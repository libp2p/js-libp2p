import { abortableDuplex, AbortError } from 'abortable-iterator'
import { pipe } from 'it-pipe'
import type { Duplex, Sink, Source } from 'it-stream-types'
import { TimeoutController } from 'timeout-abort-controller'
import { Uint8ArrayList } from 'uint8arraylist'
import type { Limit } from './pb/index.js'
import { logger } from '@libp2p/logger'

const log = logger('libp2p:circuit:v2:util')

type DuplexStream = Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array>
export async function createLimitedShortCircuit (source: DuplexStream, destination: DuplexStream, limit?: Limit) {
  // trivial case
  if (limit == null) {
    return await pipe(source, destination, source)
  }
  const src = durationLimitDuplex(dataLimitDuplex(source, Number(limit.data ?? 0)), limit.duration ?? 0)
  const dst = durationLimitDuplex(dataLimitDuplex(destination, Number(limit.data ?? 0)), limit.duration ?? 0)
  void pipe(
    src,
    dst,
    src
  ).catch((err) => log.error('error while relaying streams: ', err))
}

const dataLimitSource = (source: Source<Uint8ArrayList>, limit: number): Source<Uint8ArrayList> => {
  if (limit === 0) {
    return source
  }

  return pipe(source, async function * (src): Source<Uint8ArrayList> {
    let total = 0
    for await (const buf of src) {
      const remaining = limit - total
      if (remaining <= 0) {
        return
      }
      total += Math.min(buf.length, remaining)
      yield buf.sublist(0, Math.min(buf.length, remaining))
    }
  })
}

const dataLimitSink = (sink: Sink<Uint8ArrayList | Uint8Array>, limit: number): Sink<Uint8ArrayList | Uint8Array> => {
  return async (source: Source<Uint8ArrayList | Uint8Array>) => await sink(
    dataLimitSource(
      // adapter for uint8array sources
      pipe(source, async function * (src) {
        for await (const buf of src) {
          if (buf instanceof Uint8Array) {
            yield Uint8ArrayList.fromUint8Arrays([buf])
          } else {
            yield buf
          }
        }
      }),
      limit
    )
  )
}

const dataLimitDuplex = (duplex: DuplexStream, limit: number): DuplexStream => {
  return { ...duplex, source: dataLimitSource(duplex.source, limit), sink: dataLimitSink(duplex.sink, limit) }
}

const durationLimitDuplex = (duplex: DuplexStream, limit: number): DuplexStream => {
  if (limit === 0) {
    return duplex
  }
  const controller = new TimeoutController(limit)
  const d = abortableDuplex(duplex, controller.signal)
  const source = pipe(d.source, async function * (source) {
    try {
      for await (const buf of source) {
        yield buf
      }
    } catch (err: any) {
      if (!(err instanceof AbortError)) {
        throw err
      }
    } finally {
      controller.clear()
    }
  })

  return { ...duplex, source }
}
