/* eslint-disable no-console */
import * as asn1js from 'asn1js'
import Benchmark from 'benchmark'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { encodeSequence, encodeInteger } from '../../dist/src/keys/rsa/der.js'
import { RSA_KEY_512_BITS } from '../../dist/test/fixtures/rsa.js'

// results
// % node ./benchmark/der/encode-jwk-to-pkcs1.js
// asn1js x 21,453 ops/sec ±0.54% (92 runs sampled)
// encodeSequence x 65,991 ops/sec ±0.36% (98 runs sampled)

const jwk = RSA_KEY_512_BITS.privateKey

const suite = new Benchmark.Suite('encode JWK private key to PKCS#1')

suite.add('asn1js', async () => {
  const root = new asn1js.Sequence({
    value: [
      new asn1js.Integer({ value: 0 }),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.n, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.e, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.d, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.p, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.q, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.dp, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.dq, 'base64url'))),
      asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.qi, 'base64url')))
    ]
  })

  const der = root.toBER()

  return new Uint8Array(der, 0, der.byteLength)
})

suite.add('encodeSequence', async () => {
  return encodeSequence([
    encodeInteger(Uint8Array.from([0])),
    encodeInteger(uint8ArrayFromString(jwk.n, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.e, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.d, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.p, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.q, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.dp, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.dq, 'base64url')),
    encodeInteger(uint8ArrayFromString(jwk.qi, 'base64url'))
  ]).subarray()
})

suite
  .on('cycle', (event) => console.log(String(event.target)))
  .run({ async: true })

function bufToBn (u8) {
  const hex = []

  u8.forEach(function (i) {
    let h = i.toString(16)

    if (h.length % 2 > 0) {
      h = `0${h}`
    }

    hex.push(h)
  })

  return BigInt('0x' + hex.join(''))
}
