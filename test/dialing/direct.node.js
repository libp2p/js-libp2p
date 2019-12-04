'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-as-promised'))
const { expect } = chai
const sinon = require('sinon')
const Transport = require('libp2p-tcp')
const Muxer = require('libp2p-mplex')
const Crypto = require('libp2p-secio')
const multiaddr = require('multiaddr')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const delay = require('delay')
const pDefer = require('p-defer')
const pipe = require('it-pipe')
const AggregateError = require('aggregate-error')
const { AbortError } = require('libp2p-interfaces/src/transport/errors')

const Libp2p = require('../../src')
const Dialer = require('../../src/dialer')
const PeerStore = require('../../src/peer-store')
const TransportManager = require('../../src/transport-manager')
const { codes: ErrorCodes } = require('../../src/errors')
const Protector = require('../../src/pnet')
const swarmKeyBuffer = Buffer.from(require('../fixtures/swarm.key'))

const mockUpgrader = require('../utils/mockUpgrader')
const Peers = require('../fixtures/peers')

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')
const unsupportedAddr = multiaddr('/ip4/127.0.0.1/tcp/9999/ws')

describe('Dialing (direct, TCP)', () => {
  let remoteTM
  let localTM
  let remoteAddr

  before(async () => {
    remoteTM = new TransportManager({
      libp2p: {},
      upgrader: mockUpgrader
    })
    remoteTM.add(Transport.prototype[Symbol.toStringTag], Transport)

    localTM = new TransportManager({
      libp2p: {},
      upgrader: mockUpgrader
    })
    localTM.add(Transport.prototype[Symbol.toStringTag], Transport)

    await remoteTM.listen([listenAddr])

    remoteAddr = remoteTM.getAddrs()[0]
  })

  after(() => remoteTM.close())

  afterEach(() => {
    sinon.restore()
  })

  it('should be able to connect to a remote node via its multiaddr', async () => {
    const dialer = new Dialer({ transportManager: localTM })

    const connection = await dialer.connectToMultiaddr(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should be able to connect to a remote node via its stringified multiaddr', async () => {
    const dialer = new Dialer({ transportManager: localTM })

    const connection = await dialer.connectToMultiaddr(remoteAddr.toString())
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    const dialer = new Dialer({ transportManager: localTM })

    await expect(dialer.connectToMultiaddr(unsupportedAddr))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', ErrorCodes.ERR_TRANSPORT_UNAVAILABLE)
  })

  it('should be able to connect to a given peer info', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      peerStore: {
        multiaddrsForPeer: () => [remoteAddr]
      }
    })
    const peerId = await PeerId.createFromJSON(Peers[0])
    const peerInfo = new PeerInfo(peerId)

    const connection = await dialer.connectToPeer(peerInfo)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should be able to connect to a given peer id', async () => {
    const peerStore = new PeerStore()
    const dialer = new Dialer({
      transportManager: localTM,
      peerStore
    })

    const peerId = await PeerId.createFromJSON(Peers[0])
    const peerInfo = new PeerInfo(peerId)
    peerInfo.multiaddrs.add(remoteAddr)
    peerStore.put(peerInfo)

    const connection = await dialer.connectToPeer(peerId)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      peerStore: {
        multiaddrsForPeer: () => [unsupportedAddr]
      }
    })
    const peerId = await PeerId.createFromJSON(Peers[0])
    const peerInfo = new PeerInfo(peerId)

    await expect(dialer.connectToPeer(peerInfo))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', ErrorCodes.ERR_TRANSPORT_UNAVAILABLE)
  })

  it('should abort dials on queue task timeout', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      timeout: 50
    })
    sinon.stub(localTM, 'dial').callsFake(async (addr, options) => {
      expect(options.signal).to.exist()
      expect(options.signal.aborted).to.equal(false)
      expect(addr.toString()).to.eql(remoteAddr.toString())
      await delay(60)
      expect(options.signal.aborted).to.equal(true)
      throw new AbortError()
    })

    await expect(dialer.connectToMultiaddr(remoteAddr))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.property('code', ErrorCodes.ERR_TIMEOUT)
  })

  it('should dial to the max concurrency', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      concurrency: 2
    })

    expect(dialer.tokens).to.have.length(2)

    const deferredDial = pDefer()
    sinon.stub(localTM, 'dial').callsFake(async () => {
      await deferredDial.promise
    })

    // Perform 3 multiaddr dials
    dialer.connectToMultiaddrs([remoteAddr, remoteAddr, remoteAddr])

    // Let the call stack run
    await delay(0)

    // We should have 2 in progress, and 1 waiting
    expect(dialer.tokens).to.have.length(0)

    deferredDial.resolve()

    // Let the call stack run
    await delay(0)

    // Only two dials should be executed, as the first dial will succeed
    expect(localTM.dial.callCount).to.equal(2)
    expect(dialer.tokens).to.have.length(2)
  })

  describe('libp2p.dialer', () => {
    let peerInfo
    let remotePeerInfo
    let libp2p
    let remoteLibp2p
    let remoteAddr

    before(async () => {
      const [peerId, remotePeerId] = await Promise.all([
        PeerId.createFromJSON(Peers[0]),
        PeerId.createFromJSON(Peers[1])
      ])

      peerInfo = new PeerInfo(peerId)
      remotePeerInfo = new PeerInfo(remotePeerId)

      remoteLibp2p = new Libp2p({
        peerInfo: remotePeerInfo,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        }
      })
      remoteLibp2p.handle('/echo/1.0.0', ({ stream }) => pipe(stream, stream))

      await remoteLibp2p.transportManager.listen([listenAddr])
      remoteAddr = remoteLibp2p.transportManager.getAddrs()[0]
    })

    afterEach(async () => {
      sinon.restore()
      libp2p && await libp2p.stop()
      libp2p = null
    })

    after(() => remoteLibp2p.stop())

    it('should use the dialer for connecting to a multiaddr', async () => {
      libp2p = new Libp2p({
        peerInfo,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        }
      })

      sinon.spy(libp2p.dialer, 'connectToMultiaddr')

      const connection = await libp2p.dial(remoteAddr)
      expect(connection).to.exist()
      const { stream, protocol } = await connection.newStream('/echo/1.0.0')
      expect(stream).to.exist()
      expect(protocol).to.equal('/echo/1.0.0')
      await connection.close()
      expect(libp2p.dialer.connectToMultiaddr.callCount).to.equal(1)
    })

    it('should use the dialer for connecting to a peer', async () => {
      libp2p = new Libp2p({
        peerInfo,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        }
      })

      sinon.spy(libp2p.dialer, 'connectToMultiaddrs')
      const remotePeer = new PeerInfo(remoteLibp2p.peerInfo.id)
      remotePeer.multiaddrs.add(remoteAddr)

      const connection = await libp2p.dial(remotePeer)
      expect(connection).to.exist()
      const { stream, protocol } = await connection.newStream('/echo/1.0.0')
      expect(stream).to.exist()
      expect(protocol).to.equal('/echo/1.0.0')
      await connection.close()
      expect(libp2p.dialer.connectToMultiaddrs.callCount).to.equal(1)
    })

    it('should be able to use hangup to close connections', async () => {
      libp2p = new Libp2p({
        peerInfo,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        }
      })

      const connection = await libp2p.dial(remoteAddr)
      expect(connection).to.exist()
      expect(connection.stat.timeline.close).to.not.exist()
      await libp2p.hangUp(connection.remotePeer)
      expect(connection.stat.timeline.close).to.exist()
    })

    it('should use the protectors when provided for connecting', async () => {
      const protector = new Protector(swarmKeyBuffer)
      libp2p = new Libp2p({
        peerInfo,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto],
          connProtector: protector
        }
      })

      sinon.spy(libp2p.upgrader.protector, 'protect')
      sinon.stub(remoteLibp2p.upgrader, 'protector').value(new Protector(swarmKeyBuffer))

      const connection = await libp2p.dialer.connectToMultiaddr(remoteAddr)
      expect(connection).to.exist()
      const { stream, protocol } = await connection.newStream('/echo/1.0.0')
      expect(stream).to.exist()
      expect(protocol).to.equal('/echo/1.0.0')
      await connection.close()
      expect(libp2p.upgrader.protector.protect.callCount).to.equal(1)
    })
  })
})
