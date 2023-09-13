import { logger } from '@libp2p/logger'
import { detect } from 'detect-browser'
import pDefer from 'p-defer'

const log = logger('libp2p:webrtc:utils')

const browser = detect()
export const isFirefox = ((browser != null) && browser.name === 'firefox')

export const nopSource = async function * nop (): AsyncGenerator<Uint8Array, any, unknown> {}

export const nopSink = async (_: any): Promise<void> => {}

export function drainAndClose (channel: RTCDataChannel, channelCloseDelay: number): void {
  if (channel.readyState !== 'open') {
    return
  }

  void Promise.resolve()
    .then(async () => {
      // wait for bufferedAmount to become zero
      if (channel.bufferedAmount > 0) {
        const deferred = pDefer()

        channel.bufferedAmountLowThreshold = 0
        channel.addEventListener('bufferedamountlow', () => {
          deferred.resolve()
        })

        await deferred.promise
      }
    })
    .then(async () => {
      const deferred = pDefer()

      // event if bufferedAmount is zero there can still be unsent bytes
      const timeout = setTimeout(() => {
        try {
          // only close if the channel is still open
          if (channel.readyState === 'open') {
            channel.close()
          }

          deferred.resolve()
        } catch (err: any) {
          deferred.reject(err)
        }
      }, channelCloseDelay)

      if (timeout.unref != null) {
        timeout.unref()
      }

      await deferred.promise
    })
    .catch(err => {
      log.error('error closing outbound stream', err)
    })
}
