import { CodeError } from '@libp2p/interface/errors'
import { logger } from '@libp2p/logger'
import { anySignal } from 'any-signal'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { codes } from '../errors.js'
import type { Limit } from './pb/index.js'
import type { Stream } from '@libp2p/interface/connection'
import type { Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

const log = logger('libp2p:circuit-relay:utils')

async function * countStreamBytes (source: Source<Uint8Array | Uint8ArrayList>, limit: { remaining: bigint }): AsyncGenerator<Uint8Array | Uint8ArrayList, void, unknown> {
  const limitBytes = limit.remaining

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

      throw new CodeError(`data limit of ${limitBytes} bytes exceeded`, codes.ERR_TRANSFER_LIMIT_EXCEEDED)
    }

    limit.remaining -= len
    yield buf
  }
}

export function createLimitedRelay (src: Stream, dst: Stream, abortSignal: AbortSignal, limit?: Limit): void {
  function abortStreams (err: Error): void {
    src.abort(err)
    dst.abort(err)
    clearTimeout(timeout)
  }

  const abortController = new AbortController()
  const signal = anySignal([abortSignal, abortController.signal])

  let timeout: ReturnType<typeof setTimeout> | undefined

  if (limit?.duration != null) {
    timeout = setTimeout(() => {
      abortController.abort()
    }, limit.duration)
  }

  let srcDstFinished = false
  let dstSrcFinished = false

  let dataLimit: { remaining: bigint } | undefined

  if (limit?.data != null) {
    dataLimit = {
      remaining: limit.data
    }
  }

  queueMicrotask(() => {
    const onAbort = (): void => {
      dst.abort(new CodeError(`duration limit of ${limit?.duration} ms exceeded`, codes.ERR_TRANSFER_LIMIT_EXCEEDED))
    }

    signal.addEventListener('abort', onAbort, { once: true })

    void dst.sink(dataLimit == null ? src.source : countStreamBytes(src.source, dataLimit))
      .catch(err => {
        log.error('error while relaying streams src -> dst', err)
        abortStreams(err)
      })
      .finally(() => {
        srcDstFinished = true

        if (dstSrcFinished) {
          signal.removeEventListener('abort', onAbort)
          signal.clear()
          clearTimeout(timeout)
        }
      })
  })

  queueMicrotask(() => {
    const onAbort = (): void => {
      src.abort(new CodeError(`duration limit of ${limit?.duration} ms exceeded`, codes.ERR_TRANSFER_LIMIT_EXCEEDED))
    }

    signal.addEventListener('abort', onAbort, { once: true })

    void src.sink(dataLimit == null ? dst.source : countStreamBytes(dst.source, dataLimit))
      .catch(err => {
        log.error('error while relaying streams dst -> src', err)
        abortStreams(err)
      })
      .finally(() => {
        dstSrcFinished = true

        if (srcDstFinished) {
          signal.removeEventListener('abort', onAbort)
          signal.clear()
          clearTimeout(timeout)
        }
      })
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
