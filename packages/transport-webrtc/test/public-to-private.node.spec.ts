/* eslint-disable @typescript-eslint/no-unused-expressions */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { WebRTCDirect } from '@multiformats/mafmt'
import { expect } from 'aegir/chai'
import map from 'it-map'
import { pipe } from 'it-pipe'
import toBuffer from 'it-to-buffer'
import { createLibp2p } from 'libp2p'
import { identifyService } from 'libp2p/identify'
import { webRTCDirect } from '../src/index.js'
import type { Libp2p } from '@libp2p/interface'
import type { Connection } from '@libp2p/interface/connection'

async function createPublicNode (): Promise<Libp2p> {
  return createLibp2p({
    addresses: {
      listen: [
        '/ip4/0.0.0.0/udp/0/webrtc-direct'
      ]
    },
    transports: [
      webRTCDirect()
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux()
    ],
    services: {
      identify: identifyService()
    },
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    connectionManager: {
      minConnections: 0
    }
  })
}

async function createPrivateNode (): Promise<Libp2p> {
  return createLibp2p({
    transports: [
      webRTCDirect()
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux()
    ],
    services: {
      identify: identifyService()
    },
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    connectionManager: {
      minConnections: 0
    }
  })
}

describe.only('WebRTCDirect basics', () => {
  const echo = '/echo/1.0.0'

  let localNode: Libp2p
  let remoteNode: Libp2p

  async function connectNodes (): Promise<Connection> {
    const remoteAddr = remoteNode.getMultiaddrs()
      .filter(ma => WebRTCDirect.matches(ma)).pop()

    if (remoteAddr == null) {
      throw new Error('Remote peer could not listen on relay')
    }

    await remoteNode.handle(echo, ({ stream }) => {
      void pipe(
        stream,
        stream
      )
    })

    return await localNode.dial(remoteAddr)
  }

  beforeEach(async () => {
    localNode = await createPrivateNode()
    remoteNode = await createPublicNode()
  })

  afterEach(async () => {
    if (localNode != null) {
      await localNode.stop()
    }

    if (remoteNode != null) {
      await remoteNode.stop()
    }
  })

  it('can dial a private node', async () => {
    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo)

    // send and receive some data
    const input = new Array(5).fill(0).map(() => new Uint8Array(10))
    const output = await pipe(
      input,
      stream,
      (source) => map(source, list => list.subarray()),
      async (source) => toBuffer(source)
    )

    // asset that we got the right data
    expect(output).to.equalBytes(toBuffer(input))
  })

  it('can send a large file to a private node', async () => {
    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo)

    // send and receive some data
    const input = new Array(5).fill(0).map(() => new Uint8Array(1024 * 1024))
    const output = await pipe(
      input,
      stream,
      (source) => map(source, list => list.subarray()),
      async (source) => toBuffer(source)
    )

    // asset that we got the right data
    expect(output).to.equalBytes(toBuffer(input))
  })
})
