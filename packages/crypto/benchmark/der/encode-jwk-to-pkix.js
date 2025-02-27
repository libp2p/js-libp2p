/* eslint-disable no-console */
import * as asn1js from 'asn1js'
import Benchmark from 'benchmark'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { encodeBitString, encodeSequence, encodeInteger } from '../../dist/src/keys/rsa/der.js'
import { RSA_KEY_512_BITS } from '../../dist/test/fixtures/rsa.js'

// results
// % node ./benchmark/der/encode-jwk-to-pkix.js
// asn1js x 41,774 ops/sec ±0.67% (91 runs sampled)
// encodeDer x 244,387 ops/sec ±0.36% (95 runs sampled)

const jwk = RSA_KEY_512_BITS.publicKey

const suite = new Benchmark.Suite('encode JWK public key to PKIX')

const algorithmIdentifierSequence = Uint8Array.from([
  0x30, 0x0D, 0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01, 0x05, 0x00
])

suite.add('asn1js', async () => {
  const root = new asn1js.Sequence({
    value: [
      new asn1js.Sequence({
        value: [
          // rsaEncryption
          new asn1js.ObjectIdentifier({
            value: '1.2.840.113549.1.1.1'
          }),
          new asn1js.Null()
        ]
      }),
      new asn1js.BitString({
        valueHex: new asn1js.Sequence({
          value: [
            asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.n, 'base64url'))),
            asn1js.Integer.fromBigInt(bufToBn(uint8ArrayFromString(jwk.e, 'base64url')))
          ]
        }).toBER()
      })
    ]
  })

  return root.toBER()
})

suite.add('encodeDer', async () => {
  return encodeSequence([
    algorithmIdentifierSequence,
    encodeBitString(
      encodeSequence([
        encodeInteger(uint8ArrayFromString(jwk.n, 'base64url')),
        encodeInteger(uint8ArrayFromString(jwk.e, 'base64url'))
      ])
    )
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
