'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const Muxer = require('libp2p-mplex')
const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')
const pipe = require('it-pipe')
const { collect } = require('streaming-iterables')
const pSettle = require('p-settle')
const Transport = require('libp2p-websockets')
const { NOISE: Crypto } = require('@chainsafe/libp2p-noise')
const Protector = require('../../src/pnet')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const swarmKeyBuffer = uint8ArrayFromString(require('../fixtures/swarm.key'))

const Libp2p = require('../../src')
const Upgrader = require('../../src/upgrader')
const { codes } = require('../../src/errors')

const mockMultiaddrConnPair = require('../utils/mockMultiaddrConn')
const Peers = require('../fixtures/peers')
const addrs = [
  new Multiaddr('/ip4/127.0.0.1/tcp/0'),
  new Multiaddr('/ip4/127.0.0.1/tcp/0')
]

describe('Upgrader', () => {
  let localUpgrader
  let remoteUpgrader
  let localPeer
  let remotePeer

  before(async () => {
    ([
      localPeer,
      remotePeer
    ] = await Promise.all([
      PeerId.createFromJSON(Peers[0]),
      PeerId.createFromJSON(Peers[1])
    ]))

    localUpgrader = new Upgrader({
      localPeer
    })
    remoteUpgrader = new Upgrader({
      localPeer: remotePeer
    })

    localUpgrader.protocols.set('/echo/1.0.0', ({ stream }) => pipe(stream, stream))
    remoteUpgrader.protocols.set('/echo/1.0.0', ({ stream }) => pipe(stream, stream))
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should upgrade with valid muxers and crypto', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const cryptos = new Map([[Crypto.protocol, Crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    const { stream, protocol } = await connections[0].newStream('/echo/1.0.0')
    expect(protocol).to.equal('/echo/1.0.0')

    const hello = uint8ArrayFromString('hello there!')
    const result = await pipe(
      [hello],
      stream,
      function toBuffer (source) {
        return (async function * () {
          for await (const val of source) yield val.slice()
        })()
      },
      collect
    )

    expect(result).to.eql([hello])
  })

  it('should upgrade with only crypto', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    // No available muxers
    const muxers = new Map()
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const cryptos = new Map([[Crypto.protocol, Crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    await expect(connections[0].newStream('/echo/1.0.0')).to.be.rejected()

    // Verify the MultiaddrConnection close method is called
    sinon.spy(inbound, 'close')
    sinon.spy(outbound, 'close')
    await Promise.all(connections.map(conn => conn.close()))
    expect(inbound.close.callCount).to.equal(1)
    expect(outbound.close.callCount).to.equal(1)
  })

  it('should use a private connection protector when provided', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const cryptos = new Map([[Crypto.protocol, Crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    const protector = new Protector(swarmKeyBuffer)
    sinon.stub(localUpgrader, 'protector').value(protector)
    sinon.stub(remoteUpgrader, 'protector').value(protector)
    sinon.spy(protector, 'protect')

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    const { stream, protocol } = await connections[0].newStream('/echo/1.0.0')
    expect(protocol).to.equal('/echo/1.0.0')

    const hello = uint8ArrayFromString('hello there!')
    const result = await pipe(
      [hello],
      stream,
      function toBuffer (source) {
        return (async function * () {
          for await (const val of source) yield val.slice()
        })()
      },
      collect
    )

    expect(result).to.eql([hello])
    expect(protector.protect.callCount).to.eql(2)
  })

  it('should fail if crypto fails', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const crypto = {
      tag: '/insecure',
      secureInbound: () => { throw new Error('Boom') },
      secureOutbound: () => { throw new Error('Boom') }
    }

    const cryptos = new Map([[crypto.tag, crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    // Wait for the results of each side of the connection
    const results = await pSettle([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    // Ensure both sides fail
    expect(results).to.have.length(2)
    results.forEach(result => {
      expect(result.isRejected).to.equal(true)
      expect(result.reason.code).to.equal(codes.ERR_ENCRYPTION_FAILED)
    })
  })

  it('should fail if muxers do not match', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const muxersLocal = new Map([['/muxer-local', Muxer]])
    const muxersRemote = new Map([['/muxer-remote', Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxersLocal)
    sinon.stub(remoteUpgrader, 'muxers').value(muxersRemote)

    const cryptos = new Map([[Crypto.protocol, Crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    // Wait for the results of each side of the connection
    const results = await pSettle([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    // Ensure both sides fail
    expect(results).to.have.length(2)
    results.forEach(result => {
      expect(result.isRejected).to.equal(true)
      expect(result.reason.code).to.equal(codes.ERR_MUXER_UNAVAILABLE)
    })
  })

  it('should map getStreams and close methods', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const cryptos = new Map([[Crypto.protocol, Crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    // Create a few streams, at least 1 in each direction
    await connections[0].newStream('/echo/1.0.0')
    await connections[1].newStream('/echo/1.0.0')
    await connections[0].newStream('/echo/1.0.0')
    connections.forEach(conn => {
      expect(conn.streams).to.have.length(3)
    })

    // Verify the MultiaddrConnection close method is called
    sinon.spy(inbound, 'close')
    sinon.spy(outbound, 'close')
    await Promise.all(connections.map(conn => conn.close()))
    expect(inbound.close.callCount).to.equal(1)
    expect(outbound.close.callCount).to.equal(1)
  })

  it('should call connection handlers', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const cryptos = new Map([[Crypto.protocol, Crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    // Verify onConnection is called with the connection
    sinon.spy(localUpgrader, 'onConnection')
    sinon.spy(remoteUpgrader, 'onConnection')
    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])
    expect(connections).to.have.length(2)
    expect(localUpgrader.onConnection.callCount).to.equal(1)
    expect(localUpgrader.onConnection.getCall(0).args).to.eql([connections[0]])
    expect(remoteUpgrader.onConnection.callCount).to.equal(1)
    expect(remoteUpgrader.onConnection.getCall(0).args).to.eql([connections[1]])

    // Verify onConnectionEnd is called with the connection
    sinon.spy(localUpgrader, 'onConnectionEnd')
    sinon.spy(remoteUpgrader, 'onConnectionEnd')
    await Promise.all(connections.map(conn => conn.close()))
    expect(localUpgrader.onConnectionEnd.callCount).to.equal(1)
    expect(localUpgrader.onConnectionEnd.getCall(0).args).to.eql([connections[0]])
    expect(remoteUpgrader.onConnectionEnd.callCount).to.equal(1)
    expect(remoteUpgrader.onConnectionEnd.getCall(0).args).to.eql([connections[1]])
  })

  it('should fail to create a stream for an unsupported protocol', async () => {
    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    const muxers = new Map([[Muxer.multicodec, Muxer]])
    sinon.stub(localUpgrader, 'muxers').value(muxers)
    sinon.stub(remoteUpgrader, 'muxers').value(muxers)

    const cryptos = new Map([[Crypto.protocol, Crypto]])
    sinon.stub(localUpgrader, 'cryptos').value(cryptos)
    sinon.stub(remoteUpgrader, 'cryptos').value(cryptos)

    const connections = await Promise.all([
      localUpgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])

    expect(connections).to.have.length(2)

    const results = await pSettle([
      connections[0].newStream('/unsupported/1.0.0'),
      connections[1].newStream('/unsupported/1.0.0')
    ])
    expect(results).to.have.length(2)
    results.forEach(result => {
      expect(result.isRejected).to.equal(true)
      expect(result.reason.code).to.equal(codes.ERR_UNSUPPORTED_PROTOCOL)
    })
  })
})

describe('libp2p.upgrader', () => {
  let peers
  let libp2p

  before(async () => {
    peers = await Promise.all([
      PeerId.createFromJSON(Peers[0]),
      PeerId.createFromJSON(Peers[1])
    ])
  })

  afterEach(async () => {
    sinon.restore()
    libp2p && await libp2p.stop()
    libp2p = null
  })

  it('should create an Upgrader', () => {
    const protector = new Protector(swarmKeyBuffer)
    libp2p = new Libp2p({
      peerId: peers[0],
      modules: {
        transport: [Transport],
        streamMuxer: [Muxer],
        connEncryption: [Crypto],
        connProtector: protector
      }
    })

    expect(libp2p.upgrader).to.exist()
    expect(libp2p.upgrader.muxers).to.eql(new Map([[Muxer.multicodec, Muxer]]))
    expect(libp2p.upgrader.cryptos).to.eql(new Map([[Crypto.protocol, Crypto]]))
    expect(libp2p.upgrader.protector).to.equal(protector)
    // Ensure the transport manager also has the upgrader
    expect(libp2p.upgrader).to.equal(libp2p.transportManager.upgrader)
  })

  it('should be able to register and unregister a handler', () => {
    libp2p = new Libp2p({
      peerId: peers[0],
      modules: {
        transport: [Transport],
        streamMuxer: [Muxer],
        connEncryption: [Crypto]
      }
    })

    expect(libp2p.upgrader.protocols).to.not.have.any.keys(['/echo/1.0.0', '/echo/1.0.1'])

    const echoHandler = () => {}
    libp2p.handle(['/echo/1.0.0', '/echo/1.0.1'], echoHandler)
    expect(libp2p.upgrader.protocols.get('/echo/1.0.0')).to.equal(echoHandler)
    expect(libp2p.upgrader.protocols.get('/echo/1.0.1')).to.equal(echoHandler)

    libp2p.unhandle(['/echo/1.0.0'])
    expect(libp2p.upgrader.protocols.get('/echo/1.0.0')).to.equal(undefined)
    expect(libp2p.upgrader.protocols.get('/echo/1.0.1')).to.equal(echoHandler)
  })

  it('should return muxed streams', async () => {
    const remotePeer = peers[1]
    libp2p = new Libp2p({
      peerId: peers[0],
      modules: {
        transport: [Transport],
        streamMuxer: [Muxer],
        connEncryption: [Crypto]
      }
    })
    const echoHandler = () => {}
    libp2p.handle(['/echo/1.0.0'], echoHandler)

    const remoteUpgrader = new Upgrader({
      localPeer: remotePeer,
      muxers: new Map([[Muxer.multicodec, Muxer]]),
      cryptos: new Map([[Crypto.protocol, Crypto]])
    })
    remoteUpgrader.protocols.set('/echo/1.0.0', echoHandler)

    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })
    const [localConnection] = await Promise.all([
      libp2p.upgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])
    sinon.spy(remoteUpgrader, '_onStream')

    const { stream } = await localConnection.newStream(['/echo/1.0.0'])
    expect(stream).to.include.keys(['id', 'close', 'reset', 'timeline'])

    const [arg0] = remoteUpgrader._onStream.getCall(0).args
    expect(arg0.stream).to.include.keys(['id', 'close', 'reset', 'timeline'])
  })

  it('should emit connect and disconnect events', async () => {
    const remotePeer = peers[1]
    libp2p = new Libp2p({
      peerId: peers[0],
      modules: {
        transport: [Transport],
        streamMuxer: [Muxer],
        connEncryption: [Crypto]
      }
    })

    const remoteUpgrader = new Upgrader({
      localPeer: remotePeer,
      muxers: new Map([[Muxer.multicodec, Muxer]]),
      cryptos: new Map([[Crypto.protocol, Crypto]])
    })

    const { inbound, outbound } = mockMultiaddrConnPair({ addrs, remotePeer })

    // Spy on emit for easy verification
    sinon.spy(libp2p.connectionManager, 'emit')

    // Upgrade and check the connect event
    const connections = await Promise.all([
      libp2p.upgrader.upgradeOutbound(outbound),
      remoteUpgrader.upgradeInbound(inbound)
    ])
    expect(libp2p.connectionManager.emit.callCount).to.equal(1)

    let [event, connection] = libp2p.connectionManager.emit.getCall(0).args
    expect(event).to.equal('peer:connect')
    expect(connection.remotePeer.equals(remotePeer)).to.equal(true)

    // Close and check the disconnect event
    await Promise.all(connections.map(conn => conn.close()))
    expect(libp2p.connectionManager.emit.callCount).to.equal(2)
    ;([event, connection] = libp2p.connectionManager.emit.getCall(1).args)
    expect(event).to.equal('peer:disconnect')
    expect(connection.remotePeer.equals(remotePeer)).to.equal(true)
  })
})
