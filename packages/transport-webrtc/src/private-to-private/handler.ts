import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { abortableDuplex } from 'abortable-iterator'
import { pbStream } from 'it-protobuf-stream'
import pDefer, { type DeferredPromise } from 'p-defer'
import { DataChannelMuxerFactory } from '../muxer.js'
import { RTCPeerConnection, RTCSessionDescription } from '../webrtc/index.js'
import { Message } from './pb/message.js'
import { readCandidatesUntilConnected, resolveOnConnected } from './util.js'
import type { DataChannelOpts } from '../stream.js'
import type { Stream } from '@libp2p/interface/connection'
import type { StreamMuxerFactory } from '@libp2p/interface/stream-muxer'
import type { IncomingStreamData } from '@libp2p/interface-internal/registrar'

const DEFAULT_TIMEOUT = 30 * 1000

const log = logger('libp2p:webrtc:peer')

export type IncomingStreamOpts = { rtcConfiguration?: RTCConfiguration, dataChannelOptions?: Partial<DataChannelOpts> } & IncomingStreamData

export async function handleIncomingStream ({ rtcConfiguration, dataChannelOptions, stream: rawStream }: IncomingStreamOpts): Promise<{ pc: RTCPeerConnection, muxerFactory: StreamMuxerFactory, remoteAddress: string }> {
  const signal = AbortSignal.timeout(DEFAULT_TIMEOUT)
  const stream = pbStream(abortableDuplex(rawStream, signal)).pb(Message)
  const pc = new RTCPeerConnection(rtcConfiguration)

  try {
    const muxerFactory = new DataChannelMuxerFactory({ peerConnection: pc, dataChannelOptions })
    const connectedPromise: DeferredPromise<void> = pDefer()
    const answerSentPromise: DeferredPromise<void> = pDefer()

    signal.onabort = () => {
      connectedPromise.reject(new CodeError('Timed out while trying to connect', 'ERR_TIMEOUT'))
    }
    // candidate callbacks
    pc.onicecandidate = ({ candidate }) => {
      answerSentPromise.promise.then(
        async () => {
          await stream.write({
            type: Message.Type.ICE_CANDIDATE,
            data: (candidate != null) ? JSON.stringify(candidate.toJSON()) : ''
          })
        },
        (err) => {
          log.error('cannot set candidate since sending answer failed', err)
          connectedPromise.reject(err)
        }
      )
    }

    resolveOnConnected(pc, connectedPromise)

    // read an SDP offer
    const pbOffer = await stream.read()
    if (pbOffer.type !== Message.Type.SDP_OFFER) {
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
    await stream.write({ type: Message.Type.SDP_ANSWER, data: answer.sdp })

    await pc.setLocalDescription(answer).catch(err => {
      log.error('could not execute setLocalDescription', err)
      answerSentPromise.reject(err)
      throw new Error('Failed to set localDescription')
    })

    answerSentPromise.resolve()

    // wait until candidates are connected
    await readCandidatesUntilConnected(connectedPromise, pc, stream)

    const remoteAddress = parseRemoteAddress(pc.currentRemoteDescription?.sdp ?? '')

    return { pc, muxerFactory, remoteAddress }
  } catch (err) {
    pc.close()
    throw err
  }
}

export interface ConnectOptions {
  stream: Stream
  signal: AbortSignal
  rtcConfiguration?: RTCConfiguration
  dataChannelOptions?: Partial<DataChannelOpts>
}

export async function initiateConnection ({ rtcConfiguration, dataChannelOptions, signal, stream: rawStream }: ConnectOptions): Promise<{ pc: RTCPeerConnection, muxerFactory: StreamMuxerFactory, remoteAddress: string }> {
  const stream = pbStream(abortableDuplex(rawStream, signal)).pb(Message)
  // setup peer connection
  const pc = new RTCPeerConnection(rtcConfiguration)

  try {
    const muxerFactory = new DataChannelMuxerFactory({ peerConnection: pc, dataChannelOptions })

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
      void stream.write({
        type: Message.Type.ICE_CANDIDATE,
        data: (candidate != null) ? JSON.stringify(candidate.toJSON()) : ''
      })
        .catch(err => {
          log.error('error sending ICE candidate', err)
        })
    }

    // create an offer
    const offerSdp = await pc.createOffer()
    // write the offer to the stream
    await stream.write({ type: Message.Type.SDP_OFFER, data: offerSdp.sdp })
    // set offer as local description
    await pc.setLocalDescription(offerSdp).catch(err => {
      log.error('could not execute setLocalDescription', err)
      throw new Error('Failed to set localDescription')
    })

    // read answer
    const answerMessage = await stream.read()
    if (answerMessage.type !== Message.Type.SDP_ANSWER) {
      throw new Error('remote should send an SDP answer')
    }

    const answerSdp = new RTCSessionDescription({ type: 'answer', sdp: answerMessage.data })
    await pc.setRemoteDescription(answerSdp).catch(err => {
      log.error('could not execute setRemoteDescription', err)
      throw new Error('Failed to set remoteDescription')
    })

    await readCandidatesUntilConnected(connectedPromise, pc, stream)
    channel.close()

    const remoteAddress = parseRemoteAddress(pc.currentRemoteDescription?.sdp ?? '')

    return { pc, muxerFactory, remoteAddress }
  } catch (err) {
    pc.close()
    throw err
  }
}

function parseRemoteAddress (sdp: string): string {
  // 'a=candidate:1746876089 1 udp 2113937151 0614fbad-b...ocal 54882 typ host generation 0 network-cost 999'
  const candidateLine = sdp.split('\r\n').filter(line => line.startsWith('a=candidate')).pop()
  const candidateParts = candidateLine?.split(' ')

  if (candidateLine == null || candidateParts == null || candidateParts.length < 5) {
    log('could not parse remote address from', candidateLine)
    return '/webrtc'
  }

  return `/dnsaddr/${candidateParts[4]}/${candidateParts[2].toLowerCase()}/${candidateParts[3]}/webrtc`
}
