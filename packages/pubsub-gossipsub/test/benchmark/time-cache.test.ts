import { itBench, setBenchOpts } from '@dapplion/benchmark'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-expect-error no types
import TimeCache from 'time-cache'
import { SimpleTimeCache } from '../../src/utils/time-cache.js'

// TODO: errors with "Error: root suite not found"
describe('npm TimeCache vs SimpleTimeCache', () => {
  setBenchOpts({
    maxMs: 100 * 1000,
    minMs: 60 * 1000,
    minRuns: 512
  })

  const iterations = [1_000_000, 4_000_000, 8_000_000, 16_000_000]
  const timeCache = new TimeCache({ validity: 1 })
  const simpleTimeCache = new SimpleTimeCache({ validityMs: 1000 })

  for (const iteration of iterations) {
    itBench(`npm TimeCache.put x${iteration}`, () => {
      for (let j = 0; j < iteration; j++) timeCache.put(String(j))
    })

    itBench(`SimpleTimeCache.put x${iteration}`, () => {
      for (let j = 0; j < iteration; j++) simpleTimeCache.put(String(j), true)
    })
  }
})
