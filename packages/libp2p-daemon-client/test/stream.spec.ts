/* eslint-env mocha */

import { createServer } from '@libp2p/daemon-server'
import { peerIdFromString } from '@libp2p/peer-id'
import { echo, streamPair } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import all from 'it-all'
import { pEvent } from 'p-event'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { createClient } from '../src/index.js'
import type { DaemonClient } from '../src/index.js'
import type { GossipSub } from '@chainsafe/libp2p-gossipsub'
import type { Libp2pServer } from '@libp2p/daemon-server'
import type { Connection, Libp2p, PeerStore } from '@libp2p/interface'
import type { KadDHT } from '@libp2p/kad-dht'
import type { StubbedInstance } from 'sinon-ts'

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

    const [outboundStream, inboundStream] = await streamPair({
      protocol
    })

    // echo all bytes back to the sender
    void echo(inboundStream)

    const peerB = peerIdFromString('12D3KooWJKCJW8Y26pRFNv78TCMGLNTfyN8oKaFswMRYXTzSbSsb')

    const peerAToPeerB = stubInterface<Connection>({
      newStream: async () => {
        return outboundStream
      }
    })

    libp2p.dial.withArgs(peerB).resolves(peerAToPeerB)

    const stream = await client.openStream(peerB, protocol)
    const dataPromise = all(stream)

    stream.send(uint8ArrayFromString('hello world'))

    await Promise.all([
      pEvent(inboundStream, 'close'),
      stream.closeWrite()
    ])

    const data = await dataPromise

    expect(data).to.have.lengthOf(1)
    expect(uint8ArrayToString(data[0].subarray())).to.equal('hello world')
  })
})
