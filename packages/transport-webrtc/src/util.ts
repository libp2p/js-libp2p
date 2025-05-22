import { detect } from 'detect-browser'
import pDefer from 'p-defer'
import pTimeout from 'p-timeout'
import sdpTransform from 'sdp-transform'
import { DATA_CHANNEL_DRAIN_TIMEOUT, DEFAULT_ICE_SERVERS, UFRAG_ALPHABET, UFRAG_PREFIX } from './constants.js'
import type { RTCPeerConnection } from '@roamhq/wrtc'
import type { LoggerOptions } from '@libp2p/interface'

const browser = detect()
export const isFirefox = ((browser != null) && browser.name === 'firefox')

export const nopSource = async function * nop (): AsyncGenerator<Uint8Array, any, unknown> {}

export const nopSink = async (_: any): Promise<void> => {}

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
      options.log.error('error closing outbound stream', err)
    })
}

export interface AbortPromiseOptions {
  signal?: AbortSignal
  message?: string
}

export function isPeerConnection (obj: any): obj is RTCPeerConnection {
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

export interface RTCCertificateFingerprint {
  value: string
  algorithm: 'sha-1' | 'sha-224' | 'sha-256' | 'sha-384' | 'sha-512' | 'md5' | 'md2'
}

function isIn<T> (values: readonly T[], x: any): x is T {
  return values.includes(x)
}

export function getRTCFingerprint (session: RTCSessionDescription): RTCCertificateFingerprint {
  const remoteSdp = sdpTransform.parse(session.sdp)

  const fingerprint = remoteSdp.fingerprint

  if (fingerprint === undefined) {
    throw new Error('Invalid state: unable to parse fingerprint from sdp')
  }

  /**
   * @see https://developer.mozilla.org/en-US/docs/Web/API/RTCCertificate/getFingerprints#algorithm
   */
  const allowedAlgorithms = ['sha-1', 'sha-224', 'sha-256', 'sha-384', 'sha-512', 'md5', 'md2'] as const

  if (!isIn(allowedAlgorithms, fingerprint.type)) {
    throw new Error(`Invalid state: alogorithm state invalid in fingerprint, found ${fingerprint.hash}`)
  }

  return { value: fingerprint.hash, algorithm: fingerprint.type }
}
