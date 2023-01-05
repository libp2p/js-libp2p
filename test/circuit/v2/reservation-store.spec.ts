import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { Status } from '../../../src/circuit/v2/pb/index.js'
import { ReservationStore } from '../../../src/circuit/v2/reservation-store.js'
import { createPeerId } from '../../utils/creators/peer.js'

/* eslint-env mocha */

describe('Circuit v2 - reservation store', function () {
  it('should add reservation', async function () {
    const store = new ReservationStore(2)
    const peer = await createPeerId()
    const result = await store.reserve(peer, multiaddr())
    expect(result.status).to.equal(Status.OK)
    expect(result.expire).to.not.be.undefined()
    expect(await store.hasReservation(peer)).to.be.true()
  })
  it('should add reservation if peer already has reservation', async function () {
    const store = new ReservationStore(1)
    const peer = await createPeerId()
    await store.reserve(peer, multiaddr())
    const result = await store.reserve(peer, multiaddr())
    expect(result.status).to.equal(Status.OK)
    expect(result.expire).to.not.be.undefined()
    expect(await store.hasReservation(peer)).to.be.true()
  })

  it('should fail to add reservation on exceeding limit', async function () {
    const store = new ReservationStore(0)
    const peer = await createPeerId()
    const result = await store.reserve(peer, multiaddr())
    expect(result.status).to.equal(Status.RESERVATION_REFUSED)
  })

  it('should remove reservation', async function () {
    const store = new ReservationStore(10)
    const peer = await createPeerId()
    const result = await store.reserve(peer, multiaddr())
    expect(result.status).to.equal(Status.OK)
    expect(await store.hasReservation(peer)).to.be.true()
    await store.removeReservation(peer)
    expect(await store.hasReservation(peer)).to.be.false()
    await store.removeReservation(peer)
  })
})
