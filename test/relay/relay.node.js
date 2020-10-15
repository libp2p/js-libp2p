'use strict'
/* eslint-env mocha */

const { expect } = require('aegir/utils/chai')
const sinon = require('sinon')

const multiaddr = require('multiaddr')
const { collect } = require('streaming-iterables')
const pipe = require('it-pipe')
const AggregateError = require('aggregate-error')
const PeerId = require('peer-id')
const uint8ArrayFromString = require('uint8arrays/from-string')

const { createPeerId } = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options')
const Libp2p = require('../../src')
const { codes: Errors } = require('../../src/errors')

const listenAddr = '/ip4/0.0.0.0/tcp/0'

describe('Dialing (via relay, TCP)', () => {
  let srcLibp2p
  let relayLibp2p
  let dstLibp2p

  beforeEach(async () => {
    const peerIds = await createPeerId({ number: 3 })
    // Create 3 nodes, and turn HOP on for the relay
    ;[srcLibp2p, relayLibp2p, dstLibp2p] = peerIds.map((peerId, index) => {
      const opts = baseOptions
      index === 1 && (opts.config.relay.hop.enabled = true)
      return new Libp2p({
        ...opts,
        addresses: {
          listen: [listenAddr]
        },
        peerId
      })
    })

    dstLibp2p.handle('/echo/1.0.0', ({ stream }) => pipe(stream, stream))
  })

  beforeEach(() => {
    // Start each node
    return Promise.all([srcLibp2p, relayLibp2p, dstLibp2p].map(libp2p => libp2p.start()))
  })

  afterEach(() => {
    // Stop each node
    return Promise.all([srcLibp2p, relayLibp2p, dstLibp2p].map(async libp2p => {
      await libp2p.stop()
      // Clear the peer stores
      for (const peerIdStr of libp2p.peerStore.peers.keys()) {
        const peerId = PeerId.createFromCID(peerIdStr)
        libp2p.peerStore.delete(peerId)
      }
    }))
  })

  it('should be able to connect to a peer over a relay with active connections', async () => {
    const relayAddr = relayLibp2p.transportManager.getAddrs()[0]
    const relayIdString = relayLibp2p.peerId.toB58String()

    const dialAddr = relayAddr
      .encapsulate(`/p2p/${relayIdString}`)
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerId.toB58String()}`)

    const tcpAddrs = dstLibp2p.transportManager.getAddrs()
    sinon.stub(dstLibp2p.addressManager, 'listen').value([multiaddr(`/p2p-circuit${relayAddr}/p2p/${relayIdString}`)])

    await dstLibp2p.transportManager.listen(dstLibp2p.addressManager.getListenAddrs())
    expect(dstLibp2p.transportManager.getAddrs()).to.have.deep.members([...tcpAddrs, dialAddr.decapsulate('p2p')])

    const connection = await srcLibp2p.dial(dialAddr)
    expect(connection).to.exist()
    expect(connection.remotePeer.toBytes()).to.eql(dstLibp2p.peerId.toBytes())
    expect(connection.localPeer.toBytes()).to.eql(srcLibp2p.peerId.toBytes())
    expect(connection.remoteAddr).to.eql(dialAddr)
    expect(connection.localAddr).to.eql(
      relayAddr // the relay address
        .encapsulate(`/p2p/${relayIdString}`) // with its peer id
        .encapsulate('/p2p-circuit') // the local peer is connected over the relay
        .encapsulate(`/p2p/${srcLibp2p.peerId.toB58String()}`) // and the local peer id
    )

    const { stream: echoStream } = await connection.newStream('/echo/1.0.0')
    const input = uint8ArrayFromString('hello')
    const [output] = await pipe(
      [input],
      echoStream,
      collect
    )

    expect(output.slice()).to.eql(input)
  })

  it('should fail to connect to a peer over a relay with inactive connections', async () => {
    const relayAddr = relayLibp2p.transportManager.getAddrs()[0]
    const relayIdString = relayLibp2p.peerId.toB58String()

    const dialAddr = relayAddr
      .encapsulate(`/p2p/${relayIdString}`)
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerId.toB58String()}`)

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)
  })

  it('should not stay connected to a relay when not already connected and HOP fails', async () => {
    const relayAddr = relayLibp2p.transportManager.getAddrs()[0]
    const relayIdString = relayLibp2p.peerId.toB58String()

    const dialAddr = relayAddr
      .encapsulate(`/p2p/${relayIdString}`)
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerId.toB58String()}`)

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)

    // We should not be connected to the relay, because we weren't before the dial
    const srcToRelayConn = srcLibp2p.connectionManager.get(relayLibp2p.peerId)
    expect(srcToRelayConn).to.not.exist()
  })

  it('dialer should stay connected to an already connected relay on hop failure', async () => {
    const relayIdString = relayLibp2p.peerId.toB58String()
    const relayAddr = relayLibp2p.transportManager.getAddrs()[0].encapsulate(`/p2p/${relayIdString}`)

    const dialAddr = relayAddr
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerId.toB58String()}`)

    await srcLibp2p.dial(relayAddr)

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)

    const srcToRelayConn = srcLibp2p.connectionManager.get(relayLibp2p.peerId)
    expect(srcToRelayConn).to.exist()
    expect(srcToRelayConn.stat.status).to.equal('open')
  })

  it('destination peer should stay connected to an already connected relay on hop failure', async () => {
    const relayIdString = relayLibp2p.peerId.toB58String()
    const relayAddr = relayLibp2p.transportManager.getAddrs()[0].encapsulate(`/p2p/${relayIdString}`)

    const dialAddr = relayAddr
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerId.toB58String()}`)

    // Connect the destination peer and the relay
    const tcpAddrs = dstLibp2p.transportManager.getAddrs()
    sinon.stub(dstLibp2p.addressManager, 'getListenAddrs').returns([multiaddr(`${relayAddr}/p2p-circuit`)])

    await dstLibp2p.transportManager.listen(dstLibp2p.addressManager.getListenAddrs())
    expect(dstLibp2p.transportManager.getAddrs()).to.have.deep.members([...tcpAddrs, dialAddr.decapsulate('p2p')])

    // Tamper with the our multiaddrs for the circuit message
    sinon.stub(srcLibp2p, 'multiaddrs').value([{
      bytes: uint8ArrayFromString('an invalid multiaddr')
    }])

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)

    const dstToRelayConn = dstLibp2p.connectionManager.get(relayLibp2p.peerId)
    expect(dstToRelayConn).to.exist()
    expect(dstToRelayConn.stat.status).to.equal('open')
  })
})
