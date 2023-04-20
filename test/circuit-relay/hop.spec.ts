/* eslint-env mocha */
/* eslint max-nested-callbacks: ['error', 5] */

import type { Connection, Stream } from '@libp2p/interface-connection'
import { mockRegistrar, mockUpgrader, mockNetwork, mockConnectionManager, mockConnectionGater } from '@libp2p/interface-mocks'
import { expect } from 'aegir/chai'
import { circuitRelayServer, CircuitRelayService, circuitRelayTransport } from '../../src/circuit-relay/index.js'
import { HopMessage, Status } from '../../src/circuit-relay/pb/index.js'
import { MessageStream, pbStream } from 'it-pb-stream'
import type { PeerStore } from '@libp2p/interface-peer-store'
import { StubbedInstance, stubInterface } from 'sinon-ts'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { ContentRouting } from '@libp2p/interface-content-routing'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import type { Registrar } from '@libp2p/interface-registrar'
import type { Transport, TransportManager, Upgrader } from '@libp2p/interface-transport'
import { isStartable } from '@libp2p/interfaces/startable'
import { Multiaddr, multiaddr } from '@multiformats/multiaddr'
import type { PeerId } from '@libp2p/interface-peer-id'
import { DEFAULT_MAX_RESERVATION_STORE_SIZE, RELAY_SOURCE_TAG, RELAY_V2_HOP_CODEC } from '../../src/circuit-relay/constants.js'
import { PeerMap } from '@libp2p/peer-collections'
import { matchPeerId } from '../fixtures/match-peer-id.js'
import type { CircuitRelayServerInit } from '../../src/circuit-relay/server/index.js'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { ConnectionGater } from '@libp2p/interface-connection-gater'
import Sinon from 'sinon'
import { EventEmitter } from '@libp2p/interfaces/events'

interface Node {
  peerId: PeerId
  multiaddr: Multiaddr
  registrar: Registrar
  peerStore: StubbedInstance<PeerStore>
  circuitRelayService: CircuitRelayService
  upgrader: Upgrader
  connectionManager: ConnectionManager
  circuitRelayTransport: Transport
  connectionGater: ConnectionGater
}

let peerIndex = 0

