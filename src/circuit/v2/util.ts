import type { Sink, Source } from 'it-stream-types'
import { Uint8ArrayList } from 'uint8arraylist'
import type { Limit } from './pb/index.js'
import { logger } from '@libp2p/logger'
import type { DuplexStream, Abortable } from './interfaces.js'

const log = logger('libp2p:circuit:v2:util')

const doRelay = (src: DuplexStream, dst: DuplexStream) => {
  queueMicrotask(() => {
    void dst.sink(src.source).catch(err => log.error('error while relating streams:', err))
  })

  queueMicrotask(() => {
    void src.sink(dst.source).catch(err => log.error('error while relaying streams:', err))
  })
}

export function createLimitedRelay (source: Abortable<DuplexStream>, destination: Abortable<DuplexStream>, limit?: Limit) {
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

const dataLimitSource = (source: Source<Uint8ArrayList>, abort: (err: Error) => void, limit: bigint): Source<Uint8ArrayList> => {
  if (limit === BigInt(0)) {
    return source
  }

  return (async function * (): Source<Uint8ArrayList> {
    let total = BigInt(0)
    for await (const buf of source) {
      const len = BigInt(buf.length)
      if (total + len > limit) {
        log.error('attempted to send more data than limit: %s, resetting stream', limit.toString())
        abort(new Error('exceeded connection data limit'))
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

const dataLimitSink = (sink: Sink<Uint8ArrayList | Uint8Array>, abort: (err: Error) => void, limit: bigint): Sink<Uint8ArrayList | Uint8Array> => {
  return async (source: Source<Uint8ArrayList | Uint8Array>) => await sink(
    dataLimitSource(
      adaptSource(source),
      abort,
      limit
    )
  )
}

const dataLimitDuplex = (duplex: Abortable<DuplexStream>, limit: bigint): Abortable<DuplexStream> => {
  return {
    ...duplex,
    value: {
      ...duplex.value,
      source: dataLimitSource(duplex.value.source, duplex.abort, limit),
      sink: dataLimitSink(duplex.value.sink, duplex.abort, limit)
    }
  }
}

const durationLimitDuplex = (duplex: Abortable<DuplexStream>, limit: number): Abortable<DuplexStream> => {
  if (limit === 0) {
    return duplex
  }
  let timedOut = false
  const timeout = setTimeout(
    () => {
      timedOut = true
      duplex.abort(new Error('exceeded connection duration limit'))
    },
    limit
  )
  const source = (async function * (): Source<Uint8ArrayList> {
    try {
      for await (const buf of duplex.value.source) {
        if (timedOut) {
          return
        }
        yield buf
      }
    } finally {
      clearTimeout(timeout)
    }
  })()

  return { ...duplex, value: { ...duplex.value, source } }
}
