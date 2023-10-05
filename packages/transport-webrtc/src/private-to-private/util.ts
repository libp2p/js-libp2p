import { logger } from '@libp2p/logger'
import { raceSignal } from 'race-signal'
import { isFirefox } from '../util.js'
import { RTCIceCandidate } from '../webrtc/index.js'
import { Message } from './pb/message.js'
import type { AbortOptions, MessageStream } from 'it-protobuf-stream'
import type { DeferredPromise } from 'p-defer'

const log = logger('libp2p:webrtc:peer:util')

export interface ReadCandidatesOptions extends AbortOptions {
  direction: string
}

export const readCandidatesUntilConnected = async (connectedPromise: DeferredPromise<void>, pc: RTCPeerConnection, stream: MessageStream<Message>, options: ReadCandidatesOptions): Promise<void> => {
  try {
    while (true) {
      const readResult = await Promise.race([
        connectedPromise.promise,
        stream.read(options)
      ])

      if (readResult == null) {
        // connected promise resolved
        break
      }

      const message = readResult

      if (message.type !== Message.Type.ICE_CANDIDATE) {
        throw new Error('ICE candidate message expected')
      }

      // end of candidates has been signalled
      if (message.data == null || message.data === '') {
        log.trace('%s received end-of-candidates', options.direction)
        break
      }

      log.trace('%s received new ICE candidate: %s', options.direction, message.data)

      try {
        await pc.addIceCandidate(new RTCIceCandidate(JSON.parse(message.data)))
      } catch (err) {
        log.error('%s bad candidate received:', options.direction, err)
        throw new Error('bad candidate received')
      }
    }
  } catch (err: any) {
    // this happens when the remote PeerConnection's state has changed to
    // connected before the final ICE candidate is sent and so they close
    // the signalling stream while we are still reading from it - ignore
    // the error and race the passed signal for our own connection state
    // to change
    if (err.code !== 'ERR_UNEXPECTED_EOF') {
      log.error('error while reading ICE candidates', err)
      throw err
    }
  }

  // read all available ICE candidates, wait for connection state change
  await raceSignal(connectedPromise.promise, options.signal, {
    errorMessage: 'Aborted before connected',
    errorCode: 'ERR_ABORTED_BEFORE_CONNECTED'
  })
}

export function resolveOnConnected (pc: RTCPeerConnection, promise: DeferredPromise<void>): void {
  pc[isFirefox ? 'oniceconnectionstatechange' : 'onconnectionstatechange'] = (_) => {
    log.trace('receiver peerConnectionState state change: %s', pc.connectionState)
    switch (isFirefox ? pc.iceConnectionState : pc.connectionState) {
      case 'connected':
        promise.resolve()
        break
      case 'failed':
      case 'disconnected':
      case 'closed':
        promise.reject(new Error('RTCPeerConnection was closed'))
        break
      default:
        break
    }
  }
}

export function parseRemoteAddress (sdp: string): string {
  // 'a=candidate:1746876089 1 udp 2113937151 0614fbad-b...ocal 54882 typ host generation 0 network-cost 999'
  const candidateLine = sdp.split('\r\n').filter(line => line.startsWith('a=candidate')).pop()
  const candidateParts = candidateLine?.split(' ')

  if (candidateLine == null || candidateParts == null || candidateParts.length < 5) {
    log('could not parse remote address from', candidateLine)
    return '/webrtc'
  }

  return `/dnsaddr/${candidateParts[4]}/${candidateParts[2].toLowerCase()}/${candidateParts[5]}/webrtc`
}
