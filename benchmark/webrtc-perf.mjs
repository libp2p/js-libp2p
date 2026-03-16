import { spawn } from 'node:child_process'
import { once } from 'node:events'
import { parseArgs } from 'node:util'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayServer, circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { perf } from '@libp2p/perf'
import { tcp } from '@libp2p/tcp'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { multiaddr } from '@multiformats/multiaddr'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import { createLibp2p } from 'libp2p'

const ONE_MIB = 1024 * 1024
const DEFAULT_TRANSPORTS = ['tcp', 'webrtc-direct', 'webrtc']

const argv = parseArgs({
  allowPositionals: true,
  options: {
    mode: {
      type: 'string',
      default: 'parent'
    },
    transport: {
      type: 'string'
    },
    target: {
      type: 'string'
    },
    'upload-bytes': {
      type: 'string',
      default: '0'
    },
    'download-bytes': {
      type: 'string',
      default: '0'
    },
    'throughput-iterations': {
      type: 'string',
      default: '3'
    },
    'throughput-seconds': {
      type: 'string',
      default: '10'
    },
    'latency-iterations': {
      type: 'string',
      default: '10'
    },
    'webrtc-max-message-size': {
      type: 'string'
    },
    'webrtc-max-buffered-amount': {
      type: 'string'
    },
    transports: {
      type: 'string',
      multiple: true
    }
  }
})

try {
  if (argv.values.mode === 'worker') {
    await runWorker({
      transport: required(argv.values.transport, '--transport is required in worker mode'),
      target: required(argv.values.target, '--target is required in worker mode'),
      uploadBytes: Number(argv.values['upload-bytes']),
      downloadBytes: Number(argv.values['download-bytes'])
    })
  } else {
    await runParent({
      transports: argv.values.transports?.length > 0 ? argv.values.transports : DEFAULT_TRANSPORTS,
      throughputIterations: Number(argv.values['throughput-iterations']),
      throughputSeconds: Number(argv.values['throughput-seconds']),
      latencyIterations: Number(argv.values['latency-iterations']),
      dataChannel: {
        maxMessageSize: optionalNumber(argv.values['webrtc-max-message-size']),
        maxBufferedAmount: optionalNumber(argv.values['webrtc-max-buffered-amount'])
      }
    })
  }

  process.exit(0)
} catch (err) {
  console.error(err)
  process.exit(1)
}

async function runParent (options) {
  const summary = {
    timestamp: new Date().toISOString(),
    cwd: process.cwd(),
    node: process.version,
    config: {
      transports: options.transports,
      throughputIterations: options.throughputIterations,
      throughputSeconds: options.throughputSeconds,
      latencyIterations: options.latencyIterations,
      dataChannel: options.dataChannel
    },
    results: {}
  }

  for (const transport of options.transports) {
    console.error(`\n== ${transport}`)

    const context = await createTransportContext(transport, options.dataChannel)

    try {
      summary.results[transport] = await benchmarkTransport({
        transport,
        target: context.target,
        throughputIterations: options.throughputIterations,
        throughputSeconds: options.throughputSeconds,
        latencyIterations: options.latencyIterations,
        dataChannel: options.dataChannel
      })
    } finally {
      await context.stop()
    }
  }

  console.log(JSON.stringify(summary, null, 2))
}

async function runWorker (options) {
  const node = await createDialer(options.transport)

  const shutdown = async () => {
    try {
      await node.stop()
    } finally {
      process.exit(0)
    }
  }

  process.once('SIGINT', shutdown)
  process.once('SIGTERM', shutdown)

  try {
    for await (const output of node.services.perf.measurePerformance(multiaddr(options.target), options.uploadBytes, options.downloadBytes)) {
      process.stdout.write(`${JSON.stringify(output)}\n`)
    }
  } finally {
    await node.stop()
  }
}

