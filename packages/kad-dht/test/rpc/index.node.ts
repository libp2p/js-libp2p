/* eslint-env mocha */

import { TypedEventEmitter, start } from '@libp2p/interface'
import { mockStream } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import all from 'it-all'
import * as lp from 'it-length-prefixed'
import map from 'it-map'
import { pipe } from 'it-pipe'
import pDefer from 'p-defer'
import Sinon, { type SinonStubbedInstance } from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message, MESSAGE_TYPE } from '../../src/message/index.js'
import { PeerRouting } from '../../src/peer-routing/index.js'
import { Providers } from '../../src/providers.js'
import { RoutingTable } from '../../src/routing-table/index.js'
import { RPC, type RPCComponents } from '../../src/rpc/index.js'
import { createPeerId } from '../utils/create-peer-id.js'
import type { Validators } from '../../src/index.js'
import type { Libp2pEvents, Connection, PeerId, PeerStore } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { Datastore } from 'interface-datastore'
import type { Duplex, Source } from 'it-stream-types'

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
      addressManager: stubInterface<AddressManager>(),
      logger: defaultLogger()
    }
    components.peerStore = new PersistentPeerStore({
      ...components,
      events: new TypedEventEmitter<Libp2pEvents>()
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

    const validateMessage = (res: Uint8ArrayList[]): void => {
      const msg = Message.deserialize(res[0])
      expect(msg).to.have.property('key').eql(uint8ArrayFromString('hello'))
      expect(msg).to.have.property('closerPeers').eql([])
      defer.resolve()
    }

    peerRouting.getCloserPeersOffline.resolves([])

    const source = pipe(
      [msg.serialize()],
      (source) => lp.encode(source),
      source => map(source, arr => new Uint8ArrayList(arr)),
      (source) => all(source)
    )

    const duplexStream: Duplex<AsyncGenerator<Uint8ArrayList>, Source<Uint8ArrayList | Uint8Array>, Promise<void>> = {
      source: (async function * () {
        yield * source
      })(),
      sink: async (source) => {
        const res = await pipe(
          source,
          (source) => lp.decode(source),
          async (source) => all(source)
        )
        validateMessage(res)
      }
    }

    rpc.onIncomingStream({
      stream: mockStream(duplexStream),
      connection: stubInterface<Connection>()
    })

    await defer.promise
  })
})
