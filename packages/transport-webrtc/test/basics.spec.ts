/* eslint-disable @typescript-eslint/no-unused-expressions */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import * as filter from '@libp2p/websockets/filters'
import { WebRTC } from '@multiformats/mafmt'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import map from 'it-map'
import { pipe } from 'it-pipe'
import toBuffer from 'it-to-buffer'
import { createLibp2p } from 'libp2p'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import pDefer from 'p-defer'
import { webRTC } from '../src/index.js'
import type { Libp2p } from '@libp2p/interface'
import type { Connection } from '@libp2p/interface/connection'
import type { StreamHandler } from '@libp2p/interface/stream-handler'

export async function createRelayNode (): Promise<Libp2p> {
  return createLibp2p({
    addresses: {
      listen: [
        '/webrtc',
        `${process.env.RELAY_MULTIADDR}/p2p-circuit`
      ]
    },
    transports: [
      webSockets({
        filter: filter.all
      }),
      circuitRelayTransport(),
      webRTC()
    ],
    connectionEncryption: [
      noise()
    ],
    streamMuxers: [
      yamux()
    ],
    connectionGater: {
      denyDialMultiaddr: () => false
    },
    connectionManager: {
      minConnections: 0
    }
  })
}

describe('basics', () => {
  const echo = '/echo/1.0.0'

  let localNode: Libp2p
  let remoteNode: Libp2p
  let streamHandler: StreamHandler

  async function connectNodes (): Promise<Connection> {
    const remoteAddr = remoteNode.getMultiaddrs()
      .filter(ma => WebRTC.matches(ma)).pop()

    if (remoteAddr == null) {
      throw new Error('Remote peer could not listen on relay')
    }

    await remoteNode.handle(echo, (info) => {
      streamHandler(info)
    }, {
      runOnTransientConnection: true
    })

    const connection = await localNode.dial(remoteAddr)

    // disconnect both from relay
    await localNode.hangUp(multiaddr(process.env.RELAY_MULTIADDR))
    await remoteNode.hangUp(multiaddr(process.env.RELAY_MULTIADDR))

    return connection
  }

  beforeEach(async () => {
    streamHandler = ({ stream }) => {
      void pipe(
        stream,
        stream
      )
    }

    localNode = await createRelayNode()
    remoteNode = await createRelayNode()
  })

  afterEach(async () => {
    if (localNode != null) {
      await localNode.stop()
    }

    if (remoteNode != null) {
      await remoteNode.stop()
    }
  })

  it('can dial through a relay', async () => {
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

  it('can send a large file', async () => {
    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo, {
      runOnTransientConnection: true
    })

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

  it('can close local stream for reading but send a large file', async () => {
    let output: Uint8Array = new Uint8Array(0)
    const streamClosed = pDefer()

    streamHandler = ({ stream }) => {
      void Promise.resolve().then(async () => {
        output = await toBuffer(map(stream.source, (buf) => buf.subarray()))
        await stream.close()
        streamClosed.resolve()
      })
    }

    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo, {
      runOnTransientConnection: true
    })

    // close for reading
    await stream.closeRead()

    // send some data
    const input = new Array(5).fill(0).map(() => new Uint8Array(1024 * 1024))

    await stream.sink(input)
    await stream.close()

    // wait for remote to receive all data
    await streamClosed.promise

    // asset that we got the right data
    expect(output).to.equalBytes(toBuffer(input))
  })

  it('can close local stream for writing but receive a large file', async () => {
    const input = new Array(5).fill(0).map(() => new Uint8Array(1024 * 1024))

    streamHandler = ({ stream }) => {
      void Promise.resolve().then(async () => {
        // send some data
        await stream.sink(input)
        await stream.close()
      })
    }

    const connection = await connectNodes()

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo, {
      runOnTransientConnection: true
    })

    // close for reading
    await stream.closeWrite()

    // receive some data
    const output = await toBuffer(map(stream.source, (buf) => buf.subarray()))

    await stream.close()

    // asset that we got the right data
    expect(output).to.equalBytes(toBuffer(input))
  })
})
