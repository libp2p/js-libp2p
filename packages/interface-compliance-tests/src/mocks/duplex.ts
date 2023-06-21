import type { Duplex, Source } from 'it-stream-types'

export function mockDuplex (): Duplex<AsyncGenerator<Uint8Array>, Source<Uint8Array>, Promise<void>> {
  return {
    source: (async function * () {
      yield * []
    }()),
    sink: async () => {}
  }
}
