import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { pbStream, streamPair } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { TypedEventEmitter } from 'main-event'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { DEFAULT_MAX_RESERVATION_STORE_SIZE, RELAY_SOURCE_TAG, RELAY_V2_HOP_CODEC, RELAY_V2_STOP_CODEC } from '../src/constants.js'
import { HopMessage, Status } from '../src/pb/index.js'
import { CircuitRelayServer } from '../src/server/index.js'
import { CircuitRelayTransport } from '../src/transport/index.ts'
import type { Connection, Stream, PeerStore, Upgrader, ConnectionGater, TypedEventTarget, Libp2pEvents, PeerId, PrivateKey, ComponentLogger } from '@libp2p/interface'
import type { RandomWalk, AddressManager, ConnectionManager, Registrar, TransportManager } from '@libp2p/interface-internal'
import type { MessageStream } from 'it-protobuf-stream'
import type { StubbedInstance } from 'sinon-ts'

let peerIndex = 0

interface StubbedCircuitRelayServerComponents {
  registrar: StubbedInstance<Registrar>
  peerStore: StubbedInstance<PeerStore>
  addressManager: StubbedInstance<AddressManager>
  peerId: PeerId
  privateKey: PrivateKey
  connectionManager: StubbedInstance<ConnectionManager>
  connectionGater: StubbedInstance<ConnectionGater>
  logger: ComponentLogger
}

interface StubbedCircuitRelayTransportComponents {
  peerStore: PeerStore
  connectionManager: StubbedInstance<ConnectionManager>
  transportManager: StubbedInstance<TransportManager>
  registrar: StubbedInstance<Registrar>
  logger: ComponentLogger
  randomWalk: StubbedInstance<RandomWalk>
  events: TypedEventTarget<Libp2pEvents>
  peerId: PeerId
  upgrader: StubbedInstance<Upgrader>
  addressManager: StubbedInstance<AddressManager>
  connectionGater: StubbedInstance<ConnectionGater>
}

interface RelayServer {
  server: CircuitRelayServer
  components: StubbedCircuitRelayServerComponents
}

interface Peer {
  transport: CircuitRelayTransport
  components: StubbedCircuitRelayTransportComponents
}

