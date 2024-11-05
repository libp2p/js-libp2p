/* eslint-env mocha */

import { stop } from '@libp2p/interface'
import { memory } from '@libp2p/memory'
import { expect } from 'aegir/chai'
import delay from 'delay'
import drain from 'it-drain'
import pDefer from 'p-defer'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { createPeers } from '../fixtures/create-peers.js'
import { slowMuxer } from '../fixtures/slow-muxer.js'
import type { Components } from '../../src/components.js'
import type { Echo } from '@libp2p/echo'
import type { Libp2p, ConnectionProtector, ConnectionEncrypter, SecuredConnection, StreamMuxerFactory } from '@libp2p/interface'

describe('upgrader', () => {
  let dialer: Libp2p<{ echo: Echo }>
  let listener: Libp2p<{ echo: Echo }>
  let dialerComponents: Components
  let listenerComponents: Components

  afterEach(async () => {
    await stop(dialer, listener)
  })

  it('should upgrade with valid muxers and crypto', async () => {
    ({ dialer, listener } = await createPeers())

    const input = Uint8Array.from([0, 1, 2, 3, 4])
    const output = await dialer.services.echo.echo(listener.getMultiaddrs(), input)
    expect(output).to.equalBytes(input)
  })

  it('should upgrade with only crypto', async () => {
    ({ dialer, listener } = await createPeers({ streamMuxers: [] }, { streamMuxers: [] }))

    const connection = await dialer.dial(listener.getMultiaddrs())

    await expect(connection.newStream('/echo/1.0.0')).to.eventually.be.rejected
      .with.property('name', 'MuxerUnavailableError')
  })

  it('should use a private connection protector when provided', async () => {
    const protector = stubInterface<ConnectionProtector>()
    protector.protect.callsFake(async (conn) => conn)
    const connectionProtector = (): ConnectionProtector => protector

    ;({ dialer, listener } = await createPeers({ connectionProtector }, { connectionProtector }))

    const input = Uint8Array.from([0, 1, 2, 3, 4])
    const output = await dialer.services.echo.echo(listener.getMultiaddrs(), input)
    expect(output).to.equalBytes(input)

    expect(protector.protect.callCount).to.equal(2)
  })

  it('should fail if crypto fails', async () => {
    class BoomCrypto implements ConnectionEncrypter {
      static protocol = '/unstable'
      public protocol = '/unstable'
      async secureInbound (): Promise<SecuredConnection> { throw new Error('Boom') }
      async secureOutbound (): Promise<SecuredConnection> { throw new Error('Boom') }
    }

    ({ dialer, dialerComponents, listener, listenerComponents } = await createPeers({
      connectionEncrypters: [
        () => new BoomCrypto()
      ]
    }, {
      connectionEncrypters: [
        () => new BoomCrypto()
      ]
    }))

    const dialerUpgraderUpgradeOutboundSpy = Sinon.spy(dialerComponents.upgrader, 'upgradeOutbound')
    const listenerUpgraderUpgradeInboundSpy = Sinon.spy(listenerComponents.upgrader, 'upgradeInbound')

    await expect(dialer.dial(listener.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'EncryptionFailedError')

    // Ensure both sides fail
    await expect(dialerUpgraderUpgradeOutboundSpy.getCall(0).returnValue).to.eventually.be.rejected
      .with.property('name', 'EncryptionFailedError')
    await expect(listenerUpgraderUpgradeInboundSpy.getCall(0).returnValue).to.eventually.be.rejected
      .with.property('name', 'EncryptionFailedError')
  })

  it('should clear timeout if upgrade is successful', async () => {
    ({ dialer, dialerComponents, listener, listenerComponents } = await createPeers({
      connectionManager: {
        inboundUpgradeTimeout: 100
      }
    }, {
      connectionManager: {
        inboundUpgradeTimeout: 100
      }
    }))

    await dialer.dial(listener.getMultiaddrs())

    await delay(1000)

    // connections should still be open after timeout
    expect(dialer.getConnections(listener.peerId)).to.have.lengthOf(1)
    expect(listener.getConnections(dialer.peerId)).to.have.lengthOf(1)
  })

  it('should not abort if upgrade is successful', async () => {
    ({ dialer, dialerComponents, listener, listenerComponents } = await createPeers({
      connectionManager: {
        inboundUpgradeTimeout: 10000
      }
    }, {
      connectionManager: {
        inboundUpgradeTimeout: 10000
      }
    }))

    await dialer.dial(listener.getMultiaddrs(), {
      signal: AbortSignal.timeout(500)
    })

    await delay(1000)

    // connections should still be open after timeout
    expect(dialer.getConnections(listener.peerId)).to.have.lengthOf(1)
    expect(listener.getConnections(dialer.peerId)).to.have.lengthOf(1)
  })

  it('should fail if muxers do not match', async () => {
    ({ dialer, dialerComponents, listener, listenerComponents } = await createPeers({
      streamMuxers: [
        () => stubInterface<StreamMuxerFactory>({
          protocol: '/acme-muxer'
        })
      ]
    }, {
      streamMuxers: [
        () => stubInterface<StreamMuxerFactory>({
          protocol: '/example-muxer'
        })
      ]
    }))

    const dialerUpgraderUpgradeOutboundSpy = Sinon.spy(dialerComponents.upgrader, 'upgradeOutbound')
    const listenerUpgraderUpgradeInboundSpy = Sinon.spy(listenerComponents.upgrader, 'upgradeInbound')

    await expect(dialer.dial(listener.getMultiaddrs())).to.eventually.be.rejected
      .with.property('name', 'MuxerUnavailableError')

    // Ensure both sides fail
    await expect(dialerUpgraderUpgradeOutboundSpy.getCall(0).returnValue).to.eventually.be.rejected
      .with.property('name', 'MuxerUnavailableError')
    await expect(listenerUpgraderUpgradeInboundSpy.getCall(0).returnValue).to.eventually.be.rejected
      .with.property('name', 'MuxerUnavailableError')
  })

  it('should emit connection events', async () => {
    ({ dialer, dialerComponents, listener, listenerComponents } = await createPeers())

    const localConnectionEventReceived = pDefer()
    const localConnectionEndEventReceived = pDefer()
    const localPeerConnectEventReceived = pDefer()
    const localPeerDisconnectEventReceived = pDefer()
    const remoteConnectionEventReceived = pDefer()
    const remoteConnectionEndEventReceived = pDefer()
    const remotePeerConnectEventReceived = pDefer()
    const remotePeerDisconnectEventReceived = pDefer()

    dialerComponents.events.addEventListener('connection:open', (event) => {
      expect(event.detail.remotePeer.equals(listener.peerId)).to.be.true()
      localConnectionEventReceived.resolve()
    })
    dialerComponents.events.addEventListener('connection:close', (event) => {
      expect(event.detail.remotePeer.equals(listener.peerId)).to.be.true()
      localConnectionEndEventReceived.resolve()
    })
    dialerComponents.events.addEventListener('peer:connect', (event) => {
      expect(event.detail.equals(listener.peerId)).to.be.true()
      localPeerConnectEventReceived.resolve()
    })
    dialerComponents.events.addEventListener('peer:disconnect', (event) => {
      expect(event.detail.equals(listener.peerId)).to.be.true()
      localPeerDisconnectEventReceived.resolve()
    })

    listenerComponents.events.addEventListener('connection:open', (event) => {
      expect(event.detail.remotePeer.equals(dialer.peerId)).to.be.true()
      remoteConnectionEventReceived.resolve()
    })
    listenerComponents.events.addEventListener('connection:close', (event) => {
      expect(event.detail.remotePeer.equals(dialer.peerId)).to.be.true()
      remoteConnectionEndEventReceived.resolve()
    })
    listenerComponents.events.addEventListener('peer:connect', (event) => {
      expect(event.detail.equals(dialer.peerId)).to.be.true()
      remotePeerConnectEventReceived.resolve()
    })
    listenerComponents.events.addEventListener('peer:disconnect', (event) => {
      expect(event.detail.equals(dialer.peerId)).to.be.true()
      remotePeerDisconnectEventReceived.resolve()
    })

    await dialer.dial(listener.getMultiaddrs())

    // Verify onConnection is called with the connection
    const connections = await Promise.all([
      ...dialer.getConnections(listener.peerId),
      ...listener.getConnections(dialer.peerId)
    ])
    expect(connections).to.have.lengthOf(2)

    await Promise.all([
      localConnectionEventReceived.promise,
      localPeerConnectEventReceived.promise,
      remoteConnectionEventReceived.promise,
      remotePeerConnectEventReceived.promise
    ])

    // Verify onConnectionEnd is called with the connection
    await Promise.all(connections.map(async conn => { await conn.close() }))

    await Promise.all([
      localConnectionEndEventReceived.promise,
      localPeerDisconnectEventReceived.promise,
      remoteConnectionEndEventReceived.promise,
      remotePeerDisconnectEventReceived.promise
    ])
  })

  it('should fail to create a stream for an unsupported protocol', async () => {
    ({ dialer, listener } = await createPeers())

    await dialer.dial(listener.getMultiaddrs())

    const connections = await Promise.all([
      ...dialer.getConnections(listener.peerId),
      ...listener.getConnections(dialer.peerId)
    ])
    expect(connections).to.have.lengthOf(2)

    await expect(connections[0].newStream('/unsupported/1.0.0')).to.eventually.be.rejected
      .with.property('name', 'UnsupportedProtocolError')
    await expect(connections[1].newStream('/unsupported/1.0.0')).to.eventually.be.rejected
      .with.property('name', 'UnsupportedProtocolError')
  })

  it('should abort protocol selection for slow stream creation', async () => {
    ({ dialer, listener } = await createPeers({
      streamMuxers: [
        slowMuxer(1000)
      ]
    }))

    const connection = await dialer.dial(listener.getMultiaddrs())

    await expect(connection.newStream('/echo/1.0.0', {
      signal: AbortSignal.timeout(100)
    })).to.eventually.be.rejected
      .with.property('name', 'AbortError')
  })

  it('should close streams when protocol negotiation fails', async () => {
    ({ dialer, listener } = await createPeers())

    await dialer.dial(listener.getMultiaddrs())

    const connections = await Promise.all([
      ...dialer.getConnections(listener.peerId),
      ...listener.getConnections(dialer.peerId)
    ])
    expect(connections).to.have.lengthOf(2)
    expect(connections[0].streams).to.have.lengthOf(0)
    expect(connections[1].streams).to.have.lengthOf(0)

    await expect(connections[0].newStream('/foo/1.0.0'))
      .to.eventually.be.rejected.with.property('name', 'UnsupportedProtocolError')

    // wait for remote to close
    await delay(100)

    expect(connections[0].streams).to.have.lengthOf(0)
    expect(connections[1].streams).to.have.lengthOf(0)
  })

  it('should allow skipping encryption and protection', async () => {
    const protector = stubInterface<ConnectionProtector>()
    const encrypter = stubInterface<ConnectionEncrypter>()

    ;({ dialer, listener } = await createPeers({
      transports: [
        memory({
          upgraderOptions: {
            skipEncryption: true,
            skipProtection: true
          }
        })
      ],
      connectionEncrypters: [
        () => encrypter
      ],
      connectionProtector: () => protector
    }, {
      transports: [
        memory({
          upgraderOptions: {
            skipEncryption: true,
            skipProtection: true
          }
        })
      ],
      connectionEncrypters: [
        () => encrypter
      ],
      connectionProtector: () => protector
    }))

    const input = Uint8Array.from([0, 1, 2, 3, 4])
    const output = await dialer.services.echo.echo(listener.getMultiaddrs(), input)
    expect(output).to.equalBytes(input)

    expect(encrypter.secureInbound.called).to.be.false('used connection encrypter')
    expect(encrypter.secureOutbound.called).to.be.false('used connection encrypter')
    expect(protector.protect.called).to.be.false('used connection protector')
  })

  it('should not decrement inbound pending connection count if the connection is denied', async () => {
    ({ dialer, dialerComponents, listener, listenerComponents } = await createPeers())

    listenerComponents.connectionManager.acceptIncomingConnection = async () => false
    const afterUpgradeInboundSpy = Sinon.spy(listenerComponents.connectionManager, 'afterUpgradeInbound')

    await expect(dialer.dial(listener.getMultiaddrs())).to.eventually.be.rejected
      .with.property('message', 'Connection denied')

    expect(afterUpgradeInboundSpy.called).to.be.false()
  })

  it('should limit the number of incoming streams that can be opened using a protocol', async () => {
    ({ dialer, listener } = await createPeers())

    const protocol = '/a-test-protocol/1.0.0'

    await listener.handle(protocol, () => {}, {
      maxInboundStreams: 2,
      maxOutboundStreams: 2
    })

    const connection = await dialer.dial(listener.getMultiaddrs())
    expect(connection.streams).to.have.lengthOf(0)

    await connection.newStream(protocol)
    await connection.newStream(protocol)

    expect(connection.streams).to.have.lengthOf(2)

    const stream = await connection.newStream(protocol)

    await expect(drain(stream.source)).to.eventually.be.rejected()
      .with.property('name', 'StreamResetError')
  })

  it('should limit the number of outgoing streams that can be opened using a protocol', async () => {
    ({ dialer, listener } = await createPeers())

    const protocol = '/a-test-protocol/1.0.0'

    await listener.handle(protocol, () => {}, {
      maxInboundStreams: 20,
      maxOutboundStreams: 20
    })

    await dialer.handle(protocol, () => {}, {
      maxInboundStreams: 2,
      maxOutboundStreams: 2
    })

    const connection = await dialer.dial(listener.getMultiaddrs())
    expect(connection.streams).to.have.lengthOf(0)

    await connection.newStream(protocol)
    await connection.newStream(protocol)

    expect(connection.streams).to.have.lengthOf(2)

    await expect(connection.newStream(protocol)).to.eventually.be.rejected()
      .with.property('name', 'TooManyOutboundProtocolStreamsError')
  })

  it('should allow overriding the number of outgoing streams that can be opened using a protocol without a handler', async () => {
    ({ dialer, listener } = await createPeers())

    const protocol = '/a-test-protocol/1.0.0'

    await listener.handle(protocol, () => {}, {
      maxInboundStreams: 20,
      maxOutboundStreams: 20
    })

    const connection = await dialer.dial(listener.getMultiaddrs())
    expect(connection.streams).to.have.lengthOf(0)

    const opts = {
      maxOutboundStreams: 2
    }

    await connection.newStream(protocol, opts)
    await connection.newStream(protocol, opts)

    expect(connection.streams).to.have.lengthOf(2)

    await expect(connection.newStream(protocol, opts)).to.eventually.be.rejected()
      .with.property('name', 'TooManyOutboundProtocolStreamsError')
  })
})
