'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const { Multiaddr } = require('multiaddr')
const Transport = require('libp2p-websockets')
const filters = require('libp2p-websockets/src/filters')
const { NOISE: Crypto } = require('@chainsafe/libp2p-noise')
const AddressManager = require('../../src/address-manager')
const TransportManager = require('../../src/transport-manager')
const mockUpgrader = require('../utils/mockUpgrader')
const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')
const { codes: ErrorCodes } = require('../../src/errors')
const Libp2p = require('../../src')
const { FaultTolerance } = require('../../src/transport-manager')

const Peers = require('../fixtures/peers')
const PeerId = require('peer-id')

const listenAddr = new Multiaddr('/ip4/127.0.0.1/tcp/0')

describe('Transport Manager (WebSockets)', () => {
  let tm

  before(() => {
    tm = new TransportManager({
      libp2p: {
        addressManager: new AddressManager({ listen: [listenAddr] })
      },
      upgrader: mockUpgrader,
      onConnection: () => {}
    })
  })

  afterEach(async () => {
    await tm.removeAll()
    expect(tm._transports.size).to.equal(0)
  })

  it('should be able to add and remove a transport', async () => {
    tm.add(Transport.prototype[Symbol.toStringTag], Transport, { filter: filters.all })
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
    tm.add(Transport.prototype[Symbol.toStringTag], Transport, { filter: filters.all })
    const addr = MULTIADDRS_WEBSOCKETS[0]
    const connection = await tm.dial(addr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to dial an unsupported address', async () => {
    tm.add(Transport.prototype[Symbol.toStringTag], Transport, { filter: filters.all })
    const addr = new Multiaddr('/ip4/127.0.0.1/tcp/0')
    await expect(tm.dial(addr))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_TRANSPORT_UNAVAILABLE)
  })

  it('should fail to listen with no valid address', async () => {
    tm.add(Transport.prototype[Symbol.toStringTag], Transport, { filter: filters.all })

    await expect(tm.listen([listenAddr]))
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_NO_VALID_ADDRESSES)
  })
})

describe('libp2p.transportManager', () => {
  let peerId
  let libp2p

  before(async () => {
    peerId = await PeerId.createFromJSON(Peers[0])
  })

  afterEach(async () => {
    sinon.restore()
    libp2p && await libp2p.stop()
    libp2p = null
  })

  it('should create a TransportManager', () => {
    libp2p = new Libp2p({
      peerId,
      modules: {
        transport: [Transport],
        connEncryption: [Crypto]
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
      another: 'value',
      listenerOptions: {
        listen: 'carefully'
      }
    }
    libp2p = new Libp2p({
      peerId,
      modules: {
        transport: [spy],
        connEncryption: [Crypto]
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
    expect(libp2p.transportManager._listenerOptions.size).to.equal(2)
    expect(spy).to.have.property('callCount', 1)
    expect(spy.getCall(0)).to.have.deep.property('args', [{
      ...customOptions,
      libp2p,
      upgrader: libp2p.upgrader
    }])
  })

  it('starting and stopping libp2p should start and stop TransportManager', async () => {
    libp2p = new Libp2p({
      peerId,
      modules: {
        transport: [Transport],
        connEncryption: [Crypto]
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

describe('libp2p.transportManager (dial only)', () => {
  let peerId
  let libp2p

  before(async () => {
    peerId = await PeerId.createFromJSON(Peers[0])
  })

  afterEach(async () => {
    sinon.restore()
    libp2p && await libp2p.stop()
  })

  it('fails to start if multiaddr fails to listen', async () => {
    libp2p = new Libp2p({
      peerId,
      addresses: {
        listen: [new Multiaddr('/ip4/127.0.0.1/tcp/0')]
      },
      modules: {
        transport: [Transport],
        connEncryption: [Crypto]
      }
    })

    try {
      await libp2p.start()
    } catch (/** @type {any} */ err) {
      expect(err).to.exist()
      expect(err.code).to.equal(ErrorCodes.ERR_NO_VALID_ADDRESSES)
      return
    }
    throw new Error('it should fail to start if multiaddr fails to listen')
  })

  it('does not fail to start if provided listen multiaddr are not compatible to configured transports (when supporting dial only mode)', async () => {
    libp2p = new Libp2p({
      peerId,
      addresses: {
        listen: [new Multiaddr('/ip4/127.0.0.1/tcp/0')]
      },
      transportManager: {
        faultTolerance: FaultTolerance.NO_FATAL
      },
      modules: {
        transport: [Transport],
        connEncryption: [Crypto]
      }
    })

    await libp2p.start()
  })

  it('does not fail to start if provided listen multiaddr fail to listen on configured transports (when supporting dial only mode)', async () => {
    libp2p = new Libp2p({
      peerId,
      addresses: {
        listen: [new Multiaddr('/ip4/127.0.0.1/tcp/12345/p2p/QmWDn2LY8nannvSWJzruUYoLZ4vV83vfCBwd8DipvdgQc3/p2p-circuit')]
      },
      transportManager: {
        faultTolerance: FaultTolerance.NO_FATAL
      },
      modules: {
        transport: [Transport],
        connEncryption: [Crypto]
      }
    })

    await libp2p.start()
  })
})
