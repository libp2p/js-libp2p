/* eslint-disable no-console */
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import last from 'it-last'
import { createLibp2p, type Libp2p } from 'libp2p'
import { perf, type PerfOutput, type Perf } from '../src/index.js'

const ONE_MEG = 1024 * 1024
const DOWNLOAD_BYTES = ONE_MEG * 1024 * 5
const REPEAT = 10

// plaintext/yamux - 1354 MB/s
// plaintext/mplex - 34478 MB/s
// noise/yamux - 60 MB/s
// noise/mplex - 62 MB/s

// noise/yamux/native crypto - 282 MB/s
// noise/mplex/native crypto - 420 MB/s

const sizes = [
  64, 128, 256, 384, 512, 640, 768, 896, 1024, 1152, 1280, 1408, 1536
]

for (let i = 0; i < sizes.length; i++) {
  const size = sizes[i]

  const measurements: PerfOutput[] = []

  for (let n = 0; n < REPEAT; n++) {
    async function createNode (): Promise<Libp2p<{ perf: Perf }>> {
      return createLibp2p({
        addresses: {
          listen: [
            '/ip4/0.0.0.0/tcp/0'
          ]
        },
        transports: [
          tcp()
        ],
        connectionEncryption: [
          noise(), plaintext()
        ],
        streamMuxers: [
          yamux(), mplex()
        ],
        services: {
          perf: perf({
            writeBlockSize: size * 1024
          })
        },
        connectionManager: {
          minConnections: 0
        }
      })
    }

    const libp2p1 = await createNode()
    const libp2p2 = await createNode()

    const result = await last(
      libp2p1.services.perf.measurePerformance(libp2p2.getMultiaddrs()[0], 0, DOWNLOAD_BYTES)
    )

    if (result != null) {
      measurements.push(result)
    }

    await libp2p1.stop()
    await libp2p2.stop()
  }

  const downloadBytes = measurements
    .map(m => {
      if (m.type === 'final') {
        return m.downloadBytes
      }

      return 0
    })
    .filter(outliers())
    .reduce((acc, curr) => acc + curr, 0)

  const timeSeconds = measurements
    .map(m => {
      if (m.type === 'final') {
        return m.timeSeconds
      }

      return 0
    })
    .filter(outliers())
    .reduce((acc, curr) => acc + curr, 0)

  console.info(size, 'kb', (downloadBytes / (1024 * 1024)) / timeSeconds, 'MB/s')
}

function outliers() {
  let o: number[]

  return function(v: number, i: number, a: number[]) {
    if (o == null) {
      o = calc(a)
    }

    return !~o.indexOf(v);
  }
}

function calc(arr: number[]): number[] {
  arr = arr.slice(0);

  arr = arr.sort(function(a, b) {
    return a - b;
  });

  var len = arr.length;
  var middle = median(arr);
  var range = iqr(arr);
  var outliers = [];

  for (var i = 0; i < len; i++) {
    Math.abs(arr[i] - middle) > range && outliers.push(arr[i]);
  }

  return outliers;
}

function median(arr: number[]): number {
  var len = arr.length;
  var half = ~~(len / 2);

  return len % 2
    ? arr[half]
    : (arr[half - 1] + arr[half]) / 2;
}

function iqr(arr: number[]): number {
  var len = arr.length;
  var q1 = median(arr.slice(0, ~~(len / 2)));
  var q3 = median(arr.slice(Math.ceil(len / 2)));
  var g = 1.5;

  return (q3 - q1) * g;
}
