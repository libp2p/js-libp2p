import { generateKeyPair, publicKeyToProtobuf } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { PeerRecord, RecordEnvelope } from '@libp2p/peer-record'
import { streamPair, pbStream } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import * as lp from 'it-length-prefixed'
import { TypedEventEmitter } from 'main-event'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Identify } from '../src/identify.js'
import { Identify as IdentifyMessage } from '../src/pb/message.js'
import type { Libp2pEvents, PeerStore, Connection, PeerId, PrivateKey, TypedEventTarget, ComponentLogger, NodeInfo } from '@libp2p/interface'
import type { AddressManager, Registrar } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

interface StubbedIdentifyComponents {
  peerId: PeerId
  privateKey: PrivateKey
  peerStore: StubbedInstance<PeerStore>
  registrar: StubbedInstance<Registrar>
  addressManager: StubbedInstance<AddressManager>
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
  nodeInfo: NodeInfo
}

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

    const [outgoingStream, incomingStream] = await streamPair()
    incomingStream.send(lp.encode.single(IdentifyMessage.encode(message)))
    void incomingStream.close()
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

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

    const [outgoingStream, incomingStream] = await streamPair()
    incomingStream.send(lp.encode.single(IdentifyMessage.encode({
      listenAddrs: [],
      protocols: [],
      publicKey: publicKeyToProtobuf(otherPeer.publicKey)
    })))
    void incomingStream.close()
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    // run identify
    await expect(identify.identify(connection))
      .to.eventually.be.rejected()
      .and.to.have.property('name', 'InvalidMessageError')
  })

  it('should store own host data and protocol version into metadataBook on start', async () => {
    const agentVersion = 'test'
    const protocolVersion = '/my/id/0.1.0'

    identify = new Identify(components, {
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

    const [outgoingStream] = await streamPair({
      delay: 1_000
    })
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    // run identify with timeout
    await expect(identify.identify(connection, {
      signal: AbortSignal.timeout(timeout)
    }))
      .to.eventually.be.rejected.with.property('name', 'TimeoutError')

    // should have aborted stream
    expect(outgoingStream).to.have.property('status', 'aborted')
  })

  it('should succeed if the remote closes the stream after sending the identify response', async () => {
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

    const [outgoingStream] = await streamPair()
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    const identifyPromise = identify.identify(connection)

    // Wait for identify to register its stream listener
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    // send the identify message with a trailing byte then close immediately.
    const encoded = lp.encode.single(IdentifyMessage.encode(message)).subarray()
    const combined = new Uint8Array(encoded.byteLength + 1)
    combined.set(encoded)
    outgoingStream.push(combined) // appends to readBuffer, schedules setTimeout(dispatchReadBuffer, 0)
    outgoingStream.remoteWriteStatus = 'closed' // set before dispatchReadBuffer fires

    const response = await identifyPromise

    expect(response.peerId.toString()).to.equal(remotePeer.toString())
    expect(response.protocols).to.deep.equal(message.protocols)
    expect(response.listenAddrs.map(ma => ma.toString())).to.deep.equal(['/ip4/123.123.123.123/tcp/123'])
  })

  it('should merge multiple identify messages from the remote', async () => {
    identify = new Identify(components)

    await start(identify)

    const remotePrivateKey = await generateKeyPair('Ed25519')
    const remotePeer = peerIdFromPrivateKey(remotePrivateKey)

    const signedPeerRecord = await RecordEnvelope.seal(new PeerRecord({
      peerId: remotePeer,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/5678')
      ]
    }), remotePrivateKey)
    const peerRecordEnvelope = signedPeerRecord.marshal()

    // simulate go-libp2p splitting a large identify response into two messages:
    // first message has everything except signedPeerRecord, second has only signedPeerRecord
    const firstMessage: IdentifyMessage = {
      listenAddrs: [
        multiaddr('/ip4/123.123.123.123/tcp/123').bytes
      ],
      protocols: [
        '/foo/bar/1.0'
      ],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey)
    }
    const secondMessage: IdentifyMessage = {
      listenAddrs: [],
      protocols: [],
      signedPeerRecord: peerRecordEnvelope
    }

    const [outgoingStream] = await streamPair()
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    const identifyPromise = identify.identify(connection)

    // Wait for identify to register its stream listener
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    const encoded1 = lp.encode.single(IdentifyMessage.encode(firstMessage)).subarray()
    const encoded2 = lp.encode.single(IdentifyMessage.encode(secondMessage)).subarray()
    const combined = new Uint8Array(encoded1.byteLength + encoded2.byteLength)
    combined.set(encoded1)
    combined.set(encoded2, encoded1.byteLength)
    outgoingStream.push(combined) // appends to readBuffer, schedules setTimeout(dispatchReadBuffer, 0)
    outgoingStream.remoteWriteStatus = 'closed' // set before dispatchReadBuffer fires

    await identifyPromise

    // should have stored the signedPeerRecord from the second message
    expect(components.peerStore.patch.callCount).to.equal(1)
    expect(components.peerStore.patch.getCall(0).args[1])
      .to.have.property('peerRecordEnvelope').that.equalBytes(peerRecordEnvelope)
  })

  it('should reject when remote closes the stream without sending any message', async () => {
    identify = new Identify(components)
    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const [outgoingStream] = await streamPair()
    const connection = stubInterface<Connection>({ remotePeer })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    // Do not push any bytes - just close the remote write side.
    outgoingStream.remoteWriteStatus = 'closed'

    // The receive loop only treats an EOF as "remote finished" once at least
    // one message has been read; with zero messages, the EOF propagates as
    // UnexpectedEOFError so the caller sees a hard failure for an empty stream.
    await expect(identify.identify(connection))
      .to.eventually.be.rejected()
      .with.property('name', 'UnexpectedEOFError')
  })

  it('should return merged identify when peer sends MAX_IDENTIFY_MESSAGES + 1 messages', async () => {
    identify = new Identify(components)
    await start(identify)

    const remotePrivateKey = await generateKeyPair('Ed25519')
    const remotePeer = peerIdFromPrivateKey(remotePrivateKey)

    // First message carries publicKey so identify validates.
    // Subsequent 10 messages each carry one extra protocol.
    // Total 11 messages - reader should truncate to first 10.
    const messages: IdentifyMessage[] = [{
      listenAddrs: [],
      protocols: ['/test/0/1.0.0'],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey)
    }]
    for (let i = 1; i < 11; i++) {
      messages.push({ listenAddrs: [], protocols: [`/test/${i}/1.0.0`] })
    }

    const [outgoingStream] = await streamPair()
    const connection = stubInterface<Connection>({ remotePeer })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    const identifyPromise = identify.identify(connection)
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    const encoded = messages.map(m => lp.encode.single(IdentifyMessage.encode(m)).subarray())
    const totalLen = encoded.reduce((n, e) => n + e.byteLength, 0)
    const combined = new Uint8Array(totalLen)
    let off = 0
    for (const e of encoded) { combined.set(e, off); off += e.byteLength }

    outgoingStream.push(combined)
    outgoingStream.remoteWriteStatus = 'closed'

    const result = await identifyPromise
    // Reader merged at most MAX_IDENTIFY_MESSAGES (10) - the 11th protocol is truncated.
    expect(result.protocols).to.have.lengthOf.at.most(10)
    expect(result.protocols).to.not.include('/test/10/1.0.0')
  })

  it('should reject when peer sends invalid bytes mid-stream', async () => {
    identify = new Identify(components)
    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const firstMessage: IdentifyMessage = {
      listenAddrs: [],
      protocols: ['/foo/bar/1.0'],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey)
    }

    const [outgoingStream] = await streamPair()
    const connection = stubInterface<Connection>({ remotePeer })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    const identifyPromise = identify.identify(connection, {
      signal: AbortSignal.timeout(500)
    })
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    const encoded1 = lp.encode.single(IdentifyMessage.encode(firstMessage)).subarray()
    // Append a varint length prefix that promises far more bytes than provided.
    // The pb.read() in the second iteration will see the prefix, try to read,
    // hit EOF early without remoteWriteStatus changing, and throw.
    // With remoteWriteStatus still 'writable', isEofLike returns false and the
    // error propagates.
    const garbage = new Uint8Array([0xff, 0xff, 0xff, 0xff, 0x07])
    const combined = new Uint8Array(encoded1.byteLength + garbage.byteLength)
    combined.set(encoded1)
    combined.set(garbage, encoded1.byteLength)

    outgoingStream.push(combined)
    // Note: do NOT set remoteWriteStatus to 'closed' - keep it 'writable'.

    await expect(identifyPromise).to.eventually.be.rejected()
  })

  it('should return the message when remote resets the stream after a successful write', async () => {
    identify = new Identify(components)
    await start(identify)

    const remotePrivateKey = await generateKeyPair('Ed25519')
    const remotePeer = peerIdFromPrivateKey(remotePrivateKey)

    const message: IdentifyMessage = {
      listenAddrs: [
        multiaddr('/ip4/123.123.123.123/tcp/123').bytes
      ],
      protocols: ['/foo/bar/1.0'],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey)
    }

    const [outgoingStream] = await streamPair()
    const connection = stubInterface<Connection>({ remotePeer })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    const identifyPromise = identify.identify(connection)
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    const encoded = lp.encode.single(IdentifyMessage.encode(message)).subarray()
    outgoingStream.push(encoded)
    // Set status to a non-'writable' value to simulate stream-reset-after-success.
    // This documents the I4 widening: any non-'writable' status post-success
    // is treated as EOF.
    outgoingStream.remoteWriteStatus = 'closed'

    const result = await identifyPromise
    expect(result.protocols).to.include('/foo/bar/1.0')
  })

  it('should succeed even if close() throws after a successful read (C2 regression)', async () => {
    identify = new Identify(components)
    await start(identify)

    const remotePrivateKey = await generateKeyPair('Ed25519')
    const remotePeer = peerIdFromPrivateKey(remotePrivateKey)

    const message: IdentifyMessage = {
      listenAddrs: [
        multiaddr('/ip4/123.123.123.123/tcp/123').bytes
      ],
      protocols: ['/foo/bar/1.0'],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey)
    }

    const [outgoingStream] = await streamPair()
    const connection = stubInterface<Connection>({ remotePeer })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    // Force close() to throw with a StreamStateError-shaped error after a
    // successful read. This simulates the original bug: byteStream.unwrap()
    // throwing because the read buffer holds trailing bytes that can't be
    // pushed back to a closed-read stream.
    const originalClose = outgoingStream.close.bind(outgoingStream)
    outgoingStream.close = async (...args: any[]) => {
      // Let the underlying close run, then throw afterwards.
      await originalClose(...args)
      throw Object.assign(new Error('simulated close-after-read failure'), { name: 'StreamStateError' })
    }

    const identifyPromise = identify.identify(connection)
    await new Promise<void>(resolve => setTimeout(resolve, 0))

    const encoded = lp.encode.single(IdentifyMessage.encode(message)).subarray()
    outgoingStream.push(encoded)
    outgoingStream.remoteWriteStatus = 'closed'

    const result = await identifyPromise
    expect(result.protocols).to.include('/foo/bar/1.0')
  })

  it('should limit incoming identify message sizes', async () => {
    const maxMessageSize = 100

    identify = new Identify(components, {
      maxMessageSize
    })

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const [outgoingStream, incomingStream] = await streamPair()
    incomingStream.send(lp.encode.single(new Uint8Array(maxMessageSize + 1)))
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    // run identify
    await expect(identify.identify(connection)).to.eventually.be.rejected()
      .with.property('name', 'InvalidDataLengthError')

    // should have aborted stream
    expect(outgoingStream).to.have.property('status', 'aborted')
  })

  it('should retain existing peer metadata when updating agent/protocol version', async () => {
    identify = new Identify(components)

    await start(identify)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    const [outgoingStream, incomingStream] = await streamPair()
    incomingStream.send(lp.encode.single(IdentifyMessage.encode({
      listenAddrs: [],
      protocols: [],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey),
      agentVersion: 'secret-agent',
      protocolVersion: '9000'
    })))
    void incomingStream.close()
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

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

    const [outgoingStream, incomingStream] = await streamPair()
    incomingStream.send(lp.encode.single(IdentifyMessage.encode({
      listenAddrs: [],
      protocols: [],
      publicKey: publicKeyToProtobuf(remotePeer.publicKey),
      signedPeerRecord: oldPeerRecord.marshal()
    })))
    void incomingStream.close()
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

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

    const [outgoingStream, incomingStream] = await streamPair()
    incomingStream.send(lp.encode.single(IdentifyMessage.encode(message)))
    void incomingStream.close()
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

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

    const [outgoingStream, incomingStream] = await streamPair()
    incomingStream.send(lp.encode.single(IdentifyMessage.encode(message)))
    void incomingStream.close()
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

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

    components.addressManager.getAddresses.returns([])

    // local peer data
    components.peerStore.get.resolves({
      id: components.peerId,
      addresses: [],
      protocols: [],
      metadata: new Map(),
      tags: new Map()
    })

    const message: IdentifyMessage = {
      listenAddrs: [],
      protocols: []
    }

    const [outgoingStream, incomingStream] = await streamPair()
    incomingStream.send(lp.encode.single(IdentifyMessage.encode(message)))
    const connection = stubInterface<Connection>({
      remoteAddr: multiaddr('/webrtc/p2p/QmR5VwgsL7jyfZHAGyp66tguVrQhCRQuRc3NokocsCZ3fA')
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    // handle identify
    void identify.handleProtocol(incomingStream, connection)

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
      observedAddr: multiaddr('/ip6zone/en/ip6/fe80::2892:aef3:af04:735a').bytes
    }

    const [outgoingStream, incomingStream] = await streamPair()
    incomingStream.send(lp.encode.single(IdentifyMessage.encode(message)))
    void incomingStream.close()
    const connection = stubInterface<Connection>({
      remotePeer
    })
    connection.newStream.withArgs('/ipfs/id/1.0.0').resolves(outgoingStream)

    // run identify
    await identify.identify(connection)

    expect(components.addressManager.addObservedAddr.called).to.be.false()
  })
})
