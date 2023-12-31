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
import { matchPeerId } from './fixtures/match-peer-id.js'
import { createPeerIds } from './utils/create-peer-id.js'
import { sortClosestPeers } from './utils/sort-closest-peers.js'
import type { ContentRouting, PeerStore, PeerId, TypedEventTarget, ComponentLogger, Connection, Peer, Stream, PeerRouting } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Datastore } from 'interface-datastore'

interface StubbedKadDHTComponents {
  peerId: PeerId
  registrar: StubbedInstance<Registrar>
  addressManager: StubbedInstance<AddressManager>
  peerStore: StubbedInstance<PeerStore>
  connectionManager: StubbedInstance<ConnectionManager>
  datastore: Datastore
  events: TypedEventTarget<any>
  logger: ComponentLogger
}

const PROTOCOL = '/test/dht/1.0.0'

function createStreams (peerId: PeerId, components: StubbedKadDHTComponents): { connection: Connection, incomingStream: Stream } {
  const duplex = duplexPair<any>()
  const outgoingStream = stubInterface<Stream>()
  outgoingStream.source = duplex[0].source
  outgoingStream.sink.callsFake(async source => duplex[0].sink(source))

  const incomingStream = stubInterface<Stream>()
  incomingStream.source = duplex[1].source
  incomingStream.sink.callsFake(async source => duplex[1].sink(source))

  const connection = stubInterface<Connection>()
  connection.newStream.withArgs(PROTOCOL).resolves(outgoingStream)
  components.connectionManager.openConnection.withArgs(matchPeerId(peerId)).resolves(connection)

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
  let peers: PeerId[]
  let key: CID

  beforeEach(async () => {
    key = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')

    const unsortedPeers = await createPeerIds(5)

    // sort remaining peers by XOR distance to the key, closest -> furthest
    peers = await sortClosestPeers(unsortedPeers, await convertBuffer(key.multihash.bytes))

    components = {
      peerId: peers[peers.length - 1],
      registrar: stubInterface<Registrar>(),
      addressManager: stubInterface<AddressManager>(),
      peerStore: stubInterface<PeerStore>(),
      connectionManager: stubInterface<ConnectionManager>(),
      datastore: new MemoryDatastore(),
      events: new TypedEventEmitter<any>(),
      logger: defaultLogger()
    }

    dht = kadDHT({
      protocol: PROTOCOL,
      peerInfoMapper: passthroughMapper,
      clientMode: false,
      allowQueryWithZeroPeers: true
    })(components)

    await start(dht)

    // @ts-expect-error cannot use symbol to index KadDHT type
    contentRouting = dht[contentRoutingSymbol]
  })

  afterEach(async () => {
    await stop(dht)
  })

  it('should provide', async () => {
    const remotePeer = createPeer(peers[0])

    components.peerStore.get.withArgs(matchPeerId(remotePeer.id)).resolves(remotePeer)

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
        id: remotePeer.id.toBytes(),
        multiaddrs: remotePeer.addresses.map(({ multiaddr }) => multiaddr.bytes)
      }]
    }, Message)

    // read ADD_PROVIDER message
    const addProviderRequest = await pb.read(Message)
    expect(addProviderRequest.type).to.equal(MessageType.ADD_PROVIDER)
  })

  it('should find providers', async () => {
    const remotePeer = createPeer(peers[3])
    const providerPeer = createPeer(peers[2])

    components.peerStore.get.withArgs(matchPeerId(remotePeer.id)).resolves(remotePeer)

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
          id: providerPeer.id.toBytes(),
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

  it('should not block on finding providers without multiaddrs', async () => {
    const receivedFirstProvider = pDefer()
    const remotePeerInteractionsComplete = pDefer()
    const providerPeerInteractionsComplete = pDefer()

    const remotePeer = createPeer(peers[3])
    const providerPeerWithoutAddresses = createPeer(peers[2])
    const providerPeer = createPeer(peers[1])

    components.peerStore.get.withArgs(matchPeerId(remotePeer.id)).resolves(remotePeer)

    const {
      connection,
      incomingStream
    } = createStreams(remotePeer.id, components)

    const {
      incomingStream: providerPeerIncomingStream
    } = createStreams(providerPeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    // remotePeer stream
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
          id: providerPeerWithoutAddresses.id.toBytes(),
          multiaddrs: []
        }, {
          id: providerPeer.id.toBytes(),
          multiaddrs: providerPeer.addresses.map(({ multiaddr }) => multiaddr.bytes)
        }]
      }, Message)

      // read FIND_NODE message
      const findNodeRequest = await pb.read(Message)
      expect(findNodeRequest.type).to.equal(MessageType.FIND_NODE)
      expect(findNodeRequest.key).to.equalBytes(providerPeerWithoutAddresses.id.toBytes())

      // delay sending the response until providerPeer has been received
      await receivedFirstProvider.promise

      // return details of providerPeerWithoutAddresses
      await pb.write({
        type: MessageType.FIND_NODE,
        closer: [{
          id: providerPeerWithoutAddresses.id.toBytes(),
          multiaddrs: providerPeerWithoutAddresses.addresses.map(({ multiaddr }) => multiaddr.bytes)
        }]
      }, Message)

      remotePeerInteractionsComplete.resolve()
    })

    // providerPeer stream
    void Promise.resolve().then(async () => {
      const pb = pbStream(providerPeerIncomingStream)

      // read FIND_NODE message
      const findNodeRequest = await pb.read(Message)
      expect(findNodeRequest.type).to.equal(MessageType.FIND_NODE)
      expect(findNodeRequest.key).to.equalBytes(providerPeerWithoutAddresses.id.toBytes())

      // don't know providerPeerWithoutAddresses
      await pb.write({
        type: MessageType.FIND_NODE
      }, Message)

      providerPeerInteractionsComplete.resolve()
    })

    const provs: Array<{ id: string, multiaddrs: string[] }> = []

    for await (const prov of contentRouting.findProviders(key)) {
      provs.push({
        id: prov.id.toString(),
        multiaddrs: prov.multiaddrs.map(ma => ma.toString())
      })

      receivedFirstProvider.resolve()
    }

    // should have received the provider
    expect(provs).to.deep.equal([{
      id: providerPeer.id.toString(),
      multiaddrs: providerPeer.addresses.map(({ multiaddr }) => multiaddr.toString())
    }, {
      id: providerPeerWithoutAddresses.id.toString(),
      multiaddrs: providerPeerWithoutAddresses.addresses.map(({ multiaddr }) => multiaddr.toString())
    }])

    await expect(remotePeerInteractionsComplete.promise).to.eventually.be.undefined()
    await expect(providerPeerInteractionsComplete.promise).to.eventually.be.undefined()
  })

  it('should ignore providers without multiaddrs', async () => {
    const receivedFirstProvider = pDefer()
    const remotePeerInteractionsComplete = pDefer()
    const providerPeerInteractionsComplete = pDefer()

    const remotePeer = createPeer(peers[3])
    const providerPeerWithoutAddresses = createPeer(peers[2], {
      addresses: []
    })
    const providerPeer = createPeer(peers[1])

    components.peerStore.get.withArgs(matchPeerId(remotePeer.id)).resolves(remotePeer)

    const {
      connection,
      incomingStream
    } = createStreams(remotePeer.id, components)

    const {
      incomingStream: providerPeerIncomingStream
    } = createStreams(providerPeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    // remotePeer stream
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
          id: providerPeerWithoutAddresses.id.toBytes(),
          multiaddrs: []
        }, {
          id: providerPeer.id.toBytes(),
          multiaddrs: providerPeer.addresses.map(({ multiaddr }) => multiaddr.bytes)
        }]
      }, Message)

      // read FIND_NODE message
      const findNodeRequest = await pb.read(Message)
      expect(findNodeRequest.type).to.equal(MessageType.FIND_NODE)
      expect(findNodeRequest.key).to.equalBytes(providerPeerWithoutAddresses.id.toBytes())

      // delay sending the response until providerPeer has been received
      await receivedFirstProvider.promise

      // don't know providerPeerWithoutAddresses
      await pb.write({
        type: MessageType.FIND_NODE
      }, Message)

      remotePeerInteractionsComplete.resolve()
    })

    // providerPeer stream
    void Promise.resolve().then(async () => {
      const pb = pbStream(providerPeerIncomingStream)

      // read FIND_NODE message
      const findNodeRequest = await pb.read(Message)
      expect(findNodeRequest.type).to.equal(MessageType.FIND_NODE)
      expect(findNodeRequest.key).to.equalBytes(providerPeerWithoutAddresses.id.toBytes())

      // don't know providerPeerWithoutAddresses
      await pb.write({
        type: MessageType.FIND_NODE
      }, Message)

      providerPeerInteractionsComplete.resolve()
    })

    const provs: Array<{ id: string, multiaddrs: string[] }> = []

    for await (const prov of contentRouting.findProviders(key)) {
      provs.push({
        id: prov.id.toString(),
        multiaddrs: prov.multiaddrs.map(ma => ma.toString())
      })

      receivedFirstProvider.resolve()
    }

    // should have received the provider
    expect(provs).to.deep.equal([{
      id: providerPeer.id.toString(),
      multiaddrs: providerPeer.addresses.map(({ multiaddr }) => multiaddr.toString())
    }])

    await expect(remotePeerInteractionsComplete.promise).to.eventually.be.undefined()
    await expect(providerPeerInteractionsComplete.promise).to.eventually.be.undefined()
  })
})

