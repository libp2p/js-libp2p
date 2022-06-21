/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */

import { expect } from 'aegir/chai'
import sinon from 'sinon'
import { Multiaddr } from '@multiformats/multiaddr'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { codes } from '../../src/errors.js'
import { IdentifyService, IdentifyServiceInit, Message } from '../../src/identify/index.js'
import Peers from '../fixtures/peers.js'
import { PersistentPeerStore } from '@libp2p/peer-store'
import { DefaultAddressManager } from '../../src/address-manager/index.js'
import { MemoryDatastore } from 'datastore-core/memory'
import * as lp from 'it-length-prefixed'
import drain from 'it-drain'
import { pipe } from 'it-pipe'
import { mockConnectionGater, mockRegistrar, mockUpgrader, connectionPair } from '@libp2p/interface-mocks'
import { createFromJSON } from '@libp2p/peer-id-factory'
import { Components } from '@libp2p/components'
import { PeerRecordUpdater } from '../../src/peer-record-updater.js'
import {
  MULTICODEC_IDENTIFY,
  MULTICODEC_IDENTIFY_PUSH
} from '../../src/identify/consts.js'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { DefaultTransportManager } from '../../src/transport-manager.js'
import delay from 'delay'
import { start, stop } from '@libp2p/interfaces/startable'
import { TimeoutController } from 'timeout-abort-controller'
import { CustomEvent } from '@libp2p/interfaces/events'
import pDefer from 'p-defer'

const listenMaddrs = [new Multiaddr('/ip4/127.0.0.1/tcp/15002/ws')]

const defaultInit: IdentifyServiceInit = {
  protocolPrefix: 'ipfs',
  host: {
    agentVersion: 'v1.0.0'
  },
  maxInboundStreams: 1,
  maxOutboundStreams: 1,
  maxPushIncomingStreams: 1,
  maxPushOutgoingStreams: 1
}

const protocols = [MULTICODEC_IDENTIFY, MULTICODEC_IDENTIFY_PUSH]

async function createComponents (index: number) {
  const peerId = await createFromJSON(Peers[index])

  const components = new Components({
    peerId,
    datastore: new MemoryDatastore(),
    registrar: mockRegistrar(),
    upgrader: mockUpgrader(),
    connectionGater: mockConnectionGater(),
    peerStore: new PersistentPeerStore(),
    connectionManager: new DefaultConnectionManager({
      minConnections: 50,
      maxConnections: 1000,
      autoDialInterval: 1000
    })
  })
  components.setAddressManager(new DefaultAddressManager(components, {
    announce: listenMaddrs.map(ma => ma.toString())
  }))

  const transportManager = new DefaultTransportManager(components)
  components.setTransportManager(transportManager)

  await components.getPeerStore().protoBook.set(peerId, protocols)

  return components
}

