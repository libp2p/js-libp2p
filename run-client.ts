/* eslint-disable no-console */
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import { multiaddr } from '@multiformats/multiaddr'
import { createLibp2p, type Libp2p } from 'libp2p'
import { perf, type PerfOutput, type Perf } from '../src/index.js'

const ONE_MEG = 1024 * 1024
const DOWNLOAD_BYTES = ONE_MEG * 1024 * 5

async function createNode (): Promise<Libp2p<{ perf: Perf }>> {
  return createLibp2p({
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
        writeBlockSize: 1024 * 1024
      })
    },
    connectionManager: {
      minConnections: 0
    }
  })
}

const libp2p1 = await createNode()

let last: PerfOutput | undefined

const ma = multiaddr('/ip4/127.0.0.1/tcp/59032')

for await (const output of libp2p1.services.perf.measurePerformance(ma, 0, DOWNLOAD_BYTES)) {
  last = output
  console.info(output)

  console.info((output.downloadBytes / (1024 * 1024)) / output.timeSeconds, 'MB/s')
}

if (last?.type === 'final') {
  console.info((last.downloadBytes / (1024 * 1024)) / last.timeSeconds, 'MB/s')
}

await libp2p1.stop()

// plaintext/yamux - 1354 MB/s
// plaintext/mplex - 34478 MB/s
// noise/yamux - 60 MB/s
// noise/mplex - 62 MB/s

// noise/yamux/native crypto - 282 MB/s
// noise/mplex/native crypto - 420 MB/s
