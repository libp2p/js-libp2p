/* eslint-env mocha */

import { TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromBytes } from '@libp2p/peer-id'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import Sinon, { type SinonStubbedInstance } from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { type Message, MessageType } from '../../../src/message/dht.js'
import { PeerRouting } from '../../../src/peer-routing/index.js'
import { Providers } from '../../../src/providers.js'
import { GetProvidersHandler, type GetProvidersHandlerComponents } from '../../../src/rpc/handlers/get-providers.js'
import { passthroughMapper } from '../../../src/utils.js'
import { createPeerId } from '../../utils/create-peer-id.js'
import { createValues, type Value } from '../../utils/create-values.js'
import type { Libp2pEvents, PeerId, PeerInfo, PeerStore } from '@libp2p/interface'

const T = MessageType.GET_PROVIDERS

describe('rpc - handlers - GetProviders', () => {
  let peerId: PeerId
  let sourcePeer: PeerId
  let closerPeer: PeerId
  let providerPeer: PeerId
  let peerStore: PeerStore
  let providers: SinonStubbedInstance<Providers>
  let peerRouting: SinonStubbedInstance<PeerRouting>
  let handler: GetProvidersHandler
  let values: Value[]

  beforeEach(async () => {
    peerId = await createPeerId()
    sourcePeer = await createPeerId()
    closerPeer = await createPeerId()
    providerPeer = await createPeerId()
    values = await createValues(1)

    peerRouting = Sinon.createStubInstance(PeerRouting)
    providers = Sinon.createStubInstance(Providers)
    peerStore = new PersistentPeerStore({
      peerId,
      datastore: new MemoryDatastore(),
      events: new TypedEventEmitter<Libp2pEvents>(),
      logger: defaultLogger()
    })

    const components: GetProvidersHandlerComponents = {
      peerStore,
      logger: defaultLogger()
    }

    handler = new GetProvidersHandler(components, {
      peerRouting,
      providers,
      logPrefix: '',
      peerInfoMapper: passthroughMapper
    })
  })

  it('errors with an invalid key ', async () => {
    const msg: Message = {
      type: T,
      key: uint8ArrayFromString('hello'),
      closer: [],
      providers: []
    }

    await expect(handler.handle(sourcePeer, msg)).to.eventually.be.rejected
      .with.property('name', 'InvalidMessageError')
  })

  it('responds with providers and closer peers', async () => {
    const v = values[0]
    const msg: Message = {
      type: T,
      key: v.cid.bytes,
      closer: [],
      providers: []
    }

    const closer: PeerInfo[] = [{
      id: closerPeer,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/4002'),
        multiaddr('/ip4/192.168.2.6/tcp/4002'),
        multiaddr('/ip4/21.31.57.23/tcp/4002')
      ]
    }]

    const provider: PeerInfo[] = [{
      id: providerPeer,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/4002'),
        multiaddr('/ip4/192.168.1.5/tcp/4002'),
        multiaddr('/ip4/135.4.67.0/tcp/4002')
      ]
    }]

    providers.getProviders.withArgs(v.cid).resolves([providerPeer])
    peerRouting.getCloserPeersOffline.withArgs(msg.key, sourcePeer).resolves(closer)

    await peerStore.merge(providerPeer, {
      multiaddrs: provider[0].multiaddrs
    })
    await peerStore.merge(closerPeer, {
      multiaddrs: closer[0].multiaddrs
    })

    const response = await handler.handle(sourcePeer, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.key).to.be.eql(v.cid.bytes)
    expect(response.providers).to.have.lengthOf(1)
    expect(peerIdFromBytes(response.providers[0].id).toString()).to.equal(provider[0].id.toString())
    expect(response.closer).to.have.lengthOf(1)
    expect(peerIdFromBytes(response.closer[0].id).toString()).to.equal(closer[0].id.toString())
  })
})
