// @ts-expect-error no types
import Benchmark from 'benchmark'
// @ts-expect-error no types
import TimeCache from 'time-cache'
import { SimpleTimeCache } from '../../src/utils/time-cache.js'

// TODO: errors with "Error: root suite not found"
describe('npm TimeCache vs SimpleTimeCache', () => {
  const iterations = [1_000_000, 4_000_000, 8_000_000, 16_000_000]
  const timeCache = new TimeCache({ validity: 1 })
  const simpleTimeCache = new SimpleTimeCache({ validityMs: 1000 })

  for (const iteration of iterations) {
    it(`npm TimeCache.put x${iteration}`, async () => {
      await runBenchmark(`npm TimeCache.put x${iteration}`, () => {
        for (let j = 0; j < iteration; j++) { timeCache.put(String(j)) }
      })
    })

    it(`SimpleTimeCache.put x${iteration}`, async () => {
      await runBenchmark(`SimpleTimeCache.put x${iteration}`, () => {
        for (let j = 0; j < iteration; j++) { simpleTimeCache.put(String(j), true) }
      })
    })
  }
})

async function runBenchmark (name: string, fn: () => void | Promise<void>): Promise<void> {
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
        process.stdout.write(`    ${name}: ${this.hz.toFixed(4)} ops/s ${(1000 / this.hz).toFixed(6)} ms/op ${this.count} runs\n`)
        resolve()
      })
      .on('error', reject)
      .run({ async: true })
  })
}
