/* eslint-env mocha */

import { defaultLogger } from '@libp2p/logger'
import { peerIdFromMultihash } from '@libp2p/peer-id'
import { persistentPeerStore } from '@libp2p/peer-store'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import { TypedEventEmitter } from 'main-event'
import * as Digest from 'multiformats/hashes/digest'
import Sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { MessageType } from '../../../src/message/dht.js'
import { PeerRouting } from '../../../src/peer-routing/index.js'
import { Providers } from '../../../src/providers.js'
import { GetProvidersHandler } from '../../../src/rpc/handlers/get-providers.js'
import { passthroughMapper } from '../../../src/utils.js'
import { createPeerIdWithPrivateKey } from '../../utils/create-peer-id.js'
import { createValues } from '../../utils/create-values.js'
import type { Message } from '../../../src/message/dht.js'
import type { GetProvidersHandlerComponents } from '../../../src/rpc/handlers/get-providers.js'
import type { PeerAndKey } from '../../utils/create-peer-id.js'
import type { Value } from '../../utils/create-values.js'
import type { Libp2pEvents, PeerInfo, PeerStore } from '@libp2p/interface'
import type { SinonStubbedInstance } from 'sinon'

const T = MessageType.GET_PROVIDERS

describe('rpc - handlers - GetProviders', () => {
  let peerId: PeerAndKey
  let sourcePeer: PeerAndKey
  let closerPeer: PeerAndKey
  let providerPeer: PeerAndKey
  let peerStore: PeerStore
  let providers: SinonStubbedInstance<Providers>
  let peerRouting: SinonStubbedInstance<PeerRouting>
  let handler: GetProvidersHandler
  let values: Value[]

  beforeEach(async () => {
    peerId = await createPeerIdWithPrivateKey()
    sourcePeer = await createPeerIdWithPrivateKey()
    closerPeer = await createPeerIdWithPrivateKey()
    providerPeer = await createPeerIdWithPrivateKey()
    values = await createValues(1)

    peerRouting = Sinon.createStubInstance(PeerRouting)
    providers = Sinon.createStubInstance(Providers)
    peerStore = persistentPeerStore({
      peerId: peerId.peerId,
      datastore: new MemoryDatastore(),
      events: new TypedEventEmitter<Libp2pEvents>(),
      logger: defaultLogger()
    })

    const components: GetProvidersHandlerComponents = {
      peerId: peerId.peerId,
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

    await expect(handler.handle(sourcePeer.peerId, msg)).to.eventually.be.rejected
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
      id: closerPeer.peerId,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/4002'),
        multiaddr('/ip4/192.168.2.6/tcp/4002'),
        multiaddr('/ip4/21.31.57.23/tcp/4002')
      ]
    }]

    const provider: PeerInfo[] = [{
      id: providerPeer.peerId,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/4002'),
        multiaddr('/ip4/192.168.1.5/tcp/4002'),
        multiaddr('/ip4/135.4.67.0/tcp/4002')
      ]
    }]

    providers.getProviders.withArgs(v.cid).resolves([providerPeer.peerId])
    peerRouting.getCloserPeersOffline.withArgs(msg.key, sourcePeer.peerId).resolves(closer)

    await peerStore.merge(providerPeer.peerId, {
      multiaddrs: provider[0].multiaddrs
    })
    await peerStore.merge(closerPeer.peerId, {
      multiaddrs: closer[0].multiaddrs
    })

    const response = await handler.handle(sourcePeer.peerId, msg)

    if (response == null) {
      throw new Error('No response received from handler')
    }

    expect(response.key).to.be.eql(v.cid.bytes)
    expect(response.providers).to.have.lengthOf(1)
    expect(peerIdFromMultihash(Digest.decode(response.providers[0].id)).toString()).to.equal(provider[0].id.toString())
    expect(response.closer).to.have.lengthOf(1)
    expect(peerIdFromMultihash(Digest.decode(response.closer[0].id)).toString()).to.equal(closer[0].id.toString())
  })
})
