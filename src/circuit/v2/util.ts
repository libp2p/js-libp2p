import { abortableDuplex, AbortError } from 'abortable-iterator'
import type { Duplex, Sink, Source } from 'it-stream-types'
import { TimeoutController } from 'timeout-abort-controller'
import { Uint8ArrayList } from 'uint8arraylist'
import type { Limit } from './pb/index.js'
import { logger } from '@libp2p/logger'

const log = logger('libp2p:circuit:v2:util')

type DuplexStream = Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array>
const doRelay = (src: DuplexStream, dst: DuplexStream) => {
  void dst.sink(src.source).catch(err => log.error('error while relating streams:', err))
  void src.sink(dst.source).catch(err => log.error('error while relaying streams:', err))
}

export async function createLimitedShortCircuit (source: DuplexStream, destination: DuplexStream, limit?: Limit) {
  // trivial case
  if (limit == null) {
    void doRelay(source, destination)
    return
  }
  const dataLimit = limit.data ?? BigInt(0)
  const durationLimit = limit.duration ?? 0
  const src = durationLimitDuplex(dataLimitDuplex(source, dataLimit), durationLimit)
  const dst = durationLimitDuplex(dataLimitDuplex(destination, dataLimit), durationLimit)
  void doRelay(src, dst)
}

const dataLimitSource = (source: Source<Uint8ArrayList>, limit: bigint): Source<Uint8ArrayList> => {
  if (limit === BigInt(0)) {
    return source
  }

  return (async function * (): Source<Uint8ArrayList> {
    let total = BigInt(0)
    for await (const buf of source) {
      const remaining = limit - total
      if (remaining <= 0) {
        return
      }
      const len = BigInt(buf.length)
      const readBytes = len <= remaining ? len : remaining
      total += readBytes
      // downcast to number is safe since len is guaranteed to
      // be within the range of `number`.
      yield buf.sublist(0, Number(readBytes))
    }
  })()
}

const adaptSource = (source: Source<Uint8ArrayList | Uint8Array>): Source<Uint8ArrayList> => (async function * () {
  for await (const buf of source) {
    if (buf instanceof Uint8Array) {
      yield Uint8ArrayList.fromUint8Arrays([buf])
    } else {
      yield buf
    }
  }
})()

const dataLimitSink = (sink: Sink<Uint8ArrayList | Uint8Array>, limit: bigint): Sink<Uint8ArrayList | Uint8Array> => {
  return async (source: Source<Uint8ArrayList | Uint8Array>) => await sink(
    dataLimitSource(
      adaptSource(source),
      limit
    )
  )
}

const dataLimitDuplex = (duplex: DuplexStream, limit: bigint): DuplexStream => {
  return { ...duplex, source: dataLimitSource(duplex.source, limit), sink: dataLimitSink(duplex.sink, limit) }
}

const durationLimitDuplex = (duplex: DuplexStream, limit: number): DuplexStream => {
  if (limit === 0) {
    return duplex
  }
  const controller = new TimeoutController(limit)
  const d = abortableDuplex(duplex, controller.signal)
  const source = (async function * () {
    try {
      for await (const buf of d.source) {
        yield buf
      }
    } catch (err: any) {
      if (!(err instanceof AbortError)) {
        throw err
      }
    } finally {
      controller.clear()
    }
  })()

  return { ...duplex, source }
}
