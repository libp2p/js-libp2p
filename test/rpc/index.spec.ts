/* eslint-env mocha */

import { expect } from 'aegir/utils/chai.js'
import pDefer from 'p-defer'
import { pipe } from 'it-pipe'
import * as lp from 'it-length-prefixed'
import all from 'it-all'
import { Message, MESSAGE_TYPE } from '../../src/message/index.js'
import { RPC } from '../../src/rpc/index.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { createPeerId } from '../utils/create-peer-id.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { PeerStore } from '@libp2p/interfaces/peer-store'
import { createPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core'
import Sinon, { SinonStubbedInstance } from 'sinon'
import { Providers } from '../../src/providers.js'
import { PeerRouting } from '../../src/peer-routing/index.js'
import type { Validators } from '@libp2p/interfaces/dht'
import type { Datastore } from 'interface-datastore'
import { RoutingTable } from '../../src/routing-table/index.js'
import type { Duplex } from 'it-stream-types'
import { CustomEvent } from '@libp2p/interfaces'
import { mockStream, mockConnection, mockMultiaddrConnection } from '@libp2p/interface-compliance-tests/mocks'

describe('rpc', () => {
  let peerId: PeerId
  let otherPeerId: PeerId
  let rpc: RPC
  let peerStore: PeerStore
  let providers: SinonStubbedInstance<Providers>
  let peerRouting: SinonStubbedInstance<PeerRouting>
  let validators: Validators
  let datastore: Datastore
  let routingTable: RoutingTable

  beforeEach(async () => {
    peerId = await createPeerId()
    otherPeerId = await createPeerId()
    datastore = new MemoryDatastore()
    peerStore = createPeerStore({
      peerId,
      datastore
    })
    providers = Sinon.createStubInstance(Providers)
    peerRouting = Sinon.createStubInstance(PeerRouting)
    routingTable = Sinon.createStubInstance(RoutingTable)
    validators = {}

    rpc = new RPC({
      peerId,
      routingTable,
      keyBook: peerStore.keyBook,
      addressBook: peerStore.addressBook,
      providers,
      peerRouting,
      datastore,
      validators,
      lan: false
    })
  })

  it('calls back with the response', async () => {
    const defer = pDefer()
    const msg = new Message(MESSAGE_TYPE.GET_VALUE, uint8ArrayFromString('hello'), 5)

    const validateMessage = (res: Uint8Array[]) => {
      const msg = Message.deserialize(res[0])
      expect(msg).to.have.property('key').eql(uint8ArrayFromString('hello'))
      expect(msg).to.have.property('closerPeers').eql([])
      defer.resolve()
    }

    const source = await pipe(
      [msg.serialize()],
      lp.encode(),
      async (source) => await all(source)
    )

    const duplexStream: Duplex<Uint8Array> = {
      source,
      sink: async (source) => {
        const res = await pipe(
          source,
          lp.decode(),
          async (source) => await all(source)
        )
        validateMessage(res)
      }
    }

    await rpc.onIncomingStream(new CustomEvent('incomingStream', {
      detail: {
        protocol: 'protocol',
        stream: mockStream(duplexStream),
        connection: await mockConnection(mockMultiaddrConnection(duplexStream, otherPeerId))
      }
    }))

    return await defer.promise
  })
})
