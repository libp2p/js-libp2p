/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { Message, MESSAGE_TYPE } from '../../../src/message/index.js'
import { GetProvidersHandler, GetProvidersHandlerComponents } from '../../../src/rpc/handlers/get-providers.js'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { multiaddr } from '@multiformats/multiaddr'
import { createPeerId } from '../../utils/create-peer-id.js'
import { createValues, Value } from '../../utils/create-values.js'
import Sinon, { SinonStubbedInstance } from 'sinon'
import { Providers } from '../../../src/providers.js'
import { PeerRouting } from '../../../src/peer-routing/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { MemoryDatastore } from 'datastore-core'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import { EventEmitter } from '@libp2p/interfaces/events'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'
import type { PeerStore } from '@libp2p/interface-peer-store'

const T = MESSAGE_TYPE.GET_PROVIDERS

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
      events: new EventEmitter<Libp2pEvents>()
    })

    const components: GetProvidersHandlerComponents = {
      peerStore
    }

    handler = new GetProvidersHandler(components, {
      peerRouting,
      providers,
      lan: false
    })
  })

  it('errors with an invalid key ', async () => {
    const msg = new Message(T, uint8ArrayFromString('hello'), 0)

    await expect(handler.handle(sourcePeer, msg)).to.eventually.be.rejected().with.property('code', 'ERR_INVALID_CID')
  })

  it('responds with providers and closer peers', async () => {
    const v = values[0]
    const msg = new Message(T, v.cid.bytes, 0)

    const closer: PeerInfo[] = [{
      id: closerPeer,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/4002'),
        multiaddr('/ip4/192.168.2.6/tcp/4002'),
        multiaddr('/ip4/21.31.57.23/tcp/4002')
      ],
      protocols: []
    }]

    const provider: PeerInfo[] = [{
      id: providerPeer,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/4002'),
        multiaddr('/ip4/192.168.1.5/tcp/4002'),
        multiaddr('/ip4/135.4.67.0/tcp/4002')
      ],
      protocols: []
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
    expect(response.providerPeers).to.have.lengthOf(1)
    expect(response.providerPeers[0].id.toString()).to.equal(provider[0].id.toString())
    expect(response.closerPeers).to.have.lengthOf(1)
    expect(response.closerPeers[0].id.toString()).to.equal(closer[0].id.toString())
  })
})
