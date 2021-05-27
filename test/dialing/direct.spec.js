'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')
const pDefer = require('p-defer')
const pWaitFor = require('p-wait-for')
const delay = require('delay')
const Transport = require('libp2p-websockets')
const filters = require('libp2p-websockets/src/filters')
const Muxer = require('libp2p-mplex')
const { NOISE: Crypto } = require('libp2p-noise')
const { Multiaddr } = require('multiaddr')
const AggregateError = require('aggregate-error')
const { AbortError } = require('libp2p-interfaces/src/transport/errors')

const { codes: ErrorCodes } = require('../../src/errors')
const Constants = require('../../src/constants')
const Dialer = require('../../src/dialer')
const addressSort = require('libp2p-utils/src/address-sort')
const PeerStore = require('../../src/peer-store')
const TransportManager = require('../../src/transport-manager')
const Libp2p = require('../../src')

const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')
const mockUpgrader = require('../utils/mockUpgrader')
const createMockConnection = require('../utils/mockConnection')
const { createPeerId } = require('../utils/creators/peer')
const unsupportedAddr = new Multiaddr('/ip4/127.0.0.1/tcp/9999/ws/p2p/QmckxVrJw1Yo8LqvmDJNUmdAsKtSbiKWmrXJFyKmUraBoN')
const remoteAddr = MULTIADDRS_WEBSOCKETS[0]

