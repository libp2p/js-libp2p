/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { DEFAULT_DATA_LIMIT, DEFAULT_DURATION_LIMIT } from '../src/constants.js'
import { Status } from '../src/pb/index.js'
import { ReservationStore } from '../src/server/reservation-store.js'

describe('circuit-relay server reservation store', function () {
  it('should add reservation', async function () {
    const store = new ReservationStore({ logger: defaultLogger() }, { maxReservations: 2 })
    const privateKey = await generateKeyPair('Ed25519')
    const peer = peerIdFromPrivateKey(privateKey)
    const result = store.reserve(peer, multiaddr())
    expect(result.status).to.equal(Status.OK)
    expect(result.expire).to.not.be.undefined()
    expect(store.get(peer)).to.be.ok()
  })

  it('should add reservation if peer already has reservation', async function () {
    const store = new ReservationStore({ logger: defaultLogger() }, { maxReservations: 1 })
    const privateKey = await generateKeyPair('Ed25519')
    const peer = peerIdFromPrivateKey(privateKey)
    store.reserve(peer, multiaddr())
    const result = store.reserve(peer, multiaddr())
    expect(result.status).to.equal(Status.OK)
    expect(result.expire).to.not.be.undefined()
    expect(store.get(peer)).to.be.ok()
  })

  it('should fail to add reservation on exceeding limit', async function () {
    const store = new ReservationStore({ logger: defaultLogger() }, { maxReservations: 0 })
    const privateKey = await generateKeyPair('Ed25519')
    const peer = peerIdFromPrivateKey(privateKey)
    const result = store.reserve(peer, multiaddr())
    expect(result.status).to.equal(Status.RESERVATION_REFUSED)
  })

  it('should remove reservation', async function () {
    const store = new ReservationStore({ logger: defaultLogger() }, { maxReservations: 10 })
    const privateKey = await generateKeyPair('Ed25519')
    const peer = peerIdFromPrivateKey(privateKey)
    const result = store.reserve(peer, multiaddr())
    expect(result.status).to.equal(Status.OK)
    expect(store.get(peer)).to.be.ok()
    store.removeReservation(peer)
    expect(store.get(peer)).to.not.be.ok()
    store.removeReservation(peer)
  })

  it('should apply configured default connection limits', async function () {
    const defaultDataLimit = 10n
    const defaultDurationLimit = 10

    const store = new ReservationStore({ logger: defaultLogger() }, {
      defaultDataLimit,
      defaultDurationLimit
    })
    const privateKey = await generateKeyPair('Ed25519')
    const peer = peerIdFromPrivateKey(privateKey)
    store.reserve(peer, multiaddr())

    const reservation = store.get(peer)

    expect(reservation).to.have.nested.property('limit.data', defaultDataLimit)
    expect(reservation).to.have.nested.property('limit.duration', defaultDurationLimit)
  })

  it('should apply default connection limits', async function () {
    const store = new ReservationStore({ logger: defaultLogger() })
    const privateKey = await generateKeyPair('Ed25519')
    const peer = peerIdFromPrivateKey(privateKey)
    store.reserve(peer, multiaddr())

    const reservation = store.get(peer)

    expect(reservation).to.have.nested.property('limit.data', DEFAULT_DATA_LIMIT)
    expect(reservation).to.have.nested.property('limit.duration', DEFAULT_DURATION_LIMIT)
  })

  it('should not apply default connection limits when they have been disabled', async function () {
    const store = new ReservationStore({ logger: defaultLogger() }, {
      applyDefaultLimit: false
    })
    const privateKey = await generateKeyPair('Ed25519')
    const peer = peerIdFromPrivateKey(privateKey)
    store.reserve(peer, multiaddr())

    const reservation = store.get(peer)

    expect(reservation).to.not.have.nested.property('limit.data')
    expect(reservation).to.not.have.nested.property('limit.duration')
  })
})
