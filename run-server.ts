/* eslint-disable no-console */
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { tcp } from '@libp2p/tcp'
import { createLibp2p, type Libp2p } from 'libp2p'
import { perf, type Perf } from '../src/index.js'

async function createNode (): Promise<Libp2p<{ perf: Perf }>> {
  return createLibp2p({
    addresses: {
      listen: [
        '/ip4/0.0.0.0/tcp/59032'
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
        writeBlockSize: 1024 * 1024
      })
    },
    connectionManager: {
      minConnections: 0
    }
  })
}

const server = await createNode()

console.info(server.getMultiaddrs())
