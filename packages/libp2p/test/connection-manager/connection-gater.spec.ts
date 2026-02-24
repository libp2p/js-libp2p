import { generateKeyPair } from '@libp2p/crypto/keys'
import { start, stop } from '@libp2p/interface'
import { logger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { DefaultConnectionManager } from '../../src/connection-manager/index.js'
import { Upgrader } from '../../src/upgrader.js'
import { createDefaultUpgraderComponents } from '../upgrading/utils.js'
import { createDefaultConnectionManagerComponents } from './utils.js'
import type { Transport, MultiaddrConnection, StreamMuxerFactory } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'

describe('connection-gater', () => {
  let connectionManager: DefaultConnectionManager

  afterEach(async () => {
    await stop(connectionManager)
  })

  it('intercept peer dial', async () => {
    const denyDialPeer = Sinon.stub().returns(true)
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const ma = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${remotePeer}`)

    connectionManager = new DefaultConnectionManager(await createDefaultConnectionManagerComponents({
      connectionGater: {
        denyDialPeer
      }
    }))
    await start(connectionManager)

    await expect(connectionManager.openConnection(ma))
      .to.eventually.be.rejected().with.property('name', 'DialDeniedError')

    expect(denyDialPeer.called).to.be.true()
  })

  it('intercept addr dial', async () => {
    const denyDialMultiaddr = Sinon.stub().returns(true)
    const ma = multiaddr('/ip4/123.123.123.123/tcp/1234')

    connectionManager = new DefaultConnectionManager(await createDefaultConnectionManagerComponents({
      connectionGater: {
        denyDialMultiaddr
      },
      transportManager: stubInterface<TransportManager>({
        dialTransportForMultiaddr: () => stubInterface<Transport>()
      })
    }))
    await start(connectionManager)

    await expect(connectionManager.openConnection(ma))
      .to.eventually.be.rejected().with.property('name', 'DialDeniedError')

    expect(denyDialMultiaddr.called).to.be.true()
  })

  it('intercept accept inbound connection', async () => {
    const denyInboundConnection = Sinon.stub().returns(true)

    const upgrader = new Upgrader(await createDefaultUpgraderComponents({
      connectionGater: {
        denyInboundConnection
      }
    }), {
      connectionEncrypters: [],
      streamMuxers: []
    })

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const remoteAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${remotePeer}`)

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr
    })

    await expect(upgrader.upgradeInbound(maConn, {
      skipEncryption: true,
      remotePeer,
      skipProtection: true,
      muxerFactory: stubInterface<StreamMuxerFactory>(),
      signal: AbortSignal.timeout(5_000)
    }))
      .to.eventually.be.rejected().with.property('name', 'ConnectionInterceptedError')

    expect(denyInboundConnection.called).to.be.true()
  })

  it('intercept accept outbound connection', async () => {
    const denyOutboundConnection = Sinon.stub().returns(true)

    const upgrader = new Upgrader(await createDefaultUpgraderComponents({
      connectionGater: {
        denyOutboundConnection
      }
    }), {
      connectionEncrypters: [],
      streamMuxers: []
    })

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const remoteAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${remotePeer}`)

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr
    })

    await expect(upgrader.upgradeOutbound(maConn, {
      skipEncryption: true,
      remotePeer,
      skipProtection: true,
      muxerFactory: stubInterface<StreamMuxerFactory>(),
      signal: AbortSignal.timeout(5_000)
    }))
      .to.eventually.be.rejected().with.property('name', 'ConnectionInterceptedError')
  })

  it('intercept inbound encrypted', async () => {
    const denyInboundEncryptedConnection = Sinon.stub().returns(true)
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const remoteAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${remotePeer}`)

    const upgrader = new Upgrader(await createDefaultUpgraderComponents({
      connectionGater: {
        denyInboundEncryptedConnection
      }
    }), {
      connectionEncrypters: [],
      streamMuxers: []
    })
    upgrader._encryptInbound = async (maConn) => {
      return {
        connection: maConn,
        remotePeer,
        protocol: '/test-encrypter',
        earlyData: new Uint8ArrayList()
      }
    }

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr,
      log: logger('test')
    })

    await expect(upgrader.upgradeInbound(maConn, {
      skipProtection: true,
      muxerFactory: stubInterface<StreamMuxerFactory>(),
      signal: AbortSignal.timeout(5_000)
    }))
      .to.eventually.be.rejected().with.property('name', 'ConnectionInterceptedError')

    expect(denyInboundEncryptedConnection.called).to.be.true()
  })

  it('intercept outbound encrypted', async () => {
    const denyOutboundEncryptedConnection = Sinon.stub().returns(true)

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const remoteAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${remotePeer}`)

    const upgrader = new Upgrader(await createDefaultUpgraderComponents({
      connectionGater: {
        denyOutboundEncryptedConnection
      }
    }), {
      connectionEncrypters: [],
      streamMuxers: []
    })
    upgrader._encryptOutbound = async (maConn) => {
      return {
        connection: maConn,
        remotePeer,
        protocol: '/test-encrypter'
      }
    }

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr,
      log: logger('test')
    })

    await expect(upgrader.upgradeOutbound(maConn, {
      skipProtection: true,
      muxerFactory: stubInterface<StreamMuxerFactory>(),
      signal: AbortSignal.timeout(5_000)
    }))
      .to.eventually.be.rejected().with.property('name', 'ConnectionInterceptedError')

    expect(denyOutboundEncryptedConnection.called).to.be.true()
  })

  it('intercept inbound upgraded', async () => {
    const denyInboundUpgradedConnection = Sinon.stub().returns(true)
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const remoteAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${remotePeer}`)

    const upgrader = new Upgrader(await createDefaultUpgraderComponents({
      connectionGater: {
        denyInboundUpgradedConnection
      }
    }), {
      connectionEncrypters: [],
      streamMuxers: []
    })

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr,
      log: logger('test')
    })

    await expect(upgrader.upgradeInbound(maConn, {
      skipEncryption: true,
      remotePeer,
      skipProtection: true,
      muxerFactory: stubInterface<StreamMuxerFactory>(),
      signal: AbortSignal.timeout(5_000)
    }))
      .to.eventually.be.rejected().with.property('name', 'ConnectionInterceptedError')

    expect(denyInboundUpgradedConnection.called).to.be.true()
  })

  it('intercept outbound upgraded', async () => {
    const denyOutboundUpgradedConnection = Sinon.stub().returns(true)
    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const remoteAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${remotePeer}`)

    const upgrader = new Upgrader(await createDefaultUpgraderComponents({
      connectionGater: {
        denyOutboundUpgradedConnection
      }
    }), {
      connectionEncrypters: [],
      streamMuxers: []
    })

    const maConn = stubInterface<MultiaddrConnection>({
      remoteAddr,
      log: logger('test')
    })

    await expect(upgrader.upgradeOutbound(maConn, {
      skipEncryption: true,
      remotePeer,
      skipProtection: true,
      muxerFactory: stubInterface<StreamMuxerFactory>(),
      signal: AbortSignal.timeout(5_000)
    }))
      .to.eventually.be.rejected().with.property('name', 'ConnectionInterceptedError')

    expect(denyOutboundUpgradedConnection.called).to.be.true()
  })
})
