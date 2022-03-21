'use strict'

const { expect } = require('aegir/utils/chai')
const { Multiaddr } = require('multiaddr')
const PeerId = require('peer-id')
const { Status } = require('../../../src/circuit/v2/protocol')
const ReservationStore = require('../../../src/circuit/v2/reservation-store')

/* eslint-env mocha */

describe('Circuit v2 - reservation store', function () {
  it('should add reservation', async function () {
    const store = new ReservationStore(2)
    const peer = await PeerId.create()
    const result = await store.reserve(peer, new Multiaddr())
    expect(result.status).to.equal(Status.OK)
    expect(result.expire).to.not.be.undefined()
    expect(await store.hasReservation(peer)).to.be.true()
  })
  it('should add reservation if peer already has reservation', async function () {
    const store = new ReservationStore(1)
    const peer = await PeerId.create()
    await store.reserve(peer, new Multiaddr())
    const result = await store.reserve(peer, new Multiaddr())
    expect(result.status).to.equal(Status.OK)
    expect(result.expire).to.not.be.undefined()
    expect(await store.hasReservation(peer)).to.be.true()
  })

  it('should fail to add reservation on exceeding limit', async function () {
    const store = new ReservationStore(0)
    const peer = await PeerId.create()
    const result = await store.reserve(peer, new Multiaddr())
    expect(result.status).to.equal(Status.RESERVATION_REFUSED)
  })

  it('should remove reservation', async function () {
    const store = new ReservationStore(10)
    const peer = await PeerId.create()
    const result = await store.reserve(peer, new Multiaddr())
    expect(result.status).to.equal(Status.OK)
    expect(await store.hasReservation(peer)).to.be.true()
    await store.removeReservation(peer)
    expect(await store.hasReservation(peer)).to.be.false()
    await store.removeReservation(peer)
  })
})
