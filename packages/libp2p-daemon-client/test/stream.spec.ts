/* eslint-env mocha */

import { createServer, type Libp2pServer } from '@libp2p/daemon-server'
import { mockRegistrar, connectionPair } from '@libp2p/interface-compliance-tests/mocks'
import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { pipe } from 'it-pipe'
import sinon from 'sinon'
import { type StubbedInstance, stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { createClient, type DaemonClient } from '../src/index.js'
import type { GossipSub } from '@chainsafe/libp2p-gossipsub'
import type { Libp2p } from '@libp2p/interface'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { KadDHT } from '@libp2p/kad-dht'

const defaultMultiaddr = multiaddr('/ip4/0.0.0.0/tcp/0')

describe('daemon stream client', function () {
  this.timeout(50e3)

  let libp2p: StubbedInstance<Libp2p<{ dht: KadDHT, pubsub: GossipSub }>>
  let server: Libp2pServer
  let client: DaemonClient

  beforeEach(async function () {
    libp2p = stubInterface<Libp2p<{ dht: KadDHT, pubsub: GossipSub }>>()
    libp2p.peerStore = stubInterface<PeerStore>()

    server = createServer(defaultMultiaddr, libp2p)

    await server.start()

    client = createClient(server.getMultiaddr())
  })

  afterEach(async () => {
    if (server != null) {
      await server.stop()
    }

    sinon.restore()
  })

  it('should be able to open a stream, write to it and a stream handler, should handle the message', async () => {
    const protocol = '/echo/1.0.0'

    const peerA = peerIdFromString('12D3KooWJKCJW8Y26pRFNv78TCMGLNTfyN8oKaFswMRYXTzSbSsa')
    const registrarA = mockRegistrar()
    await registrarA.handle(protocol, (data) => {
      void pipe(
        data.stream,
        data.stream
      )
    })

    const peerB = peerIdFromString('12D3KooWJKCJW8Y26pRFNv78TCMGLNTfyN8oKaFswMRYXTzSbSsb')
    const registrarB = mockRegistrar()
    await registrarB.handle(protocol, (data) => {
      void pipe(
        data.stream,
        data.stream
      )
    })

    const [peerAtoPeerB] = connectionPair({
      peerId: peerA,
      registrar: registrarA
    }, {
      peerId: peerB,
      registrar: registrarB
    }
    )

    libp2p.dial.withArgs(peerB).resolves(peerAtoPeerB)

    const stream = await client.openStream(peerB, protocol)

    const data = await pipe(
      [uint8ArrayFromString('hello world')],
      stream,
      async (source) => all(source)
    )

    expect(data).to.have.lengthOf(1)
    expect(uint8ArrayToString(data[0].subarray())).to.equal('hello world')
  })
})
