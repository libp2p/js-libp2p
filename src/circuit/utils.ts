import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import type { Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Limit } from './pb/index.js'
import { logger } from '@libp2p/logger'
import type { Stream } from '@libp2p/interface-connection'
import { DEFAULT_DATA_LIMIT, DEFAULT_DURATION_LIMIT } from './constants.js'
import { abortableSource } from 'abortable-iterator'
import anySignal from 'any-signal'

const log = logger('libp2p:circuit-relay:utils')

async function * countStreamBytes (source: Source<Uint8Array | Uint8ArrayList>, limit: { remaining: bigint }): AsyncGenerator<Uint8Array | Uint8ArrayList, void, unknown> {
  for await (const buf of source) {
    const len = BigInt(buf.byteLength)

    if ((limit.remaining - len) < 0) {
      // this is a safe downcast since len is guarantee to be in the range for a number
      const remaining = Number(limit.remaining)
      limit.remaining = 0n

      try {
        if (remaining !== 0) {
          yield buf.subarray(0, remaining)
        }
      } catch (err: any) {
        log.error(err)
      }

      throw new Error('data limit exceeded')
    }

    limit.remaining -= len
    yield buf
  }
}

const doRelay = (src: Stream, dst: Stream, abortSignal: AbortSignal, limit: Required<Limit>): void => {
  function abortStreams (err: Error) {
    src.abort(err)
    dst.abort(err)
    clearTimeout(timeout)
  }

  const abortController = new AbortController()
  const signal = anySignal([abortSignal, abortController.signal])

  const timeout = setTimeout(() => {
    abortController.abort()
  }, limit.duration)

  let srcDstFinished = false
  let dstSrcFinished = false

  const dataLimit = {
    remaining: limit.data
  }

  queueMicrotask(() => {
    void dst.sink(countStreamBytes(abortableSource(src.source, signal, {
      abortMessage: 'duration limit exceeded'
    }), dataLimit))
      .catch(err => {
        log.error('error while relaying streams src -> dst', err)
        abortStreams(err)
      })
      .finally(() => {
        srcDstFinished = true

        if (dstSrcFinished) {
          clearTimeout(timeout)
        }
      })
  })

  queueMicrotask(() => {
    void src.sink(countStreamBytes(abortableSource(dst.source, signal, {
      abortMessage: 'duration limit exceeded'
    }), dataLimit))
      .catch(err => {
        log.error('error while relaying streams dst -> src', err)
        abortStreams(err)
      })
      .finally(() => {
        dstSrcFinished = true

        if (srcDstFinished) {
          clearTimeout(timeout)
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
export function getExpiration (expireTime: bigint): number {
  return Number(expireTime) - new Date().getTime()
}
