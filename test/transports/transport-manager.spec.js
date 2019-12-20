'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-as-promised'))
const { expect } = chai
const sinon = require('sinon')

const multiaddr = require('multiaddr')
const Transport = require('libp2p-websockets')
const TransportManager = require('../../src/transport-manager')
const mockUpgrader = require('../utils/mockUpgrader')
const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')
const { codes: ErrorCodes } = require('../../src/errors')
const Libp2p = require('../../src')
const Peers = require('../fixtures/peers')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')

describe('Transport Manager (WebSockets)', () => {
  let tm

  before(() => {
    tm = new TransportManager({
      libp2p: {},
      upgrader: mockUpgrader,
      onConnection: () => {}
    })
  })

  afterEach(async () => {
    await tm.removeAll()
    expect(tm._transports.size).to.equal(0)
  })

  it('should be able to add and remove a transport', async () => {
    tm.add(Transport.prototype[Symbol.toStringTag], Transport)
    expect(tm._transports.size).to.equal(1)
    await tm.remove(Transport.prototype[Symbol.toStringTag])
  })

  it('should not be able to add a transport without a key', async () => {
    // Chai as promised conflicts with normal `throws` validation,
    // so wrap the call in an async function
    await expect((async () => { // eslint-disable-line
      tm.add(undefined, Transport)
    })())
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_INVALID_KEY)
  })

  it('should not be able to add a transport twice', async () => {
    tm.add(Transport.prototype[Symbol.toStringTag], Transport)
    // Chai as promised conflicts with normal `throws` validation,
    // so wrap the call in an async function
    await expect((async () => { // eslint-disable-line
      tm.add(Transport.prototype[Symbol.toStringTag], Transport)
    })())
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_DUPLICATE_TRANSPORT)
  })

  it('should be able to dial', async () => {
    tm.add(Transport.prototype[Symbol.toStringTag], Transport)
    const addr = MULTIADDRS_WEBSOCKETS[0]
    const connection = await tm.dial(addr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to dial an unsupported address', async () => {
    tm.add(Transport.prototype[Symbol.toStringTag], Transport)
    const addr = multiaddr('/ip4/127.0.0.1/tcp/0')
    await expect(tm.dial(addr))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_TRANSPORT_UNAVAILABLE)
  })

  it('should fail to listen with no valid address', async () => {
    tm.add(Transport.prototype[Symbol.toStringTag], Transport)
    const addrs = [multiaddr('/ip4/127.0.0.1/tcp/0')]

    await expect(tm.listen(addrs))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })
})

describe('libp2p.transportManager', () => {
  let peerInfo
  let libp2p

  before(async () => {
    const peerId = await PeerId.createFromJSON(Peers[0])
    peerInfo = new PeerInfo(peerId)
  })

  afterEach(async () => {
    sinon.restore()
    libp2p && await libp2p.stop()
    libp2p = null
  })

  it('should create a TransportManager', () => {
    libp2p = new Libp2p({
      peerInfo,
      modules: {
        transport: [Transport]
      }
    })

    expect(libp2p.transportManager).to.exist()
    // Our transport and circuit relay
    expect(libp2p.transportManager._transports.size).to.equal(2)
  })

  it('should be able to customize a transport', () => {
    const spy = sinon.spy()
    const key = spy.prototype[Symbol.toStringTag] = 'TransportSpy'
    const customOptions = {
      another: 'value'
    }
    libp2p = new Libp2p({
      peerInfo,
      modules: {
        transport: [spy]
      },
      config: {
        transport: {
          [key]: customOptions
        }
      }
    })

    expect(libp2p.transportManager).to.exist()
    // Our transport and circuit relay
    expect(libp2p.transportManager._transports.size).to.equal(2)
    expect(spy).to.have.property('callCount', 1)
    expect(spy.getCall(0)).to.have.deep.property('args', [{
      ...customOptions,
      libp2p,
      upgrader: libp2p.upgrader
    }])
  })

  it('starting and stopping libp2p should start and stop TransportManager', async () => {
    libp2p = new Libp2p({
      peerInfo,
      modules: {
        transport: [Transport]
      }
    })

    // We don't need to listen, stub it
    sinon.stub(libp2p.transportManager, 'listen').returns(true)
    sinon.spy(libp2p.transportManager, 'close')

    await libp2p.start()
    await libp2p.stop()

    expect(libp2p.transportManager.listen.callCount).to.equal(1)
    expect(libp2p.transportManager.close.callCount).to.equal(1)
  })
})
