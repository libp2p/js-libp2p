import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { streamPair, pbStream } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { TypedEventEmitter } from 'main-event'
import { stubInterface } from 'sinon-ts'
import { IdentifyPush } from '../src/identify-push.js'
import { Identify as IdentifyMessage } from '../src/pb/message.js'
import type { ComponentLogger, Connection, Libp2pEvents, NodeInfo, PeerId, PeerStore, PrivateKey, TypedEventTarget } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedIdentifyComponents {
  peerId: PeerId
  privateKey: PrivateKey
  peerStore: StubbedInstance<PeerStore>
  registrar: StubbedInstance<Registrar>
  connectionManager: StubbedInstance<ConnectionManager>
  addressManager: StubbedInstance<AddressManager>
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
  nodeInfo: NodeInfo
}

describe('identify (push)', () => {
  let components: StubbedIdentifyComponents
  let identify: IdentifyPush

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')
    const peerId = peerIdFromPrivateKey(privateKey)

    components = {
      peerId,
      privateKey,
      peerStore: stubInterface<PeerStore>(),
      connectionManager: stubInterface<ConnectionManager>(),
      registrar: stubInterface<Registrar>(),
      addressManager: stubInterface<AddressManager>(),
      events: new TypedEventEmitter<Libp2pEvents>(),
      logger: defaultLogger(),
      nodeInfo: {
        name: 'test',
        version: '1.0.0',
        userAgent: 'test'
      }
    }
  })

  afterEach(async () => {
    await stop(identify)
  })

  it('should register for identify push protocol on start', async () => {
    identify = new IdentifyPush(components)

    await start(identify)

    expect(components.registrar.handle.called).to.be.true('identify push not handled')
    expect(components.registrar.handle.getCall(0).args[0]).to.equal('/ipfs/id/push/1.0.0')
  })

  it('should be able to push identify updates to another peer', async () => {
    identify = new IdentifyPush(components)

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const [outgoingStream, incomingStream] = await streamPair()
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/push/1.0.0').resolves(outgoingStream)

    components.connectionManager.getConnections.returns([
      connection
    ])

    components.addressManager.getAddresses.returns([multiaddr(`/ip4/123.123.123.123/tcp/123/p2p/${components.peerId}`)])
    components.registrar.getProtocols.returns(['/super/fun/protocol'])

    // local peer data
    components.peerStore.get.withArgs(components.peerId).resolves({
      id: components.peerId,
      addresses: [],
      protocols: [],
      metadata: new Map(),
      tags: new Map()
    })

    // connected peer that supports identify push
    components.peerStore.get.withArgs(remotePeer).resolves({
      id: components.peerId,
      addresses: [],
      protocols: ['/ipfs/id/push/1.0.0'],
      metadata: new Map(),
      tags: new Map()
    })

    // push update to connections
    void identify.push()

    const pb = pbStream(incomingStream)
    const message = await pb.read(IdentifyMessage)

    expect(message.protocols).to.include('/super/fun/protocol')
    expect(message.listenAddrs.map(addr => multiaddr(addr).toString())).to.include('/ip4/123.123.123.123/tcp/123')
    expect(message.signedPeerRecord).to.be.ok('did not include a signed peer record')
  })

  it('should handle incoming push', async () => {
    identify = new IdentifyPush(components)

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const [outgoingStream, incomingStream] = await streamPair()
    const connection = stubInterface<Connection>({
      remotePeer
    })

    const updatedProtocol = '/special-new-protocol/1.0.0'
    const updatedAddress = multiaddr('/ip4/127.0.0.1/tcp/48322')

    const pb = pbStream(outgoingStream)
    void pb.write({
      publicKey: publicKeyToProtobuf(remotePeer.publicKey),
      protocols: [
        updatedProtocol
      ],
      listenAddrs: [
        updatedAddress.bytes
      ]
    }, IdentifyMessage)

    components.peerStore.patch.reset()

    await identify.handleProtocol(incomingStream, connection)

    expect(components.peerStore.patch.callCount).to.equal(1)
    const updatedId = components.peerStore.patch.getCall(0).args[0]
    expect(updatedId).to.deep.equal(remotePeer)

    const update = components.peerStore.patch.getCall(0).args[1]
    expect(update.protocols).to.include(updatedProtocol)
    expect(update.addresses?.map(({ multiaddr }) => multiaddr.toString())).deep.equals([updatedAddress.toString()])
  })

  it('should time out during push identify', async () => {
    identify = new IdentifyPush(components, {
      timeout: 10
    })

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const [, incomingStream] = await streamPair()
    const connection = stubInterface<Connection>({
      remotePeer
    })

    components.peerStore.patch.reset()

    await expect(identify.handleProtocol(incomingStream, connection)).to.eventually.be.rejected
      .with.property('name', 'TimeoutError')

    expect(components.peerStore.patch.callCount).to.equal(0, 'patched peer when push timed out')
  })

  it('should debounce outgoing pushes', async () => {
    identify = new IdentifyPush(components, {
      timeout: 10
    })

    await start(identify)

    components.addressManager.getAddresses.returns([multiaddr(`/ip4/123.123.123.123/tcp/123/p2p/${components.peerId}`)])
    components.registrar.getProtocols.returns(['/super/fun/protocol'])
    components.peerStore.get.withArgs(components.peerId).resolves({
      id: components.peerId,
      addresses: [],
      protocols: [],
      metadata: new Map(),
      tags: new Map()
    })

    expect(components.connectionManager.getConnections.called).to.be.false()

    identify.push()
    identify.push()
    identify.push()
    identify.push()
    identify.push()
    identify.push()

    await delay(2_000)

    expect(components.connectionManager.getConnections.callCount).to.equal(1)
  })
})
