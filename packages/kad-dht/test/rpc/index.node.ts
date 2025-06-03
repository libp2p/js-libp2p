/* eslint-env mocha */

import { start } from '@libp2p/interface'
import { mockStream } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { persistentPeerStore } from '@libp2p/peer-store'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import all from 'it-all'
import * as lp from 'it-length-prefixed'
import map from 'it-map'
import { pipe } from 'it-pipe'
import { TypedEventEmitter } from 'main-event'
import pDefer from 'p-defer'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message, MessageType } from '../../src/message/dht.js'
import { PeerRouting } from '../../src/peer-routing/index.js'
import { Providers } from '../../src/providers.js'
import { RoutingTable } from '../../src/routing-table/index.js'
import { RPC } from '../../src/rpc/index.js'
import { passthroughMapper } from '../../src/utils.js'
import { createPeerIdWithPrivateKey } from '../utils/create-peer-id.js'
import type { Validators } from '../../src/index.js'
import type { RPCComponents } from '../../src/rpc/index.js'
import type { PeerAndKey } from '../utils/create-peer-id.js'
import type { Libp2pEvents, Connection, PeerStore } from '@libp2p/interface'
import type { AddressManager } from '@libp2p/interface-internal'
import type { Datastore } from 'interface-datastore'
import type { Duplex, Source } from 'it-stream-types'
import type { SinonStubbedInstance } from 'sinon'

describe('rpc', () => {
  let peerId: PeerAndKey
  let rpc: RPC
  let providers: SinonStubbedInstance<Providers>
  let peerRouting: SinonStubbedInstance<PeerRouting>
  let validators: Validators
  let datastore: Datastore
  let routingTable: RoutingTable

  beforeEach(async () => {
    peerId = await createPeerIdWithPrivateKey()
    datastore = new MemoryDatastore()

    const components: RPCComponents = {
      peerId: peerId.peerId,
      datastore,
      peerStore: stubInterface<PeerStore>(),
      addressManager: stubInterface<AddressManager>(),
      logger: defaultLogger()
    }
    components.peerStore = persistentPeerStore({
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
      logPrefix: '',
      metricsPrefix: '',
      datastorePrefix: '',
      peerInfoMapper: passthroughMapper
    })
  })

  it('calls back with the response', async () => {
    const defer = pDefer()
    const msg: Partial<Message> = {
      type: MessageType.GET_VALUE,
      key: uint8ArrayFromString('hello')
    }

    const validateMessage = (res: Uint8ArrayList[]): void => {
      const msg = Message.decode(res[0])
      expect(msg).to.have.property('key').eql(uint8ArrayFromString('hello'))
      expect(msg).to.have.property('closer').eql([])
      defer.resolve()
    }

    peerRouting.getCloserPeersOffline.resolves([])

    const source = pipe(
      [Message.encode(msg)],
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
