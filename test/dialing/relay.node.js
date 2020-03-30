'use strict'
/* eslint-env mocha */

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-as-promised'))
const { expect } = chai
const sinon = require('sinon')

const multiaddr = require('multiaddr')
const { collect } = require('streaming-iterables')
const pipe = require('it-pipe')
const AggregateError = require('aggregate-error')
const PeerId = require('peer-id')

const { createPeerInfo } = require('../utils/creators/peer')
const baseOptions = require('../utils/base-options')
const Libp2p = require('../../src')
const { codes: Errors } = require('../../src/errors')

describe('Dialing (via relay, TCP)', () => {
  let srcLibp2p
  let relayLibp2p
  let dstLibp2p

  before(async () => {
    const peerInfos = await createPeerInfo({ number: 3 })
    // Create 3 nodes, and turn HOP on for the relay
    ;[srcLibp2p, relayLibp2p, dstLibp2p] = peerInfos.map((peerInfo, index) => {
      const opts = baseOptions
      index === 1 && (opts.config.relay.hop.enabled = true)
      return new Libp2p({
        ...opts,
        peerInfo
      })
    })

    dstLibp2p.handle('/echo/1.0.0', ({ stream }) => pipe(stream, stream))
  })

  beforeEach(() => {
    // Start each node
    return Promise.all([srcLibp2p, relayLibp2p, dstLibp2p].map(libp2p => {
      // Reset multiaddrs and start
      libp2p.peerInfo.multiaddrs.clear()
      libp2p.peerInfo.multiaddrs.add('/ip4/0.0.0.0/tcp/0')
      return libp2p.start()
    }))
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
    const relayIdString = relayLibp2p.peerInfo.id.toB58String()

    const dialAddr = relayAddr
      .encapsulate(`/p2p/${relayIdString}`)
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerInfo.id.toB58String()}`)

    const tcpAddrs = dstLibp2p.transportManager.getAddrs()
    await dstLibp2p.transportManager.listen([multiaddr(`/p2p-circuit${relayAddr}/p2p/${relayIdString}`)])
    expect(dstLibp2p.transportManager.getAddrs()).to.have.deep.members([...tcpAddrs, dialAddr.decapsulate('p2p')])

    const connection = await srcLibp2p.dial(dialAddr)
    expect(connection).to.exist()
    expect(connection.remotePeer.toBytes()).to.eql(dstLibp2p.peerInfo.id.toBytes())
    expect(connection.localPeer.toBytes()).to.eql(srcLibp2p.peerInfo.id.toBytes())
    expect(connection.remoteAddr).to.eql(dialAddr)
    expect(connection.localAddr).to.eql(
      relayAddr // the relay address
        .encapsulate(`/p2p/${relayIdString}`) // with its peer id
        .encapsulate('/p2p-circuit') // the local peer is connected over the relay
        .encapsulate(`/p2p/${srcLibp2p.peerInfo.id.toB58String()}`) // and the local peer id
    )

    const { stream: echoStream } = await connection.newStream('/echo/1.0.0')
    const input = Buffer.from('hello')
    const [output] = await pipe(
      [input],
      echoStream,
      collect
    )

    expect(output.slice()).to.eql(input)
  })

  it('should fail to connect to a peer over a relay with inactive connections', async () => {
    const relayAddr = relayLibp2p.transportManager.getAddrs()[0]
    const relayIdString = relayLibp2p.peerInfo.id.toB58String()

    const dialAddr = relayAddr
      .encapsulate(`/p2p/${relayIdString}`)
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerInfo.id.toB58String()}`)

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)
  })

  it('should not stay connected to a relay when not already connected and HOP fails', async () => {
    const relayAddr = relayLibp2p.transportManager.getAddrs()[0]
    const relayIdString = relayLibp2p.peerInfo.id.toB58String()

    const dialAddr = relayAddr
      .encapsulate(`/p2p/${relayIdString}`)
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerInfo.id.toB58String()}`)

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)

    // We should not be connected to the relay, because we weren't before the dial
    const srcToRelayConn = srcLibp2p.registrar.getConnection(relayLibp2p.peerInfo)
    expect(srcToRelayConn).to.not.exist()
  })

  it('dialer should stay connected to an already connected relay on hop failure', async () => {
    const relayIdString = relayLibp2p.peerInfo.id.toB58String()
    const relayAddr = relayLibp2p.transportManager.getAddrs()[0].encapsulate(`/p2p/${relayIdString}`)

    const dialAddr = relayAddr
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerInfo.id.toB58String()}`)

    await srcLibp2p.dial(relayAddr)

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)

    const srcToRelayConn = srcLibp2p.registrar.getConnection(relayLibp2p.peerInfo)
    expect(srcToRelayConn).to.exist()
    expect(srcToRelayConn.stat.status).to.equal('open')
  })

  it('destination peer should stay connected to an already connected relay on hop failure', async () => {
    const relayIdString = relayLibp2p.peerInfo.id.toB58String()
    const relayAddr = relayLibp2p.transportManager.getAddrs()[0].encapsulate(`/p2p/${relayIdString}`)

    const dialAddr = relayAddr
      .encapsulate(`/p2p-circuit/p2p/${dstLibp2p.peerInfo.id.toB58String()}`)

    // Connect the destination peer and the relay
    const tcpAddrs = dstLibp2p.transportManager.getAddrs()
    await dstLibp2p.transportManager.listen([multiaddr(`/p2p-circuit${relayAddr}`)])
    expect(dstLibp2p.transportManager.getAddrs()).to.have.deep.members([...tcpAddrs, dialAddr.decapsulate('p2p')])

    // Tamper with the our multiaddrs for the circuit message
    sinon.stub(srcLibp2p.peerInfo.multiaddrs, 'toArray').returns([{
      buffer: Buffer.from('an invalid multiaddr')
    }])

    await expect(srcLibp2p.dial(dialAddr))
      .to.eventually.be.rejectedWith(AggregateError)
      .and.to.have.nested.property('._errors[0].code', Errors.ERR_HOP_REQUEST_FAILED)

    const dstToRelayConn = dstLibp2p.registrar.getConnection(relayLibp2p.peerInfo)
    expect(dstToRelayConn).to.exist()
    expect(dstToRelayConn.stat.status).to.equal('open')
  })
})
