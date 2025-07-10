import { ConnectionFailedError, InvalidMessageError } from '@libp2p/interface'
import pDefer from 'p-defer'
import { CustomProgressEvent } from 'progress-events'
import { isFirefox } from '../util.js'
import { RTCIceCandidate } from '../webrtc/index.js'
import { Message } from './pb/message.js'
import type { WebRTCDialEvents } from './transport.js'
import type { RTCPeerConnection } from '../webrtc/index.js'
import type { AbortOptions, LoggerOptions, Stream } from '@libp2p/interface'
import type { MessageStream } from 'it-protobuf-stream'
import type { DeferredPromise } from 'p-defer'
import type { ProgressOptions } from 'progress-events'

export interface ReadCandidatesOptions extends AbortOptions, LoggerOptions, ProgressOptions<WebRTCDialEvents> {
  direction: string
}

export const readCandidatesUntilConnected = async (pc: RTCPeerConnection, stream: MessageStream<Message, Stream>, options: ReadCandidatesOptions): Promise<void> => {
  try {
    const connectedPromise: DeferredPromise<void> = pDefer()
    resolveOnConnected(pc, connectedPromise)

    // read candidates until we are connected or we reach the end of the stream
    while (true) {
      // if we connect, stop trying to read from the stream
      const message = await Promise.race([
        connectedPromise.promise,
        stream.read({
          signal: options.signal
        }).catch(() => {})
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
        options.log.error('%s bad candidate received', options.direction, candidateInit, err)
      }
    }
  } catch (err) {
    options.log.error('%s error parsing ICE candidate', options.direction, err)

    if (options.signal?.aborted === true && getConnectionState(pc) !== 'connected') {
      throw err
    }
  }
}

export function getConnectionState (pc: RTCPeerConnection): string {
  return isFirefox ? pc.iceConnectionState : pc.connectionState
}

function resolveOnConnected (pc: RTCPeerConnection, promise: DeferredPromise<void>): void {
  pc[isFirefox ? 'oniceconnectionstatechange' : 'onconnectionstatechange'] = (_) => {
    switch (getConnectionState(pc)) {
      case 'connected':
        promise.resolve()
        break
      case 'failed':
      case 'disconnected':
      case 'closed':
        promise.reject(new ConnectionFailedError('RTCPeerConnection was closed'))
        break
      default:
        break
    }
  }
}
