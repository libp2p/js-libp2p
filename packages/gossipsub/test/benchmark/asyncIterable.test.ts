import { abortableSource } from 'abortable-iterator'
import all from 'it-all'
import { pipe } from 'it-pipe'
import { runBenchmark } from '../utils/benchmark.ts'

describe('abortableSource cost', function () {
  const n = 10000
  const bytes = new Uint8Array(200)
  const controller = new AbortController()

  async function * bytesSource (): AsyncGenerator<Uint8Array, void, unknown> {
    let i = 0
    while (i++ < n) {
      yield bytes
    }
  }

  for (let k = 0; k < 5; k++) {
    it(`async iterate abortable x${k} bytesSource ${n}`, async () => {
      await runBenchmark(`async iterate abortable x${k} bytesSource ${n}`, async () => {
        let source = bytesSource()
        for (let i = 0; i < k; i++) {
          source = abortableSource(source, controller.signal)
        }

        for await (const chunk of source) {
          // eslint-disable-next-line @typescript-eslint/no-unused-expressions
          chunk
        }
      })
    })
  }
})

describe('pipe extra iterables cost', function () {
  const n = 10000

  async function * numberSource (): AsyncGenerator<number, void, unknown> {
    let i = 0
    while (i < n) {
      yield i++
    }
  }

  async function * numberTransform (source: AsyncIterable<number>): AsyncIterable<number> {
    for await (const num of source) {
      yield num + 1
    }
  }

  it(`async iterate pipe x0 transforms ${n}`, async () => {
    await runBenchmark(`async iterate pipe x0 transforms ${n}`, async () => {
      await pipe(numberSource, all)
    })
  })

  it(`async iterate pipe x1 transforms ${n}`, async () => {
    await runBenchmark(`async iterate pipe x1 transforms ${n}`, async () => {
      await pipe(numberSource, numberTransform, all)
    })
  })

  it(`async iterate pipe x2 transforms ${n}`, async () => {
    await runBenchmark(`async iterate pipe x2 transforms ${n}`, async () => {
      await pipe(
        numberSource,
        numberTransform,
        numberTransform,
        all
      )
    })
  })

  it(`async iterate pipe x4 transforms ${n}`, async () => {
    await runBenchmark(`async iterate pipe x4 transforms ${n}`, async () => {
      await pipe(
        numberSource,
        numberTransform,
        numberTransform,
        numberTransform,
        numberTransform,
        all
      )
    })
  })

  it(`async iterate pipe x8 transforms ${n}`, async () => {
    await runBenchmark(`async iterate pipe x8 transforms ${n}`, async () => {
      await pipe(
        numberSource,
        numberTransform,
        numberTransform,
        numberTransform,
        numberTransform,
        numberTransform,
        numberTransform,
        numberTransform,
        numberTransform,
        all
      )
    })
  })
})
