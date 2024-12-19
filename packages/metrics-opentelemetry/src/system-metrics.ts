import { readdirSync, readFileSync } from 'node:fs'
import { statfs } from 'node:fs/promises'
import { totalmem } from 'node:os'
import { monitorEventLoopDelay, PerformanceObserver, constants as PerfHooksConstants } from 'node:perf_hooks'
import { getHeapSpaceStatistics } from 'node:v8'
import type { Metrics } from '@libp2p/interface'

export interface SystemMetricsOptions {
  statfsLocation?: string
}

export function collectSystemMetrics (metrics: Metrics, init?: SystemMetricsOptions): void {
  metrics.registerMetricGroup('nodejs_memory_usage_bytes', {
    label: 'memory',
    calculate: () => {
      return {
        ...process.memoryUsage()
      }
    }
  })
  const totalMemoryMetric = metrics.registerMetric('nodejs_memory_total_bytes')
  totalMemoryMetric.update(totalmem())

  metrics.registerMetricGroup('nodejs_fs_usage_bytes', {
    label: 'filesystem',
    calculate: async () => {
      const stats = await statfs(init?.statfsLocation ?? process.cwd())
      const total = stats.bsize * stats.blocks
      const available = stats.bsize * stats.bavail

      return {
        total,
        free: stats.bsize * stats.bfree,
        available,
        used: (available / total) * 100
      }
    }
  })

  collectProcessCPUMetrics(metrics)
  collectProcessStartTime(metrics)
  collectMemoryHeap(metrics)
  collectOpenFileDescriptors(metrics)
  collectMaxFileDescriptors(metrics)
  collectEventLoopStats(metrics)
  collectProcessResources(metrics)
  collectProcessHandles(metrics)
  collectProcessRequests(metrics)
  collectHeapSizeAndUsed(metrics)
  collectHeapSpacesSizeAndUsed(metrics)
  collectNodeVersion(metrics)
  collectGcStats(metrics)
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/processCpuTotal.js
 */
function collectProcessCPUMetrics (metrics: Metrics): void {
  let lastCpuUsage = process.cpuUsage()
  const cpuUserSecondsTotal = metrics.registerCounter('process_cpu_user_seconds_total', {
    help: 'Total user CPU time spent in seconds.'
  })
  const cpuSystemSecondsTotal = metrics.registerCounter('process_cpu_system_seconds_total', {
    help: 'Total system CPU time spent in seconds.'
  })

  metrics.registerCounter('process_cpu_seconds_total', {
    help: 'Total user and system CPU time spent in seconds.',
    calculate: () => {
      const cpuUsage = process.cpuUsage()
      const userUsageMicros = cpuUsage.user - lastCpuUsage.user
      const systemUsageMicros = cpuUsage.system - lastCpuUsage.system
      lastCpuUsage = cpuUsage

      cpuUserSecondsTotal.increment(userUsageMicros / 1e6)
      cpuSystemSecondsTotal.increment(systemUsageMicros / 1e6)

      return (userUsageMicros + systemUsageMicros) / 1e6
    }
  })
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/processStartTime.js
 */
function collectProcessStartTime (metrics: Metrics): void {
  const metric = metrics.registerMetric('process_start_time_seconds', {
    help: 'Start time of the process since unix epoch in seconds.'
  })

  metric.update(Math.round(Date.now() / 1000 - process.uptime()))
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/osMemoryHeap.js
 */
function collectMemoryHeap (metrics: Metrics): void {
  metrics.registerMetric('process_resident_memory_bytes', {
    help: 'Resident memory size in bytes.',
    calculate: () => {
      try {
        return process.memoryUsage().rss
      } catch {}
      return 0
    }
  })
  metrics.registerMetric('process_virtual_memory_bytes', {
    help: 'Virtual memory size in bytes.',
    calculate: () => {
      // this involves doing sync io in prom-client so skip it
      // https://github.com/siimon/prom-client/blob/c1d76c5d497ef803f6bd90c56c713c3fa811c3e0/lib/metrics/osMemoryHeapLinux.js#L53C5-L54C52
      return 0
    }
  })
  metrics.registerMetric('process_heap_bytes', {
    help: 'Process heap size in bytes.',
    calculate: () => {
      try {
        return process.memoryUsage().heapTotal
      } catch {}
      return 0
    }
  })
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/processOpenFileDescriptors.js
 */
function collectOpenFileDescriptors (metrics: Metrics): void {
  if (process.platform !== 'linux') {
    return
  }

  metrics.registerMetric('process_open_fds', {
    help: 'Number of open file descriptors.',
    calculate: () => {
      try {
        const fds = readdirSync('/proc/self/fd')
        // Minus 1 to not count the fd that was used by readdirSync(),
        // it's now closed.
        return fds.length - 1
      } catch {}

      return 0
    }
  })
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/processMaxFileDescriptors.js
 */
function collectMaxFileDescriptors (metrics: Metrics): void {
  let maxFds: number | undefined

  // This will fail if a linux-like procfs is not available.
  try {
    const limits = readFileSync('/proc/self/limits', 'utf8')
    const lines = limits.split('\n')
    for (const line of lines) {
      if (line.startsWith('Max open files')) {
        const parts = line.split(/  +/)
        maxFds = Number(parts[1])
        break
      }
    }
  } catch {
    return
  }

  if (maxFds == null) {
    return
  }

  const metric = metrics.registerMetric('process_max_fds', {
    help: 'Maximum number of open file descriptors.'
  })
  metric.update(maxFds)
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/eventLoopLag.js
 */
function collectEventLoopStats (metrics: Metrics): void {
  try {
    const histogram = monitorEventLoopDelay()
    histogram.enable()

    metrics.registerMetric('nodejs_eventloop_lag_seconds', {
      help: 'Lag of event loop in seconds.',
      calculate: async () => {
        const start = process.hrtime()

        return new Promise<number>(resolve => {
          setImmediate(() => {
            const delta = process.hrtime(start)
            const nanosec = delta[0] * 1e9 + delta[1]
            const seconds = nanosec / 1e9

            lagMin.update(histogram.min / 1e9)
            lagMax.update(histogram.max / 1e9)
            lagMean.update(histogram.mean / 1e9)
            lagStddev.update(histogram.stddev / 1e9)
            lagP50.update(histogram.percentile(50) / 1e9)
            lagP90.update(histogram.percentile(90) / 1e9)
            lagP99.update(histogram.percentile(99) / 1e9)

            histogram.reset()

            resolve(seconds)
          })
        })
      }
    })
    const lagMin = metrics.registerMetric('nodejs_eventloop_lag_min_seconds', {
      help: 'The minimum recorded event loop delay.'
    })
    const lagMax = metrics.registerMetric('nodejs_eventloop_lag_max_seconds', {
      help: 'The maximum recorded event loop delay.'
    })
    const lagMean = metrics.registerMetric('nodejs_eventloop_lag_mean_seconds', {
      help: 'The mean of the recorded event loop delays.'
    })
    const lagStddev = metrics.registerMetric('nodejs_eventloop_lag_stddev_seconds', {
      help: 'The standard deviation of the recorded event loop delays.'
    })
    const lagP50 = metrics.registerMetric('nodejs_eventloop_lag_p50_seconds', {
      help: 'The 50th percentile of the recorded event loop delays.'
    })
    const lagP90 = metrics.registerMetric('nodejs_eventloop_lag_p90_seconds', {
      help: 'The 90th percentile of the recorded event loop delays.'
    })
    const lagP99 = metrics.registerMetric('nodejs_eventloop_lag_p99_seconds', {
      help: 'The 99th percentile of the recorded event loop delays.'
    })
  } catch (err: any) {
    if (err.code === 'ERR_NOT_IMPLEMENTED') {
      return // Bun
    }

    throw err
  }
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/processResources.js
 */
function collectProcessResources (metrics: Metrics): void {
  // Don't do anything if the function does not exist in previous nodes (exists in node@17.3.0)
  if (typeof process.getActiveResourcesInfo !== 'function') {
    return
  }

  metrics.registerMetricGroup('nodejs_active_resources', {
    help: 'Number of active resources that are currently keeping the event loop alive, grouped by async resource type.',
    label: 'type',
    calculate: () => {
      const resources = process.getActiveResourcesInfo()

      const data: Record<string, number> = {}

      for (let i = 0; i < resources.length; i++) {
        const resource = resources[i]

        if (Object.hasOwn(data, resource)) {
          data[resource] += 1
        } else {
          data[resource] = 1
        }
      }

      return data
    }
  })

  metrics.registerMetric('nodejs_active_resources_total', {
    help: 'Total number of active resources.',
    calculate: () => {
      const resources = process.getActiveResourcesInfo()

      return resources.length
    }
  })
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/processHandles.js
 */
function collectProcessHandles (metrics: Metrics): void {
  // Don't do anything if the function is removed in later nodes (exists in node@6-12...)
  // @ts-expect-error not part of the public API
  if (typeof process._getActiveHandles !== 'function') {
    return
  }

  metrics.registerMetricGroup('nodejs_active_handles', {
    help: 'Number of active libuv handles grouped by handle type. Every handle type is C++ class name.',
    label: 'type',
    calculate: () => {
      // @ts-expect-error not part of the public API
      const resources = process._getActiveHandles()

      const data: Record<string, number> = {}

      for (let i = 0; i < resources.length; i++) {
        const listElement = resources[i]

        if (listElement == null || typeof listElement.constructor === 'undefined') {
          continue
        }

        if (Object.hasOwnProperty.call(data, listElement.constructor.name)) {
          data[listElement.constructor.name] += 1
        } else {
          data[listElement.constructor.name] = 1
        }
      }

      return data
    }
  })

  metrics.registerMetric('nodejs_active_handles_total', {
    help: 'Total number of active handles.',
    calculate: () => {
      // @ts-expect-error not part of the public API
      const resources = process._getActiveHandles()

      return resources.length
    }
  })
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/processRequests.js
 */
function collectProcessRequests (metrics: Metrics): void {
  // Don't do anything if the function is removed in later nodes (exists in node@6)
  // @ts-expect-error not part of the public API
  if (typeof process._getActiveRequests !== 'function') {
    return
  }

  metrics.registerMetricGroup('nodejs_active_requests', {
    help: 'Number of active libuv requests grouped by request type. Every request type is C++ class name.',
    label: 'type',
    calculate: () => {
      // @ts-expect-error not part of the public API
      const resources = process._getActiveRequests()

      const data: Record<string, number> = {}

      for (let i = 0; i < resources.length; i++) {
        const listElement = resources[i]

        if (listElement == null || typeof listElement.constructor === 'undefined') {
          continue
        }

        if (Object.hasOwnProperty.call(data, listElement.constructor.name)) {
          data[listElement.constructor.name] += 1
        } else {
          data[listElement.constructor.name] = 1
        }
      }

      return data
    }
  })

  metrics.registerMetric('nodejs_active_requests_total', {
    help: 'Total number of active requests.',
    calculate: () => {
      // @ts-expect-error not part of the public API
      const resources = process._getActiveRequests()

      return resources.length
    }
  })
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/heapSizeAndUsed.js
 */
function collectHeapSizeAndUsed (metrics: Metrics): void {
  const heapSizeUsed = metrics.registerMetric('nodejs_heap_size_used_bytes', {
    help: 'Process heap size used from Node.js in bytes.'
  })
  const externalMemUsed = metrics.registerMetric('nodejs_external_memory_bytes', {
    help: 'Node.js external memory size in bytes.'
  })

  metrics.registerMetric('nodejs_heap_size_total_bytes', {
    help: 'Process heap size from Node.js in bytes.',
    calculate: () => {
      try {
        const memUsage = process.memoryUsage()

        heapSizeUsed.update(memUsage.heapUsed)
        if (memUsage.external !== undefined) {
          externalMemUsed.update(memUsage.external)
        }

        return memUsage.heapTotal
      } catch {}

      return 0
    }
  })
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/heapSpacesSizeAndUsed.js
 */
function collectHeapSpacesSizeAndUsed (metrics: Metrics): void {
  try {
    getHeapSpaceStatistics()
  } catch (err: any) {
    if (err.code === 'ERR_NOT_IMPLEMENTED') {
      return // Bun
    }
    throw err
  }

  const used = metrics.registerMetricGroup('nodejs_heap_space_size_used_bytes', {
    help: 'Process heap space size used from Node.js in bytes.',
    label: 'space'
  })
  const available = metrics.registerMetricGroup('nodejs_heap_space_size_available_bytes', {
    help: 'Process heap space size available from Node.js in bytes.',
    label: 'space'
  })

  metrics.registerMetricGroup('nodejs_heap_space_size_total_bytes', {
    help: 'Process heap space size total from Node.js in bytes.',
    label: 'space',
    calculate: () => {
      const data: Record<string, number> = {}

      for (const space of getHeapSpaceStatistics()) {
        const spaceName = space.space_name.substr(0, space.space_name.indexOf('_space'))

        used.update({
          [spaceName]: space.space_used_size
        })

        available.update({
          [spaceName]: space.space_available_size
        })

        data[spaceName] = space.space_size
      }

      return data
    }
  })
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/version.js
 */
function collectNodeVersion (metrics: Metrics): void {
  const metric = metrics.registerMetricGroup('nodejs_version_info', {
    help: 'Node.js version info.'
  })

  const version = process.version
  const versionSegments = version.slice(1).split('.').map(Number)

  // @ts-expect-error use internal API to get same result as prom-client
  metric.gauge.record(1, {
    version,
    major: versionSegments[0],
    minor: versionSegments[1],
    patch: versionSegments[2]
  })
}

/**
 * @see https://github.com/siimon/prom-client/blob/master/lib/metrics/gc.js
 */
function collectGcStats (metrics: Metrics): void {
  const histogram = metrics.registerHistogramGroup('nodejs_gc_duration_seconds_bucket', {
    buckets: [0.001, 0.01, 0.1, 1, 2, 5],
    label: 'kind'
  })

  const kinds: string[] = []
  kinds[PerfHooksConstants.NODE_PERFORMANCE_GC_MAJOR] = 'major'
  kinds[PerfHooksConstants.NODE_PERFORMANCE_GC_MINOR] = 'minor'
  kinds[PerfHooksConstants.NODE_PERFORMANCE_GC_INCREMENTAL] = 'incremental'
  kinds[PerfHooksConstants.NODE_PERFORMANCE_GC_WEAKCB] = 'weakcb'

  const obs = new PerformanceObserver(list => {
    const entry = list.getEntries()[0]
    // @ts-expect-error types are incomplete
    const kind = kinds[entry.detail.kind]
    // Convert duration from milliseconds to seconds
    histogram.observe({
      [kind]: entry.duration / 1000
    })
  })

  obs.observe({ entryTypes: ['gc'] })
}