describe('peer routing', () => {
  let peerRouting: PeerRouting
  let components: StubbedKadDHTComponents
  let dht: KadDHT
  let peers: PeerId[]
  let key: CID

  beforeEach(async () => {
    key = CID.parse('QmU621oD8AhHw6t25vVyfYKmL9VV3PTgc52FngEhTGACFB')

    const unsortedPeers = await createPeerIds(5)

    // sort remaining peers by XOR distance to the key, closest -> furthest
    peers = await sortClosestPeers(unsortedPeers, await convertBuffer(key.multihash.bytes))

    components = {
      peerId: peers[peers.length - 1],
      registrar: stubInterface<Registrar>(),
      addressManager: stubInterface<AddressManager>(),
      peerStore: stubInterface<PeerStore>(),
      connectionManager: stubInterface<ConnectionManager>(),
      datastore: new MemoryDatastore(),
      events: new TypedEventEmitter<any>(),
      logger: defaultLogger()
    }

    dht = kadDHT({
      protocol: PROTOCOL,
      peerInfoMapper: passthroughMapper,
      clientMode: false,
      allowQueryWithZeroPeers: true
    })(components)

    await start(dht)

    // @ts-expect-error cannot use symbol to index KadDHT type
    peerRouting = dht[peerRoutingSymbol]
  })

  afterEach(async () => {
    await stop(dht)
  })

  it('should find peer', async () => {
    const remotePeer = createPeer(peers[1])
    const targetPeer = createPeer(peers[0])

    components.peerStore.get.withArgs(matchPeerId(remotePeer.id)).resolves(remotePeer)

    const {
      connection,
      incomingStream
    } = createStreams(remotePeer.id, components)

    // a peer has connected
    const topology = components.registrar.register.getCall(0).args[1]
    topology.onConnect?.(remotePeer.id, connection)

    // begin find
    const p = peerRouting.findPeer(peers[0])

    // read FIND_NODE message
    const pb = pbStream(incomingStream)
    const findNodeRequest = await pb.read(Message)
    expect(findNodeRequest.type).to.equal(MessageType.FIND_NODE)
    expect(findNodeRequest.key).to.equalBytes(peers[0].toBytes())

    // reply with this node
    await pb.write({
      type: MessageType.FIND_NODE,
      closer: [{
        id: targetPeer.id.toBytes(),
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
    const remotePeer = createPeer(peers[3])
    const closestPeer = createPeer(peers[2])

    const remotePeerInteractionsComplete = pDefer()
    const closestPeerInteractionsComplete = pDefer()

    components.peerStore.get.withArgs(matchPeerId(remotePeer.id)).resolves(remotePeer)
    components.peerStore.get.withArgs(matchPeerId(closestPeer.id)).resolves(closestPeer)

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
          id: closestPeer.id.toBytes(),
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

  it('should not block on finding closest peers without multiaddrs', async () => {
    const receivedFirstClosest = pDefer()
    const remotePeerInteractionsComplete = pDefer()
    const closestPeerInteractionsComplete = pDefer()

    const remotePeer = createPeer(peers[3])
    const closestPeerWithoutAddresses = createPeer(peers[2])
    const closestPeer = createPeer(peers[1])

    components.peerStore.get.withArgs(matchPeerId(remotePeer.id)).resolves(remotePeer)
    components.peerStore.get.withArgs(matchPeerId(closestPeer.id)).resolves(closestPeer)
    components.peerStore.get.withArgs(matchPeerId(closestPeerWithoutAddresses.id)).resolves({
      ...closestPeerWithoutAddresses,
      addresses: []
    })

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
      const getProvidersRequest = await pb.read(Message)

      expect(getProvidersRequest.type).to.equal(MessageType.FIND_NODE)
      expect(getProvidersRequest.key).to.equalBytes(key.multihash.bytes)

      // reply with the closer nodes
      await pb.write({
        type: MessageType.FIND_NODE,
        closer: [{
          id: closestPeerWithoutAddresses.id.toBytes(),
          multiaddrs: []
        }, {
          id: closestPeer.id.toBytes(),
          multiaddrs: closestPeer.addresses.map(({ multiaddr }) => multiaddr.bytes)
        }]
      }, Message)

      // read FIND_NODE message
      const findNodeRequest = await pb.read(Message)

      expect(findNodeRequest.type).to.equal(MessageType.FIND_NODE)
      expect(findNodeRequest.key).to.equalBytes(closestPeerWithoutAddresses.id.toBytes())

      // delay sending the response until closestPeer has been received
      await receivedFirstClosest.promise

      // return details of closestPeerWithoutAddresses
      await pb.write({
        type: MessageType.FIND_NODE,
        closer: [{
          id: closestPeerWithoutAddresses.id.toBytes(),
          multiaddrs: closestPeerWithoutAddresses.addresses.map(({ multiaddr }) => multiaddr.bytes)
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

      await pb.write({
        type: MessageType.FIND_NODE,
        closer: []
      }, Message)

      const secondFindNodeRequest = await pb.read(Message)
      expect(secondFindNodeRequest.type).to.equal(MessageType.FIND_NODE)
      expect(secondFindNodeRequest.key).to.equalBytes(closestPeerWithoutAddresses.id.toBytes())

      // don't know closestPeerWithoutAddresses
      await pb.write({
        type: MessageType.FIND_NODE
      }, Message)

      closestPeerInteractionsComplete.resolve()
    })

    const closest: Array<{ id: string, multiaddrs: string[] }> = []

    for await (const closer of peerRouting.getClosestPeers(key.multihash.bytes)) {
      closest.push({
        id: closer.id.toString(),
        multiaddrs: closer.multiaddrs.map(ma => ma.toString())
      })

      receivedFirstClosest.resolve()
    }

    // should have received the closest peers
    expect(closest).to.deep.equal([{
      id: closestPeer.id.toString(),
      multiaddrs: closestPeer.addresses.map(({ multiaddr }) => multiaddr.toString())
    }, {
      id: closestPeerWithoutAddresses.id.toString(),
      multiaddrs: closestPeerWithoutAddresses.addresses.map(({ multiaddr }) => multiaddr.toString())
    }])

    await expect(remotePeerInteractionsComplete.promise).to.eventually.be.undefined()
    await expect(closestPeerInteractionsComplete.promise).to.eventually.be.undefined()
  })

  it('should ignore closest peers without multiaddrs', async () => {
    const receivedFirstClosest = pDefer()
    const remotePeerInteractionsComplete = pDefer()
    const closestPeerInteractionsComplete = pDefer()

    const remotePeer = createPeer(peers[3])
    const closestPeerWithoutAddresses = createPeer(peers[2])
    const closestPeer = createPeer(peers[1])

    components.peerStore.get.withArgs(matchPeerId(remotePeer.id)).resolves(remotePeer)
    components.peerStore.get.withArgs(matchPeerId(closestPeer.id)).resolves(closestPeer)
    components.peerStore.get.withArgs(matchPeerId(closestPeerWithoutAddresses.id)).resolves({
      ...closestPeerWithoutAddresses,
      addresses: []
    })

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
      const getProvidersRequest = await pb.read(Message)

      expect(getProvidersRequest.type).to.equal(MessageType.FIND_NODE)
      expect(getProvidersRequest.key).to.equalBytes(key.multihash.bytes)

      // reply with the closer nodes
      await pb.write({
        type: MessageType.FIND_NODE,
        closer: [{
          id: closestPeerWithoutAddresses.id.toBytes(),
          multiaddrs: []
        }, {
          id: closestPeer.id.toBytes(),
          multiaddrs: closestPeer.addresses.map(({ multiaddr }) => multiaddr.bytes)
        }]
      }, Message)

      const secondFindNodeRequest = await pb.read(Message)
      expect(secondFindNodeRequest.type).to.equal(MessageType.FIND_NODE)
      expect(secondFindNodeRequest.key).to.equalBytes(closestPeerWithoutAddresses.id.toBytes())

      // don't know closestPeerWithoutAddresses
      await pb.write({
        type: MessageType.FIND_NODE
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

      await pb.write({
        type: MessageType.FIND_NODE,
        closer: []
      }, Message)

      const secondFindNodeRequest = await pb.read(Message)
      expect(secondFindNodeRequest.type).to.equal(MessageType.FIND_NODE)
      expect(secondFindNodeRequest.key).to.equalBytes(closestPeerWithoutAddresses.id.toBytes())

      // don't know closestPeerWithoutAddresses
      await pb.write({
        type: MessageType.FIND_NODE
      }, Message)

      closestPeerInteractionsComplete.resolve()
    })

    const closest: Array<{ id: string, multiaddrs: string[] }> = []

    for await (const closer of peerRouting.getClosestPeers(key.multihash.bytes)) {
      closest.push({
        id: closer.id.toString(),
        multiaddrs: closer.multiaddrs.map(ma => ma.toString())
      })

      receivedFirstClosest.resolve()
    }

    // should have received the closest peers
    expect(closest).to.deep.equal([{
      id: closestPeer.id.toString(),
      multiaddrs: closestPeer.addresses.map(({ multiaddr }) => multiaddr.toString())
    }])

    await expect(remotePeerInteractionsComplete.promise).to.eventually.be.undefined()
    await expect(closestPeerInteractionsComplete.promise).to.eventually.be.undefined()
  })
})
