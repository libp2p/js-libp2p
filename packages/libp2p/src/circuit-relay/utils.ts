import { logger } from '@libp2p/logger'
import { abortableReadable } from '@libp2p/utils/stream'
import { anySignal } from 'any-signal'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { DEFAULT_DATA_LIMIT, DEFAULT_DURATION_LIMIT } from './constants.js'
import type { Limit } from './pb/index.js'
import type { Stream } from '@libp2p/interface/connection'

const log = logger('libp2p:circuit-relay:utils')

function readableCount (readable: ReadableStream<Uint8Array>, limit: { remaining: bigint }): ReadableStream<Uint8Array> {
  const reader = readable.getReader()
  let read = 0n

  return new ReadableStream({
    pull: async (controller) => {
      try {
        const result = await reader.read()

        if (result.done) {
          controller.close()
          reader.releaseLock()
          return
        }

        read += BigInt(result.value.byteLength)

        if (read > limit.remaining) {
          throw new Error('data limit exceeded')
        }

        controller.enqueue(result.value)
      } catch (err) {
        reader.releaseLock()
        controller.error(err)
      }
    }
  })
}

const doRelay = (src: Stream, dst: Stream, abortSignal: AbortSignal, limit: Required<Limit>): void => {
  function abortStreams (err: Error): void {
    src.abort(err)
    dst.abort(err)
  }

  const signal = anySignal([abortSignal, AbortSignal.timeout(limit.duration)])

  let srcDstFinished = false
  let dstSrcFinished = false

  const dataLimit = {
    remaining: limit.data
  }

  queueMicrotask(() => {
    void readableCount(abortableReadable(src.readable, signal), dataLimit).pipeTo(dst.writable)
      .catch(err => {
        log.error('error while relaying streams src -> dst', err)
        abortStreams(err)
      })
      .finally(() => {
        srcDstFinished = true

        if (dstSrcFinished) {
          signal.clear()
        }
      })
  })

  queueMicrotask(() => {
    void readableCount(abortableReadable(dst.readable, signal), dataLimit).pipeTo(src.writable)
      .catch(err => {
        log.error('error while relaying streams dst -> src', err)
        abortStreams(err)
      })
      .finally(() => {
        dstSrcFinished = true

        if (srcDstFinished) {
          signal.clear()
        }
      })
  })
}

export function createLimitedRelay (source: Stream, destination: Stream, abortSignal: AbortSignal, limit?: Limit): void {
  const dataLimit = limit?.data ?? BigInt(DEFAULT_DATA_LIMIT)
  const durationLimit = limit?.duration ?? DEFAULT_DURATION_LIMIT

  doRelay(source, destination, abortSignal, {
    data: dataLimit,
    duration: durationLimit
  })
}

/**
 * Convert a namespace string into a cid
 */
export async function namespaceToCid (namespace: string): Promise<CID> {
  const bytes = new TextEncoder().encode(namespace)
  const hash = await sha256.digest(bytes)

  return CID.createV0(hash)
}

/**
 * returns number of ms between now and expiration time
 */
export function getExpirationMilliseconds (expireTimeSeconds: bigint): number {
  const expireTimeMillis = expireTimeSeconds * BigInt(1000)
  const currentTime = new Date().getTime()

  // downcast to number to use with setTimeout
  return Number(expireTimeMillis - BigInt(currentTime))
}
