/* eslint-disable no-console */
'use strict'

import { pipe } from 'it-pipe'
import { expect } from 'aegir/chai'
import { itBench, setBenchOpts } from '@dapplion/benchmark'
import { pushable } from 'it-pushable'
import { Mplex } from '../dist/src/index.js'

const factory = new Mplex()
const muxer = factory.createStreamMuxer()
const stream1 = muxer.newStream('hello')
console.log('[dialer] new stream id', stream1.id)
const muxer2 = factory.createStreamMuxer({
  onIncomingStream: async (stream) => {
    console.log('[listener] muxed stream opened, id:', stream.id)
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
const data = Buffer.from(
  'e40000000a000000000000000a00000000000000a45c8daa336e17a150300afd4c717313c84f291754c51a378f20958083c5fa070a00000000000000a45c8daa336e17a150300afd4c717313c84f291754c51a378f20958083c5fa070a00000000000000a45c8daa336e17a150300afd4c717313c84f291754c51a378f20958083c5fa0795d2ef8ae4e2b4d1e5b3d5ce47b518e3db2c8c4d082e4498805ac2a686c69f248761b78437db2927470c1e77ede9c18606110faacbcbe4f13052bde7f7eff6aab09edf7bc4929fda2230f943aba2c47b6f940d350cb20c76fad4a8d40e2f3f1f01',
  'hex'
)

describe('benchmark mplex', function () {
  this.timeout(0)
  setBenchOpts({
    maxMs: 200 * 1000,
    minMs: 120 * 1000,
    minRuns: 200
  })

  const count = 1_000

  itBench({
    id: `send and receive ${count} items`,
    fn: async () => {
      for (let i = 0; i < count; i++) {
        p.push(data)
      }
      p.end()
      const arr = await promise
      expect(arr.length).to.be.equal(count)
    },
    runsFactor: 100
  })
})
