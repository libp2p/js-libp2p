/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { mockConnectionGater, mockRegistrar, mockUpgrader, connectionPair } from '@libp2p/interface-mocks'
import { EventEmitter } from '@libp2p/interfaces/events'
import { start, stop } from '@libp2p/interfaces/startable'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { PeerRecord, RecordEnvelope } from '@libp2p/peer-record'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import delay from 'delay'
import drain from 'it-drain'
import * as lp from 'it-length-prefixed'
import { pbStream } from 'it-pb-stream'
import { pipe } from 'it-pipe'
import pDefer from 'p-defer'
import sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { defaultComponents, type Components } from '../../src/components.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { codes } from '../../src/errors.js'
import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH
} from '../../src/identify/consts.js'
import { DefaultIdentifyService } from '../../src/identify/identify.js'
import { identifyService, type IdentifyServiceInit, Message } from '../../src/identify/index.js'
import { Identify } from '../../src/identify/pb/message.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import type { IncomingStreamData } from '@libp2p/interface-registrar'
import type { TransportManager } from '@libp2p/interface-transport'

const listenMaddrs = [multiaddr('/ip4/127.0.0.1/tcp/15002/ws')]

const defaultInit: IdentifyServiceInit = {
  protocolPrefix: 'ipfs',
  agentVersion: 'v1.0.0',
  maxInboundStreams: 1,
  maxOutboundStreams: 1,
  maxPushIncomingStreams: 1,
  maxPushOutgoingStreams: 1,
  timeout: 1000
}

const protocols = [MULTICODEC_IDENTIFY, MULTICODEC_IDENTIFY_PUSH]

async function createComponents (index: number): Promise<Components> {
  const peerId = await createEd25519PeerId()

  const events = new EventEmitter()
  const components = defaultComponents({
    peerId,
    datastore: new MemoryDatastore(),
    registrar: mockRegistrar(),
    upgrader: mockUpgrader({ events }),
    transportManager: stubInterface<TransportManager>(),
    connectionGater: mockConnectionGater(),
    events
  })
  components.peerStore = new PersistentPeerStore(components)
  components.connectionManager = new DefaultConnectionManager(components, {
    minConnections: 50,
    maxConnections: 1000,
    inboundUpgradeTimeout: 1000
  })
  components.addressManager = new DefaultAddressManager(components, {
    announce: listenMaddrs.map(ma => ma.toString())
  })

  const transportManager = new DefaultTransportManager(components)
  components.transportManager = transportManager

  await components.peerStore.patch(peerId, {
    protocols
  })

  return components
}

