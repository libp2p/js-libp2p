import { setMaxListeners } from '@libp2p/interface'
import { anySignal } from 'any-signal'
import type { AbortOptions } from '@libp2p/interface'

export interface RepeatingTask {
  /**
   * Update the interval after which the next iteration of the task will run.
   *
   * This is useful if, for example, you want to retry a task with a short rest
   * duration until it succeeds, then periodically after that.
   *
   * This only affects the next iteration of the task, if it is currently
   * running, that run will not be interrupted.
   */
  setInterval(ms: number): void

  /**
   * Update the amount of time a task will run before the passed abort signal
   * will fire.
   *
   * * This only affects the next iteration of the task, if it is currently
   * running, that run will not be interrupted.
   */
  setTimeout(ms: number): void

  /**
   * Start the task running
   */
  start(): void

  /**
   * Stop the task running
   */
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
   *
   * @default false
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
    setInterval: (ms) => {
      interval = ms

      // maybe reschedule
      if (timeout != null) {
        clearTimeout(timeout)
        timeout = setTimeout(runTask, interval)
      }
    },
    setTimeout: (ms) => {
      if (options == null) {
        options = {}
      }

      options.timeout = ms
    },
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
