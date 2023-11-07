import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { pbStream } from 'it-protobuf-stream'
import pDefer, { type DeferredPromise } from 'p-defer'
import { type RTCPeerConnection, RTCSessionDescription } from '../webrtc/index.js'
import { Message } from './pb/message.js'
import { readCandidatesUntilConnected, resolveOnConnected } from './util.js'
import type { IncomingStreamData } from '@libp2p/interface-internal/registrar'

const log = logger('libp2p:webrtc:signaling-stream-handler')

export interface IncomingStreamOpts extends IncomingStreamData {
  peerConnection: RTCPeerConnection
  signal: AbortSignal
}

export async function handleIncomingStream ({ peerConnection, stream, signal, connection }: IncomingStreamOpts): Promise<{ remoteAddress: Multiaddr }> {
  log.trace('new inbound signaling stream')

  const messageStream = pbStream(stream).pb(Message)

  try {
    const connectedPromise: DeferredPromise<void> = pDefer()
    const answerSentPromise: DeferredPromise<void> = pDefer()

    signal.onabort = () => {
      connectedPromise.reject(new CodeError('Timed out while trying to connect', 'ERR_TIMEOUT'))
    }

    // candidate callbacks
    peerConnection.onicecandidate = ({ candidate }) => {
      answerSentPromise.promise.then(
        async () => {
          // a null candidate means end-of-candidates, an empty string candidate
          // means end-of-candidates for this generation, otherwise this should
          // be a valid candidate object
          // see - https://www.w3.org/TR/webrtc/#rtcpeerconnectioniceevent
          const data = JSON.stringify(candidate?.toJSON() ?? null)

          log.trace('recipient sending ICE candidate %s', data)

          await messageStream.write({
            type: Message.Type.ICE_CANDIDATE,
            data
          }, {
            signal
          })
        },
        (err) => {
          log.error('cannot set candidate since sending answer failed', err)
          connectedPromise.reject(err)
        }
      )
    }

    resolveOnConnected(peerConnection, connectedPromise)

    // read an SDP offer
    const pbOffer = await messageStream.read({
      signal
    })

    if (pbOffer.type !== Message.Type.SDP_OFFER) {
      throw new CodeError(`expected message type SDP_OFFER, received: ${pbOffer.type ?? 'undefined'} `, 'ERR_SDP_HANDSHAKE_FAILED')
    }

    log.trace('recipient receive SDP offer %s', pbOffer.data)

    const offer = new RTCSessionDescription({
      type: 'offer',
      sdp: pbOffer.data
    })

    await peerConnection.setRemoteDescription(offer).catch(err => {
      log.error('could not execute setRemoteDescription', err)
      throw new CodeError('Failed to set remoteDescription', 'ERR_SDP_HANDSHAKE_FAILED')
    })

    // create and write an SDP answer
    const answer = await peerConnection.createAnswer().catch(err => {
      log.error('could not execute createAnswer', err)
      answerSentPromise.reject(err)
      throw new CodeError('Failed to create answer', 'ERR_SDP_HANDSHAKE_FAILED')
    })

    log.trace('recipient send SDP answer %s', answer.sdp)

    // write the answer to the remote
    await messageStream.write({ type: Message.Type.SDP_ANSWER, data: answer.sdp }, {
      signal
    })

    await peerConnection.setLocalDescription(answer).catch(err => {
      log.error('could not execute setLocalDescription', err)
      answerSentPromise.reject(err)
      throw new CodeError('Failed to set localDescription', 'ERR_SDP_HANDSHAKE_FAILED')
    })

    answerSentPromise.resolve()

    log.trace('recipient read candidates until connected')

    // wait until candidates are connected
    await readCandidatesUntilConnected(connectedPromise, peerConnection, messageStream, {
      direction: 'recipient',
      signal
    })

    log.trace('recipient connected, closing signaling stream')
    await messageStream.unwrap().unwrap().close({
      signal
    })
  } catch (err: any) {
    if (peerConnection.connectionState !== 'connected') {
      log.error('error while handling signaling stream from peer %a', connection.remoteAddr, err)

      peerConnection.close()
      throw err
    } else {
      log('error while handling signaling stream from peer %a, ignoring as the RTCPeerConnection is already connected', connection.remoteAddr, err)
    }
  }

  const remoteAddress = multiaddr(`/webrtc/p2p/${connection.remoteAddr.getPeerId()}`)

  log.trace('recipient connected to remote address %s', remoteAddress)

  return { remoteAddress }
}