describe('identify', () => {
  let localComponents: Components
  let remoteComponents: Components

  beforeEach(async () => {
    localComponents = await createComponents(0)
    remoteComponents = await createComponents(1)

    await Promise.all([
      start(localComponents),
      start(remoteComponents)
    ])
  })

  afterEach(async () => {
    sinon.restore()

    await Promise.all([
      stop(localComponents),
      stop(remoteComponents)
    ])
  })

  it('should be able to identify another peer', async () => {
    const localIdentify = new DefaultIdentifyService(localComponents, defaultInit)
    const remoteIdentify = new DefaultIdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    const localPeerStorePatchSpy = sinon.spy(localComponents.peerStore, 'patch')

    // Run identify
    await localIdentify.identify(localToRemote)

    expect(localPeerStorePatchSpy.callCount).to.equal(1)

    // Validate the remote peer gets updated in the peer store
    const peer = await localComponents.peerStore.get(remoteComponents.peerId)
    expect(peer.addresses).have.lengthOf(listenMaddrs.length)
    expect(peer.addresses.map((a) => a.multiaddr)[0].equals(listenMaddrs[0]))
    expect(peer.addresses.map((a) => a.isCertified)[0]).to.be.true()
  })

  it('should throw if identified peer is the wrong peer', async () => {
    const localIdentify = new DefaultIdentifyService(localComponents, defaultInit)
    const remoteIdentify = new DefaultIdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    // send an invalid message
    await remoteComponents.registrar.unhandle(MULTICODEC_IDENTIFY)
    await remoteComponents.registrar.handle(MULTICODEC_IDENTIFY, (data) => {
      void Promise.resolve().then(async () => {
        const { connection, stream } = data
        const peer = await remoteComponents.peerStore.get(remoteComponents.peerId)

        const message = Message.Identify.encode({
          protocolVersion: '123',
          agentVersion: '123',
          // send bad public key
          publicKey: localComponents.peerId.publicKey ?? new Uint8Array(0),
          listenAddrs: [],
          signedPeerRecord: peer.peerRecordEnvelope,
          observedAddr: connection.remoteAddr.bytes,
          protocols: []
        })

        await pipe(
          [message],
          (source) => lp.encode(source),
          stream,
          drain
        )
      })
    })

    // Run identify
    await expect(localIdentify.identify(localToRemote))
      .to.eventually.be.rejected()
      .and.to.have.property('code', codes.ERR_INVALID_PEER)
  })

  it('should store own host data and protocol version into metadataBook on start', async () => {
    const agentVersion = 'js-project/1.0.0'
    const localIdentify = identifyService({
      ...defaultInit,
      protocolPrefix: 'ipfs',
      agentVersion
    })(localComponents)

    const peer = await localComponents.peerStore.get(localComponents.peerId)
    expect(peer.metadata.get('AgentVersion')).to.be.undefined()
    expect(peer.metadata.get('ProtocolVersion')).to.be.undefined()

    await start(localIdentify)

    const updatedPeer = await localComponents.peerStore.get(localComponents.peerId)
    expect(updatedPeer.metadata.get('AgentVersion')).to.deep.equal(uint8ArrayFromString(agentVersion))
    expect(updatedPeer.metadata.get('ProtocolVersion')).to.be.ok()

    await stop(localIdentify)
  })

  it('should time out during identify', async () => {
    const localIdentify = new DefaultIdentifyService(localComponents, defaultInit)
    const remoteIdentify = new DefaultIdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    // replace existing handler with a really slow one
    await remoteComponents.registrar.unhandle(MULTICODEC_IDENTIFY)
    await remoteComponents.registrar.handle(MULTICODEC_IDENTIFY, ({ stream }) => {
      void pipe(
        stream,
        async function * (source) {
          // we receive no data in the identify protocol, we just send our data
          await drain(source)

          // longer than the timeout
          await delay(1000)

          yield new Uint8Array()
        },
        stream
      )
    })

    const newStreamSpy = sinon.spy(localToRemote, 'newStream')

    // 10 ms timeout
    const signal = AbortSignal.timeout(10)

    // Run identify
    await expect(localIdentify.identify(localToRemote, {
      signal
    }))
      .to.eventually.be.rejected.with.property('code', 'ABORT_ERR')

    // should have closed stream
    expect(newStreamSpy).to.have.property('callCount', 1)
    const stream = await newStreamSpy.getCall(0).returnValue
    expect(stream).to.have.nested.property('stat.timeline.close')
  })

  it('should limit incoming identify message sizes', async () => {
    const deferred = pDefer()

    const remoteIdentify = new DefaultIdentifyService(remoteComponents, {
      ...defaultInit,
      maxIdentifyMessageSize: 100
    })
    await start(remoteIdentify)

    const identifySpy = sinon.spy(remoteIdentify, 'identify')

    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)

    // handle incoming identify requests and send too much data
    await localComponents.registrar.handle('/ipfs/id/1.0.0', ({ stream }) => {
      const data = new Uint8Array(1024)

      void Promise.resolve().then(async () => {
        await pipe(
          [data],
          (source) => lp.encode(source),
          stream,
          async (source) => { await drain(source) }
        )

        deferred.resolve()
      })
    })

    // ensure connections are registered by connection manager
    localComponents.events.safeDispatchEvent('connection:open', {
      detail: localToRemote
    })
    remoteComponents.events.safeDispatchEvent('connection:open', {
      detail: remoteToLocal
    })

    await deferred.promise
    await stop(remoteIdentify)

    expect(identifySpy.called).to.be.true()

    await expect(identifySpy.getCall(0).returnValue)
      .to.eventually.be.rejected.with.property('code', 'ERR_MSG_DATA_TOO_LONG')
  })

  it('should time out incoming identify messages', async () => {
    const deferred = pDefer()

    const remoteIdentify = new DefaultIdentifyService(remoteComponents, {
      ...defaultInit,
      timeout: 100
    })
    await start(remoteIdentify)

    const identifySpy = sinon.spy(remoteIdentify, 'identify')

    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)

    // handle incoming identify requests and don't send anything
    await localComponents.registrar.handle('/ipfs/id/1.0.0', ({ stream }) => {
      const data = new Uint8Array(1024)

      void Promise.resolve().then(async () => {
        await pipe(
          [data],
          (source) => lp.encode(source),
          async (source) => {
            await stream.sink(async function * () {
              for await (const buf of source) {
                // don't send all of the data, remote will expect another message
                yield buf.slice(0, buf.length - 100)

                // wait for longer than the timeout without sending any more data or closing the stream
                await delay(500)
              }
            }())
          }
        )

        deferred.resolve()
      })
    })

    // ensure connections are registered by connection manager
    localComponents.events.safeDispatchEvent('connection:open', {
      detail: localToRemote
    })
    remoteComponents.events.safeDispatchEvent('connection:open', {
      detail: remoteToLocal
    })

    await deferred.promise
    await stop(remoteIdentify)

    expect(identifySpy.called).to.be.true()

    await expect(identifySpy.getCall(0).returnValue)
      .to.eventually.be.rejected.with.property('code', 'ABORT_ERR')
  })

  it('should retain existing peer metadata', async () => {
    const localIdentify = new DefaultIdentifyService(localComponents, defaultInit)
    const remoteIdentify = new DefaultIdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    await localComponents.peerStore.merge(remoteComponents.peerId, {
      metadata: {
        foo: Uint8Array.from([0, 1, 2, 3])
      }
    })

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    const localPeerStorePatchSpy = sinon.spy(localComponents.peerStore, 'patch')

    // Run identify
    await localIdentify.identify(localToRemote)

    expect(localPeerStorePatchSpy.callCount).to.equal(1)

    // Validate the remote peer gets updated in the peer store
    const peer = await localComponents.peerStore.get(remoteComponents.peerId)
    expect(peer.metadata.get('foo')).to.equalBytes(Uint8Array.from([0, 1, 2, 3]))
  })

  it('should ignore older signed peer record', async () => {
    const localIdentify = new DefaultIdentifyService(localComponents, defaultInit)
    const remoteIdentify = new DefaultIdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const signedPeerRecord = await RecordEnvelope.seal(new PeerRecord({
      peerId: remoteComponents.peerId,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/1234')
      ],
      seqNumber: BigInt(Date.now() * 2)
    }), remoteComponents.peerId)
    const peerRecordEnvelope = signedPeerRecord.marshal()

    await localComponents.peerStore.merge(remoteComponents.peerId, {
      peerRecordEnvelope
    })

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    const localPeerStorePatchSpy = sinon.spy(localComponents.peerStore, 'patch')

    // Run identify
    await localIdentify.identify(localToRemote)

    expect(localPeerStorePatchSpy.callCount).to.equal(1)

    // Should not have added addresses from received peer record as the sequence
    // number will be less than the one above
    const peer = await localComponents.peerStore.get(remoteComponents.peerId)
    expect(peer.addresses.map(({ multiaddr }) => multiaddr.toString())).to.deep.equal([
      '/ip4/127.0.0.1/tcp/1234'
    ])
    expect(peer).to.have.property('peerRecordEnvelope').that.equalBytes(peerRecordEnvelope)
  })

  it('should store data without signed peer record', async () => {
    const localIdentify = new DefaultIdentifyService(localComponents, defaultInit)
    const remoteIdentify = new DefaultIdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    const localPeerStorePatchSpy = sinon.spy(localComponents.peerStore, 'patch')

    // should know know remote peer
    await expect(localComponents.peerStore.has(remoteComponents.peerId)).to.eventually.be.false()

    const message = {
      protocolVersion: 'protocol version',
      agentVersion: 'agent version',
      listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/1234').bytes],
      protocols: ['protocols'],
      publicKey: remoteComponents.peerId.publicKey
    }

    remoteIdentify._handleIdentify = async (data: IncomingStreamData): Promise<void> => {
      const { stream } = data
      const pb = pbStream(stream)
      pb.writePB(message, Identify)
    }

    // Run identify
    await localIdentify.identify(localToRemote)

    expect(localPeerStorePatchSpy.callCount).to.equal(1)

    // should have stored all passed data
    const peer = await localComponents.peerStore.get(remoteComponents.peerId)
    expect(peer.metadata.get('AgentVersion')).to.equalBytes(uint8ArrayFromString(message.agentVersion))
    expect(peer.metadata.get('ProtocolVersion')).to.equalBytes(uint8ArrayFromString(message.protocolVersion))
    expect(peer.protocols).to.deep.equal(message.protocols)
    expect(peer.addresses).to.deep.equal([{
      isCertified: false,
      multiaddr: multiaddr('/ip4/127.0.0.1/tcp/1234')
    }])
    expect(peer.id.publicKey).to.equalBytes(remoteComponents.peerId.publicKey)
  })

  it('should prefer addresses from signed peer record', async () => {
    const localIdentify = new DefaultIdentifyService(localComponents, defaultInit)
    const remoteIdentify = new DefaultIdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    const localPeerStorePatchSpy = sinon.spy(localComponents.peerStore, 'patch')

    // should know know remote peer
    await expect(localComponents.peerStore.has(remoteComponents.peerId)).to.eventually.be.false()

    const signedPeerRecord = await RecordEnvelope.seal(new PeerRecord({
      peerId: remoteComponents.peerId,
      multiaddrs: [
        multiaddr('/ip4/127.0.0.1/tcp/5678')
      ],
      seqNumber: BigInt(Date.now() * 2)
    }), remoteComponents.peerId)
    const peerRecordEnvelope = signedPeerRecord.marshal()

    const message = {
      protocolVersion: 'protocol version',
      agentVersion: 'agent version',
      listenAddrs: [multiaddr('/ip4/127.0.0.1/tcp/1234').bytes],
      protocols: ['protocols'],
      publicKey: remoteComponents.peerId.publicKey,
      signedPeerRecord: peerRecordEnvelope
    }

    remoteIdentify._handleIdentify = async (data: IncomingStreamData): Promise<void> => {
      const { stream } = data
      const pb = pbStream(stream)
      pb.writePB(message, Identify)
    }

    // Run identify
    await localIdentify.identify(localToRemote)

    expect(localPeerStorePatchSpy.callCount).to.equal(1)

    // should have stored all passed data
    const peer = await localComponents.peerStore.get(remoteComponents.peerId)
    expect(peer.metadata.get('AgentVersion')).to.equalBytes(uint8ArrayFromString(message.agentVersion))
    expect(peer.metadata.get('ProtocolVersion')).to.equalBytes(uint8ArrayFromString(message.protocolVersion))
    expect(peer.protocols).to.deep.equal(message.protocols)
    expect(peer.addresses).to.deep.equal([{
      isCertified: true,
      multiaddr: multiaddr('/ip4/127.0.0.1/tcp/5678')
    }])
    expect(peer.id.publicKey).to.equalBytes(remoteComponents.peerId.publicKey)
  })
})