describe('circuit-relay hop protocol', function () {
  let relayNode: Node
  let clientNode: Node
  let targetNode: Node
  let nodes: Node[]

  async function createNode (circuitRelayInit?: CircuitRelayServerInit): Promise<Node> {
    peerIndex++

    const peerId = await createEd25519PeerId()
    const registrar = mockRegistrar()
    const connections = new PeerMap<Connection>()

    const octet = peerIndex + 100
    const port = peerIndex + 10000
    const ma = multiaddr(`/ip4/${octet}.${octet}.${octet}.${octet}/tcp/${port}/p2p/${peerId.toString()}`)

    const addressManager = stubInterface<AddressManager>()
    addressManager.getAddresses.returns([
      ma
    ])
    const peerStore = stubInterface<PeerStore>()

    const connectionManager = mockConnectionManager({
      peerId,
      registrar
    })

    const events = new EventEmitter()
    events.addEventListener('connection:open', (evt) => {
      const conn = evt.detail
      connections.set(conn.remotePeer, conn)
    })
    events.addEventListener('connection:close', (evt) => {
      const conn = evt.detail
      connections.delete(conn.remotePeer)
    })

    const upgrader = mockUpgrader({
      registrar
    })

    const connectionGater = mockConnectionGater()

    const service = circuitRelayServer(circuitRelayInit)({
      addressManager,
      contentRouting: stubInterface<ContentRouting>(),
      connectionManager,
      peerId,
      peerStore,
      registrar,
      connectionGater
    })

    if (isStartable(service)) {
      await service.start()
    }

    const transport = circuitRelayTransport({})({
      addressManager,
      connectionManager,
      contentRouting: stubInterface<ContentRouting>(),
      peerId,
      peerStore,
      registrar,
      transportManager: stubInterface<TransportManager>(),
      upgrader,
      connectionGater,
      events
    })

    if (isStartable(transport)) {
      await transport.start()
    }

    const node: Node = {
      peerId,
      multiaddr: ma,
      registrar,
      circuitRelayService: service,
      peerStore,
      upgrader,
      connectionManager,
      circuitRelayTransport: transport,
      connectionGater
    }

    mockNetwork.addNode(node)
    nodes.push(node)

    return node
  }

  async function openStream (client: Node, relay: Node, protocol: string): Promise<MessageStream<HopMessage, Stream>> {
    const connection = await client.connectionManager.openConnection(relay.peerId)
    const clientStream = await connection.newStream(protocol)
    return pbStream(clientStream).pb(HopMessage)
  }

  async function makeReservation (client: Node, relay: Node): Promise<{ response: HopMessage, clientPbStream: MessageStream<HopMessage> }> {
    const clientPbStream = await openStream(client, relay, RELAY_V2_HOP_CODEC)

    // send reserve message
    clientPbStream.write({
      type: HopMessage.Type.RESERVE
    })

    return {
      response: await clientPbStream.read(),
      clientPbStream
    }
  }

  async function sendConnect (client: Node, target: Node, relay: Node): Promise<{ response: HopMessage, clientPbStream: MessageStream<HopMessage, Stream> }> {
    const clientPbStream = await openStream(client, relay, RELAY_V2_HOP_CODEC)

    // send reserve message
    clientPbStream.write({
      type: HopMessage.Type.CONNECT,
      peer: {
        id: target.peerId.toBytes(),
        addrs: [
          target.multiaddr.bytes
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

    relayNode = await createNode()
    clientNode = await createNode()
    targetNode = await createNode()
  })

  afterEach(async () => {
    for (const node of nodes) {
      if (isStartable(node.circuitRelayService)) {
        await node.circuitRelayService.stop()
      }

      if (isStartable(node.circuitRelayTransport)) {
        await node.circuitRelayTransport.stop()
      }
    }

    mockNetwork.reset()
  })

  describe('reserve', function () {
    it('error on unknown message type', async () => {
      const clientPbStream = await openStream(clientNode, relayNode, RELAY_V2_HOP_CODEC)

      // wrong initial message
      clientPbStream.write({
        type: HopMessage.Type.STATUS,
        status: Status.MALFORMED_MESSAGE
      })

      const msg = await clientPbStream.read()
      expect(msg).to.have.property('type', HopMessage.Type.STATUS)
      expect(msg).to.have.property('status', Status.UNEXPECTED_MESSAGE)
    })

    it('should reserve slot', async () => {
      const { response } = await makeReservation(clientNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.OK)
      expect(response).to.have.nested.property('reservation.expire').that.is.a('bigint')
      expect(response).to.have.nested.property('reservation.addrs').that.satisfies((val: Uint8Array[]) => {
        return val
          .map(buf => multiaddr(buf))
          .map(ma => ma.toString())
          .includes(relayNode.multiaddr.toString())
      })
      expect(response.limit).to.have.property('data').that.is.a('bigint')
      expect(response.limit).to.have.property('duration').that.is.a('number')

      const reservation = relayNode.circuitRelayService.reservations.get(clientNode.peerId)
      expect(reservation).to.have.nested.property('limit.data', response.limit?.data)
      expect(reservation).to.have.nested.property('limit.duration', response.limit?.duration)
    })

    it('should fail to reserve slot - denied by connection gater', async () => {
      relayNode.connectionGater.denyInboundRelayReservation = Sinon.stub().returns(true)

      const { response } = await makeReservation(clientNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.PERMISSION_DENIED)

      expect(relayNode.circuitRelayService.reservations.get(clientNode.peerId)).to.be.undefined()
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
      const { response } = await makeReservation(clientNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.RESERVATION_REFUSED)

      expect(relayNode.circuitRelayService.reservations.get(clientNode.peerId)).to.be.undefined()
    })

    it('should refresh previous reservation when store is full', async () => {
      const peers: Node[] = []

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
      expect(relayNode.circuitRelayService.reservations.get(clientNode.peerId)).to.be.undefined()

      // should be able to refresh older reservation
      const { response: successResponse } = await makeReservation(peers[0], relayNode)
      expect(successResponse).to.have.property('type', HopMessage.Type.STATUS)
      expect(successResponse).to.have.property('status', Status.OK)
      expect(relayNode.circuitRelayService.reservations.get(peers[0].peerId)).to.be.ok()
    })

    it('should tag peer making reservation', async () => {
      const { response } = await makeReservation(clientNode, relayNode)
      expect(response).to.have.property('type', HopMessage.Type.STATUS)
      expect(response).to.have.property('status', Status.OK)

      expect(relayNode.peerStore.tagPeer.calledWith(matchPeerId(clientNode.peerId), RELAY_SOURCE_TAG)).to.be.true()
    })
  })

  describe('connect', () => {
    it('should connect successfully', async () => {
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

      const clientPbStream = await openStream(clientNode, relayNode, RELAY_V2_HOP_CODEC)
      clientPbStream.write({
        type: HopMessage.Type.CONNECT,
        // @ts-expect-error {} is missing the following properties from peer: id, addrs
        peer: {}
      })

      const response = await clientPbStream.read()
      expect(response.type).to.be.equal(HopMessage.Type.STATUS)
      expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
    })

    it('should failed to connect - denied by connection gater', async () => {
      relayNode.connectionGater.denyOutboundRelayedConnection = Sinon.stub().returns(true)

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
