import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { TypedEventEmitter, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { PeerRecord, RecordEnvelope } from '@libp2p/peer-record'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import drain from 'it-drain'
import * as lp from 'it-length-prefixed'
import { duplexPair } from 'it-pair/duplex'
import { pbStream } from 'it-protobuf-stream'
import { pushable } from 'it-pushable'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Identify } from '../src/identify.js'
import { Identify as IdentifyMessage } from '../src/pb/message.js'
import { identifyConnection, identifyStream } from './fixtures/index.js'
import type { StubbedIdentifyComponents } from './fixtures/index.js'
import type { Libp2pEvents, PeerStore, Connection, Stream } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { Uint8ArrayList } from 'uint8arraylist'

describe('identify', () => {
  let components: StubbedIdentifyComponents
  let identify: Identify

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

  it('should register for identify protocol on start', async () => {
    identify = new Identify(components)

    await start(identify)

    expect(components.registrar.handle.called).to.be.true('identify push not handled')
    expect(components.registrar.handle.getCall(0).args[0]).to.equal('/ipfs/id/1.0.0')
  })

  it('should be able to identify another peer', async () => {
    identify = new Identify(components)

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const message: IdentifyMessage = {
      listenAddrs: [
        multiaddr('/ip4/123.123.123.123/tcp/123').bytes
      ],
      protocols: [
        '/foo/bar/1.0'
      ],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey)
    }

    const connection = identifyConnection(remotePeer, message)

    // run identify
    const response = await identify.identify(connection)

    expect(response.peerId.toString()).to.equal(remotePeer.toString())
    expect(response.protocols).to.deep.equal(message.protocols)
    expect(response.listenAddrs.map(ma => ma.toString())).to.deep.equal(['/ip4/123.123.123.123/tcp/123'])
  })

  it('should throw if identified peer is the wrong peer', async () => {
    identify = new Identify(components)

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const otherPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const connection = identifyConnection(remotePeer, {
      listenAddrs: [],
      protocols: [],
      publicKey: publicKeyToProtobuf(otherPeer.publicKey)
    })

    // run identify
    await expect(identify.identify(connection))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'InvalidMessageError')
  })

  it('should store own host data and protocol version into metadataBook on start', async () => {
    const agentVersion = 'js-project/1.0.0'
    const protocolVersion = '/my/id/0.1.0'

    identify = new Identify(components, {
      agentVersion,
      protocolPrefix: '/my/id'
    })

    await start(identify)

    expect(components.peerStore.merge.getCall(0).args).to.deep.equal([components.peerId, {
      metadata: {
        AgentVersion: uint8ArrayFromString(agentVersion),
        ProtocolVersion: uint8ArrayFromString(protocolVersion)
      }
    }])
  })

  it('should time out during identify', async () => {
    const timeout = 10
    identify = new Identify(components)

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const { connection, stream } = identifyStream(remotePeer)

    // eslint-disable-next-line require-yield
    stream.source = (async function * () {
      await delay(timeout * 10)
    })()

    // run identify with timeout
    await expect(identify.identify(connection, {
      signal: AbortSignal.timeout(timeout)
    }))
      .to.eventually.be.rejected.with.property('name', 'AbortError')

    // should have aborted stream
    expect(stream.abort.called).to.be.true()
  })

  it('should limit incoming identify message sizes', async () => {
    const maxMessageSize = 100

    identify = new Identify(components, {
      maxMessageSize
    })

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const { connection, stream } = identifyStream(remotePeer)

    const input = stream.source = pushable<Uint8ArrayList>()
    stream.sink.callsFake(async (source) => {
      await drain(source)
    })

    void input.push(lp.encode.single(new Uint8Array(maxMessageSize + 1)))

    // run identify
    await expect(identify.identify(connection))
      .to.eventually.be.rejected.with.property('name', 'InvalidDataLengthError')

    // should have aborted stream
    expect(stream.abort.called).to.be.true()
  })

  it('should retain existing peer metadata when updating agent/protocol version', async () => {
    identify = new Identify(components)

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const connection = identifyConnection(remotePeer, {
      listenAddrs: [],
      protocols: [],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey),
      agentVersion: 'secret-agent',
      protocolVersion: '9000'
    })

    // peer exists in peer store
    components.peerStore.get.withArgs(remotePeer).resolves({
      id: remotePeer,
      addresses: [],
      protocols: [],
      metadata: new Map([['foo', uint8ArrayFromString('bar')]]),
      tags: new Map()
    })

    // reset call count after startup
    components.peerStore.merge.reset()

    // run identify
    await identify.identify(connection)

    // peer record was patched but not with metadata
    expect(components.peerStore.patch.callCount).to.equal(1)
    expect(components.peerStore.patch.getCall(0).args[1].metadata).to.be.undefined()

    // metadata was merged instead
    expect(components.peerStore.merge.callCount).to.be.equal(1)
    expect(components.peerStore.merge.getCall(0).args[1].metadata).to.have.property('AgentVersion')
    expect(components.peerStore.merge.getCall(0).args[1].metadata).to.have.property('ProtocolVersion')
  })

  it('should ignore older signed peer record', async () => {
    identify = new Identify(components)

    await start(identify)

    const remotePrivateKey = await generateKeyPair('Ed25519')
    const remotePeer = peerIdFromPrivateKey(remotePrivateKey)

    const oldPeerRecord = await RecordEnvelope.seal(new PeerRecord({
      peerId: remotePeer,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/1234')
      ],
      seqNumber: BigInt(1n)
    }), remotePrivateKey)

    const connection = identifyConnection(remotePeer, {
      listenAddrs: [],
      protocols: [],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey),
      signedPeerRecord: oldPeerRecord.marshal()
    })

    // peer exists in peer store with existing signed peer record
    const signedPeerRecord = await RecordEnvelope.seal(new PeerRecord({
      peerId: remotePeer,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/1234')
      ],
      seqNumber: BigInt(Date.now() * 2)
    }), remotePrivateKey)

    components.peerStore.get.resolves({
      id: remotePeer,
      addresses: [],
      protocols: [],
      metadata: new Map([['foo', uint8ArrayFromString('bar')]]),
      tags: new Map(),
      peerRecordEnvelope: signedPeerRecord.marshal()
    })

    // run identify
    await identify.identify(connection)

    // should have updated peer store entry
    expect(components.peerStore.patch.callCount).to.equal(1)

    // should have ignored older peer record
    expect(components.peerStore.patch.getCall(0).args[1])
      .to.have.property('peerRecordEnvelope').that.equalBytes(signedPeerRecord.marshal())
  })

  it('should store data without signed peer record', async () => {
    identify = new Identify(components)

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const message: IdentifyMessage = {
      protocolVersion: 'protocol version',
      agentVersion: 'agent version',
      listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/1234').bytes],
      protocols: ['protocols'],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey)
    }

    const connection = identifyConnection(remotePeer, message)

    // run identify
    await identify.identify(connection)

    expect(components.peerStore.patch.callCount).to.equal(1)

    // should have stored all passed data
    const peer = components.peerStore.patch.getCall(0).args[1]
    expect(peer.protocols).to.deep.equal(message.protocols)
    expect(peer.addresses).to.deep.equal([{
      isCertified: false,
      multiaddr: multiaddr('/ip4/127.0.0.1/tcp/1234')
    }])
    expect(peer.publicKey?.equals(remotePeer.publicKey)).to.be.true()
  })

  it('should prefer addresses from signed peer record', async () => {
    identify = new Identify(components)

    await start(identify)

    const remotePrivateKey = await generateKeyPair('Ed25519')
    const remotePeer = peerIdFromPrivateKey(remotePrivateKey)

    const signedPeerRecord = await RecordEnvelope.seal(new PeerRecord({
      peerId: remotePeer,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/5678')
      ],
      seqNumber: BigInt(Date.now() * 2)
    }), remotePrivateKey)
    const peerRecordEnvelope = signedPeerRecord.marshal()

    const message: IdentifyMessage = {
      protocolVersion: 'protocol version',
      agentVersion: 'agent version',
      listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/1234').bytes],
      protocols: ['protocols'],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey),
      signedPeerRecord: peerRecordEnvelope
    }

    const connection = identifyConnection(remotePeer, message)

    // run identify
    await identify.identify(connection)

    // should have stored all passed data but preferred the multiaddrs from the
    // signed peer record
    const peer = components.peerStore.patch.getCall(0).args[1]
    expect(peer.protocols).to.deep.equal(message.protocols)
    expect(peer.addresses).to.deep.equal([{
      isCertified: true,
      multiaddr: multiaddr('/ip4/127.0.0.1/tcp/5678')
    }])
    expect(peer.publicKey?.equals(remotePeer.publicKey)).to.be.true()
  })

  it('should not send un-routable observed addresses', async () => {
    identify = new Identify(components)

    await start(identify)

    const duplex = duplexPair<any>()
    const incomingStream = stubInterface<Stream>(duplex[0])
    const outgoingStream = stubInterface<Stream>(duplex[1])

    components.addressManager.getAddresses.returns([])

    // local peer data
    components.peerStore.get.resolves({
      id: components.peerId,
      addresses: [],
      protocols: [],
      metadata: new Map(),
      tags: new Map()
    })

    // handle identify
    void identify.handleProtocol({
      stream: incomingStream,
      connection: stubInterface<Connection>({
        remoteAddr: multiaddr('/webrtc/p2p/QmR5VwgsL7jyfZHAGyp66tguVrQhCRQuRc3NokocsCZ3fA')
      })
    })

    const pb = pbStream(outgoingStream)
    const result = await pb.read(IdentifyMessage)

    expect(result.observedAddr).to.be.undefined()
  })

  it('should ignore observed non global unicast IPv6 addresses', async () => {
    identify = new Identify(components)

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const message: IdentifyMessage = {
      protocolVersion: 'protocol version',
      agentVersion: 'agent version',
      listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/1234').bytes],
      protocols: ['protocols'],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey),
      observedAddr: multiaddr('/ip6/fe80::2892:aef3:af04:735a%en').bytes
    }

    const connection = identifyConnection(remotePeer, message)

    // run identify
    await identify.identify(connection)

    expect(components.addressManager.addObservedAddr.called).to.be.false()
  })
})
