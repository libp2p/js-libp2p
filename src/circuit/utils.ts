import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import type { Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Limit } from './pb/index.js'
import { logger } from '@libp2p/logger'
import type { Stream } from '@libp2p/interface-connection'
import { DEFAULT_DATA_LIMIT, DEFAULT_DURATION_LIMIT } from './constants.js'

const log = logger('libp2p:circuit-relay:utils')

async function * countStreamBytes (source: Source<Uint8Array | Uint8ArrayList>, limit: bigint): AsyncGenerator<Uint8Array | Uint8ArrayList, void, unknown> {
  let total = 0n

  for await (const buf of source) {
    const len = BigInt(buf.byteLength)
    if (total + len > limit) {
      // this is a safe downcast since len is guarantee to be in the range for a number
      const remaining = Number(limit - total)

      try {
        if (remaining !== 0) {
          yield buf.subarray(0, remaining)
        }
      } catch (err: any) {
        log.error(err)
      }

      throw new Error('data limit exceeded')
    }

    total += len
    yield buf
  }
}

const doRelay = (src: Stream, dst: Stream, limit: bigint) => {
  queueMicrotask(() => {
    void dst.sink(countStreamBytes(src.source, limit))
      .catch(err => {
        log.error('error while relaying streams src -> dst', err)
        src.abort(err)
        dst.abort(err)
      })
  })

  queueMicrotask(() => {
    void src.sink(countStreamBytes(dst.source, limit))
      .catch(err => {
        log.error('error while relaying streams dst -> src', err)
        src.abort(err)
        dst.abort(err)
      })
  })
}

export function createLimitedRelay (source: Stream, destination: Stream, abortSignal: AbortSignal, limit?: Limit): void {
  const dataLimit = limit?.data ?? BigInt(DEFAULT_DATA_LIMIT)
  const durationLimit = limit?.duration ?? DEFAULT_DURATION_LIMIT
  const src = durationLimitDuplex(source, durationLimit, abortSignal)
  const dst = durationLimitDuplex(destination, durationLimit, abortSignal)

  doRelay(src, dst, dataLimit)
}

const durationLimitDuplex = (stream: Stream, limit: number, abortSignal: AbortSignal): Stream => {
  if (limit === 0) {
    return stream
  }

  let timedOut = false
  const timeout = setTimeout(
    () => {
      timedOut = true
      stream.abort(new Error('exceeded connection duration limit'))
    },
    limit
  )

  const source = stream.source
  const listener = () => {
    timedOut = true
    stream.abort(new Error('exceeded connection duration limit'))
  }
  abortSignal.addEventListener('abort', listener)

  stream.source = (async function * (): Source<Uint8ArrayList> {
    try {
      for await (const buf of source) {
        if (timedOut) {
          return
        }
        yield buf
      }
    } finally {
      clearTimeout(timeout)
      abortSignal.removeEventListener('abort', listener)
    }
  })()

  return stream
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
