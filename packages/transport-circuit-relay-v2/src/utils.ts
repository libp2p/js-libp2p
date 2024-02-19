import { CodeError } from '@libp2p/interface'
import { anySignal } from 'any-signal'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { ERR_TRANSFER_LIMIT_EXCEEDED } from './constants.js'
import type { Limit } from './pb/index.js'
import type { LoggerOptions, Stream } from '@libp2p/interface'
import type { Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

async function * countStreamBytes (source: Source<Uint8Array | Uint8ArrayList>, limit: { remaining: bigint }, options: LoggerOptions): AsyncGenerator<Uint8Array | Uint8ArrayList, void, unknown> {
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
        options.log.error(err)
      }

      throw new CodeError(`data limit of ${limitBytes} bytes exceeded`, ERR_TRANSFER_LIMIT_EXCEEDED)
    }

    limit.remaining -= len
    yield buf
  }
}

export function createLimitedRelay (src: Stream, dst: Stream, abortSignal: AbortSignal, limit: Limit | undefined, options: LoggerOptions): void {
  function abortStreams (err: Error): void {
    src.abort(err)
    dst.abort(err)
  }

  const signals = [abortSignal]

  if (limit?.duration != null) {
    signals.push(AbortSignal.timeout(limit.duration))
  }

  const signal = anySignal(signals)

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
      dst.abort(new CodeError(`duration limit of ${limit?.duration} ms exceeded`, ERR_TRANSFER_LIMIT_EXCEEDED))
    }

    signal.addEventListener('abort', onAbort, { once: true })

    void dst.sink(dataLimit == null ? src.source : countStreamBytes(src.source, dataLimit, options))
      .catch(err => {
        options.log.error('error while relaying streams src -> dst', err)
        abortStreams(err)
      })
      .finally(() => {
        srcDstFinished = true

        if (dstSrcFinished) {
          signal.removeEventListener('abort', onAbort)
          signal.clear()
        }
      })
  })

  queueMicrotask(() => {
    const onAbort = (): void => {
      src.abort(new CodeError(`duration limit of ${limit?.duration} ms exceeded`, ERR_TRANSFER_LIMIT_EXCEEDED))
    }

    signal.addEventListener('abort', onAbort, { once: true })

    void src.sink(dataLimit == null ? dst.source : countStreamBytes(dst.source, dataLimit, options))
      .catch(err => {
        options.log.error('error while relaying streams dst -> src', err)
        abortStreams(err)
      })
      .finally(() => {
        dstSrcFinished = true

        if (srcDstFinished) {
          signal.removeEventListener('abort', onAbort)
          signal.clear()
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
