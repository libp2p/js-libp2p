/* eslint-disable no-console */
import * as asn1js from 'asn1js'
import Benchmark from 'benchmark'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { decodeDer } from '../../dist/src/keys/rsa/der.js'

// results
// % % node ./benchmark/der/decode-pkix-to-jwk.js
// asn1js x 99,871 ops/sec ±0.47% (95 runs sampled)
// decodeDer x 1,052,352 ops/sec ±0.33% (98 runs sampled)

const suite = new Benchmark.Suite('decode PKIX to JWK public key')

const encoded = 'MFwwDQYJKoZIhvcNAQEBBQADSwAwSAJBAM8jzWa2jaL3NENRi8tI2P5jjbF1biAz4004xVLD9pG/G+HERbN9v7fvXwsB0kCu8VSfAD2JVS62C5oQ1mDQFEMCAwEAAQ'
const der = uint8ArrayFromString(encoded, 'base64')

suite.add('asn1js', async () => {
  const { result } = asn1js.fromBER(der)

  // @ts-expect-error this looks fragile but DER is a canonical format so we are
  // safe to have deeply property chains like this
  const values = result.valueBlock.value[1].valueBlock.value[0].valueBlock.value

  return {
    kty: 'RSA',
    n: asn1jsIntegerToBase64(values[0]),
    e: asn1jsIntegerToBase64(values[1])
  }
})

suite.add('decodeDer', async () => {
  const decoded = decodeDer(der, {
    offset: 0
  })

  return {
    kty: 'RSA',
    n: uint8ArrayToString(
      decoded[1][0],
      'base64url'
    ),
    e: uint8ArrayToString(
      decoded[1][1],
      'base64url'
    )
  }
})

suite
  .on('cycle', (event) => console.log(String(event.target)))
  .run({ async: true })

function asn1jsIntegerToBase64 (int) {
  let buf = int.valueBlock.valueHexView

  // chrome rejects values with leading 0s
  while (buf[0] === 0) {
    buf = buf.subarray(1)
  }

  return uint8ArrayToString(buf, 'base64url')
}
