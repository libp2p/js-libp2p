import { abortableDuplex, AbortError } from 'abortable-iterator'
import type { Sink, Source } from 'it-stream-types'
import { TimeoutController } from 'timeout-abort-controller'
import { Uint8ArrayList } from 'uint8arraylist'
import type { Limit } from './pb/index.js'
import { logger } from '@libp2p/logger'
import type { DuplexStream, Resetable } from './interfaces.js'

const log = logger('libp2p:circuit:v2:util')

const doRelay = (src: DuplexStream, dst: DuplexStream) => {
  queueMicrotask(() => {
    void dst.sink(src.source).catch(err => log.error('error while relating streams:', err))
  })

  queueMicrotask(() => {
    void src.sink(dst.source).catch(err => log.error('error while relaying streams:', err))
  })
}

export function createLimitedRelay (source: Resetable<DuplexStream>, destination: Resetable<DuplexStream>, limit?: Limit) {
  // trivial case
  if (limit == null) {
    doRelay(source.value, destination.value)
    return
  }
  const dataLimit = limit.data ?? BigInt(0)
  const durationLimit = limit.duration ?? 0
  const src = durationLimitDuplex(dataLimitDuplex(source, dataLimit), durationLimit)
  const dst = durationLimitDuplex(dataLimitDuplex(destination, dataLimit), durationLimit)
  doRelay(src.value, dst.value)
}

const dataLimitSource = (source: Source<Uint8ArrayList>, reset: () => void, limit: bigint): Source<Uint8ArrayList> => {
  if (limit === BigInt(0)) {
    return source
  }

  return (async function * (): Source<Uint8ArrayList> {
    let total = BigInt(0)
    for await (const buf of source) {
      const len = BigInt(buf.length)
      if (total + len > limit) {
        log.error('attempted to send more data than limit: %s, resetting stream', limit.toString())
        reset()
        return
      }
      total += len
      yield buf
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

const dataLimitSink = (sink: Sink<Uint8ArrayList | Uint8Array>, reset: () => void, limit: bigint): Sink<Uint8ArrayList | Uint8Array> => {
  return async (source: Source<Uint8ArrayList | Uint8Array>) => await sink(
    dataLimitSource(
      adaptSource(source),
      reset,
      limit
    )
  )
}

const dataLimitDuplex = (duplex: Resetable<DuplexStream>, limit: bigint): Resetable<DuplexStream> => {
  return {
    ...duplex,
    value: {
      ...duplex.value,
      source: dataLimitSource(duplex.value.source, duplex.reset, limit),
      sink: dataLimitSink(duplex.value.sink, duplex.reset, limit)
    }
  }
}

const durationLimitDuplex = (duplex: Resetable<DuplexStream>, limit: number): Resetable<DuplexStream> => {
  if (limit === 0) {
    return duplex
  }
  const controller = new TimeoutController(limit)
  const d = abortableDuplex(duplex.value, controller.signal)
  const source = (async function * () {
    try {
      for await (const buf of d.source) {
        yield buf
      }
    } catch (err: any) {
      if (!(err instanceof AbortError)) {
        throw err
      }
      // reset if we encounter an abort error
      log.error('exceeded duration: %d ms, resetting stream', limit)
      duplex.reset()
    } finally {
      controller.clear()
    }
  })()

  return { ...duplex, value: { ...duplex.value, source } }
}
