import crypto from 'node:crypto'
// @ts-expect-error no types
import Benchmark from 'benchmark'
import { RPC } from '../../src/message/rpc.js'

describe('protobuf', function () {
  const testCases: Array<{ name: string, length: number }> = [
    // As of Oct 2023, Attestation length = 281
    { name: 'Attestation', length: 300 },
    // A SignedBeaconBlock could be from 70_000 to 300_000
    { name: 'SignedBeaconBlock', length: 70_000 },
    { name: 'SignedBeaconBlock', length: 140_000 },
    { name: 'SignedBeaconBlock', length: 210_000 },
    { name: 'SignedBeaconBlock', length: 280_000 }
  ]

  for (const { name, length } of testCases) {
    const rpc: RPC = {
      subscriptions: [],
      messages: [
        {
          topic: 'topic1',
          data: crypto.randomBytes(length),
          signature: Uint8Array.from(Array.from({ length: 96 }, () => 100))
        }
      ],
      control: undefined
    }

    const bytes = RPC.encode(rpc)

    const runsFactor = 1000

    it(`decode ${name} message ${length} bytes`, async () => {
      await runBenchmark(`decode ${name} message ${length} bytes`, () => {
        for (let i = 0; i < runsFactor; i++) {
          RPC.decode(bytes)
        }
      }, runsFactor)
    })

    it(`encode ${name} message ${length} bytes`, async () => {
      await runBenchmark(`encode ${name} message ${length} bytes`, () => {
        for (let i = 0; i < runsFactor; i++) {
          RPC.encode(rpc)
        }
      }, runsFactor)
    })
  }
})

async function runBenchmark (name: string, fn: () => void | Promise<void>, runsFactor = 1): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    new Benchmark(name, {
      defer: true,
      initCount: 1,
      maxTime: 1,
      minSamples: 1,
      minTime: 0.1,
      fn (deferred: { resolve(): void }) {
        Promise.resolve()
          .then(fn)
          .then(() => { deferred.resolve() })
          .catch(reject)
      }
    })
      .on('complete', function (this: { hz: number, count: number }) {
        const hz = this.hz * runsFactor
        process.stdout.write(`    ${name}: ${hz.toFixed(4)} ops/s ${(1000 / hz).toFixed(6)} ms/op ${this.count} runs\n`)
        resolve()
      })
      .on('error', reject)
      .run({ async: true })
  })
}
