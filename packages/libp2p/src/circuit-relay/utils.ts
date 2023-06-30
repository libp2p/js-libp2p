import { logger } from '@libp2p/logger'
import { abortableSource } from 'abortable-iterator'
import { anySignal } from 'any-signal'
import { CID } from 'multiformats/cid'
import { sha256 } from 'multiformats/hashes/sha2'
import { object, number, boolean } from 'yup'
import { DEFAULT_MAX_INBOUND_STREAMS, DEFAULT_MAX_OUTBOUND_STREAMS } from '../registrar.js'
import { DEFAULT_DATA_LIMIT, DEFAULT_DURATION_LIMIT, DEFAULT_HOP_TIMEOUT, DEFAULT_MAX_RESERVATION_CLEAR_INTERVAL, DEFAULT_MAX_RESERVATION_STORE_SIZE, DEFAULT_MAX_RESERVATION_TTL } from './constants.js'
import { type CircuitRelayServerInit, circuitRelayServer, type CircuitRelayServerComponents } from './server/index.js'
import type { CircuitRelayService } from './index.js'
import type { Limit } from './pb/index.js'
import type { Stream } from '@libp2p/interface/connection'
import type { Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

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
  function abortStreams (err: Error): void {
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
          signal.clear()
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
          signal.clear()
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
export function getExpirationMilliseconds (expireTimeSeconds: bigint): number {
  const expireTimeMillis = expireTimeSeconds * BigInt(1000)
  const currentTime = new Date().getTime()

  // downcast to number to use with setTimeout
  return Number(expireTimeMillis - BigInt(currentTime))
}

export const validateCircuitRelayServicesConfig = (opts: CircuitRelayServerInit): (components: CircuitRelayServerComponents) => CircuitRelayService => {
  return circuitRelayServer(object({
    hopTimeout: number().min(0).integer().default(DEFAULT_HOP_TIMEOUT).optional(),
    reservations: object({
      maxReservations: number().integer().min(0).default(DEFAULT_MAX_RESERVATION_STORE_SIZE).optional(),
      reservationClearInterval: number().integer().min(0).default(DEFAULT_MAX_RESERVATION_CLEAR_INTERVAL).optional(),
      applyDefaultLimit: boolean().default(true).optional(),
      reservationTtl: number().integer().min(0).default(DEFAULT_MAX_RESERVATION_TTL).optional(),
      defaultDurationLimit: number().integer().min(0).default(DEFAULT_DURATION_LIMIT).max(opts?.reservations?.reservationTtl ?? DEFAULT_MAX_RESERVATION_TTL, `default duration limit must be less than reservation TTL: ${opts?.reservations?.reservationTtl}`).optional()
    }),
    maxInboundHopStreams: number().integer().min(0).default(DEFAULT_MAX_INBOUND_STREAMS).optional(),
    maxOutboundHopStreams: number().integer().min(0).default(DEFAULT_MAX_OUTBOUND_STREAMS).optional()
  }).validateSync(opts))
}