async function benchmarkTransport (options) {
  const upload = []
  const download = []
  const latency = []

  for (let i = 0; i < options.throughputIterations; i++) {
    console.error(`upload iteration ${i + 1}/${options.throughputIterations}`)
    upload.push(await runThroughputIteration({
      transport: options.transport,
      target: options.target,
      uploadBytes: Number.MAX_SAFE_INTEGER,
      downloadBytes: 0,
      timeoutMs: options.throughputSeconds * 1000,
      dataChannel: options.dataChannel
    }))
  }

  for (let i = 0; i < options.throughputIterations; i++) {
    console.error(`download iteration ${i + 1}/${options.throughputIterations}`)
    download.push(await runThroughputIteration({
      transport: options.transport,
      target: options.target,
      uploadBytes: 0,
      downloadBytes: Number.MAX_SAFE_INTEGER,
      timeoutMs: options.throughputSeconds * 1000,
      dataChannel: options.dataChannel
    }))
  }

  for (let i = 0; i < options.latencyIterations; i++) {
    console.error(`latency iteration ${i + 1}/${options.latencyIterations}`)
    latency.push(await runLatencyIteration({
      transport: options.transport,
      target: options.target,
      dataChannel: options.dataChannel
    }))
  }

  return {
    target: options.target,
    upload: summariseBitrates(upload),
    download: summariseBitrates(download),
    latency: summariseLatencies(latency)
  }
}

async function runThroughputIteration (options) {
  const result = await spawnWorker({
    transport: options.transport,
    target: options.target,
    uploadBytes: options.uploadBytes,
    downloadBytes: options.downloadBytes,
    timeoutMs: options.timeoutMs,
    dataChannel: options.dataChannel
  })

  const direction = options.uploadBytes > 0 ? 'uploadBytes' : 'downloadBytes'
  const outputs = result.outputs.filter(output => output.type === 'intermediary' || output.type === 'final')

  let bytes = 0
  let seconds = 0

  for (const output of outputs) {
    if (output[direction] > 0) {
      bytes += output[direction]
      seconds += output.timeSeconds
    }
  }

  if (bytes === 0 || seconds === 0) {
    throw new Error(`No throughput data captured for ${options.transport}: ${result.stderr}`)
  }

  return {
    bitrate: (bytes * 8) / seconds,
    bytes,
    seconds,
    timedOut: result.timedOut
  }
}

async function runLatencyIteration (options) {
  const result = await spawnWorker({
    transport: options.transport,
    target: options.target,
    uploadBytes: 1,
    downloadBytes: 1,
    dataChannel: options.dataChannel
  })

  const finalOutput = result.outputs.find(output => output.type === 'final')

  if (finalOutput == null) {
    throw new Error(`No final latency output captured for ${options.transport}: ${result.stderr}`)
  }

  return finalOutput.timeSeconds
}

async function spawnWorker (options) {
  const child = spawn(process.execPath, [
    new URL(import.meta.url).pathname,
    '--mode=worker',
    `--transport=${options.transport}`,
    `--target=${options.target}`,
    `--upload-bytes=${options.uploadBytes}`,
    `--download-bytes=${options.downloadBytes}`,
    ...(options.dataChannel?.maxMessageSize != null ? [`--webrtc-max-message-size=${options.dataChannel.maxMessageSize}`] : []),
    ...(options.dataChannel?.maxBufferedAmount != null ? [`--webrtc-max-buffered-amount=${options.dataChannel.maxBufferedAmount}`] : [])
  ], {
    stdio: ['ignore', 'pipe', 'pipe']
  })

  const outputs = []
  let stdout = ''
  let stderr = ''
  let timedOut = false

  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')

  child.stdout.on('data', chunk => {
    stdout += chunk
  })

  child.stderr.on('data', chunk => {
    stderr += chunk
  })

  let timeout

  if (options.timeoutMs != null) {
    timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => {
        child.kill('SIGKILL')
      }, 1000).unref()
    }, options.timeoutMs)
  }

  const [code, signal] = await once(child, 'exit')

  clearTimeout(timeout)

  for (const line of stdout.split('\n')) {
    if (line.trim() === '') {
      continue
    }

    outputs.push(JSON.parse(line))
  }

  if (!timedOut && code !== 0) {
    throw new Error(`Worker failed for ${options.transport} with code ${code ?? 'null'} signal ${signal ?? 'null'}\n${stderr}`)
  }

  return {
    outputs,
    stderr,
    timedOut
  }
}

function summariseBitrates (values) {
  const bitrates = values.map(value => value.bitrate)

  return {
    unit: 'bit/s',
    median: median(bitrates),
    min: Math.min(...bitrates),
    max: Math.max(...bitrates),
    samples: values
  }
}

