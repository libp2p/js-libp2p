import { generateKeyPair } from '@libp2p/crypto/keys'
import { isStartable } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { streamPair, pbStream } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { anySignal } from 'any-signal'
import { TypedEventEmitter } from 'main-event'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Status, StopMessage } from '../src/pb/index.js'
import { CircuitRelayTransport } from '../src/transport/index.js'
import type { ComponentLogger, Libp2pEvents, Connection, Stream, ConnectionGater, PeerId, PeerStore, Upgrader, StreamHandler } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, RandomWalk, Registrar, TransportManager } from '@libp2p/interface-internal'
import type { MessageStream } from 'it-protobuf-stream'
import type { TypedEventTarget } from 'main-event'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedCircuitRelayTransportComponents {
  peerId: PeerId
  peerStore: PeerStore
  registrar: StubbedInstance<Registrar>
  connectionManager: StubbedInstance<ConnectionManager>
  transportManager: StubbedInstance<TransportManager>
  upgrader: StubbedInstance<Upgrader>
  addressManager: StubbedInstance<AddressManager>
  randomWalk: StubbedInstance<RandomWalk>
  connectionGater: StubbedInstance<ConnectionGater>
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

describe('circuit-relay stop protocol', function () {
  let transport: CircuitRelayTransport
  let components: StubbedCircuitRelayTransportComponents
  let handler: StreamHandler
  let pbStr: MessageStream<StopMessage>
  let sourcePeer: PeerId
  const stopTimeout = 100
  let localStream: Stream
  let remoteStream: Stream

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')

    components = {
      addressManager: stubInterface<AddressManager>({
        getAddresses: Sinon.stub().returns([
          multiaddr('/ip4/127.0.0.1/tcp/4002')
        ])
      }),
      connectionManager: stubInterface<ConnectionManager>(),
      peerId: peerIdFromPrivateKey(privateKey),
      peerStore: stubInterface<PeerStore>(),
      randomWalk: stubInterface<RandomWalk>(),
      registrar: stubInterface<Registrar>(),
      transportManager: stubInterface<TransportManager>(),
      upgrader: stubInterface<Upgrader>({
        createInboundAbortSignal (signal) {
          return anySignal([
            signal,
            AbortSignal.timeout(stopTimeout)
          ])
        }
      }),
      connectionGater: stubInterface<ConnectionGater>(),
      events: new TypedEventEmitter(),
      logger: defaultLogger()
    }

    transport = new CircuitRelayTransport(components)

    if (isStartable(transport)) {
      await transport.start()
    }

    const sourcePrivateKey = await generateKeyPair('Ed25519')
    sourcePeer = peerIdFromPrivateKey(sourcePrivateKey)

    handler = components.registrar.handle.getCall(0).args[1]

    ;[localStream, remoteStream] = await streamPair()

    handler(remoteStream, stubInterface<Connection>({
      remoteAddr: multiaddr('/ip4/127.0.0.1/tcp/4001')
    }))

    pbStr = pbStream(localStream).pb(StopMessage)
  })

  this.afterEach(async function () {
    if (isStartable(transport)) {
      await transport.stop()
    }
  })

  it('handle stop - success', async function () {
    await pbStr.write({
      type: StopMessage.Type.CONNECT,
      peer: {
        id: sourcePeer.toMultihash().bytes,
        addrs: []
      }
    })

    const response = await pbStr.read()
    expect(response.status).to.be.equal(Status.OK)
  })

  it('handle stop error - invalid request - missing type', async function () {
    await pbStr.write({})

    const response = await pbStr.read()
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('handle stop error - invalid request - wrong type', async function () {
    await pbStr.write({
      type: StopMessage.Type.STATUS,
      peer: {
        id: sourcePeer.toMultihash().bytes,
        addrs: []
      }
    })

    const response = await pbStr.read()
    expect(response.status).to.be.equal(Status.UNEXPECTED_MESSAGE)
  })

  it('handle stop error - invalid request - missing peer', async function () {
    await pbStr.write({
      type: StopMessage.Type.CONNECT
    })

    const response = await pbStr.read()
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('handle stop error - invalid request - invalid peer addr', async function () {
    await pbStr.write({
      type: StopMessage.Type.CONNECT,
      peer: {
        id: sourcePeer.toMultihash().bytes,
        addrs: [
          new Uint8Array(32)
        ]
      }
    })

    const response = await pbStr.read()
    expect(response.status).to.be.equal(Status.MALFORMED_MESSAGE)
  })

  it('should try to listen on the address of a relay we are dialed via if no reservation exists', async () => {
    const remotePrivateKey = await generateKeyPair('Ed25519')
    const remotePeer = peerIdFromPrivateKey(remotePrivateKey)
    const remoteAddr = multiaddr('/ip4/127.0.0.1/tcp/4001')
    transport.reservationStore.hasReservation = Sinon.stub().returns(false)
    const connection = stubInterface<Connection>({
      remotePeer,
      remoteAddr
    })

    components.transportManager.listen.returns(Promise.resolve())

    void transport.onStop(remoteStream, connection)

    await pbStr.write({
      type: StopMessage.Type.CONNECT,
      peer: {
        id: sourcePeer.toMultihash().bytes,
        addrs: []
      }
    })

    const response = await pbStr.read()
    expect(response.status).to.be.equal(Status.OK)

    expect(components.transportManager.listen.called).to.be.true()
    expect(components.transportManager.listen.getCall(0).args[0][0].toString()).to.equal(
      remoteAddr.encapsulate('/p2p-circuit').toString(),
      'did not dial relay we did not have a reservation on'
    )
  })
})
