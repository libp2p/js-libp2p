/* eslint-disable @typescript-eslint/no-unused-expressions */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { webSockets } from '@libp2p/websockets'
import * as filter from '@libp2p/websockets/filters'
import { WebRTC } from '@multiformats/mafmt'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import map from 'it-map'
import { pipe } from 'it-pipe'
import { createLibp2p } from 'libp2p'
import { circuitRelayTransport } from 'libp2p/circuit-relay'
import { identifyService } from 'libp2p/identify'
import { webRTC } from '../src/index.js'
import type { Libp2p } from '@libp2p/interface-libp2p'

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
  let localNode: Libp2p
  let remoteNode: Libp2p

  beforeEach(async () => {
    localNode = await createNode()
    remoteNode = await createNode()
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
    const remoteAddr = remoteNode.getMultiaddrs()
      .filter(ma => WebRTC.matches(ma)).pop()

    if (remoteAddr == null) {
      throw new Error('Remote peer could not listen on relay')
    }

    const echo = '/echo/1.0.0'

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

    // open a stream on the echo protocol
    const stream = await connection.newStream(echo)

    // send and receive some data
    const input = new Array(5).fill(0).map(() => new Uint8Array(10))
    const output = await pipe(
      input,
      stream,
      (source) => map(source, list => list.subarray()),
      async (source) => all(source)
    )

    // asset that we got the right data
    expect(output).to.deep.equal(input)
  })
})
