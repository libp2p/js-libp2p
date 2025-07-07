import { CODE_P2P_CIRCUIT } from '@multiformats/multiaddr'
import { P2P } from '@multiformats/multiaddr-matcher'
import { fmt, code, and } from '@multiformats/multiaddr-matcher/utils'
import { anySignal } from 'any-signal'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { DurationLimitError, TransferLimitError } from './errors.js'
import type { RelayReservation } from './index.js'
import type { Limit } from './pb/index.js'
import type { ConnectionLimits, LoggerOptions, Stream } from '@libp2p/interface'
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

      throw new TransferLimitError(`data limit of ${limitBytes} bytes exceeded`)
    }

    limit.remaining -= len
    yield buf
  }
}

export function createLimitedRelay (src: Stream, dst: Stream, abortSignal: AbortSignal, reservation: RelayReservation, options: LoggerOptions): void {
  function abortStreams (err: Error): void {
    src.abort(err)
    dst.abort(err)
  }

  // combine shutdown signal and reservation expiry signal
  const signals = [abortSignal, reservation.signal]

  if (reservation.limit?.duration != null) {
    options.log('limiting relayed connection duration to %dms', reservation.limit.duration)
    signals.push(AbortSignal.timeout(reservation.limit.duration))
  }

  const signal = anySignal(signals)

  let srcDstFinished = false
  let dstSrcFinished = false

  let dataLimit: { remaining: bigint } | undefined

  if (reservation.limit?.data != null) {
    dataLimit = {
      remaining: reservation.limit.data
    }
  }

  queueMicrotask(() => {
    const onAbort = (): void => {
      options.log('relayed connection reached time limit')
      dst.abort(new DurationLimitError(`duration limit of ${reservation.limit?.duration} ms exceeded`))
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
      options.log('relayed connection reached time limit')
      src.abort(new DurationLimitError(`duration limit of ${reservation.limit?.duration} ms exceeded`))
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

export class LimitTracker {
  private readonly expires?: number
  private bytes?: bigint

  constructor (limits?: Limit) {
    if (limits?.duration != null && limits?.duration !== 0) {
      this.expires = Date.now() + (limits.duration * 1000)
    }

    this.bytes = limits?.data

    if (this.bytes === 0n) {
      this.bytes = undefined
    }

    this.onData = this.onData.bind(this)
  }

  onData (buf: Uint8ArrayList | Uint8Array): void {
    if (this.bytes == null) {
      return
    }

    this.bytes -= BigInt(buf.byteLength)

    if (this.bytes < 0n) {
      this.bytes = 0n
    }
  }

  getLimits (): ConnectionLimits | undefined {
    if (this.expires == null && this.bytes == null) {
      return
    }

    const output = {}

    if (this.bytes != null) {
      const self = this

      Object.defineProperty(output, 'bytes', {
        get () {
          return self.bytes
        }
      })
    }

    if (this.expires != null) {
      const self = this

      Object.defineProperty(output, 'seconds', {
        get () {
          return Math.round(((self.expires ?? 0) - Date.now()) / 1000)
        }
      })
    }

    return output
  }
}

/**
 * A custom matcher that tells us to listen on a particular relay
 */
export const CircuitListen = fmt(
  and(P2P.matchers[0], code(CODE_P2P_CIRCUIT))
)

/**
 * A custom matcher that tells us to discover available relays
 */
export const CircuitSearch = fmt(
  code(CODE_P2P_CIRCUIT)
)
