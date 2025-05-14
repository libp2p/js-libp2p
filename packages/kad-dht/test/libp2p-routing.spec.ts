import { contentRoutingSymbol, TypedEventEmitter, start, stop, peerRoutingSymbol } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core'
import all from 'it-all'
import map from 'it-map'
import { duplexPair } from 'it-pair/duplex'
import { pbStream } from 'it-protobuf-stream'
import { CID } from 'multiformats/cid'
import pDefer from 'p-defer'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { kadDHT, passthroughMapper, type KadDHT } from '../src/index.js'
import { Message, MessageType } from '../src/message/dht.js'
import { convertBuffer } from '../src/utils.js'
import { createPeerIdsWithPrivateKey } from './utils/create-peer-id.js'
import { sortClosestPeers } from './utils/sort-closest-peers.js'
import type { PeerAndKey } from './utils/create-peer-id.js'
import type { ContentRouting, PeerStore, PeerId, TypedEventTarget, ComponentLogger, Connection, Peer, Stream, PeerRouting, PrivateKey } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Ping } from '@libp2p/ping'
import type { Datastore } from 'interface-datastore'

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

function createStreams (peerId: PeerId, components: StubbedKadDHTComponents): { connection: Connection, incomingStream: Stream } {
  const duplex = duplexPair<any>()
  const outgoingStream = stubInterface<Stream>({
    close: async () => {}
  })
  outgoingStream.source = duplex[0].source
  outgoingStream.sink.callsFake(async source => duplex[0].sink(source))

  const incomingStream = stubInterface<Stream>({
    close: async () => {}
  })
  incomingStream.source = duplex[1].source
  incomingStream.sink.callsFake(async source => duplex[1].sink(source))

  const connection = stubInterface<Connection>()
  connection.newStream.withArgs(PROTOCOL).resolves(outgoingStream)
  components.connectionManager.openConnection.withArgs(peerId).resolves(connection)

  return {
    connection,
    incomingStream
  }
}

function createPeer (peerId: PeerId, peer: Partial<Peer> = {}): Peer {
  const minPort = 1000
  const maxPort = 50000

  return {
    id: peerId,
    addresses: [{
      isCertified: false,
      multiaddr: multiaddr(`/ip4/58.42.62.62/tcp/${Math.random() * (maxPort - minPort) + minPort}`)
    }],
    tags: new Map(),
    metadata: new Map(),
    protocols: [
      PROTOCOL
    ],
    ...peer
  }
}

describe('content routing', () => {
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
      clientMode: false
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

    const {
      connection,
      incomingStream
    } = createStreams(remotePeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    // begin provide
    void contentRouting.provide(key)

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

    // read ADD_PROVIDER message
    const addProviderRequest = await pb.read(Message)
    expect(addProviderRequest.type).to.equal(MessageType.ADD_PROVIDER)
  })

  it('should find providers', async () => {
    const remotePeer = createPeer(peers[3].peerId)
    const providerPeer = createPeer(peers[2].peerId)

    components.peerStore.get.withArgs(remotePeer.id).resolves(remotePeer)

    const {
      connection,
      incomingStream
    } = createStreams(remotePeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    void Promise.resolve().then(async () => {
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

describe('peer routing', () => {
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
      incomingStream
    } = createStreams(remotePeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    // begin find
    const p = peerRouting.findPeer(peers[0].peerId)

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

    const peerInfo = await p

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
    components.peerStore.get.withArgs(closestPeer.id).resolves(closestPeer)

    const {
      connection,
      incomingStream
    } = createStreams(remotePeer.id, components)

    const {
      incomingStream: closestPeerIncomingStream
    } = createStreams(closestPeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    // remotePeer stream
    void Promise.resolve().then(async () => {
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
      const pb = pbStream(closestPeerIncomingStream)

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
    })))).to.eventually.deep.equal([{
      id: closestPeer.id.toString(),
      multiaddrs: closestPeer.addresses.map(({ multiaddr }) => multiaddr.toString())
    }])

    await expect(remotePeerInteractionsComplete.promise).to.eventually.be.undefined()
    await expect(closestPeerInteractionsComplete.promise).to.eventually.be.undefined()
  })
})
