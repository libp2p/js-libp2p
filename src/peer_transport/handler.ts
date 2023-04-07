import type { IncomingStreamData } from '@libp2p/interface-registrar'
import { pbStream } from 'it-pb-stream'
import pDefer, { type DeferredPromise } from 'p-defer'
import { TimeoutController } from 'timeout-abort-controller'
import { readCandidatesUntilConnected, resolveOnConnected } from './util.js'
import * as pb from './pb/index.js'
import { abortableDuplex } from 'abortable-iterator'
import { logger } from '@libp2p/logger'
import type { Stream } from '@libp2p/interface-connection'
import type { StreamMuxerFactory } from '@libp2p/interface-stream-muxer'
import { DataChannelMuxerFactory } from '../muxer.js'

const DEFAULT_TIMEOUT = 30 * 1000

const log = logger('libp2p:webrtc:peer')

export type IncomingStreamOpts = { rtcConfiguration?: RTCConfiguration } & IncomingStreamData

export async function handleIncomingStream ({ rtcConfiguration, stream: rawStream }: IncomingStreamOpts): Promise<[RTCPeerConnection, StreamMuxerFactory]> {
  const timeoutController = new TimeoutController(DEFAULT_TIMEOUT)
  const signal = timeoutController.signal
  const stream = pbStream(abortableDuplex(rawStream, timeoutController.signal)).pb(pb.Message)
  const pc = new RTCPeerConnection(rtcConfiguration)
  const muxerFactory = new DataChannelMuxerFactory(pc)

  const connectedPromise: DeferredPromise<void> = pDefer()
  const answerSentPromise: DeferredPromise<void> = pDefer()

  signal.onabort = () => { connectedPromise.reject() }
  // candidate callbacks
  pc.onicecandidate = ({ candidate }) => {
    answerSentPromise.promise.then(
      () => {
        stream.write({
          type: pb.Message.Type.ICE_CANDIDATE,
          data: (candidate != null) ? JSON.stringify(candidate.toJSON()) : ''
        })
      },
      (err) => {
        log.error('cannot set candidate since sending answer failed', err)
      }
    )
  }

  resolveOnConnected(pc, connectedPromise)

  // read an SDP offer
  const pbOffer = await stream.read()
  if (pbOffer.type !== pb.Message.Type.SDP_OFFER) {
    throw new Error(`expected message type SDP_OFFER, received: ${pbOffer.type ?? 'undefined'} `)
  }
  const offer = new RTCSessionDescription({
    type: 'offer',
    sdp: pbOffer.data
  })

  await pc.setRemoteDescription(offer).catch(err => {
    log.error('could not execute setRemoteDescription', err)
    throw new Error('Failed to set remoteDescription')
  })

  // create and write an SDP answer
  const answer = await pc.createAnswer().catch(err => {
    log.error('could not execute createAnswer', err)
    answerSentPromise.reject(err)
    throw new Error('Failed to create answer')
  })
  // write the answer to the remote
  stream.write({ type: pb.Message.Type.SDP_ANSWER, data: answer.sdp })

  await pc.setLocalDescription(answer).catch(err => {
    log.error('could not execute setLocalDescription', err)
    answerSentPromise.reject(err)
    throw new Error('Failed to set localDescription')
  })

  answerSentPromise.resolve()

  // wait until candidates are connected
  await readCandidatesUntilConnected(connectedPromise, pc, stream)
  return [pc, muxerFactory]
}

export interface ConnectOptions {
  stream: Stream
  signal: AbortSignal
  rtcConfiguration?: RTCConfiguration
}

export async function initiateConnection ({ rtcConfiguration, signal, stream: rawStream }: ConnectOptions): Promise<[RTCPeerConnection, StreamMuxerFactory]> {
  const stream = pbStream(abortableDuplex(rawStream, signal)).pb(pb.Message)

  // setup peer connection
  const pc = new RTCPeerConnection(rtcConfiguration)
  const muxerFactory = new DataChannelMuxerFactory(pc)

  const connectedPromise: DeferredPromise<void> = pDefer()
  resolveOnConnected(pc, connectedPromise)

  // reject the connectedPromise if the signal aborts
  signal.onabort = connectedPromise.reject
  // we create the channel so that the peerconnection has a component for which
  // to collect candidates. The label is not relevant to connection initiation
  // but can be useful for debugging
  const channel = pc.createDataChannel('init')
  // setup callback to write ICE candidates to the remote
  // peer
  pc.onicecandidate = ({ candidate }) => {
    stream.write({
      type: pb.Message.Type.ICE_CANDIDATE,
      data: (candidate != null) ? JSON.stringify(candidate.toJSON()) : ''
    })
  }
  // create an offer
  const offerSdp = await pc.createOffer()
  // write the offer to the stream
  stream.write({ type: pb.Message.Type.SDP_OFFER, data: offerSdp.sdp })
  // set offer as local description
  await pc.setLocalDescription(offerSdp).catch(err => {
    log.error('could not execute setLocalDescription', err)
    throw new Error('Failed to set localDescription')
  })

  // read answer
  const answerMessage = await stream.read()
  if (answerMessage.type !== pb.Message.Type.SDP_ANSWER) {
    throw new Error('remote should send an SDP answer')
  }

  const answerSdp = new RTCSessionDescription({ type: 'answer', sdp: answerMessage.data })
  await pc.setRemoteDescription(answerSdp).catch(err => {
    log.error('could not execute setRemoteDescription', err)
    throw new Error('Failed to set remoteDescription')
  })

  await readCandidatesUntilConnected(connectedPromise, pc, stream)
  channel.close()
  return [pc, muxerFactory]
}
