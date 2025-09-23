import { pbStream } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { SDPHandshakeFailedError } from '../error.js'
import { RTCSessionDescription } from '../webrtc/index.js'
import { Message } from './pb/message.js'
import { getRemotePeer, readCandidatesUntilConnected } from './util.js'
import type { RTCPeerConnection } from '../webrtc/index.js'
import type { AbortOptions, Connection, Logger, PeerId, Stream } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface IncomingStreamOptions extends AbortOptions {
  peerConnection: RTCPeerConnection
  log: Logger
}

export async function handleIncomingStream (stream: Stream, connection: Connection, { peerConnection, signal, log }: IncomingStreamOptions): Promise<{ remoteAddress: Multiaddr, remotePeer: PeerId }> {
  log.trace('new inbound signaling stream')

  const messageStream = pbStream(stream).pb(Message)

  try {
    // candidate callbacks
    peerConnection.onicecandidate = ({ candidate }) => {
      if (peerConnection.connectionState === 'connected') {
        log.trace('ignore new ice candidate as peer connection is already connected')
        return
      }

      // a null candidate means end-of-candidates, an empty string candidate
      // means end-of-candidates for this generation, otherwise this should
      // be a valid candidate object
      // see - https://www.w3.org/TR/webrtc/#rtcpeerconnectioniceevent
      if (candidate == null || candidate?.candidate === '') {
        log.trace('recipient detected end of ICE candidates')
        return
      }

      const data = JSON.stringify(candidate?.toJSON() ?? null)

      log.trace('recipient sending ICE candidate %s', data)

      messageStream.write({
        type: Message.Type.ICE_CANDIDATE,
        data
      }, {
        signal
      })
        .catch(err => {
          log.error('error sending ICE candidate - %e', err)
        })
    }

    log.trace('recipient read SDP offer')

    // read an SDP offer
    const pbOffer = await messageStream.read({
      signal
    })

    if (pbOffer.type !== Message.Type.SDP_OFFER) {
      throw new SDPHandshakeFailedError(`expected message type SDP_OFFER, received: ${pbOffer.type ?? 'undefined'} `)
    }

    log.trace('recipient received SDP offer %s', pbOffer.data)

    const offer = new RTCSessionDescription({
      type: 'offer',
      sdp: pbOffer.data
    })

    await peerConnection.setRemoteDescription(offer).catch(err => {
      log.error('could not execute setRemoteDescription - %e', err)
      throw new SDPHandshakeFailedError('Failed to set remoteDescription')
    })

    // create and write an SDP answer
    const answer = await peerConnection.createAnswer().catch(err => {
      log.error('could not execute createAnswer - %e', err)
      throw new SDPHandshakeFailedError('Failed to create answer')
    })

    log.trace('recipient send SDP answer %s', answer.sdp)

    // write the answer to the remote
    await messageStream.write({ type: Message.Type.SDP_ANSWER, data: answer.sdp }, {
      signal
    })

    await peerConnection.setLocalDescription(answer).catch(err => {
      log.error('could not execute setLocalDescription - %e', err)
      throw new SDPHandshakeFailedError('Failed to set localDescription')
    })

    log.trace('recipient read candidates until connected')

    // wait until candidates are connected
    await readCandidatesUntilConnected(peerConnection, messageStream, {
      direction: 'recipient',
      signal,
      log
    })
  } catch (err: any) {
    if (peerConnection.connectionState !== 'connected') {
      log.error('error while handling signaling stream from peer %a - %e', connection.remoteAddr, err)

      peerConnection.close()
      throw err
    } else {
      log('error while handling signaling stream from peer %a, ignoring as the RTCPeerConnection is already connected', connection.remoteAddr, err)
    }
  }

  const remotePeer = getRemotePeer(connection.remoteAddr)
  const remoteAddress = multiaddr(`/webrtc/p2p/${remotePeer}`)

  log.trace('recipient connected to remote address %s', remoteAddress)

  return {
    remoteAddress,
    remotePeer
  }
}
