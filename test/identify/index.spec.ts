/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { multiaddr } from '@multiformats/multiaddr'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { codes } from '../../src/errors.js'
import { identifyService, IdentifyServiceInit, Message } from '../../src/identify/index.js'
import Peers from '../fixtures/peers.js'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { MemoryDatastore } from 'datastore-core/memory'
import * as lp from 'it-length-prefixed'
import drain from 'it-drain'
import { pipe } from 'it-pipe'
import { mockConnectionGater, mockRegistrar, mockUpgrader, connectionPair } from '@libp2p/interface-mocks'
import { createFromJSON } from '@libp2p/peer-id-factory'
import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH
} from '../../src/identify/consts.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import delay from 'delay'
import { start, stop } from '@libp2p/interfaces/startable'
import { EventEmitter } from '@libp2p/interfaces/events'
import pDefer from 'p-defer'
import { defaultComponents, Components } from '../../src/components.js'
import { stubInterface } from 'sinon-ts'
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
  const peerId = await createFromJSON(Peers[index])

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
    const localIdentify = identifyService(defaultInit)(localComponents)
    const remoteIdentify = identifyService(defaultInit)(remoteComponents)

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
    const localIdentify = identifyService(defaultInit)(localComponents)
    const remoteIdentify = identifyService(defaultInit)(remoteComponents)

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
    const localIdentify = identifyService(defaultInit)(localComponents)
    const remoteIdentify = identifyService(defaultInit)(remoteComponents)

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

    const remoteIdentify = identifyService({
      ...defaultInit,
      maxIdentifyMessageSize: 100
    })(remoteComponents)
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

    const remoteIdentify = identifyService({
      ...defaultInit,
      timeout: 100
    })(remoteComponents)
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
})
