import { ConnectionFailedError, InvalidMessageError, InvalidMultiaddrError } from '@libp2p/interface'
import { peerIdFromString } from '@libp2p/peer-id'
import { CustomProgressEvent } from 'progress-events'
import { RTCIceCandidate } from '../webrtc/index.js'
import { Message } from './pb/message.js'
import type { WebRTCDialEvents } from './transport.js'
import type { RTCPeerConnection } from '../webrtc/index.js'
import type { AbortOptions, LoggerOptions, PeerId, Stream } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { MessageStream } from 'it-protobuf-stream'
import type { DeferredPromise } from 'p-defer'
import type { ProgressOptions } from 'progress-events'

export interface ReadCandidatesOptions extends AbortOptions, LoggerOptions, ProgressOptions<WebRTCDialEvents> {
  direction: string
}

export const readCandidatesUntilConnected = async (pc: RTCPeerConnection, stream: MessageStream<Message, Stream>, options: ReadCandidatesOptions): Promise<void> => {
  try {
    const connectedPromise = Promise.withResolvers<void>()
    resolveOnConnected(pc, connectedPromise)

    // read candidates until we are connected or we reach the end of the stream
    while (true) {
      // if we connect, stop trying to read from the stream
      const message = await Promise.race([
        connectedPromise.promise,
        stream.read({
          signal: options.signal
        })
      ])

      // stream ended or we became connected
      if (message == null) {
        // throw if we timed out
        options.signal?.throwIfAborted()

        break
      }

      if (message.type !== Message.Type.ICE_CANDIDATE) {
        throw new InvalidMessageError('ICE candidate message expected')
      }

      const candidateInit = JSON.parse(message.data ?? 'null')

      // an empty string means this generation of candidates is complete, a null
      // candidate means candidate gathering has finished
      // see - https://www.w3.org/TR/webrtc/#rtcpeerconnectioniceevent
      if (candidateInit === '' || candidateInit === null) {
        options.onProgress?.(new CustomProgressEvent('webrtc:end-of-ice-candidates'))
        options.log.trace('end-of-candidates received')

        continue
      }

      const candidate = new RTCIceCandidate(candidateInit)

      options.log.trace('%s received new ICE candidate %o', options.direction, candidateInit)

      try {
        options.onProgress?.(new CustomProgressEvent<string>('webrtc:add-ice-candidate', candidate.candidate))
        await pc.addIceCandidate(candidate)
      } catch (err) {
        options.log.error('%s bad candidate received %o - %e', options.direction, candidateInit, err)
      }
    }
  } catch (err) {
    options.log.error('%s error parsing ICE candidate - %e', options.direction, err)

    if (options.signal?.aborted === true && pc.connectionState !== 'connected') {
      throw err
    }
  }
}

function resolveOnConnected (pc: RTCPeerConnection, promise: DeferredPromise<void>): void {
  if (pc.connectionState === 'connected') {
    promise.resolve()
    return
  }

  pc.onconnectionstatechange = (_) => {
    switch (pc.connectionState) {
      case 'connected':
        promise.resolve()
        break
      case 'failed':
      case 'disconnected':
      case 'closed':
        promise.reject(new ConnectionFailedError(`RTCPeerConnection connection state became "${pc.connectionState}"`))
        break
      default:
        break
    }
  }
}

export function getRemotePeer (ma: Multiaddr): PeerId {
  let remotePeer: PeerId | undefined

  for (const component of ma.getComponents()) {
    if (component.name === 'p2p') {
      remotePeer = peerIdFromString(component.value ?? '')
    }
  }

  if (remotePeer == null) {
    throw new InvalidMultiaddrError('Remote peerId must be present in multiaddr')
  }

  return remotePeer
}
