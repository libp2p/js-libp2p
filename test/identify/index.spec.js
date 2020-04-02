'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-as-promised'))
const { expect } = chai
const sinon = require('sinon')

const delay = require('delay')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const duplexPair = require('it-pair/duplex')
const multiaddr = require('multiaddr')
const pWaitFor = require('p-wait-for')

const { codes: Errors } = require('../../src/errors')
const { IdentifyService, multicodecs } = require('../../src/identify')
const Peers = require('../fixtures/peers')
const Libp2p = require('../../src')
const baseOptions = require('../utils/base-options.browser')

const { MULTIADDRS_WEBSOCKETS } = require('../fixtures/browser')
const remoteAddr = MULTIADDRS_WEBSOCKETS[0]

describe('Identify', () => {
  let localPeer
  let remotePeer
  const protocols = new Map([
    [multicodecs.IDENTIFY, () => {}],
    [multicodecs.IDENTIFY_PUSH, () => {}]
  ])

  before(async () => {
    [localPeer, remotePeer] = (await Promise.all([
      PeerId.createFromJSON(Peers[0]),
      PeerId.createFromJSON(Peers[1])
    ])).map(id => new PeerInfo(id))
  })

  afterEach(() => {
    sinon.restore()
  })

  it('should be able to identify another peer', async () => {
    const localIdentify = new IdentifyService({
      peerInfo: localPeer,
      protocols,
      registrar: {
        peerStore: {
          addressBook: {
            set: () => { }
          },
          protoBook: {
            set: () => { }
          }
        }
      }
    })
    const remoteIdentify = new IdentifyService({
      peerInfo: remotePeer,
      protocols
    })

    const observedAddr = multiaddr('/ip4/127.0.0.1/tcp/1234')
    const localConnectionMock = { newStream: () => {}, remotePeer: remotePeer.id }
    const remoteConnectionMock = { remoteAddr: observedAddr }

    const [local, remote] = duplexPair()
    sinon.stub(localConnectionMock, 'newStream').returns({ stream: local, protocol: multicodecs.IDENTIFY })

    sinon.spy(localIdentify.registrar.peerStore.addressBook, 'set')
    sinon.spy(localIdentify.registrar.peerStore.protoBook, 'set')

    // Run identify
    await Promise.all([
      localIdentify.identify(localConnectionMock),
      remoteIdentify.handleMessage({
        connection: remoteConnectionMock,
        stream: remote,
        protocol: multicodecs.IDENTIFY
      })
    ])

    expect(localIdentify.registrar.peerStore.addressBook.set.callCount).to.equal(1)
    expect(localIdentify.registrar.peerStore.protoBook.set.callCount).to.equal(1)
    // Validate the remote peer gets updated in the peer store
    const call = localIdentify.registrar.peerStore.addressBook.set.firstCall
    expect(call.args[0].id.bytes).to.equal(remotePeer.id.bytes)
  })

  it('should throw if identified peer is the wrong peer', async () => {
    const localIdentify = new IdentifyService({
      peerInfo: localPeer,
      protocols,
      registrar: {
        peerStore: {
          addressBook: {
            set: () => { }
          },
          protoBook: {
            set: () => { }
          }
        }
      }
    })
    const remoteIdentify = new IdentifyService({
      peerInfo: remotePeer,
      protocols
    })

    const observedAddr = multiaddr('/ip4/127.0.0.1/tcp/1234')
    const localConnectionMock = { newStream: () => {}, remotePeer: localPeer.id }
    const remoteConnectionMock = { remoteAddr: observedAddr }

    const [local, remote] = duplexPair()
    sinon.stub(localConnectionMock, 'newStream').returns({ stream: local, protocol: multicodecs.IDENTIFY })

    // Run identify
    const identifyPromise = Promise.all([
      localIdentify.identify(localConnectionMock, localPeer.id),
      remoteIdentify.handleMessage({
        connection: remoteConnectionMock,
        stream: remote,
        protocol: multicodecs.IDENTIFY
      })
    ])

    await expect(identifyPromise)
      .to.eventually.be.rejected()
      .and.to.have.property('code', Errors.ERR_INVALID_PEER)
  })

  describe('push', () => {
    it('should be able to push identify updates to another peer', async () => {
      const localIdentify = new IdentifyService({
        peerInfo: localPeer,
        registrar: { getConnection: () => {} },
        protocols: new Map([
          [multicodecs.IDENTIFY],
          [multicodecs.IDENTIFY_PUSH],
          ['/echo/1.0.0']
        ])
      })
      const remoteIdentify = new IdentifyService({
        peerInfo: remotePeer,
        registrar: {
          peerStore: {
            addressBook: {
              set: () => {}
            },
            protoBook: {
              set: () => { }
            }
          }
        }
      })

      // Setup peer protocols and multiaddrs
      const localProtocols = new Set([multicodecs.IDENTIFY, multicodecs.IDENTIFY_PUSH, '/echo/1.0.0'])
      const listeningAddr = multiaddr('/ip4/127.0.0.1/tcp/1234')
      sinon.stub(localPeer.multiaddrs, 'toArray').returns([listeningAddr])
      sinon.stub(localPeer, 'protocols').value(localProtocols)
      sinon.stub(remotePeer, 'protocols').value(new Set([multicodecs.IDENTIFY, multicodecs.IDENTIFY_PUSH]))

      const localConnectionMock = { newStream: () => {} }
      const remoteConnectionMock = { remotePeer: localPeer.id }

      const [local, remote] = duplexPair()
      sinon.stub(localConnectionMock, 'newStream').returns({ stream: local, protocol: multicodecs.IDENTIFY_PUSH })

      sinon.spy(remoteIdentify.registrar.peerStore.addressBook, 'set')
      sinon.spy(remoteIdentify.registrar.peerStore.protoBook, 'set')

      // Run identify
      await Promise.all([
        localIdentify.push([localConnectionMock]),
        remoteIdentify.handleMessage({
          connection: remoteConnectionMock,
          stream: remote,
          protocol: multicodecs.IDENTIFY_PUSH
        })
      ])

      expect(remoteIdentify.registrar.peerStore.addressBook.set.callCount).to.equal(1)
      expect(remoteIdentify.registrar.peerStore.protoBook.set.callCount).to.equal(1)
      const [peerId, multiaddrs] = remoteIdentify.registrar.peerStore.addressBook.set.firstCall.args
      expect(peerId.bytes).to.eql(localPeer.id.bytes)
      expect(multiaddrs).to.eql([listeningAddr])
      const [peerId2, protocols] = remoteIdentify.registrar.peerStore.protoBook.set.firstCall.args
      expect(peerId2.bytes).to.eql(localPeer.id.bytes)
      expect(protocols).to.eql(Array.from(localProtocols))
    })
  })

  describe('libp2p.dialer.identifyService', () => {
    let peerInfo
    let libp2p
    let remoteLibp2p

    before(async () => {
      const peerId = await PeerId.createFromJSON(Peers[0])
      peerInfo = new PeerInfo(peerId)
    })

    afterEach(async () => {
      sinon.restore()
      libp2p && await libp2p.stop()
      libp2p = null
    })

    after(async () => {
      remoteLibp2p && await remoteLibp2p.stop()
    })

    it('should run identify automatically after connecting', async () => {
      libp2p = new Libp2p({
        ...baseOptions,
        peerInfo
      })

      sinon.spy(libp2p.identifyService, 'identify')
      const peerStoreSpySet = sinon.spy(libp2p.peerStore.addressBook, 'set')
      const peerStoreSpyAdd = sinon.spy(libp2p.peerStore.addressBook, 'add')

      const connection = await libp2p.dialer.connectToPeer(remoteAddr)
      expect(connection).to.exist()

      // Wait for peer store to be updated
      // Dialer._createDialTarget (add), Identify (replace)
      await pWaitFor(() => peerStoreSpySet.callCount === 1 && peerStoreSpyAdd.callCount === 1)
      expect(libp2p.identifyService.identify.callCount).to.equal(1)

      // The connection should have no open streams
      expect(connection.streams).to.have.length(0)
      await connection.close()
    })

    it('should push protocol updates to an already connected peer', async () => {
      libp2p = new Libp2p({
        ...baseOptions,
        peerInfo
      })

      sinon.spy(libp2p.identifyService, 'identify')
      sinon.spy(libp2p.identifyService, 'push')

      const connection = await libp2p.dialer.connectToPeer(remoteAddr)
      expect(connection).to.exist()
      // Wait for nextTick to trigger the identify call
      await delay(1)

      // Wait for identify to finish
      await libp2p.identifyService.identify.firstCall.returnValue
      sinon.stub(libp2p, 'isStarted').returns(true)

      libp2p.handle('/echo/2.0.0', () => {})
      libp2p.unhandle('/echo/2.0.0')

      // Verify the remote peer is notified of both changes
      expect(libp2p.identifyService.push.callCount).to.equal(2)
      for (const call of libp2p.identifyService.push.getCalls()) {
        const [connections] = call.args
        expect(connections.length).to.equal(1)
        expect(connections[0].remotePeer.toB58String()).to.equal(remoteAddr.getPeerId())
        const results = await call.returnValue
        expect(results.length).to.equal(1)
      }

      // Verify the streams close
      await pWaitFor(() => connection.streams.length === 0)
    })
  })
})
