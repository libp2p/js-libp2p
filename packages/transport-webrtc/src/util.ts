import pDefer from 'p-defer'
import pTimeout from 'p-timeout'
import { DATA_CHANNEL_DRAIN_TIMEOUT, DEFAULT_ICE_SERVERS, UFRAG_ALPHABET, UFRAG_PREFIX } from './constants.ts'
import type { Logger, LoggerOptions } from '@libp2p/interface'
import type { Duplex, Source } from 'it-stream-types'
import type { IceUdpMuxRequest, PeerConnection } from 'node-datachannel'

export const nopSource = async function * nop (): AsyncGenerator<Uint8Array, any, unknown> {}

export const nopSink = async (_: any): Promise<void> => {}

// Duplex that does nothing. Needed to fulfill the interface
export function inertDuplex (): Duplex<any, any, any> {
  return {
    source: {
      [Symbol.asyncIterator] () {
        return {
          async next () {
            // This will never resolve
            return new Promise(() => { })
          }
        }
      }
    },
    sink: async (source: Source<any>) => {
      // This will never resolve
      return new Promise(() => { })
    }
  }
}

export function drainAndClose (channel: RTCDataChannel, direction: string, drainTimeout: number = DATA_CHANNEL_DRAIN_TIMEOUT, options: LoggerOptions): void {
  if (channel.readyState !== 'open') {
    return
  }

  void Promise.resolve()
    .then(async () => {
      // wait for bufferedAmount to become zero
      if (channel.bufferedAmount > 0) {
        options.log('%s drain channel with %d buffered bytes', direction, channel.bufferedAmount)
        const deferred = pDefer()
        let drained = false

        channel.bufferedAmountLowThreshold = 0

        const closeListener = (): void => {
          if (!drained) {
            options.log('%s drain channel closed before drain', direction)
            deferred.resolve()
          }
        }

        channel.addEventListener('close', closeListener, {
          once: true
        })

        channel.addEventListener('bufferedamountlow', () => {
          drained = true
          channel.removeEventListener('close', closeListener)
          deferred.resolve()
        })

        await pTimeout(deferred.promise, {
          milliseconds: drainTimeout
        })
      }
    })
    .then(async () => {
      // only close if the channel is still open
      if (channel.readyState === 'open') {
        channel.close()
      }
    })
    .catch(err => {
      options.log.error('error closing outbound stream - %e', err)
    })
}

export interface AbortPromiseOptions {
  signal?: AbortSignal
  message?: string
}

export function isPeerConnection (obj: any): obj is PeerConnection {
  return typeof obj.state === 'function'
}

export async function getRtcConfiguration (config?: RTCConfiguration | (() => RTCConfiguration | Promise<RTCConfiguration>)): Promise<RTCConfiguration> {
  config = config ?? {}

  if (typeof config === 'function') {
    config = await config()
  }

  config.iceServers = config.iceServers ?? DEFAULT_ICE_SERVERS.map(url => ({
    urls: [
      url
    ]
  }))

  return config
}

export const genUfrag = (len: number = 32): string => {
  return UFRAG_PREFIX + [...Array(len)].map(() => UFRAG_ALPHABET.at(Math.floor(Math.random() * UFRAG_ALPHABET.length))).join('')
}

// WebRTC-direct reuses the ufrag as the ICE password, which RFC 8445 requires to
// be 22-256 chars from the ice-char set [a-zA-Z0-9+/]; other values crash the
// process during native ICE setup, so reject them beforehand.
const ICE_CREDENTIAL_REGEX = /^[a-zA-Z0-9+/]{22,256}$/

export const isValidUfrag = (ufrag: string): boolean => {
  return ICE_CREDENTIAL_REGEX.test(ufrag)
}

// Validate and forward a STUN request received by the UDP mux listener. The ufrag
// is attacker-controlled and reused as the ICE password in native setup, where an
// invalid value aborts the process, so drop anything that is not a valid credential.
export function handleStunRequest (request: IceUdpMuxRequest, log: Logger, cb: (ufrag: string, host: string, port: number) => void): void {
  if (request.ufrag == null) {
    return
  }

  if (!isValidUfrag(request.ufrag)) {
    log.trace('dropping incoming STUN packet from %s:%d with invalid ufrag', request.host, request.port)
    return
  }

  log.trace('incoming STUN packet from %s:%d %s', request.host, request.port, request.ufrag)

  cb(request.ufrag, request.host, request.port)
}
