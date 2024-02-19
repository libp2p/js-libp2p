import { getIterator } from 'get-iterator'
import { isPromise } from './is-promise.js'
import type { Logger } from '@libp2p/logger'
import type { Source } from 'it-stream-types'

export function closeSource (source: Source<unknown>, log: Logger): void {
  const res = getIterator(source).return?.()

  if (isPromise(res)) {
    res.catch(err => {
      log.error('could not cause iterator to return', err)
    })
  }
}
