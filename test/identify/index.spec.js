'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
const { expect } = chai
const sinon = require('sinon')

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const duplexPair = require('it-pair/duplex')
const multiaddr = require('multiaddr')

const { codes: Errors } = require('../../src/errors')
const { IdentifyService, multicodecs } = require('../../src/identify')
const Peers = require('../fixtures/peers')

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

  it('should be able identify another peer', async () => {
    const localIdentify = new IdentifyService({
      peerInfo: localPeer,
      protocols,
      registrar: {
        peerStore: {
          update: () => {}
        }
      }
    })
    const remoteIdentify = new IdentifyService({
      peerInfo: remotePeer,
      protocols
    })

    const observedAddr = multiaddr('/ip4/127.0.0.1/tcp/1234')
    const localConnectionMock = { newStream: () => {} }
    const remoteConnectionMock = { remoteAddr: observedAddr }

    const [local, remote] = duplexPair()
    sinon.stub(localConnectionMock, 'newStream').returns({ stream: local, protocol: multicodecs.IDENTIFY })

    sinon.spy(localIdentify.registrar.peerStore, 'update')

    // Run identify
    await Promise.all([
      localIdentify.identify(localConnectionMock, remotePeer.id),
      remoteIdentify.handleMessage({
        connection: remoteConnectionMock,
        stream: remote,
        protocol: multicodecs.IDENTIFY
      })
    ])

    expect(localIdentify.registrar.peerStore.update.callCount).to.equal(1)
    // Validate the remote peer gets updated in the peer store
    const call = localIdentify.registrar.peerStore.update.firstCall
    expect(call.args[0].id.bytes).to.equal(remotePeer.id.bytes)
  })

  it('should throw if identified peer is the wrong peer', async () => {
    const localIdentify = new IdentifyService({
      peerInfo: localPeer,
      protocols
    })
    const remoteIdentify = new IdentifyService({
      peerInfo: remotePeer,
      protocols
    })

    const observedAddr = multiaddr('/ip4/127.0.0.1/tcp/1234')
    const localConnectionMock = { newStream: () => {} }
    const remoteConnectionMock = { remoteAddr: observedAddr }

    const [local, remote] = duplexPair()
    sinon.stub(localConnectionMock, 'newStream').returns({ stream: local, protocol: multicodecs.IDENTIFY })

    // Run identify
    try {
      await Promise.all([
        localIdentify.identify(localConnectionMock, localPeer.id),
        remoteIdentify.handleMessage({
          connection: remoteConnectionMock,
          stream: remote,
          protocol: multicodecs.IDENTIFY
        })
      ])
      expect.fail('should have thrown')
    } catch (err) {
      expect(err).to.exist()
      expect(err.code).to.eql(Errors.ERR_INVALID_PEER)
    }
  })

  describe('push', () => {
    it('should be able push identify updates to another peer', async () => {
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
            update: () => {}
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
      // Mock the registrar to return the local connection
      sinon.stub(localIdentify.registrar, 'getConnection').returns(localConnectionMock)

      sinon.spy(IdentifyService, 'updatePeerAddresses')
      sinon.spy(IdentifyService, 'updatePeerProtocols')
      sinon.spy(remoteIdentify.registrar.peerStore, 'update')

      // Run identify
      await Promise.all([
        localIdentify.push([remotePeer]),
        remoteIdentify.handleMessage({
          connection: remoteConnectionMock,
          stream: remote,
          protocol: multicodecs.IDENTIFY_PUSH
        })
      ])

      expect(IdentifyService.updatePeerAddresses.callCount).to.equal(1)
      expect(IdentifyService.updatePeerProtocols.callCount).to.equal(1)

      expect(remoteIdentify.registrar.peerStore.update.callCount).to.equal(1)
      const [peerInfo] = remoteIdentify.registrar.peerStore.update.firstCall.args
      expect(peerInfo.id.bytes).to.eql(localPeer.id.bytes)
      expect(peerInfo.multiaddrs.toArray()).to.eql([listeningAddr])
      expect(peerInfo.protocols).to.eql(localProtocols)
    })
  })
})
