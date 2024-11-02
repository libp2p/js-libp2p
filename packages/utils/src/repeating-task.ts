import { setMaxListeners } from '@libp2p/interface'
import { anySignal } from 'any-signal'
import type { AbortOptions } from '@libp2p/interface'

export interface RepeatingTask {
  start(): void
  stop(): void
}

export interface RepeatingTaskOptions {
  /**
   * How long the task is allowed to run before the passed AbortSignal fires an
   * abort event
   */
  timeout?: number

  /**
   * Whether to schedule the task to run immediately
   */
  runImmediately?: boolean
}

export function repeatingTask (fn: (options?: AbortOptions) => void | Promise<void>, interval: number, options?: RepeatingTaskOptions): RepeatingTask {
  let timeout: ReturnType<typeof setTimeout>
  let shutdownController: AbortController

  function runTask (): void {
    const opts: AbortOptions = {
      signal: shutdownController.signal
    }

    if (options?.timeout != null) {
      const signal = anySignal([shutdownController.signal, AbortSignal.timeout(options.timeout)])
      setMaxListeners(Infinity, signal)

      opts.signal = signal
    }

    Promise.resolve().then(async () => {
      await fn(opts)
    })
      .catch(() => {})
      .finally(() => {
        if (shutdownController.signal.aborted) {
          // task has been cancelled, bail
          return
        }

        // reschedule
        timeout = setTimeout(runTask, interval)
      })
  }

  let started = false

  return {
    start: () => {
      if (started) {
        return
      }

      started = true
      shutdownController = new AbortController()
      setMaxListeners(Infinity, shutdownController.signal)

      // run now
      if (options?.runImmediately === true) {
        queueMicrotask(() => {
          runTask()
        })
      } else {
        // run later
        timeout = setTimeout(runTask, interval)
      }
    },
    stop: () => {
      clearTimeout(timeout)
      shutdownController?.abort()
      started = false
    }
  }
}
