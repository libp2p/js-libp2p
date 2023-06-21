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
import { identifyService } from 'libp2p/identify'
import { webRTC } from '../src/index.js'
import type { Libp2p } from '@libp2p/interface'
import type { Connection } from '@libp2p/interface/connection'

async function createNode (): Promise<Libp2p> {
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

describe('basics', () => {
  const echo = '/echo/1.0.0'

  let localNode: Libp2p
  let remoteNode: Libp2p

  async function connectNodes (): Promise<Connection> {
    const remoteAddr = remoteNode.getMultiaddrs()
      .filter(ma => WebRTC.matches(ma)).pop()

    if (remoteAddr == null) {
      throw new Error('Remote peer could not listen on relay')
    }

    await remoteNode.handle(echo, ({ stream }) => {
      void pipe(
        stream,
        stream
      )
    })

    const connection = await localNode.dial(remoteAddr)

    // disconnect both from relay
    await localNode.hangUp(multiaddr(process.env.RELAY_MULTIADDR))
    await remoteNode.hangUp(multiaddr(process.env.RELAY_MULTIADDR))

    return connection
  }

  beforeEach(async () => {
    localNode = await createNode()
    remoteNode = await createNode()
  })

  // TODO: Streams are not closing gracefully, re-introduce after https://github.com/libp2p/js-libp2p/issues/1793 is addressed
  // afterEach(async () => {
  //   if (localNode != null) {
  //     await localNode.stop()
  //   }

  //   if (remoteNode != null) {
  //     await remoteNode.stop()
  //   }
  // })

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