describe('identify', () => {
  let localComponents: Components
  let remoteComponents: Components

  let remotePeerRecordUpdater: PeerRecordUpdater

  beforeEach(async () => {
    localComponents = await createComponents(0)
    remoteComponents = await createComponents(1)

    remotePeerRecordUpdater = new PeerRecordUpdater(remoteComponents)

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
    const localIdentify = new IdentifyService(localComponents, defaultInit)
    const remoteIdentify = new IdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    const localAddressBookConsumePeerRecordSpy = sinon.spy(localComponents.getPeerStore().addressBook, 'consumePeerRecord')
    const localProtoBookSetSpy = sinon.spy(localComponents.getPeerStore().protoBook, 'set')

    // Make sure the remote peer has a peer record to share during identify
    await remotePeerRecordUpdater.update()

    // Run identify
    await localIdentify.identify(localToRemote)

    expect(localAddressBookConsumePeerRecordSpy.callCount).to.equal(1)
    expect(localProtoBookSetSpy.callCount).to.equal(1)

    // Validate the remote peer gets updated in the peer store
    const addresses = await localComponents.getPeerStore().addressBook.get(remoteComponents.getPeerId())
    expect(addresses).to.exist()

    expect(addresses).have.lengthOf(listenMaddrs.length)
    expect(addresses.map((a) => a.multiaddr)[0].equals(listenMaddrs[0]))
    expect(addresses.map((a) => a.isCertified)[0]).to.be.true()
  })

  // LEGACY
  it('should be able to identify another peer with no certified peer records support', async () => {
    const agentVersion = 'js-libp2p/5.0.0'
    const localIdentify = new IdentifyService(localComponents, {
      ...defaultInit,
      protocolPrefix: 'ipfs',
      host: {
        agentVersion: agentVersion
      }
    })
    await start(localIdentify)
    const remoteIdentify = new IdentifyService(remoteComponents, {
      ...defaultInit,
      protocolPrefix: 'ipfs',
      host: {
        agentVersion: agentVersion
      }
    })
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    sinon.stub(localComponents.getPeerStore().addressBook, 'consumePeerRecord').throws()

    const localProtoBookSetSpy = sinon.spy(localComponents.getPeerStore().protoBook, 'set')

    // Run identify
    await localIdentify.identify(localToRemote)

    expect(localProtoBookSetSpy.callCount).to.equal(1)

    // Validate the remote peer gets updated in the peer store
    const addresses = await localComponents.getPeerStore().addressBook.get(remoteComponents.getPeerId())
    expect(addresses).to.exist()

    expect(addresses).have.lengthOf(listenMaddrs.length)
    expect(addresses.map((a) => a.multiaddr)[0].equals(listenMaddrs[0]))
    expect(addresses.map((a) => a.isCertified)[0]).to.be.false()
  })

  it('should throw if identified peer is the wrong peer', async () => {
    const localIdentify = new IdentifyService(localComponents, defaultInit)
    const remoteIdentify = new IdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    // send an invalid message
    await remoteComponents.getRegistrar().unhandle(MULTICODEC_IDENTIFY)
    await remoteComponents.getRegistrar().handle(MULTICODEC_IDENTIFY, (data) => {
      void Promise.resolve().then(async () => {
        const { connection, stream } = data
        const signedPeerRecord = await remoteComponents.getPeerStore().addressBook.getRawEnvelope(remoteComponents.getPeerId())

        const message = Message.Identify.encode({
          protocolVersion: '123',
          agentVersion: '123',
          // send bad public key
          publicKey: localComponents.getPeerId().publicKey ?? new Uint8Array(0),
          listenAddrs: [],
          signedPeerRecord,
          observedAddr: connection.remoteAddr.bytes,
          protocols: []
        })

        await pipe(
          [message],
          lp.encode(),
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
    const localIdentify = new IdentifyService(localComponents, {
      ...defaultInit,
      protocolPrefix: 'ipfs',
      host: {
        agentVersion
      }
    })

    await expect(localComponents.getPeerStore().metadataBook.getValue(localComponents.getPeerId(), 'AgentVersion'))
      .to.eventually.be.undefined()
    await expect(localComponents.getPeerStore().metadataBook.getValue(localComponents.getPeerId(), 'ProtocolVersion'))
      .to.eventually.be.undefined()

    await start(localIdentify)

    await expect(localComponents.getPeerStore().metadataBook.getValue(localComponents.getPeerId(), 'AgentVersion'))
      .to.eventually.deep.equal(uint8ArrayFromString(agentVersion))
    await expect(localComponents.getPeerStore().metadataBook.getValue(localComponents.getPeerId(), 'ProtocolVersion'))
      .to.eventually.be.ok()

    await stop(localIdentify)
  })

  it('should time out during identify', async () => {
    const localIdentify = new IdentifyService(localComponents, defaultInit)
    const remoteIdentify = new IdentifyService(remoteComponents, defaultInit)

    await start(localIdentify)
    await start(remoteIdentify)

    const [localToRemote] = connectionPair(localComponents, remoteComponents)

    // replace existing handler with a really slow one
    await remoteComponents.getRegistrar().unhandle(MULTICODEC_IDENTIFY)
    await remoteComponents.getRegistrar().handle(MULTICODEC_IDENTIFY, ({ stream }) => {
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
    const timeoutController = new TimeoutController(10)

    // Run identify
    await expect(localIdentify.identify(localToRemote, {
      signal: timeoutController.signal
    }))
      .to.eventually.be.rejected.with.property('code', 'ABORT_ERR')

    // should have closed stream
    expect(newStreamSpy).to.have.property('callCount', 1)
    const stream = await newStreamSpy.getCall(0).returnValue
    expect(stream).to.have.nested.property('stat.timeline.close')
  })

  it('should limit incoming identify message sizes', async () => {
    const deferred = pDefer()

    const remoteIdentify = new IdentifyService(remoteComponents, {
      ...defaultInit,
      maxIdentifyMessageSize: 100
    })
    await start(remoteIdentify)

    const identifySpy = sinon.spy(remoteIdentify, 'identify')

    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)

    // handle incoming identify requests and send too much data
    await localComponents.getRegistrar().handle('/ipfs/id/1.0.0', ({ stream }) => {
      const data = new Uint8Array(1024)

      void Promise.resolve().then(async () => {
        await pipe(
          [data],
          lp.encode(),
          stream,
          async (source) => await drain(source)
        )

        deferred.resolve()
      })
    })

    // ensure connections are registered by connection manager
    localComponents.getUpgrader().dispatchEvent(new CustomEvent('connection', {
      detail: localToRemote
    }))
    remoteComponents.getUpgrader().dispatchEvent(new CustomEvent('connection', {
      detail: remoteToLocal
    }))

    await deferred.promise
    await stop(remoteIdentify)

    expect(identifySpy.called).to.be.true()

    await expect(identifySpy.getCall(0).returnValue)
      .to.eventually.be.rejected.with.property('code', 'ERR_MSG_DATA_TOO_LONG')
  })

  it('should time out incoming identify messages', async () => {
    const deferred = pDefer()

    const remoteIdentify = new IdentifyService(remoteComponents, {
      ...defaultInit,
      timeout: 100
    })
    await start(remoteIdentify)

    const identifySpy = sinon.spy(remoteIdentify, 'identify')

    const [localToRemote, remoteToLocal] = connectionPair(localComponents, remoteComponents)

    // handle incoming identify requests and don't send anything
    await localComponents.getRegistrar().handle('/ipfs/id/1.0.0', ({ stream }) => {
      const data = new Uint8Array(1024)

      void Promise.resolve().then(async () => {
        await pipe(
          [data],
          lp.encode(),
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
    localComponents.getUpgrader().dispatchEvent(new CustomEvent('connection', {
      detail: localToRemote
    }))
    remoteComponents.getUpgrader().dispatchEvent(new CustomEvent('connection', {
      detail: remoteToLocal
    }))

    await deferred.promise
    await stop(remoteIdentify)

    expect(identifySpy.called).to.be.true()

    await expect(identifySpy.getCall(0).returnValue)
      .to.eventually.be.rejected.with.property('code', 'ABORT_ERR')
  })
})
