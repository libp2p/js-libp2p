/* eslint-disable */
import benchmark from 'benchmark'
import { Nonce } from '../dist/src/nonce.js'

/**
 * Using Nonce class is 150x faster than nonceToBytes
 * nonceToBytes x 2.25 ops/sec ±1.41% (10 runs sampled)
 * Nonce class x 341 ops/sec ±0.71% (87 runs sampled)
 */
function nonceToBytes (n) {
  // Even though we're treating the nonce as 8 bytes, RFC7539 specifies 12 bytes for a nonce.
  const nonce = new Uint8Array(12)
  new DataView(nonce.buffer, nonce.byteOffset, nonce.byteLength).setUint32(4, n, true)
  return nonce
}
const main = function () {
  const bench1 = new benchmark('nonceToBytes', {
    fn: function () {
      for (let i = 1e6; i < 2 * 1e6; i++) {
        nonceToBytes(i)
      }
    }
  })
    .on('complete', function (stats) {
      console.log(String(stats.currentTarget))
    })

  bench1.run()

  const bench2 = new benchmark('Nonce class', {
    fn: function () {
      const nonce = new Nonce(1e6)
      for (let i = 1e6; i < 2 * 1e6; i++) {
        nonce.increment()
      }
    }
  })
    .on('complete', function (stats) {
      console.log(String(stats.currentTarget))
    })

  bench2.run()
}

main()
