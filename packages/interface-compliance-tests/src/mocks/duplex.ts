import type { Duplex, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

export function mockDuplex (): Duplex<AsyncGenerator<Uint8Array | Uint8ArrayList>, Source<Uint8Array | Uint8ArrayList>, Promise<void>> {
  return {
    source: (async function * () {
      yield * []
    }()),
    sink: async () => {}
  }
}
