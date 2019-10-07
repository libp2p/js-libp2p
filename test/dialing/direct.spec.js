'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')
const pDefer = require('p-defer')
const delay = require('delay')
const Dialer = require('../../src/dialer')
const TransportManager = require('../../src/transport-manager')
const Transport = require('libp2p-websockets')
const multiaddr = require('multiaddr')
const mockUpgrader = require('../utils/mockUpgrader')
const { codes: ErrorCodes } = require('../../src/errors')
const Peers = require('../fixtures/peers')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')
const unsupportedAddr = multiaddr('/ip4/127.0.0.1/tcp/9999/ws')

describe('Dialing (direct, WebSockets)', () => {
  let localTM
  const remoteAddr = MULTIADDRS_WEBSOCKETS[0]

  before(() => {
    localTM = new TransportManager({
      libp2p: {},
      upgrader: mockUpgrader,
      onConnection: () => {}
    })
    localTM.add(Transport.prototype[Symbol.toStringTag], Transport)
  })

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

    try {
      await dialer.connectToMultiaddr(unsupportedAddr)
    } catch (err) {
      expect(err).to.satisfy((err) => err.code === ErrorCodes.ERR_TRANSPORT_DIAL_FAILED)
      return
    }

    expect.fail('Dial should have failed')
  })

  it('should be able to connect to a given peer', async () => {
    const dialer = new Dialer({ transportManager: localTM })
    const peerId = await PeerId.createFromJSON(Peers[0])
    const peerInfo = new PeerInfo(peerId)
    peerInfo.multiaddrs.add(remoteAddr)

    const connection = await dialer.connectToPeer(peerInfo)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    const dialer = new Dialer({ transportManager: localTM })
    const peerId = await PeerId.createFromJSON(Peers[0])
    const peerInfo = new PeerInfo(peerId)
    peerInfo.multiaddrs.add(unsupportedAddr)

    try {
      await dialer.connectToPeer(peerInfo)
    } catch (err) {
      expect(err).to.satisfy((err) => err.code === ErrorCodes.ERR_CONNECTION_FAILED)
      return
    }

    expect.fail('Dial should have failed')
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
    })

    try {
      await dialer.connectToMultiaddr(remoteAddr)
    } catch (err) {
      expect(err).to.satisfy((err) => err.code === ErrorCodes.ERR_TIMEOUT)
      return
    }

    expect.fail('Dial should have failed')
  })

  it('should dial to the max concurrency', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      concurrency: 2
    })

    const deferredDial = pDefer()
    sinon.stub(localTM, 'dial').callsFake(async () => {
      await deferredDial.promise
    })

    // Add 3 dials
    Promise.all([
      dialer.connectToMultiaddr(remoteAddr),
      dialer.connectToMultiaddr(remoteAddr),
      dialer.connectToMultiaddr(remoteAddr)
    ])

    // Let the call stack run
    await delay(0)

    // We should have 2 in progress, and 1 waiting
    expect(localTM.dial.callCount).to.equal(2)
    expect(dialer.queue.pending).to.equal(2)
    expect(dialer.queue.size).to.equal(1)

    deferredDial.resolve()

    // Let the call stack run
    await delay(0)
    // All dials should have executed
    expect(localTM.dial.callCount).to.equal(3)
    expect(dialer.queue.pending).to.equal(0)
    expect(dialer.queue.size).to.equal(0)
  })
})
