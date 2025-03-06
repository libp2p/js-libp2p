import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { TypedEventEmitter, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { pair } from 'it-pair'
import { pbStream } from 'it-protobuf-stream'
import { stubInterface } from 'sinon-ts'
import { IdentifyPush } from '../src/identify-push.js'
import { Identify as IdentifyMessage } from '../src/pb/message.js'
import { identifyPushStream, type StubbedIdentifyComponents } from './fixtures/index.js'
import type { Libp2pEvents, PeerStore } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'

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
    const { stream, connection } = identifyPushStream(remotePeer)
    const duplex = pair<any>()
    stream.source = duplex.source
    stream.sink.callsFake(async (source) => duplex.sink(source))

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

    const pb = pbStream(stream)
    const message = await pb.read(IdentifyMessage)

    expect(message.protocols).to.include('/super/fun/protocol')
    expect(message.listenAddrs.map(addr => multiaddr(addr).toString())).to.include('/ip4/123.123.123.123/tcp/123')
    expect(message.signedPeerRecord).to.be.ok('did not include a signed peer record')
  })

  it('should handle incoming push', async () => {
    identify = new IdentifyPush(components)

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const { stream, connection } = identifyPushStream(remotePeer)
    const duplex = pair<any>()
    stream.source = duplex.source
    stream.sink.callsFake(async (source) => duplex.sink(source))

    const updatedProtocol = '/special-new-protocol/1.0.0'
    const updatedAddress = multiaddr('/ip4/127.0.0.1/tcp/48322')

    const pb = pbStream(stream)
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

    await identify.handleProtocol({
      stream,
      connection
    })

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
    const { stream, connection } = identifyPushStream(remotePeer)
    const duplex = pair<any>()
    stream.source = duplex.source
    stream.sink.callsFake(async (source) => duplex.sink(source))

    components.peerStore.patch.reset()

    await expect(identify.handleProtocol({
      stream,
      connection
    })).to.eventually.be.undefined()

    expect(components.peerStore.patch.callCount).to.equal(0, 'patched peer when push timed out')
    expect(stream.abort.callCount).to.equal(1, 'did not abort stream')
  })

  it('should limit the number of concurrent identify-push requests', async () => {
    identify = new IdentifyPush(components, { concurrency: 2 })

    await start(identify)

    const pushSpy = sinon.spy(identify, 'push')

    await identify.push()

    expect(pushSpy.callCount).to.be.at.most(2)
  })
})
