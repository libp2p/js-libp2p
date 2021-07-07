/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const PeerId = require('peer-id')
const random = require('lodash.random')

const RoutingTable = require('../src/routing')
const kadUtils = require('../src/utils')
const createPeerId = require('./utils/create-peer-id')

describe('Routing Table', () => {
  let table

  beforeEach(async function () {
    this.timeout(20 * 1000)

    const id = await PeerId.create({ bits: 512 })
    table = new RoutingTable(id, 20)
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
})
