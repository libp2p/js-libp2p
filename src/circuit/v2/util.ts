import { abortableDuplex } from 'abortable-iterator'
import { pipe } from 'it-pipe'
import type { Duplex, Source } from 'it-stream-types'
import { TimeoutController } from 'timeout-abort-controller'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Limit } from './pb'

type DuplexStream = Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array>
export async function createLimitedShortCircuit (source: DuplexStream, destination: DuplexStream, limit?: Limit) {
  // trivial case
  if (limit == null) {
    return await pipe(source, destination, source)
  }
  const [src, clearSource] = durationLimitDuplex({ ...source, source: dataLimitSource(source.source, Number(limit.data ?? 0)), sink: source.sink }, limit.duration ?? 0)
  const [dst, clearDest] = durationLimitDuplex({ ...destination, source: dataLimitSource(destination.source, Number(limit.data ?? 0)), sink: destination.sink }, limit.duration ?? 0)
  return await pipe(src, dst, src).then(() => { clearSource(); clearDest() })
}

const dataLimitSource = (source: Source<Uint8ArrayList>, limit: number): Source<Uint8ArrayList> => {
  if (limit === 0) {
    return source
  }

  return pipe(source, async function * (src): Source<Uint8ArrayList> {
    let total = 0
    for await (const buf of src) {
      if (total + buf.length < limit) {
        total += buf.length
        yield buf
      } else {
        const remaining = limit - total
        return yield buf.sublist(0, remaining)
      }
    }
  })
}

const durationLimitDuplex = (duplex: DuplexStream, limit: number): [DuplexStream, () => void] => {
  if (limit === 0) {
    return [duplex, () => { }]
  }
  const controller = new TimeoutController(limit)
  const d = abortableDuplex(duplex, controller.signal)
  const clear = () => controller.clear()
  return [d, clear]
}