function summariseLatencies (values) {
  return {
    unit: 's',
    median: median(values),
    min: Math.min(...values),
    max: Math.max(...values),
    samples: values
  }
}

function median (values) {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

async function createTransportContext (transport, dataChannel) {
  switch (transport) {
    case 'tcp':
      return createTcpContext()
    case 'webrtc-direct':
      return createWebRTCDirectContext(dataChannel)
    case 'webrtc':
      return createWebRTCContext(dataChannel)
    default:
      throw new Error(`Unsupported transport: ${transport}`)
  }
}

async function createTcpContext () {
  const listener = await createLibp2p({
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/0']
    },
    transports: [tcp()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    services: {
      perf: perf()
    }
  })

  return {
    target: listener.getMultiaddrs()[0].toString(),
    stop: async () => {
      await listener.stop()
    }
  }
}

async function createWebRTCDirectContext (dataChannel) {
  const listener = await createLibp2p({
    addresses: {
      listen: ['/ip4/127.0.0.1/udp/0/webrtc-direct']
    },
    transports: [webRTCDirect({ dataChannel })],
    services: {
      perf: perf()
    }
  })

  const target = listener.getMultiaddrs().find(ma => ma.toString().includes('/webrtc-direct'))

  if (target == null) {
    throw new Error('WebRTC Direct listener did not expose a dialable multiaddr')
  }

  return {
    target: target.toString(),
    stop: async () => {
      await listener.stop()
    }
  }
}

async function createWebRTCContext (dataChannel) {
  const relay = await createLibp2p({
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/0/ws']
    },
    transports: [webSockets()],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      denyDialMultiaddr: async () => false
    },
    services: {
      identify: identify(),
      relay: circuitRelayServer()
    }
  })

  const listener = await createLibp2p({
    addresses: {
      listen: ['/p2p-circuit', '/webrtc']
    },
    transports: [
      webSockets(),
      webRTC({ dataChannel }),
      circuitRelayTransport()
    ],
    connectionEncrypters: [noise()],
    streamMuxers: [yamux()],
    connectionGater: {
      denyDialMultiaddr: async () => false
    },
    services: {
      identify: identify(),
      perf: perf()
    }
  })

  await listener.dial(relay.getMultiaddrs(), {
    signal: AbortSignal.timeout(5000)
  })

  const start = Date.now()
  let target

  while (Date.now() - start < 10_000) {
    target = listener.getMultiaddrs().find(ma => WebRTC.matches(ma))

    if (target != null) {
      break
    }

    await new Promise(resolve => setTimeout(resolve, 200))
  }

  if (target == null) {
    throw new Error('WebRTC listener did not publish a relay-backed webrtc multiaddr')
  }

  return {
    target: target.toString(),
    stop: async () => {
      await listener.stop()
      await relay.stop()
    }
  }
}

async function createDialer (transport) {
  const dataChannel = {
    maxMessageSize: optionalNumber(argv.values['webrtc-max-message-size']),
    maxBufferedAmount: optionalNumber(argv.values['webrtc-max-buffered-amount'])
  }

  switch (transport) {
    case 'tcp':
      return createLibp2p({
        transports: [tcp()],
        connectionEncrypters: [noise()],
        streamMuxers: [yamux()],
        services: {
          perf: perf()
        }
      })
    case 'webrtc-direct':
      return createLibp2p({
        transports: [webRTCDirect({ dataChannel })],
        services: {
          perf: perf()
        }
      })
    case 'webrtc':
      return createLibp2p({
        transports: [
          webSockets(),
          webRTC({ dataChannel }),
          circuitRelayTransport()
        ],
        connectionEncrypters: [noise()],
        streamMuxers: [yamux()],
        connectionGater: {
          denyDialMultiaddr: async () => false
        },
        services: {
          identify: identify(),
          perf: perf()
        }
      })
    default:
      throw new Error(`Unsupported dialer transport: ${transport}`)
  }
}

function required (value, message) {
  if (value == null || value === '') {
    throw new Error(message)
  }

  return value
}

function optionalNumber (value) {
  if (value == null || value === '') {
    return undefined
  }

  return Number(value)
}
