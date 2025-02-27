/* eslint-disable no-console */
import * as asn1js from 'asn1js'
import Benchmark from 'benchmark'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { decodeDer } from '../../dist/src/keys/rsa/der.js'

// results
// % node ./benchmark/der/decode-pkcs1-to-jwk.js
// asn1js x 74,179 ops/sec ±0.57% (94 runs sampled)
// decodeDer x 272,341 ops/sec ±0.67% (96 runs sampled)

const suite = new Benchmark.Suite('decode PKCS#1 to JWK public key')

const encoded = 'MIIBOgIBAAJBAL2ujQhqyQTxxktr+/9R4gs0SeXc3jldrKYBIUfEjo6L+q5isoFkzUV5Tc8eV19wHSN8shr8QJ67MMzMG6lYIYUCAwEAAQJAWlDTfE+EOaN5XI4lJfPyIo2aJiXddgkhXMWq+AYiLsKqquDCMPExj4S+k6tjdwzFVvEKoaSXTgTAqgPyyd1aAQIhAPeUGH5izGi3BDyXao+fONvHCQHtyxtUKllFoT8bJVsFAiEAxCJLFLFy1v5rodCKIvlBSQ8FbJqz7mk04Tf2eT3bdIECIFxDNWmMGg7//TUzXEPPm1nT75hnbKRvliSUnUWuMRqdAiBP5MhAvafR/AFMAO7EIFR/tia3fq0cyK5Jr8ouyQvEAQIhAJyqAHjILO1S+hqtsZidzIxi9qlIc2cEqOlzLH9RlPxy'
const der = uint8ArrayFromString(encoded, 'base64')

suite.add('asn1js', async () => {
  const { result } = asn1js.fromBER(der)
  const values = result.valueBlock.value

  return {
    n: asn1jsIntegerToBase64(values[1]),
    e: asn1jsIntegerToBase64(values[2]),
    d: asn1jsIntegerToBase64(values[3]),
    p: asn1jsIntegerToBase64(values[4]),
    q: asn1jsIntegerToBase64(values[5]),
    dp: asn1jsIntegerToBase64(values[6]),
    dq: asn1jsIntegerToBase64(values[7]),
    qi: asn1jsIntegerToBase64(values[8]),
    kty: 'RSA',
    alg: 'RS256'
  }
})

suite.add('decodeDer', async () => {
  const values = decodeDer(der)

  return {
    n: uint8ArrayToString(values[1], 'base64url'),
    e: uint8ArrayToString(values[2], 'base64url'),
    d: uint8ArrayToString(values[3], 'base64url'),
    p: uint8ArrayToString(values[4], 'base64url'),
    q: uint8ArrayToString(values[5], 'base64url'),
    dp: uint8ArrayToString(values[6], 'base64url'),
    dq: uint8ArrayToString(values[7], 'base64url'),
    qi: uint8ArrayToString(values[8], 'base64url'),
    kty: 'RSA',
    alg: 'RS256'
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
