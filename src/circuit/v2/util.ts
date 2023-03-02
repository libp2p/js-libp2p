import type { Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Limit } from './pb/index.js'
import { logger } from '@libp2p/logger'
import type { Stream } from '@libp2p/interface-connection'

const log = logger('libp2p:circuit:v2:util')

const doRelay = (src: Stream, dst: Stream) => {
  queueMicrotask(() => {
    void dst.sink(src.source).catch(err => log.error('error while relating streams:', err))
  })

  queueMicrotask(() => {
    void src.sink(dst.source).catch(err => log.error('error while relaying streams:', err))
  })
}

export function createLimitedRelay (source: Stream, destination: Stream, limit?: Limit) {
  // trivial case
  if (limit == null) {
    doRelay(source, destination)
    return
  }

  const dataLimit = limit.data ?? 0n
  const durationLimit = limit.duration ?? 0
  const src = durationLimitDuplex(dataLimitDuplex(source, dataLimit), durationLimit)
  const dst = durationLimitDuplex(dataLimitDuplex(destination, dataLimit), durationLimit)

  doRelay(src, dst)
}

const dataLimitSource = (stream: Stream, limit: bigint): Stream => {
  if (limit === 0n) {
    return stream
  }

  const source = stream.source

  stream.source = (async function * (): Source<Uint8ArrayList> {
    let total = 0n

    for await (const buf of source) {
      const len = BigInt(buf.byteLength)
      if (total + len > limit) {
        // this is a safe downcast since len is guarantee to be in the range for a number
        const remaining = Number(limit - total)
        try {
          if (remaining !== 0) {
            yield buf
          }
        } finally {
          stream.abort(new Error('data limit exceeded'))
        }
        return
      }

      yield buf

      total += len
    }
  })()

  return stream
}

const dataLimitSink = (stream: Stream, limit: bigint): Stream => {
  if (limit === 0n) {
    return stream
  }

  const sink = stream.sink

  stream.sink = async (source: Source<Uint8ArrayList | Uint8Array>) => {
    await sink((async function * (): Source<Uint8ArrayList | Uint8Array> {
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
          } finally {
            stream.abort(new Error('data limit exceeded'))
          }
          return
        }

        total += len
        yield buf
      }
    })())
  }

  return stream
}

const dataLimitDuplex = (stream: Stream, limit: bigint): Stream => {
  dataLimitSource(stream, limit)
  dataLimitSink(stream, limit)

  return stream
}

const durationLimitDuplex = (stream: Stream, limit: number): Stream => {
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
    }
  })()

  return stream
}
