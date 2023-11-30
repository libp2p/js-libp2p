import { CodeError } from '@libp2p/interface'
import { closeSource } from '@libp2p/utils/close-source'
import { anySignal } from 'any-signal'
import { isFirefox } from '../util.js'
import { RTCIceCandidate } from '../webrtc/index.js'
import { Message } from './pb/message.js'
import type { LoggerOptions, Stream } from '@libp2p/interface'
import type { AbortOptions, MessageStream } from 'it-protobuf-stream'
import type { DeferredPromise } from 'p-defer'

export interface ReadCandidatesOptions extends AbortOptions, LoggerOptions {
  direction: string
}

export const readCandidatesUntilConnected = async (connectedPromise: DeferredPromise<void>, pc: RTCPeerConnection, stream: MessageStream<Message, Stream>, options: ReadCandidatesOptions): Promise<void> => {
  // if we connect, stop trying to read from the stream
  const controller = new AbortController()
  connectedPromise.promise.then(() => {
    controller.abort()
  }, () => {
    controller.abort()
  })

  const signal = anySignal([
    controller.signal,
    options.signal
  ])

  const abortListener = (): void => {
    closeSource(stream.unwrap().unwrap().source, options.log)
  }

  signal.addEventListener('abort', abortListener)

  try {
    // read candidates until we are connected or we reach the end of the stream
    while (true) {
      const message = await Promise.race([
        connectedPromise.promise,
        stream.read()
      ])

      // stream ended or we became connected
      if (message == null) {
        break
      }

      if (message.type !== Message.Type.ICE_CANDIDATE) {
        throw new CodeError('ICE candidate message expected', 'ERR_NOT_ICE_CANDIDATE')
      }

      const candidateInit = JSON.parse(message.data ?? 'null')

      // an empty string means this generation of candidates is complete, a null
      // candidate means candidate gathering has finished
      // see - https://www.w3.org/TR/webrtc/#rtcpeerconnectioniceevent
      if (candidateInit === '' || candidateInit === null) {
        options.log.trace('end-of-candidates received')

        continue
      }

      const candidate = new RTCIceCandidate(candidateInit)

      options.log.trace('%s received new ICE candidate', options.direction, candidate)

      try {
        await pc.addIceCandidate(candidate)
      } catch (err) {
        options.log.error('%s bad candidate received', options.direction, candidateInit, err)
      }
    }
  } catch (err) {
    options.log.error('%s error parsing ICE candidate', options.direction, err)
  } finally {
    signal.removeEventListener('abort', abortListener)
    signal.clear()
  }
}

export function resolveOnConnected (pc: RTCPeerConnection, promise: DeferredPromise<void>): void {
  pc[isFirefox ? 'oniceconnectionstatechange' : 'onconnectionstatechange'] = (_) => {
    switch (isFirefox ? pc.iceConnectionState : pc.connectionState) {
      case 'connected':
        promise.resolve()
        break
      case 'failed':
      case 'disconnected':
      case 'closed':
        promise.reject(new CodeError('RTCPeerConnection was closed', 'ERR_CONNECTION_CLOSED_BEFORE_CONNECTED'))
        break
      default:
        break
    }
  }
}