describe('circuit-relay hop protocol', function () {
  let relayNode: RelayServer
  let clientNode: Peer
  let targetNode: Peer
  let nodes: Peer[]

  async function createNode (): Promise<Peer> {
    peerIndex++

    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)

    const octet = peerIndex + 100
    const port = peerIndex + 10000
    const ma = multiaddr(`/ip4/${octet}.${octet}.${octet}.${octet}/tcp/${port}/p2p/${peerId.toString()}`)

    const addressManager = stubInterface<AddressManager>()
    addressManager.getAddresses.returns([
      ma
    ])
    const peerStore = stubInterface<PeerStore>({
      all: async () => []
    })

    const components = {
      peerId,
      registrar: stubInterface<Registrar>(),
      upgrader: stubInterface<Upgrader>(),
      addressManager,
      connectionGater: stubInterface<ConnectionGater>(),
      events: new TypedEventEmitter(),
      peerStore,
      connectionManager: stubInterface<ConnectionManager>(),
      transportManager: stubInterface<TransportManager>(),
      logger: defaultLogger(),
      randomWalk: stubInterface<RandomWalk>()
    }

    const transport = new CircuitRelayTransport(components)

    await start(transport)

    return {
      components,
      transport
    }
  }

  async function openHopStream (client: Peer, relay: RelayServer, protocol: string = RELAY_V2_HOP_CODEC): Promise<MessageStream<HopMessage, Stream>> {
    const [outboundStream, inboundStream] = await streamPair({
      protocol
    })

    relay.server.onHop(inboundStream, stubInterface<Connection>({
      remotePeer: client.components.peerId,
      remoteAddr: client.components.addressManager.getAddresses()[0]
    }))

    return pbStream(outboundStream).pb(HopMessage)
  }

  async function makeReservation (client: Peer, relay: RelayServer): Promise<{ response: HopMessage, clientPbStream: MessageStream<HopMessage> }> {
    const clientPbStream = await openHopStream(client, relay)

    // send reserve message
    await clientPbStream.write({
      type: HopMessage.Type.RESERVE
    })

    return {
      response: await clientPbStream.read(),
      clientPbStream
    }
  }

  async function sendConnect (client: Peer, target: Peer, relay: RelayServer): Promise<{ response: HopMessage, clientPbStream: MessageStream<HopMessage, Stream> }> {
    const clientPbStream = await openHopStream(client, relay)

    // send reserve message
    await clientPbStream.write({
      type: HopMessage.Type.CONNECT,
      peer: {
        id: target.components.peerId.toMultihash().bytes,
        addrs: [
          target.components.addressManager.getAddresses()[0].bytes
        ]
      }
    })

    return {
      response: await clientPbStream.read(),
      clientPbStream
    }
  }

  beforeEach(async () => {
    nodes = []

    const addressManager = stubInterface<AddressManager>()
    addressManager.getAddresses.returns([
      multiaddr('/ip4/127.0.0.1/tcp/54321')
    ])

    const relayServerKey = await generateKeyPair('Ed25519')
    const relayComponents = {
      registrar: stubInterface<Registrar>(),
      peerStore: stubInterface<PeerStore>(),
      addressManager,
      peerId: peerIdFromPrivateKey(relayServerKey),
      privateKey: relayServerKey,
      connectionManager: stubInterface<ConnectionManager>(),
      connectionGater: stubInterface<ConnectionGater>(),
      logger: defaultLogger()
    }
    relayNode = {
      server: new CircuitRelayServer(relayComponents),
      components: relayComponents
    }

    clientNode = await createNode()
    targetNode = await createNode()
  })

  afterEach(async () => {
    await stop(relayNode, clientNode, targetNode, ...nodes)
  })

  describe('reserve', function () {
    it('error on unknown message type', async () => {
      const clientPbStream = await openHopStream(clientNode, relayNode)

      // wrong initial message
      await clientPbStream.write({
        type: HopMessage.Type.STATUS,
        status: Status.MALFORMED_MESSAGE
      })

      const msg = await clientPbStream.read()
      expect(msg).to.have.property('type', HopMessage.Type.STATUS)
      expect(msg).to.have.property('status', Status.UNEXPECTED_MESSAGE)
    })

    it('should reserve slot', async () => {
      const relayMultiaddr = multiaddr('/ip4/127.0.0.1/tcp/1234')
      relayNode.components.addressManager.getAddresses.returns([
        relayMultiaddr
      ])

      const { response } = await makeReservation(clientNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.OK)
      expect(response).to.have.nested.property('reservation.expire').that.is.a('bigint')
      expect(response).to.have.nested.property('reservation.addrs').that.satisfies((val: Uint8Array[]) => {
        return val
          .map(buf => multiaddr(buf))
          .map(ma => ma.toString())
          .includes(relayMultiaddr.toString())
      })
      expect(response.limit).to.have.property('data').that.is.a('bigint')
      expect(response.limit).to.have.property('duration').that.is.a('number')

      const reservation = relayNode.server.reservations.get(clientNode.components.peerId)
      expect(reservation).to.have.nested.property('limit.data', response.limit?.data)
      expect(reservation).to.have.nested.property('limit.duration', response.limit?.duration)
    })

    it('should fail to reserve slot - denied by connection gater', async () => {
      relayNode.components.connectionGater.denyInboundRelayReservation = Sinon.stub<any>().returns(true)

      const { response } = await makeReservation(targetNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.PERMISSION_DENIED)

      expect(relayNode.server.reservations.get(clientNode.components.peerId)).to.be.undefined()
    })

    it('should fail to reserve slot - resource exceeded', async () => {
      // fill all the available reservation slots
      for (let i = 0; i < DEFAULT_MAX_RESERVATION_STORE_SIZE; i++) {
        const peer = await createNode()
        const { response } = await makeReservation(peer, relayNode)
        expect(response).to.have.property('type', HopMessage.Type.STATUS)
        expect(response).to.have.property('status', Status.OK)
      }

      // next reservation should fail
      const { response } = await makeReservation(targetNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.RESERVATION_REFUSED)

      expect(relayNode.server.reservations.get(targetNode.components.peerId)).to.be.undefined()
    })

    it('should refresh previous reservation when store is full', async () => {
      const peers: Peer[] = []

      // fill all the available reservation slots
      for (let i = 0; i < DEFAULT_MAX_RESERVATION_STORE_SIZE; i++) {
        const peer = await createNode()
        peers.push(peer)

        const { response } = await makeReservation(peer, relayNode)
        expect(response).to.have.property('type', HopMessage.Type.STATUS)
        expect(response).to.have.property('status', Status.OK)
      }

      // next reservation should fail
      const { response: failureResponse } = await makeReservation(clientNode, relayNode)
      expect(failureResponse).to.have.property('type', HopMessage.Type.STATUS)
      expect(failureResponse).to.have.property('status', Status.RESERVATION_REFUSED)
      expect(relayNode.server.reservations.get(clientNode.components.peerId)).to.be.undefined()

      // should be able to refresh older reservation
      const { response: successResponse } = await makeReservation(peers[0], relayNode)
      expect(successResponse).to.have.property('type', HopMessage.Type.STATUS)
      expect(successResponse).to.have.property('status', Status.OK)
      expect(relayNode.server.reservations.get(peers[0].components.peerId)).to.be.ok()
    })

    it('should tag peer making reservation', async () => {
      const { response } = await makeReservation(clientNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.OK)

      expect(relayNode.components.peerStore.merge.calledWith(clientNode.components.peerId, {
        tags: {
          [RELAY_SOURCE_TAG]: {
            value: 1,
            ttl: Sinon.match.number as unknown as number
          }
        }
      })).to.be.true()
    })
  })

  describe('connect', () => {
    it('should connect successfully', async () => {
      const [stopOutgoing, stopIncoming] = await streamPair({
        protocol: RELAY_V2_STOP_CODEC
      })

      // stub server -> target
      const relayToTargetOutgoing = stubInterface<Connection>({
        newStream: Sinon.stub().withArgs(RELAY_V2_STOP_CODEC).resolves(stopOutgoing)
      })
      relayNode.components.connectionManager.getConnections.withArgs(targetNode.components.peerId).returns([
        relayToTargetOutgoing
      ])

      // stub server <- target
      const relayToTargetIncoming = stubInterface<Connection>({
        remotePeer: relayNode.components.peerId,
        remoteAddr: relayNode.components.addressManager.getAddresses()[0]
      })
      void targetNode.transport.onStop(stopIncoming, relayToTargetIncoming)

      // both peers make a reservation on the relay
      await expect(makeReservation(clientNode, relayNode)).to.eventually.have.nested.property('response.status', Status.OK)
      await expect(makeReservation(targetNode, relayNode)).to.eventually.have.nested.property('response.status', Status.OK)

      // client peer sends CONNECT to target peer
      const { response } = await sendConnect(clientNode, targetNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.OK)
    })

    it('should fail to connect - invalid request', async () => {
      // both peers make a reservation on the relay
      await expect(makeReservation(clientNode, relayNode)).to.eventually.have.nested.property('response.status', Status.OK)
      await expect(makeReservation(targetNode, relayNode)).to.eventually.have.nested.property('response.status', Status.OK)

      const clientPbStream = await openHopStream(clientNode, relayNode, RELAY_V2_HOP_CODEC)
      await clientPbStream.write({
        type: HopMessage.Type.CONNECT,
        // @ts-expect-error {} is missing the following properties from peer: id, addrs
        peer: {}
      })

      const response = await clientPbStream.read()
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
    })

    it('should failed to connect - denied by connection gater', async () => {
      relayNode.components.connectionGater.denyOutboundRelayedConnection = Sinon.stub<any>().returns(true)

      // both peers make a reservation on the relay
      await expect(makeReservation(clientNode, relayNode)).to.eventually.have.nested.property('response.status', Status.OK)
      await expect(makeReservation(targetNode, relayNode)).to.eventually.have.nested.property('response.status', Status.OK)

      // client peer sends CONNECT to target peer
      const { response } = await sendConnect(clientNode, targetNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.PERMISSION_DENIED)
    })

    it('should fail to connect - no connection', async () => {
      // target peer has no reservation on the relay
      await expect(makeReservation(clientNode, relayNode)).to.eventually.have.nested.property('response.status', Status.OK)

      // client peer sends CONNECT to target peer
      const { response } = await sendConnect(clientNode, targetNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.NO_RESERVATION)
    })
  })
})
