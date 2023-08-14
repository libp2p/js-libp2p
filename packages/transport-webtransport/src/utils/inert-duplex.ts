import type { Duplex, Source } from 'it-stream-types'

// Duplex that does nothing. Needed to fulfill the interface
export function inertDuplex (): Duplex<any, any, any> {
  return {
    source: {
      [Symbol.asyncIterator] () {
        return {
          async next () {
            // This will never resolve
            return new Promise(() => { })
          }
        }
      }
    },
    sink: async (source: Source<any>) => {
      // This will never resolve
      return new Promise(() => { })
    }
  }
}
