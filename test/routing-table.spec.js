/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const PeerId = require('peer-id')
const random = require('lodash.random')
const sinon = require('sinon')

const { RoutingTable } = require('../src/routing-table')
const kadUtils = require('../src/utils')
const createPeerId = require('./utils/create-peer-id')
const { PROTOCOL_DHT } = require('../src/constants')

describe('Routing Table', () => {
  let table

  beforeEach(async function () {
    this.timeout(20 * 1000)

    const lipbp2p = {
      peerId: await PeerId.create({ bits: 512 }),
      dialProtocol: sinon.stub()
    }

    table = new RoutingTable({
      peerId: lipbp2p.peerId,
      dialer: lipbp2p
    })
    await table.start()
  })

  afterEach(async () => {
    await table.stop()
  })

  it('add', async function () {
    this.timeout(20 * 1000)

    const ids = await createPeerId(20)

    await Promise.all(
      Array.from({ length: 1000 }).map(() => table.add(ids[random(ids.length - 1)]))
    )

    await Promise.all(
      Array.from({ length: 20 }).map(async () => {
        const id = ids[random(ids.length - 1)]
        const key = await kadUtils.convertPeerId(id)

        expect(table.closestPeers(key, 5).length)
          .to.be.above(0)
      })
    )
  })

  it('remove', async function () {
    this.timeout(20 * 1000)

    const peers = await createPeerId(10)
    await Promise.all(peers.map((peer) => table.add(peer)))

    const key = await kadUtils.convertPeerId(peers[2])
    expect(table.closestPeers(key, 10)).to.have.length(10)

    await table.remove(peers[5])
    expect(table.closestPeers(key, 10)).to.have.length(9)
    expect(table.size).to.be.eql(9)
  })

  it('closestPeer', async function () {
    this.timeout(10 * 1000)

    const peers = await createPeerId(4)
    await Promise.all(peers.map((peer) => table.add(peer)))

    const id = peers[2]
    const key = await kadUtils.convertPeerId(id)
    expect(table.closestPeer(key)).to.eql(id)
  })

  it('closestPeers', async function () {
    this.timeout(20 * 1000)

    const peers = await createPeerId(18)
    await Promise.all(peers.map((peer) => table.add(peer)))

    const key = await kadUtils.convertPeerId(peers[2])
    expect(table.closestPeers(key, 15)).to.have.length(15)
  })

  it('favours old peers that respond to pings', async () => {
    let fn

    // execute queued functions immediately
    table._pingQueue = {
      add: (f) => {
        fn = f
      },
      clear: () => {}
    }

    const peerIds = [
      PeerId.createFromB58String('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi5'),
      PeerId.createFromB58String('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi6')
    ]

    const oldPeer = {
      id: peerIds[0].toBytes(),
      peer: peerIds[0]
    }
    const newPeer = {
      id: peerIds[1].toBytes(),
      peer: peerIds[1]
    }

    table._onPing([oldPeer], newPeer)

    // add the old peer
    table.kb.add(oldPeer)

    // simulate connection succeeding
    table._dialer.dialProtocol.withArgs(oldPeer.peer, PROTOCOL_DHT).resolves({ stream: { close: sinon.stub() } })

    // perform the ping
    await fn()

    expect(table._dialer.dialProtocol.callCount).to.equal(1)
    expect(table._dialer.dialProtocol.calledWith(oldPeer.peer)).to.be.true()

    // did not add the new peer
    expect(table.kb.get(newPeer.id)).to.be.null()

    // kept the old peer
    expect(table.kb.get(oldPeer.id)).to.not.be.null()
  })

  it('evicts oldest peer that does not respond to ping', async () => {
    let fn

    // execute queued functions immediately
    table._pingQueue = {
      add: (f) => {
        fn = f
      },
      clear: () => {}
    }

    const peerIds = [
      PeerId.createFromB58String('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi5'),
      PeerId.createFromB58String('QmYobx1VAHP7Mi88LcDvLeQoWcc1Aa2rynYHpdEPBqHZi6')
    ]

    const oldPeer = {
      id: peerIds[0].toBytes(),
      peer: peerIds[0]
    }
    const newPeer = {
      id: peerIds[1].toBytes(),
      peer: peerIds[1]
    }

    table._onPing([oldPeer], newPeer)

    // add the old peer
    table.kb.add(oldPeer)

    // libp2p fails to dial the old peer
    table._dialer.dialProtocol = sinon.stub().withArgs(oldPeer.peer, PROTOCOL_DHT).rejects(new Error('Could not dial peer'))

    // perform the ping
    await fn()

    expect(table._dialer.dialProtocol.callCount).to.equal(1)
    expect(table._dialer.dialProtocol.calledWith(oldPeer.peer)).to.be.true()

    // added the new peer
    expect(table.kb.get(newPeer.id)).to.not.be.null()

    // evicted the old peer
    expect(table.kb.get(oldPeer.id)).to.be.null()
  })
})