describe('Dialing (direct, WebSockets)', () => {
  let localTM
  let peerStore
  let peerId

  before(async () => {
    [peerId] = await createPeerId()
    peerStore = new PeerStore({ peerId })
    localTM = new TransportManager({
      libp2p: {},
      upgrader: mockUpgrader,
      onConnection: () => {}
    })
    localTM.add(Transport.prototype[Symbol.toStringTag], Transport, { filter: filters.all })
  })

  afterEach(() => {
    peerStore.delete(peerId)
    sinon.restore()
  })

  it('should have appropriate defaults', () => {
    const dialer = new Dialer({ transportManager: localTM, peerStore })
    expect(dialer.maxParallelDials).to.equal(Constants.MAX_PARALLEL_DIALS)
    expect(dialer.timeout).to.equal(Constants.DIAL_TIMEOUT)
  })

  it('should limit the number of tokens it provides', () => {
    const dialer = new Dialer({ transportManager: localTM, peerStore })
    const maxPerPeer = Constants.MAX_PER_PEER_DIALS
    expect(dialer.tokens).to.have.length(Constants.MAX_PARALLEL_DIALS)
    const tokens = dialer.getTokens(maxPerPeer + 1)
    expect(tokens).to.have.length(maxPerPeer)
    expect(dialer.tokens).to.have.length(Constants.MAX_PARALLEL_DIALS - maxPerPeer)
  })

  it('should not return tokens if non are left', () => {
    const dialer = new Dialer({ transportManager: localTM, peerStore })
    sinon.stub(dialer, 'tokens').value([])
    const tokens = dialer.getTokens(1)
    expect(tokens.length).to.equal(0)
  })

  it('should NOT be able to return a token twice', () => {
    const dialer = new Dialer({ transportManager: localTM, peerStore })
    const tokens = dialer.getTokens(1)
    expect(tokens).to.have.length(1)
    expect(dialer.tokens).to.have.length(Constants.MAX_PARALLEL_DIALS - 1)
    dialer.releaseToken(tokens[0])
    dialer.releaseToken(tokens[0])
    expect(dialer.tokens).to.have.length(Constants.MAX_PARALLEL_DIALS)
  })

  it('should be able to connect to a remote node via its multiaddr', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      peerStore: {
        addressBook: {
          add: () => {},
          getMultiaddrsForPeer: () => [remoteAddr]
        }
      }
    })

    const connection = await dialer.connectToPeer(remoteAddr)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should be able to connect to a remote node via its stringified multiaddr', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      peerStore: {
        addressBook: {
          add: () => {},
          getMultiaddrsForPeer: () => [remoteAddr]
        }
      }
    })

    const connection = await dialer.connectToPeer(remoteAddr.toString())
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to an unsupported multiaddr', async () => {
    const dialer = new Dialer({ transportManager: localTM, peerStore })

    await expect(dialer.connectToPeer(unsupportedAddr))
      .to.eventually.be.rejectedWith(AggregateError)
  })

  it('should be able to connect to a given peer', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      peerStore: {
        addressBook: {
          add: () => {},
          getMultiaddrsForPeer: () => [remoteAddr]
        }
      }
    })

    const connection = await dialer.connectToPeer(peerId)
    expect(connection).to.exist()
    await connection.close()
  })

  it('should fail to connect to a given peer with unsupported addresses', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      peerStore: {
        addressBook: {
          set: () => {},
          getMultiaddrsForPeer: () => [unsupportedAddr]
        }
      }
    })

    await expect(dialer.connectToPeer(peerId))
      .to.eventually.be.rejectedWith(AggregateError)
  })

  it('should abort dials on queue task timeout', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      dialTimeout: 50,
      peerStore: {
        addressBook: {
          add: () => {},
          getMultiaddrsForPeer: () => [remoteAddr]
        }
      }
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
      .to.eventually.be.rejected()
      .and.to.have.property('code', ErrorCodes.ERR_TIMEOUT)
  })

  it('should sort addresses on dial', async () => {
    const peerMultiaddrs = [
      new Multiaddr('/ip4/127.0.0.1/tcp/15001/ws'),
      new Multiaddr('/ip4/20.0.0.1/tcp/15001/ws'),
      new Multiaddr('/ip4/30.0.0.1/tcp/15001/ws')
    ]

    sinon.spy(addressSort, 'publicAddressesFirst')
    sinon.stub(localTM, 'dial').callsFake(createMockConnection)

    const dialer = new Dialer({
      transportManager: localTM,
      addressSorter: addressSort.publicAddressesFirst,
      maxParallelDials: 3,
      peerStore
    })

    // Inject data in the AddressBook
    peerStore.addressBook.add(peerId, peerMultiaddrs)

    // Perform 3 multiaddr dials
    await dialer.connectToPeer(peerId)

    expect(addressSort.publicAddressesFirst.callCount).to.eql(1)

    const sortedAddresses = addressSort.publicAddressesFirst(peerMultiaddrs.map((m) => ({ multiaddr: m })))
    expect(localTM.dial.getCall(0).args[0].equals(sortedAddresses[0].multiaddr))
    expect(localTM.dial.getCall(1).args[0].equals(sortedAddresses[1].multiaddr))
    expect(localTM.dial.getCall(2).args[0].equals(sortedAddresses[2].multiaddr))
  })

  it('should dial to the max concurrency', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      maxParallelDials: 2,
      peerStore: {
        addressBook: {
          set: () => {},
          getMultiaddrsForPeer: () => [remoteAddr, remoteAddr, remoteAddr]
        }
      }
    })

    expect(dialer.tokens).to.have.length(2)

    const deferredDial = pDefer()
    sinon.stub(localTM, 'dial').callsFake(() => deferredDial.promise)

    // Perform 3 multiaddr dials
    dialer.connectToPeer(peerId)

    // Let the call stack run
    await delay(0)

    // We should have 2 in progress, and 1 waiting
    expect(dialer.tokens).to.have.length(0)
    expect(dialer._pendingDials.size).to.equal(1) // 1 dial request

    deferredDial.resolve(await createMockConnection())

    // Let the call stack run
    await delay(0)

    // Only two dials will be run, as the first two succeeded
    expect(localTM.dial.callCount).to.equal(2)
    expect(dialer.tokens).to.have.length(2)
    expect(dialer._pendingDials.size).to.equal(0)
  })

  it('.destroy should abort pending dials', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      maxParallelDials: 2,
      peerStore: {
        addressBook: {
          set: () => {},
          getMultiaddrsForPeer: () => [remoteAddr, remoteAddr, remoteAddr]
        }
      }
    })

    expect(dialer.tokens).to.have.length(2)

    sinon.stub(localTM, 'dial').callsFake((_, options) => {
      const deferredDial = pDefer()
      const onAbort = () => {
        options.signal.removeEventListener('abort', onAbort)
        deferredDial.reject(new AbortError())
      }
      options.signal.addEventListener('abort', onAbort)
      return deferredDial.promise
    })

    // Perform 3 multiaddr dials
    const dialPromise = dialer.connectToPeer(peerId)

    // Let the call stack run
    await delay(0)

    // We should have 2 in progress, and 1 waiting
    expect(dialer.tokens).to.have.length(0)
    expect(dialer._pendingDials.size).to.equal(1) // 1 dial request

    try {
      dialer.destroy()
      await dialPromise
      expect.fail('should have failed')
    } catch (err) {
      expect(err).to.be.an.instanceof(AggregateError)
      expect(dialer._pendingDials.size).to.equal(0) // 1 dial request
    }
  })

  it('should cancel pending dial targets before proceeding', async () => {
    const dialer = new Dialer({
      transportManager: localTM,
      peerStore: {
        addressBook: {
          set: () => { }
        }
      }
    })

    sinon.stub(dialer, '_createDialTarget').callsFake(() => {
      const deferredDial = pDefer()
      return deferredDial.promise
    })

    // Perform dial
    const dialPromise = dialer.connectToPeer(peerId)

    // Let the call stack run
    await delay(0)

    dialer.destroy()

    await expect(dialPromise)
      .to.eventually.be.rejected()
      .and.to.have.property('code', 'ABORT_ERR')
  })

  describe('libp2p.dialer', () => {
    const transportKey = Transport.prototype[Symbol.toStringTag]
    let libp2p

    afterEach(async () => {
      sinon.restore()
      libp2p && await libp2p.stop()
      libp2p = null
    })

    it('should create a dialer', () => {
      libp2p = new Libp2p({
        peerId,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        },
        config: {
          transport: {
            [transportKey]: {
              filter: filters.all
            }
          }
        }
      })

      expect(libp2p.dialer).to.exist()
      expect(libp2p.dialer.maxParallelDials).to.equal(Constants.MAX_PARALLEL_DIALS)
      expect(libp2p.dialer.maxDialsPerPeer).to.equal(Constants.MAX_PER_PEER_DIALS)
      expect(libp2p.dialer.timeout).to.equal(Constants.DIAL_TIMEOUT)
      // Ensure the dialer also has the transport manager
      expect(libp2p.transportManager).to.equal(libp2p.dialer.transportManager)
    })

    it('should be able to override dialer options', async () => {
      const config = {
        peerId,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        },
        dialer: {
          maxParallelDials: 10,
          maxDialsPerPeer: 1,
          dialTimeout: 1e3 // 30 second dial timeout per peer
        },
        config: {
          transport: {
            [transportKey]: {
              filter: filters.all
            }
          }
        }
      }
      libp2p = await Libp2p.create(config)

      expect(libp2p.dialer).to.exist()
      expect(libp2p.dialer.maxParallelDials).to.equal(config.dialer.maxParallelDials)
      expect(libp2p.dialer.maxDialsPerPeer).to.equal(config.dialer.maxDialsPerPeer)
      expect(libp2p.dialer.timeout).to.equal(config.dialer.dialTimeout)
    })

    it('should use the dialer for connecting', async () => {
      libp2p = new Libp2p({
        peerId,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        },
        config: {
          transport: {
            [transportKey]: {
              filter: filters.all
            }
          }
        }
      })

      sinon.spy(libp2p.dialer, 'connectToPeer')
      sinon.spy(libp2p.peerStore.addressBook, 'add')

      const connection = await libp2p.dial(remoteAddr)
      expect(connection).to.exist()
      const { stream, protocol } = await connection.newStream('/echo/1.0.0')
      expect(stream).to.exist()
      expect(protocol).to.equal('/echo/1.0.0')
      await connection.close()
      expect(libp2p.dialer.connectToPeer.callCount).to.equal(1)
      expect(libp2p.peerStore.addressBook.add.callCount).to.be.at.least(1)
    })

    it('should run identify automatically after connecting', async () => {
      libp2p = new Libp2p({
        peerId,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        },
        config: {
          transport: {
            [transportKey]: {
              filter: filters.all
            }
          }
        }
      })

      sinon.spy(libp2p.identifyService, 'identify')
      sinon.spy(libp2p.upgrader, 'onConnection')

      const connection = await libp2p.dial(remoteAddr)
      expect(connection).to.exist()

      sinon.spy(libp2p.peerStore.protoBook, 'set')

      // Wait for onConnection to be called
      await pWaitFor(() => libp2p.upgrader.onConnection.callCount === 1)

      expect(libp2p.identifyService.identify.callCount).to.equal(1)
      await libp2p.identifyService.identify.firstCall.returnValue

      expect(libp2p.peerStore.protoBook.set.callCount).to.equal(1)
    })

    it('should be able to use hangup to close connections', async () => {
      libp2p = new Libp2p({
        peerId,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        },
        config: {
          transport: {
            [transportKey]: {
              filter: filters.all
            }
          }
        }
      })

      const connection = await libp2p.dial(remoteAddr)
      expect(connection).to.exist()
      expect(connection.stat.timeline.close).to.not.exist()
      await libp2p.hangUp(connection.remotePeer)
      expect(connection.stat.timeline.close).to.exist()
    })

    it('should be able to use hangup when no connection exists', async () => {
      libp2p = new Libp2p({
        peerId,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        },
        config: {
          transport: {
            [transportKey]: {
              filter: filters.all
            }
          }
        }
      })

      await libp2p.hangUp(remoteAddr)
    })

    it('should cancel pending dial targets and stop', async () => {
      const [, remotePeerId] = await createPeerId({ number: 2 })

      libp2p = new Libp2p({
        peerId,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        },
        config: {
          transport: {
            [transportKey]: {
              filter: filters.all
            }
          }
        }
      })

      sinon.stub(libp2p.dialer, '_createDialTarget').callsFake(() => {
        const deferredDial = pDefer()
        return deferredDial.promise
      })

      // Perform dial
      const dialPromise = libp2p.dial(remotePeerId)

      // Let the call stack run
      await delay(0)

      await libp2p.stop()
      await expect(dialPromise)
        .to.eventually.be.rejected()
    })

    it('should abort pending dials on stop', async () => {
      libp2p = new Libp2p({
        peerId,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        },
        config: {
          transport: {
            [transportKey]: {
              filter: filters.all
            }
          }
        }
      })

      sinon.spy(libp2p.dialer, 'destroy')

      await libp2p.stop()

      expect(libp2p.dialer.destroy).to.have.property('callCount', 1)
    })

    it('should fail to dial self', async () => {
      libp2p = new Libp2p({
        peerId,
        modules: {
          transport: [Transport],
          streamMuxer: [Muxer],
          connEncryption: [Crypto]
        }
      })

      await expect(libp2p.dial(peerId))
        .to.eventually.be.rejected()
        .and.to.have.property('code', ErrorCodes.ERR_DIALED_SELF)
    })
  })
})
