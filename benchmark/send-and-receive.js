/* eslint-disable no-console */

/*
$ node benchmark/send-and-receive.js
$ npx playwright-test benchmark/send-and-receive.js --runner benchmark
*/

import Benchmark from 'benchmark'
import { pipe } from 'it-pipe'
import { expect } from 'aegir/chai'
import { pushable } from 'it-pushable'
import { Mplex } from '../dist/src/index.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'

const factory = new Mplex()
const muxer = factory.createStreamMuxer()
const stream1 = muxer.newStream('hello')
const muxer2 = factory.createStreamMuxer({
  onIncomingStream: async (stream) => {
    await pipe(
      stream,
      function transform (source) {
        return (async function * () { // A generator is async iterable
          for await (const chunk of source) {
            yield chunk
          }
        })()
      },
      stream
    )
  }
})

pipe(muxer, muxer2, muxer)

const p = pushable()
const promise = pipe(p, stream1, async function collect (source) {
  const vals = []
  for await (const val of source) {
    vals.push(val)
  }
  return vals
})

// typical data of ethereum consensus attestation
const data = uint8ArrayFromString(
  'e40000000a000000000000000a00000000000000a45c8daa336e17a150300afd4c717313c84f291754c51a378f20958083c5fa070a00000000000000a45c8daa336e17a150300afd4c717313c84f291754c51a378f20958083c5fa070a00000000000000a45c8daa336e17a150300afd4c717313c84f291754c51a378f20958083c5fa0795d2ef8ae4e2b4d1e5b3d5ce47b518e3db2c8c4d082e4498805ac2a686c69f248761b78437db2927470c1e77ede9c18606110faacbcbe4f13052bde7f7eff6aab09edf7bc4929fda2230f943aba2c47b6f940d350cb20c76fad4a8d40e2f3f1f01',
  'hex'
)

const count = 1000

new Benchmark.Suite()
  .add('send and receive', async () => {
    for (let i = 0; i < count; i++) {
      p.push(data)
    }
    p.end()
    const arr = await promise
    expect(arr.length).to.be.equal(count)
  })
  .on('error', (err) => {
    console.error(err)
  })
  .on('cycle', (event) => {
    console.info(String(event.target))
  })
  .on('complete', function () {
    // @ts-expect-error types are wrong
    console.info(`Fastest is ${this.filter('fastest').map('name')}`) // eslint-disable-line @typescript-eslint/restrict-template-expressions
  })
  // run async
  .run({ async: true })
