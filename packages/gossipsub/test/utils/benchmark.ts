import Benchmark from 'benchmark'

export async function runBenchmark (name: string, fn: () => void | Promise<void>, runsFactor = 1): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    new Benchmark(name, {
      defer: true,
      initCount: 1,
      maxTime: 1,
      minSamples: 1,
      minTime: 0.1,
      fn (deferred: Benchmark.Deferred) {
        Promise.resolve()
          .then(fn)
          .then(() => { deferred.resolve() })
          .catch(reject)
      }
    })
      .on('complete', function (this: Benchmark) {
        const hz = this.hz * runsFactor
        process.stdout.write(`    ${name}: ${hz.toFixed(4)} ops/s ${(1000 / hz).toFixed(6)} ms/op ${this.count} runs\n`)
        resolve()
      })
      .on('error', reject)
      .run({ async: true })
  })
}
