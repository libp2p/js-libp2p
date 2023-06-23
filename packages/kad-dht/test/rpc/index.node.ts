/* eslint-env mocha */

import { EventEmitter } from '@libp2p/interface/events'
import { start } from '@libp2p/interface/startable'
import { mockStream } from '@libp2p/interface-compliance-tests/mocks'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { bytesTransform, lengthPrefixedEncoderTransform, pbReader, readableStreamFromArray, pbEncoderTransform } from '@libp2p/utils/stream'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import pDefer from 'p-defer'
import Sinon, { type SinonStubbedInstance } from 'sinon'
import { stubInterface } from 'ts-sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message, MESSAGE_TYPE } from '../../src/message/index.js'
import { PeerRouting } from '../../src/peer-routing/index.js'
import { Providers } from '../../src/providers.js'
import { RoutingTable } from '../../src/routing-table/index.js'
import { RPC, type RPCComponents } from '../../src/rpc/index.js'
import { createPeerId } from '../utils/create-peer-id.js'
import type { Validators } from '../../src/index.js'
import type { Libp2pEvents } from '@libp2p/interface'
import type { ByteStream, Connection } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { Datastore } from 'interface-datastore'

describe('rpc', () => {
  let peerId: PeerId
  let rpc: RPC
  let providers: SinonStubbedInstance<Providers>
  let peerRouting: SinonStubbedInstance<PeerRouting>
  let validators: Validators
  let datastore: Datastore
  let routingTable: RoutingTable

  beforeEach(async () => {
    peerId = await createPeerId()
    datastore = new MemoryDatastore()

    const components: RPCComponents = {
      peerId,
      datastore,
      peerStore: stubInterface<PeerStore>(),
      addressManager: stubInterface<AddressManager>()
    }
    components.peerStore = new PersistentPeerStore({
      ...components,
      events: new EventEmitter<Libp2pEvents>()
    })

    await start(...Object.values(components))

    providers = Sinon.createStubInstance(Providers)
    peerRouting = Sinon.createStubInstance(PeerRouting)
    routingTable = Sinon.createStubInstance(RoutingTable)
    validators = {}

    rpc = new RPC(components, {
      routingTable,
      providers,
      peerRouting,
      validators,
      lan: false
    })
  })

  it('calls back with the response', async () => {
    const defer = pDefer()
    const msg = new Message(MESSAGE_TYPE.GET_VALUE, uint8ArrayFromString('hello'), 5)

    const validateMessage = (msg: Message): void => {
      expect(msg).to.have.property('key').eql(uint8ArrayFromString('hello'))
      expect(msg).to.have.property('closerPeers').eql([])
      defer.resolve()
    }

    peerRouting.getCloserPeersOffline.resolves([])

    const duplexStream: ByteStream = {
      readable: readableStreamFromArray([msg])
        .pipeThrough(pbEncoderTransform(Message))
        .pipeThrough(lengthPrefixedEncoderTransform())
        .pipeThrough(bytesTransform()),

      writable: pbReader((message) => {
        validateMessage(message)
      }, Message)
    }

    rpc.onIncomingStream({
      stream: mockStream(duplexStream),
      connection: stubInterface<Connection>()
    })

    await defer.promise
  })
})
