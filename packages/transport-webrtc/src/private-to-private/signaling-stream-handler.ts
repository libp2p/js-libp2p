import { multiaddr } from '@multiformats/multiaddr'
import { pbStream } from 'it-protobuf-stream'
import { SDPHandshakeFailedError } from '../error.js'
import { RTCSessionDescription } from '../webrtc/index.js'
import { Message } from './pb/message.js'
import { getConnectionState, readCandidatesUntilConnected } from './util.js'
import type { RTCPeerConnection } from '../webrtc/index.js'
import type { Logger, IncomingStreamData } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface IncomingStreamOpts extends IncomingStreamData {
  peerConnection: RTCPeerConnection
  signal: AbortSignal
  log: Logger
}

export async function handleIncomingStream ({ peerConnection, stream, signal, connection, log }: IncomingStreamOpts): Promise<{ remoteAddress: Multiaddr }> {
  log.trace('new inbound signaling stream')

  const messageStream = pbStream(stream).pb(Message)

  try {
    // candidate callbacks
    peerConnection.onicecandidate = ({ candidate }) => {
      // a null candidate means end-of-candidates, an empty string candidate
      // means end-of-candidates for this generation, otherwise this should
      // be a valid candidate object
      // see - https://www.w3.org/TR/webrtc/#rtcpeerconnectioniceevent
      const data = JSON.stringify(candidate?.toJSON() ?? null)

      log.trace('recipient sending ICE candidate %s', data)

      messageStream.write({
        type: Message.Type.ICE_CANDIDATE,
        data
      }, {
        signal
      })
        .catch(err => {
          log.error('error sending ICE candidate', err)
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
      log.error('could not execute setRemoteDescription', err)
      throw new SDPHandshakeFailedError('Failed to set remoteDescription')
    })

    // create and write an SDP answer
    const answer = await peerConnection.createAnswer().catch(err => {
      log.error('could not execute createAnswer', err)
      throw new SDPHandshakeFailedError('Failed to create answer')
    })

    log.trace('recipient send SDP answer %s', answer.sdp)

    // write the answer to the remote
    await messageStream.write({ type: Message.Type.SDP_ANSWER, data: answer.sdp }, {
      signal
    })

    await peerConnection.setLocalDescription(answer).catch(err => {
      log.error('could not execute setLocalDescription', err)
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
    if (getConnectionState(peerConnection) !== 'connected') {
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
