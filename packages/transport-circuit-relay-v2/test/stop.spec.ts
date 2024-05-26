/* eslint-env mocha */

import { TypedEventEmitter, type TypedEventTarget, type ComponentLogger, type Libp2pEvents, type Connection, type Stream, type ConnectionGater, type ContentRouting, type PeerId, type PeerStore, type Upgrader } from '@libp2p/interface'
import { isStartable } from '@libp2p/interface'
import { mockStream } from '@libp2p/interface-compliance-tests/mocks'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { duplexPair } from 'it-pair/duplex'
import { pbStream, type MessageStream } from 'it-protobuf-stream'
import Sinon from 'sinon'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { Status, StopMessage } from '../src/pb/index.js'
import { CircuitRelayTransport } from '../src/transport/transport.js'
import type { AddressManager, ConnectionManager, Registrar, StreamHandler, TransportManager } from '@libp2p/interface-internal'

interface StubbedCircuitRelayTransportComponents {
  peerId: PeerId
  peerStore: PeerStore
  registrar: StubbedInstance<Registrar>
  connectionManager: StubbedInstance<ConnectionManager>
  transportManager: StubbedInstance<TransportManager>
  upgrader: StubbedInstance<Upgrader>
  addressManager: StubbedInstance<AddressManager>
  contentRouting: StubbedInstance<ContentRouting>
  connectionGater: StubbedInstance<ConnectionGater>
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

describe('circuit-relay stop protocol', function () {
  let transport: CircuitRelayTransport
  let components: StubbedCircuitRelayTransportComponents
  let handler: StreamHandler
  let pbstr: MessageStream<StopMessage>
  let sourcePeer: PeerId
  const stopTimeout = 100
  let localStream: Stream
  let remoteStream: Stream

  beforeEach(async () => {
    components = {
      addressManager: stubInterface<AddressManager>(),
      connectionManager: stubInterface<ConnectionManager>(),
      contentRouting: stubInterface<ContentRouting>(),
      peerId: await createEd25519PeerId(),
      peerStore: stubInterface<PeerStore>(),
      registrar: stubInterface<Registrar>(),
      transportManager: stubInterface<TransportManager>(),
      upgrader: stubInterface<Upgrader>(),
      connectionGater: stubInterface<ConnectionGater>(),
      events: new TypedEventEmitter(),
      logger: defaultLogger()
    }

    transport = new CircuitRelayTransport(components, {
      stopTimeout
    })

    if (isStartable(transport)) {
      await transport.start()
    }

    sourcePeer = await createEd25519PeerId()

    handler = components.registrar.handle.getCall(0).args[1]

    const [localDuplex, remoteDuplex] = duplexPair<any>()

    localStream = mockStream(localDuplex)
    remoteStream = mockStream(remoteDuplex)

    handler({
      stream: remoteStream,
      connection: stubInterface<Connection>()
    })

    pbstr = pbStream(localStream).pb(StopMessage)
  })

  this.afterEach(async function () {
    if (isStartable(transport)) {
      await transport.stop()
    }
  })

  it('handle stop - success', async function () {
    await pbstr.write({
      type: StopMessage.Type.CONNECT,
      peer: {
        id: sourcePeer.toBytes(),
        addrs: []
      }
    })

    const response = await pbstr.read()
    expect(response.status).to.be.equal(Status.OK)
  })

  it('handle stop error - invalid request - missing type', async function () {
    await pbstr.write({})

    const response = await pbstr.read()
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('handle stop error - invalid request - wrong type', async function () {
    await pbstr.write({
      type: StopMessage.Type.STATUS,
      peer: {
        id: sourcePeer.toBytes(),
        addrs: []
      }
    })

    const response = await pbstr.read()
    expect(response.status).to.be.equal(Status.UNEXPECTED_MESSAGE)
  })

  it('handle stop error - invalid request - missing peer', async function () {
    await pbstr.write({
      type: StopMessage.Type.CONNECT
    })

    const response = await pbstr.read()
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('handle stop error - invalid request - invalid peer addr', async function () {
    await pbstr.write({
      type: StopMessage.Type.CONNECT,
      peer: {
        id: sourcePeer.toBytes(),
        addrs: [
          new Uint8Array(32)
        ]
      }
    })

    const response = await pbstr.read()
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('handle stop error - timeout', async function () {
    const abortSpy = Sinon.spy(remoteStream, 'abort')

    await pbstr.write({
      type: StopMessage.Type.CONNECT,
      peer: {
        id: sourcePeer.toBytes(),
        addrs: []
      }
    })

    // take longer than `stopTimeout` to read the response
    await delay(stopTimeout * 2)

    // should have aborted remote stream
    expect(abortSpy).to.have.property('called', true)
  })

  it('should try to listen on the address of a relay we are dialed via if no reservation exists', async () => {
    const remotePeer = await createEd25519PeerId()
    const remoteAddr = multiaddr(`/ip4/127.0.0.1/tcp/4001/p2p/${remotePeer}`)
    transport.reservationStore.hasReservation = Sinon.stub().returns(false)
    const connection = stubInterface<Connection>({
      remotePeer,
      remoteAddr
    })

    components.transportManager.listen.returns(Promise.resolve())

    void transport.onStop({
      connection,
      stream: remoteStream
    })

    await pbstr.write({
      type: StopMessage.Type.CONNECT,
      peer: {
        id: sourcePeer.toBytes(),
        addrs: []
      }
    })

    const response = await pbstr.read()
    expect(response.status).to.be.equal(Status.OK)

    expect(components.transportManager.listen.called).to.be.true()
    expect(components.transportManager.listen.getCall(0).args[0][0].toString()).to.equal(
      remoteAddr.encapsulate('/p2p-circuit').toString(),
      'did not dial relay we did not have a reservation on'
    )
  })

  it('Should not be a transient connection if the relay has no limit', async () => {
    const remotePeer = await createEd25519PeerId()
    const remoteAddr = multiaddr(`/ip4/127.0.0.1/tcp/4001/p2p/${remotePeer}`)

    transport.reservationStore.hasReservation = Sinon.stub().returns(false)
    const connection = stubInterface<Connection>({
      remotePeer,
      remoteAddr
    })

    components.transportManager.listen.returns(Promise.resolve())

    void transport.onStop({
      connection,
      stream: remoteStream
    })

    await pbstr.write({
      type: StopMessage.Type.CONNECT,
      peer: {
        id: sourcePeer.toBytes(),
        addrs: []
      }
    })

    expect(connection.transient).to.be.false()
  })
})
