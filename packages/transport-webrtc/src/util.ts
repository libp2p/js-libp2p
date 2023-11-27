import { detect } from 'detect-browser'
import pDefer from 'p-defer'
import pTimeout from 'p-timeout'
import type { LoggerOptions } from '@libp2p/interface'

const browser = detect()
export const isFirefox = ((browser != null) && browser.name === 'firefox')

export const nopSource = async function * nop (): AsyncGenerator<Uint8Array, any, unknown> {}

export const nopSink = async (_: any): Promise<void> => {}

export const DATA_CHANNEL_DRAIN_TIMEOUT = 30 * 1000

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
