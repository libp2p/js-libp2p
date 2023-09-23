import { logger } from '@libp2p/logger'
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
      throw new Error('expected only ice candidates')
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

  await connectedPromise.promise
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
