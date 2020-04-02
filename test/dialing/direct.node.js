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
const pSettle = require('p-settle')
const pipe = require('it-pipe')
const AggregateError = require('aggregate-error')
const { Connection } = require('libp2p-interfaces/src/connection')
const { AbortError } = require('libp2p-interfaces/src/transport/errors')

const Libp2p = require('../../src')
const Dialer = require('../../src/dialer')
const PeerStore = require('../../src/peer-store')
const TransportManager = require('../../src/transport-manager')
const { codes: ErrorCodes } = require('../../src/errors')
const Protector = require('../../src/pnet')
const swarmKeyBuffer = Buffer.from(require('../fixtures/swarm.key'))

const mockUpgrader = require('../utils/mockUpgrader')
const createMockConnection = require('../utils/mockConnection')
const Peers = require('../fixtures/peers')
const { createPeerInfo } = require('../utils/creators/peer')

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')
const unsupportedAddr = multiaddr('/ip4/127.0.0.1/tcp/9999/ws/p2p/QmckxVrJw1Yo8LqvmDJNUmdAsKtSbiKWmrXJFyKmUraBoN')

describe('Dialing (direct, TCP)', () => {
  let remoteTM
  let localTM
  let peerStore
  let remoteAddr

  before(async () => {
    const [remotePeerId] = await Promise.all([
      PeerId.createFromJSON(Peers[0])
    ])
    remoteTM = new TransportManager({
      libp2p: {},
      upgrader: mockUpgrader
    })
    remoteTM.add(Transport.prototype[Symbol.toStringTag], Transport)

    peerStore = new PeerStore()
    localTM = new TransportManager({
      libp2p: {},
      upgrader: mockUpgrader
    })
    localTM.add(Transport.prototype[Symbol.toStringTag], Transport)

    await remoteTM.listen([listenAddr])

    remoteAddr = remoteTM.getAddrs()[0].encapsulate(`/p2p/${remotePeerId.toB58String()}`)
  })

  after(() => remoteTM.close())

  afterEach(() => {
    sinon.restore()
  })

  it('should be able to connect to a remote node via its multiaddr', async () => {
    const dialer = new Dialer({ transportManager: localTM, peerStore })

    const connection = await dialer.connectToPeer(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should be able to connect to a remote node via its stringified multiaddr', async () => {
    const dialer = new Dialer({ transportManager: localTM, peerStore })

    const dialable = Dialer.getDialable(remoteAddr.toString())
    const connection = await dialer.connectToPeer(dialable)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    const dialer = new Dialer({ transportManager: localTM, peerStore })

    await expect(dialer.connectToPeer(unsupportedAddr))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', ErrorCodes.ERR_TRANSPORT_UNAVAILABLE)
  })

  it('should be able to connect to a given peer info', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      peerStore: {
        addressBook: {
          add: () => {},
          getMultiaddrsForPeer: () => [remoteAddr]
        }
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
    peerStore.addressBook.set(peerInfo.id, peerInfo.multiaddrs.toArray())

    const connection = await dialer.connectToPeer(peerInfo)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      peerStore: {
        addressBook: {
          add: () => {},
          getMultiaddrsForPeer: () => [unsupportedAddr]
        }
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
      peerStore,
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

    await expect(dialer.connectToPeer(remoteAddr))
      .to.eventually.be.rejectedWith(Error)
      .and.to.have.property('code', ErrorCodes.ERR_TIMEOUT)
  })

  it('should dial to the max concurrency', async () => {
    const addrs = [
      '/ip4/0.0.0.0/tcp/8000',
      '/ip4/0.0.0.0/tcp/8001',
      '/ip4/0.0.0.0/tcp/8002'
    ]
    const dialer = new Dialer({
      transportManager: localTM,
      concurrency: 2,
      peerStore: {
        addressBook: {
          add: () => {},
          getMultiaddrsForPeer: () => addrs
        }
      }
    })

    expect(dialer.tokens).to.have.length(2)

    const deferredDial = pDefer()
    sinon.stub(localTM, 'dial').callsFake(() => deferredDial.promise)

    const [peerInfo] = await createPeerInfo()

    // Perform 3 multiaddr dials
    dialer.connectToPeer(peerInfo)

    // Let the call stack run
    await delay(0)

    // We should have 2 in progress, and 1 waiting
    expect(dialer.tokens).to.have.length(0)

    deferredDial.resolve(await createMockConnection())

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
      remoteLibp2p.peerInfo.multiaddrs.add(listenAddr)
      remoteLibp2p.handle('/echo/1.0.0', ({ stream }) => pipe(stream, stream))

      await remoteLibp2p.start()
      remoteAddr = remoteLibp2p.transportManager.getAddrs()[0].encapsulate(`/p2p/${remotePeerId.toB58String()}`)
    })

    afterEach(async () => {
      sinon.restore()
      libp2p && await libp2p.stop()
      libp2p = null
    })

    after(() => remoteLibp2p.stop())

    it('should fail if no peer id is provided', async () => {
      libp2p = new Libp2p({
        peerInfo,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        }
      })

      sinon.spy(libp2p.dialer, 'connectToPeer')

      try {
        await libp2p.dial(remoteLibp2p.transportManager.getAddrs()[0])
      } catch (err) {
        expect(err).to.have.property('code', ErrorCodes.ERR_INVALID_PEER)
        return
      }

      expect.fail('dial should have failed')
    })

    it('should use the dialer for connecting to a multiaddr', async () => {
      libp2p = new Libp2p({
        peerInfo,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        }
      })

      sinon.spy(libp2p.dialer, 'connectToPeer')

      const connection = await libp2p.dial(remoteAddr)
      expect(connection).to.exist()
      const { stream, protocol } = await connection.newStream('/echo/1.0.0')
      expect(stream).to.exist()
      expect(protocol).to.equal('/echo/1.0.0')
      await connection.close()
      expect(libp2p.dialer.connectToPeer.callCount).to.equal(1)
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

      sinon.spy(libp2p.dialer, 'connectToPeer')

      const connection = await libp2p.dial(remotePeerInfo)
      expect(connection).to.exist()
      const { stream, protocol } = await connection.newStream('/echo/1.0.0')
      expect(stream).to.exist()
      expect(protocol).to.equal('/echo/1.0.0')
      await connection.close()
      expect(libp2p.dialer.connectToPeer.callCount).to.equal(1)
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

    it('should be able to use hangup by address string to close connections', async () => {
      libp2p = new Libp2p({
        peerInfo,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        }
      })

      const connection = await libp2p.dial(`${remoteAddr.toString()}`)
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

      const connection = await libp2p.dialer.connectToPeer(remoteAddr)
      expect(connection).to.exist()
      const { stream, protocol } = await connection.newStream('/echo/1.0.0')
      expect(stream).to.exist()
      expect(protocol).to.equal('/echo/1.0.0')
      await connection.close()
      expect(libp2p.upgrader.protector.protect.callCount).to.equal(1)
    })

    it('should coalesce parallel dials to the same peer (id in multiaddr)', async () => {
      libp2p = new Libp2p({
        peerInfo,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        }
      })
      const dials = 10

      const fullAddress = remoteAddr.encapsulate(`/p2p/${remoteLibp2p.peerInfo.id.toB58String()}`)
      const dialResults = await Promise.all([...new Array(dials)].map((_, index) => {
        if (index % 2 === 0) return libp2p.dial(remoteLibp2p.peerInfo)
        return libp2p.dial(fullAddress)
      }))

      // All should succeed and we should have ten results
      expect(dialResults).to.have.length(10)
      for (const connection of dialResults) {
        expect(Connection.isConnection(connection)).to.equal(true)
      }

      // 1 connection, because we know the peer in the multiaddr
      expect(libp2p.connectionManager._connections.size).to.equal(1)
      expect(remoteLibp2p.connectionManager._connections.size).to.equal(1)
    })

    it('should coalesce parallel dials to the same error on failure', async () => {
      libp2p = new Libp2p({
        peerInfo,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        }
      })
      const dials = 10
      const error = new Error('Boom')
      sinon.stub(libp2p.transportManager, 'dial').callsFake(() => Promise.reject(error))

      const dialResults = await pSettle([...new Array(dials)].map((_, index) => {
        if (index % 2 === 0) return libp2p.dial(remoteLibp2p.peerInfo)
        return libp2p.dial(remoteAddr)
      }))

      // All should succeed and we should have ten results
      expect(dialResults).to.have.length(10)
      for (const result of dialResults) {
        expect(result).to.have.property('isRejected', true)
        expect(result.reason).to.be.an.instanceof(AggregateError)
        // All errors should be the exact same as `error`
        for (const err of result.reason) {
          expect(err).to.equal(error)
        }
      }

      // 1 connection, because we know the peer in the multiaddr
      expect(libp2p.connectionManager._connections.size).to.equal(0)
      expect(remoteLibp2p.connectionManager._connections.size).to.equal(0)
    })
  })
})
