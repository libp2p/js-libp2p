/* eslint-env mocha */

import { identify, identifyPush } from '@libp2p/identify'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import { pEvent } from 'p-event'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { createBaseOptions } from './fixtures/base-options.js'
import type { Identify, IdentifyPush } from '@libp2p/identify'
import type { Libp2p } from '@libp2p/interface'

const LOCAL_PORT = 47321
const REMOTE_PORT = 47322
const AGENT_VERSION = 'libp2p/0.0.0'

// Stub environment version for testing dynamic AGENT_VERSION
sinon.stub(process, 'version').value('vTEST')

if (typeof globalThis.navigator !== 'undefined') {
  sinon.stub(navigator, 'userAgent').value('vTEST')
}

describe('identify', () => {
  let libp2p: Libp2p<{ identify: Identify, identifyPush: IdentifyPush }>
  let remoteLibp2p: Libp2p<{ identify: Identify }>

  beforeEach(async () => {
    libp2p = await createLibp2p(createBaseOptions({
      addresses: {
        announce: [`/dns4/localhost/tcp/${LOCAL_PORT}`],
        listen: [`/ip4/0.0.0.0/tcp/${LOCAL_PORT}`]
      },
      services: {
        identify: identify(),
        identifyPush: identifyPush()
      }
    }))
    remoteLibp2p = await createLibp2p(createBaseOptions({
      addresses: {
        announce: [`/dns4/localhost/tcp/${REMOTE_PORT}`],
        listen: [`/ip4/0.0.0.0/tcp/${REMOTE_PORT}`]
      },
      services: {
        identify: identify(),
        identifyPush: identifyPush()
      }
    }))
  })

  afterEach(async () => {
    sinon.restore()

    if (libp2p != null) {
      await libp2p.stop()
    }

    if (remoteLibp2p != null) {
      await remoteLibp2p.stop()
    }
  })

  it('should run identify automatically for outbound connections', async () => {
    await libp2p.start()
    await remoteLibp2p.start()

    if (libp2p.services.identify == null) {
      throw new Error('Identity service was not configured')
    }

    const eventPromise = pEvent(libp2p, 'peer:identify')

    // dial local -> remote via loopback in order to assert we receive the announce address via identify
    const connection = await libp2p.dial(multiaddr(`/ip4/127.0.0.1/tcp/${REMOTE_PORT}/p2p/${remoteLibp2p.peerId.toString()}`))
    expect(connection).to.exist()

    // wait for identify to run on the new connection
    const identifyResult = await eventPromise

    // should have run on the new connection
    expect(identifyResult).to.have.nested.property('detail.connection', connection)

    // assert we have received certified announce addresses
    expect(identifyResult).to.have.deep.nested.property('detail.signedPeerRecord.addresses', [
      multiaddr(`/dns4/localhost/tcp/${REMOTE_PORT}`)
    ], 'did not receive announce address via identify')
  })

  it('should run identify automatically for inbound connections', async () => {
    await libp2p.start()
    await remoteLibp2p.start()

    if (libp2p.services.identify == null) {
      throw new Error('Identity service was not configured')
    }

    const eventPromise = pEvent(remoteLibp2p, 'peer:identify')

    // dial remote -> local via loopback in order to assert we receive the announce address via identify
    const connection = await remoteLibp2p.dial(multiaddr(`/ip4/127.0.0.1/tcp/${LOCAL_PORT}/p2p/${libp2p.peerId.toString()}`))
    expect(connection).to.exist()

    // wait for identify to run
    const identifyResult = await eventPromise

    // should have run on the new connection
    expect(identifyResult).to.have.nested.property('detail.connection', connection)

    // assert we have received certified announce addresses
    expect(identifyResult).to.have.deep.nested.property('detail.signedPeerRecord.addresses', [
      multiaddr(`/dns4/localhost/tcp/${LOCAL_PORT}`)
    ], 'did not receive announce address via identify')
  })

  it('should identify connection on dial and get proper announce addresses', async () => {
    const announceAddrs = [
      '/dns4/peers1.com/tcp/433/wss',
      '/dns4/peers2.com/tcp/433/wss'
    ]
    const port = 58322
    const protocol = '/ipfs/bitswap/1.2.0'

    const receiver = await createLibp2p(createBaseOptions({
      addresses: {
        announce: announceAddrs,
        listen: [`/ip4/127.0.0.1/tcp/${port}/ws`]
      },
      services: {
        identify: identify()
      }
    }))
    await receiver.handle(protocol, () => {})

    const sender = await createLibp2p(createBaseOptions({
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0/ws']
      },
      services: {
        identify: identify()
      }
    }))

    const eventPromise = pEvent(sender, 'peer:identify')

    const connection = await sender.dial(multiaddr(`/ip4/127.0.0.1/tcp/${port}/ws/p2p/${receiver.peerId.toString()}`))

    await eventPromise

    const stream = await connection.newStream(protocol)
    const clientPeer = await sender.peerStore.get(receiver.peerId)

    expect(clientPeer.addresses).to.have.length(2)
    expect(clientPeer.addresses[0].multiaddr.toString()).to.equal(announceAddrs[0].toString())
    expect(clientPeer.addresses[1].multiaddr.toString()).to.equal(announceAddrs[1].toString())

    await stream.close()
    await connection.close()
    await receiver.stop()
    await sender.stop()
  })

  it('should store remote agent and protocol versions in metadataBook after connecting', async () => {
    const eventPromise = pEvent(libp2p, 'peer:identify')

    const connection = await libp2p.dial(remoteLibp2p.getMultiaddrs())
    expect(connection).to.exist()

    await eventPromise

    // The connection should have no open streams
    await pWaitFor(() => connection.streams.length === 0)
    await connection.close()

    const remotePeer = await libp2p.peerStore.get(remoteLibp2p.peerId)
    expect(remotePeer.metadata.get('AgentVersion')).to.exist()
    expect(remotePeer.metadata.get('ProtocolVersion')).to.exist()
  })

  it('should push protocol updates to an already connected peer', async () => {
    const identityServiceIdentifySpy = sinon.spy(libp2p.services.identify, 'identify')
    const identityServicePushSpy = sinon.spy(libp2p.services.identifyPush, 'push')
    const connectionPromise = pEvent(libp2p, 'connection:open')
    const connection = await libp2p.dial(remoteLibp2p.getMultiaddrs())

    expect(connection).to.exist()
    // Wait for connection event to be emitted
    await connectionPromise

    // Wait for identify to finish
    await identityServiceIdentifySpy.firstCall.returnValue

    // Cause supported protocols to change
    await libp2p.handle('/echo/2.0.0', () => {})

    // Wait for push to complete
    await pWaitFor(() => identityServicePushSpy.callCount === 1)
    await identityServicePushSpy.firstCall.returnValue

    // Cause supported protocols to change back
    await libp2p.unhandle('/echo/2.0.0')

    // Wait for push to complete a second time
    await pWaitFor(() => identityServicePushSpy.callCount === 2)
    await identityServicePushSpy.secondCall.returnValue

    // Verify the remote peer is notified of both changes
    expect(identityServicePushSpy.callCount).to.equal(2)

    // Verify the streams close
    await pWaitFor(() => connection.streams.length === 0)
  })

  it('should append UserAgent information to default AGENT_VERSION', async () => {
    const peer = await libp2p.peerStore.get(libp2p.peerId)
    const storedAgentVersion = peer.metadata.get('AgentVersion')

    expect(uint8ArrayToString(storedAgentVersion ?? new Uint8Array())).to.include(`${AGENT_VERSION} node/`)
  })

  it('should store host data and protocol version into peer store', async () => {
    const agentVersion = 'js-project/1.0.0'

    const libp2p = await createLibp2p(createBaseOptions({
      nodeInfo: {
        userAgent: agentVersion
      },
      services: {
        identify: identify()
      }
    }))

    await libp2p.start()

    const remotePeer = await libp2p.peerStore.get(libp2p.peerId)
    expect(remotePeer.metadata.get('AgentVersion')).to.deep.equal(uint8ArrayFromString(agentVersion))
    expect(remotePeer.metadata.get('ProtocolVersion')).to.exist()

    await libp2p.stop()
  })

  it('should push multiaddr updates to an already connected peer', async () => {
    const identityServiceIdentifySpy = sinon.spy(libp2p.services.identify, 'identify')
    const identityServicePushSpy = sinon.spy(libp2p.services.identifyPush, 'push')
    const connectionPromise = pEvent(libp2p, 'connection:open')
    const connection = await libp2p.dial(remoteLibp2p.getMultiaddrs())

    expect(connection).to.exist()
    // Wait for connection event to be emitted
    await connectionPromise

    // Wait for identify to finish
    await identityServiceIdentifySpy.firstCall.returnValue

    await libp2p.peerStore.merge(libp2p.peerId, {
      multiaddrs: [multiaddr('/ip4/180.0.0.1/tcp/15001/ws')]
    })

    // the protocol change event listener in the identity service is async
    await pWaitFor(() => identityServicePushSpy.callCount === 1)

    // Verify the remote peer is notified of change
    expect(identityServicePushSpy.callCount).to.equal(1)

    // Verify the streams close
    await pWaitFor(() => connection.streams.length === 0)
  })
})
