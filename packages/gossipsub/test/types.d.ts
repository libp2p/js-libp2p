// Minimal type stubs for dev-only packages without bundled types.

declare module 'benchmark' {
  class Benchmark {
    constructor (name: string, options?: Benchmark.Options)
    hz: number
    count: number
    on (type: string, listener: (...args: any[]) => void): this
    run (options?: { async?: boolean }): this
  }

  namespace Benchmark {
    interface Deferred {
      resolve (): void
    }
    interface Options {
      defer?: boolean
      initCount?: number
      maxTime?: number
      minSamples?: number
      minTime?: number
      fn?(deferred: Deferred): void
    }
  }

  export default Benchmark
}
