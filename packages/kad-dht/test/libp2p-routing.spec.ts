import { contentRoutingSymbol, start, stop, peerRoutingSymbol } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { streamPair, pbStream } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import all from 'it-all'
import first from 'it-first'
import map from 'it-map'
import { pushable } from 'it-pushable'
import { TypedEventEmitter } from 'main-event'
import { CID } from 'multiformats/cid'
import pDefer from 'p-defer'
import { stubInterface } from 'sinon-ts'
import { kadDHT, passthroughMapper } from '../src/index.js'
import { Message, MessageType } from '../src/message/dht.js'
import { convertBuffer } from '../src/utils.js'
import { createPeerIdsWithPrivateKey } from './utils/create-peer-id.js'
import { sortClosestPeers } from './utils/sort-closest-peers.js'
import type { KadDHT } from '../src/index.js'
import type { PeerAndKey } from './utils/create-peer-id.js'
import type { ContentRouting, PeerStore, PeerId, ComponentLogger, Connection, Peer, Stream, PeerRouting, PrivateKey } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Ping } from '@libp2p/ping'
import type { Datastore } from 'interface-datastore'
import type { TypedEventTarget } from 'main-event'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedKadDHTComponents {
  peerId: PeerId
  privateKey: PrivateKey
  registrar: StubbedInstance<Registrar>
  addressManager: StubbedInstance<AddressManager>
  peerStore: StubbedInstance<PeerStore>
  connectionManager: StubbedInstance<ConnectionManager>
  datastore: Datastore
  events: TypedEventTarget<any>
  logger: ComponentLogger
  ping: Ping
}

const PROTOCOL = '/test/dht/1.0.0'

async function createStreams (peerId: PeerId, components: StubbedKadDHTComponents): Promise<{ connection: Connection, incomingStreams: AsyncIterable<Stream> }> {
  const incomingStreams = pushable<Stream>({
    objectMode: true
  })

  const connection = stubInterface<Connection>()
  components.connectionManager.openStream.withArgs(peerId).callsFake(async () => {
    const [outboundStream, incomingStream] = await streamPair()

    queueMicrotask(() => {
      incomingStreams.push(incomingStream)
    })

    return outboundStream
  })

  return {
    connection,
    incomingStreams
  }
}

function createPeer (peerId: PeerId, peer: Partial<Peer> = {}): Peer {
  const minPort = 1000
  const maxPort = 50000

  return {
    id: peerId,
    addresses: [{
      isCertified: false,
      multiaddr: multiaddr(`/ip4/58.42.62.62/tcp/${Math.round(Math.random() * (maxPort - minPort) + minPort)}`)
    }],
    tags: new Map(),
    metadata: new Map(),
    protocols: [
      PROTOCOL
    ],
    ...peer
  }
}

