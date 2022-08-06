import defer from 'p-defer'
import type { Source, Duplex } from 'it-stream-types'
import { Uint8ArrayList } from 'uint8arraylist'
import map from 'it-map'

// a pair of streams where one drains from the other
export function pair (): Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array> {
  const deferred = defer<Source<Uint8ArrayList>>()
  let piped = false

  return {
    sink: async source => {
      if (piped) {
        throw new Error('already piped')
      }

      piped = true
      deferred.resolve(map(source, (arg) => {
        return new Uint8ArrayList(arg)
      }))
    },
    source: (async function * () {
      const source = await deferred.promise

      yield * source
    }())
  }
}
