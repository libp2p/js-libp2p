import { setMaxListeners } from '@libp2p/interface'
import { pipe } from '@libp2p/utils'
import { CODE_P2P_CIRCUIT } from '@multiformats/multiaddr'
import { P2P } from '@multiformats/multiaddr-matcher'
import { fmt, code, and } from '@multiformats/multiaddr-matcher/utils'
import { anySignal } from 'any-signal'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { DurationLimitError, TransferLimitError } from './errors.js'
import type { RelayReservation } from './index.js'
import type { Limit } from './pb/index.js'
import type { ConnectionLimits, LoggerOptions, Stream, MessageStream, StreamMessageEvent } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

function countStreamBytes (source: MessageStream, limit: { remaining: bigint }, options: LoggerOptions): void {
  const limitBytes = limit.remaining

  const abortIfStreamByteLimitExceeded = (evt: StreamMessageEvent): void => {
    const len = BigInt(evt.data.byteLength)
    limit.remaining -= len

    if (limit.remaining < 0) {
      source.abort(new TransferLimitError(`data limit of ${limitBytes} bytes exceeded`))
    }
  }
  source.addEventListener('message', abortIfStreamByteLimitExceeded)
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
    const durationSignal = AbortSignal.timeout(reservation.limit.duration)
    setMaxListeners(Infinity, durationSignal)
    signals.push(durationSignal)
  }

  const signal = anySignal(signals)
  setMaxListeners(Infinity, signal)

  let dataLimit: { remaining: bigint } | undefined

  if (reservation.limit?.data != null) {
    dataLimit = {
      remaining: reservation.limit.data
    }
  }

  const onAbort = (): void => {
    let err: Error

    if (abortSignal.aborted) {
      err = abortSignal.reason
    } else {
      err = new DurationLimitError(`duration limit of ${reservation.limit?.duration} ms exceeded`)
    }

    abortStreams(err)
  }
  signal.addEventListener('abort', onAbort, { once: true })

  if (dataLimit != null) {
    countStreamBytes(dst, dataLimit, options)
    countStreamBytes(src, dataLimit, options)
  }

  // join the streams together
  pipe(
    src, dst, src
  )
    .catch(err => {
      abortStreams(err)
    })
    .finally(() => {
      signal.clear()
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
