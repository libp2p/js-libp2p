'use strict'

const { Status } = require('./protocol')

/**
 * @typedef {import('./interfaces').ReservationStore} IReservationStore
 * @typedef {import('./interfaces').ReservationStatus} ReservationStatus
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 * @typedef {import('peer-id')} PeerId
 */

/**
 * @implements IReservationStore
 */
class ReservationStore {
  constructor (limit = 15) {
    /**
     * PeerId =>
     */
    this._reservations = new Map()
    this._limit = limit
  }

  /**
   * @typedef {Object} Result
   * @property {ReservationStatus} status
   * @property {number|undefined} expire
   */

  /**
   *
   * @param {PeerId} peer
   * @param {Multiaddr} addr
   * @returns {Promise<Result>}
   */
  async reserve (peer, addr) {
    if (this._reservations.size >= this._limit && !this._reservations.has(peer.toB58String())) {
      return { status: Status.RESERVATION_REFUSED, expire: undefined }
    }
    const expire = new Date()
    this._reservations.set(peer.toB58String(), { addr, expire })
    return { status: Status.OK, expire: expire.getTime() }
  }

  /**
   * @param {PeerId} peer
   */
  async removeReservation (peer) {
    this._reservations.delete(peer.toB58String())
  }

  /**
   *
   * @param {PeerId} dst
   * @returns {Promise<boolean>}
   */
  async hasReservation (dst) {
    return this._reservations.has(dst.toB58String())
  }
}

module.exports = ReservationStore