describe('libp2p routing - content routing', () => {
  let contentRouting: ContentRouting
  let components: StubbedKadDHTComponents
  let dht: KadDHT
  let peers: PeerAndKey[]

  let key: CID

  beforeEach(async () => {
    key = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')

    const unsortedPeers = await createPeerIdsWithPrivateKey(5)

    // sort remaining peers by XOR distance to the key, closest -> furthest
    peers = await sortClosestPeers(unsortedPeers, await convertBuffer(key.multihash.bytes))

    components = {
      peerId: peers[peers.length - 1].peerId,
      privateKey: peers[peers.length - 1].privateKey,
      registrar: stubInterface<Registrar>(),
      addressManager: stubInterface<AddressManager>(),
      peerStore: stubInterface<PeerStore>({
        all: async () => []
      }),
      connectionManager: stubInterface<ConnectionManager>({
        isDialable: async () => true
      }),
      datastore: new MemoryDatastore(),
      events: new TypedEventEmitter<any>(),
      logger: defaultLogger(),
      ping: stubInterface<Ping>()
    }

    dht = kadDHT({
      protocol: PROTOCOL,
      peerInfoMapper: passthroughMapper,
      clientMode: false,
      initialQuerySelfInterval: 10_000
    })(components)

    // @ts-expect-error not part of public api
    dht.routingTable.kb.verify = async () => true

    // @ts-expect-error not part of public api
    dht.queryManager.initialQuerySelfHasRun.resolve()

    await start(dht)

    // @ts-expect-error cannot use symbol to index KadDHT type
    contentRouting = dht[contentRoutingSymbol]
  })

  afterEach(async () => {
    await stop(dht)
  })

  it('should provide', async () => {
    const remotePeer = createPeer(peers[0].peerId)

    components.peerStore.get.withArgs(remotePeer.id).resolves(remotePeer)
    components.peerStore.getInfo.withArgs(remotePeer.id).resolves({
      id: remotePeer.id,
      multiaddrs: remotePeer.addresses.map(({ multiaddr }) => multiaddr)
    })

    const {
      connection,
      incomingStreams
    } = await createStreams(remotePeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    // begin provide
    await Promise.all([
      contentRouting.provide(key),
      (async function () {
        let streamCount = 0

        for await (const incomingStream of incomingStreams) {
          streamCount++

          if (streamCount === 1) {
            // read FIND_NODE message
            const pb = pbStream(incomingStream)
            const findNodeRequest = await pb.read(Message)
            expect(findNodeRequest.type).to.equal(MessageType.FIND_NODE)
            expect(findNodeRequest.key).to.equalBytes(key.multihash.bytes)

            // reply with this node
            await pb.write({
              type: MessageType.FIND_NODE,
              closer: [{
                id: remotePeer.id.toMultihash().bytes,
                multiaddrs: remotePeer.addresses.map(({ multiaddr }) => multiaddr.bytes)
              }]
            }, Message)
          } else if (streamCount === 2) {
            // read ADD_PROVIDER message
            const pb = pbStream(incomingStream)
            const addProviderRequest = await pb.read(Message)
            expect(addProviderRequest.type).to.equal(MessageType.ADD_PROVIDER)

            return
          }
        }
      })()
    ])
  })

  it('should find providers', async () => {
    const remotePeer = createPeer(peers[3].peerId)
    const providerPeer = createPeer(peers[2].peerId)

    components.peerStore.get.withArgs(remotePeer.id).resolves(remotePeer)
    components.peerStore.getInfo.withArgs(remotePeer.id).resolves({
      id: remotePeer.id,
      multiaddrs: remotePeer.addresses.map(({ multiaddr }) => multiaddr)
    })

    const {
      connection,
      incomingStreams
    } = await createStreams(remotePeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    void Promise.resolve().then(async () => {
      for await (const incomingStream of incomingStreams) {
        const pb = pbStream(incomingStream)

        // read GET_PROVIDERS message
        const getProvidersRequest = await pb.read(Message)

        expect(getProvidersRequest.type).to.equal(MessageType.GET_PROVIDERS)
        expect(getProvidersRequest.key).to.equalBytes(key.multihash.bytes)

        // reply with the provider node
        await pb.write({
          type: MessageType.GET_PROVIDERS,
          providers: [{
            id: providerPeer.id.toMultihash().bytes,
            multiaddrs: providerPeer.addresses.map(({ multiaddr }) => multiaddr.bytes)
          }]
        }, Message)
      }
    })

    // should have received the provider
    await expect(all(map(contentRouting.findProviders(key), prov => ({
      id: prov.id.toString(),
      multiaddrs: prov.multiaddrs.map(ma => ma.toString())
    })))).to.eventually.deep.equal([{
      id: providerPeer.id.toString(),
      multiaddrs: providerPeer.addresses.map(({ multiaddr }) => multiaddr.toString())
    }])
  })
})

describe('libp2p routing - peer routing', () => {
  let peerRouting: PeerRouting
  let components: StubbedKadDHTComponents
  let dht: KadDHT
  let peers: PeerAndKey[]
  let key: CID

  beforeEach(async () => {
    key = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')

    const unsortedPeers = await createPeerIdsWithPrivateKey(5)

    // sort remaining peers by XOR distance to the key, closest -> furthest
    peers = await sortClosestPeers(unsortedPeers, await convertBuffer(key.multihash.bytes))

    components = {
      peerId: peers[peers.length - 1].peerId,
      privateKey: peers[peers.length - 1].privateKey,
      registrar: stubInterface<Registrar>(),
      addressManager: stubInterface<AddressManager>(),
      peerStore: stubInterface<PeerStore>({
        all: async () => []
      }),
      connectionManager: stubInterface<ConnectionManager>({
        isDialable: async () => true
      }),
      datastore: new MemoryDatastore(),
      events: new TypedEventEmitter<any>(),
      logger: defaultLogger(),
      ping: stubInterface<Ping>()
    }

    dht = kadDHT({
      protocol: PROTOCOL,
      peerInfoMapper: passthroughMapper,
      clientMode: false
    })(components)

    await start(dht)

    // @ts-expect-error not part of public api
    dht.routingTable.kb.verify = async () => true

    // @ts-expect-error not part of public api
    dht.queryManager.initialQuerySelfHasRun.resolve()

    // @ts-expect-error cannot use symbol to index KadDHT type
    peerRouting = dht[peerRoutingSymbol]
  })

  afterEach(async () => {
    await stop(dht)
  })

  it('should find peer', async () => {
    const remotePeer = createPeer(peers[1].peerId)
    const targetPeer = createPeer(peers[0].peerId)

    components.peerStore.get.withArgs(remotePeer.id).resolves(remotePeer)

    const {
      connection,
      incomingStreams
    } = await createStreams(remotePeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    const [peerInfo] = await Promise.all([
      // begin find
      peerRouting.findPeer(peers[0].peerId),
      Promise.resolve().then(async () => {
        const incomingStream = await first(incomingStreams)

        if (incomingStream == null) {
          throw new Error('No stream was opened')
        }

        // read FIND_NODE message
        const pb = pbStream(incomingStream)
        const findNodeRequest = await pb.read(Message)
        expect(findNodeRequest.type).to.equal(MessageType.FIND_NODE)
        expect(findNodeRequest.key).to.equalBytes(peers[0].peerId.toMultihash().bytes)

        // reply with this node
        await pb.write({
          type: MessageType.FIND_NODE,
          closer: [{
            id: targetPeer.id.toMultihash().bytes,
            multiaddrs: targetPeer.addresses.map(({ multiaddr }) => multiaddr.bytes)
          }]
        }, Message)
      })
    ])

    expect({
      id: peerInfo.id.toString(),
      multiaddrs: peerInfo.multiaddrs.map(ma => ma.toString())
    }).to.deep.equal({
      id: targetPeer.id.toString(),
      multiaddrs: targetPeer.addresses.map(({ multiaddr }) => multiaddr.toString())
    })
  })

  it('should find closest peers', async () => {
    const remotePeer = createPeer(peers[3].peerId)
    const closestPeer = createPeer(peers[2].peerId)

    const remotePeerInteractionsComplete = pDefer()
    const closestPeerInteractionsComplete = pDefer()

    components.peerStore.get.withArgs(remotePeer.id).resolves(remotePeer)
    components.peerStore.getInfo.withArgs(remotePeer.id).resolves({
      id: remotePeer.id,
      multiaddrs: remotePeer.addresses.map(({ multiaddr }) => multiaddr)
    })
    components.peerStore.get.withArgs(closestPeer.id).resolves(closestPeer)
    components.peerStore.getInfo.withArgs(closestPeer.id).resolves({
      id: closestPeer.id,
      multiaddrs: closestPeer.addresses.map(({ multiaddr }) => multiaddr)
    })

    const {
      connection,
      incomingStreams
    } = await createStreams(remotePeer.id, components)

    const {
      incomingStreams: closestPeerIncomingStreams
    } = await createStreams(closestPeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    // remotePeer stream
    void Promise.resolve().then(async () => {
      const incomingStream = await first(incomingStreams)

      if (incomingStream == null) {
        throw new Error('No stream was opened')
      }

      const pb = pbStream(incomingStream)

      // read FIND_NODE message
      const findNodeRequest = await pb.read(Message)
      expect(findNodeRequest.type).to.equal(MessageType.FIND_NODE)
      expect(findNodeRequest.key).to.equalBytes(key.multihash.bytes)

      // reply with the closest node
      await pb.write({
        type: MessageType.FIND_NODE,
        closer: [{
          id: closestPeer.id.toMultihash().bytes,
          multiaddrs: closestPeer.addresses.map(({ multiaddr }) => multiaddr.bytes)
        }]
      }, Message)

      remotePeerInteractionsComplete.resolve()
    })

    // closestPeer stream
    void Promise.resolve().then(async () => {
      const incomingStream = await first(closestPeerIncomingStreams)

      if (incomingStream == null) {
        throw new Error('No stream was opened')
      }

      const pb = pbStream(incomingStream)

      // read FIND_NODE message
      const findNodeRequest = await pb.read(Message)
      expect(findNodeRequest.type).to.equal(MessageType.FIND_NODE)
      expect(findNodeRequest.key).to.equalBytes(key.multihash.bytes)

      // we are the closest so no closer peers
      await pb.write({
        type: MessageType.FIND_NODE
      }, Message)

      closestPeerInteractionsComplete.resolve()
    })

    // should have received the closest peer
    await expect(all(map(peerRouting.getClosestPeers(key.multihash.bytes), prov => ({
      id: prov.id.toString(),
      multiaddrs: prov.multiaddrs.map(ma => ma.toString())
    })))).to.eventually.deep.include({
      id: closestPeer.id.toString(),
      multiaddrs: closestPeer.addresses.map(({ multiaddr }) => multiaddr.toString())
    })

    await expect(remotePeerInteractionsComplete.promise).to.eventually.be.undefined()
    await expect(closestPeerInteractionsComplete.promise).to.eventually.be.undefined()
  })
})
