/* eslint-disable no-console */

import { tcp } from '@libp2p/tcp'
import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { createLibp2p, type Libp2pOptions, type Libp2pNode } from 'libp2p'
import { PerfService } from 'libp2p/perf'
import { plaintext } from 'libp2p/insecure'

async function newNode (options: Libp2pOptions): Promise<Libp2pNode> {
  return await createLibp2p({
    ...options
  })
}

async function benchmarkWithOptions (serverOptions: Libp2pOptions, clientOptions: Libp2pOptions) {
  const server = await newNode(serverOptions)
  const client = await newNode(clientOptions)

  const serverPerf = new PerfService(server.components)
  await serverPerf.start()

  const clientPerf = new PerfService(client.components)
  await clientPerf.start()
  await client.dial(server.getMultiaddrs()[0])

  // Warmup
  await clientPerf.measureDownloadBandwidth(server.peerId, 10n << 20n)
  await clientPerf.measureUploadBandwidth(server.peerId, 10n << 20n)

  const downloadBandwidth = await clientPerf.measureDownloadBandwidth(server.peerId, 100n << 20n)
  console.log('Download bandwidth is (mbits/s)', downloadBandwidth >> 20)
  const uploadBandwidth = await clientPerf.measureDownloadBandwidth(server.peerId, 50n << 20n)
  console.log('Upload bandwidth is (mbits/s)', uploadBandwidth >> 20)

  await clientPerf.stop()
  await serverPerf.stop()

  server.stop()
  client.stop()
}

async function run () {
  const testcases = [
    {
      name: 'TCP+mplex+noise',
      baseOptions: {
        transports: [
          tcp()
        ],
        streamMuxers: [
          mplex()
        ],
        connectionEncryption: [
          noise()
        ]
      },
      serverOptions: {
        addresses: {
          listen: ['/ip4/0.0.0.0/tcp/0']
        }
      }
    },
    {
      name: 'TCP+yamux+noise',
      baseOptions: {
        transports: [
          tcp()
        ],
        streamMuxers: [
          yamux()
        ],
        connectionEncryption: [
          noise()
        ]
      },
      serverOptions: {
        addresses: {
          listen: ['/ip4/0.0.0.0/tcp/0']
        }
      }
    },
    {
      name: 'TCP+yamux+plaintext',
      baseOptions: {
        transports: [
          tcp()
        ],
        streamMuxers: [
          yamux()
        ],
        connectionEncryption: [
          plaintext()
        ]
      },
      serverOptions: {
        addresses: {
          listen: ['/ip4/0.0.0.0/tcp/0']
        }
      }
    },
    {
      name: 'TCP+mplex+plaintext',
      baseOptions: {
        transports: [
          tcp()
        ],
        streamMuxers: [
          mplex()
        ],
        connectionEncryption: [
          plaintext()
        ]
      },
      serverOptions: {
        addresses: {
          listen: ['/ip4/0.0.0.0/tcp/0']
        }
      }
    }
  ]

  for (const testcase of testcases) {
    console.log(testcase.name)
    await benchmarkWithOptions({
      ...testcase.baseOptions,
      ...testcase.serverOptions
    }, testcase.baseOptions)
  }
}

void run()
