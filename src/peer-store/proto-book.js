'use strict'

const errcode = require('err-code')
const debug = require('debug')
const log = debug('libp2p:peer-store:proto-book')
log.error = debug('libp2p:peer-store:proto-book:error')

const PeerId = require('peer-id')

const Book = require('./book')
const Protobuf = require('./pb/proto-book.proto')

const {
  codes: { ERR_INVALID_PARAMETERS }
} = require('../errors')

/**
 * The ProtoBook is responsible for keeping the known supported
 * protocols of a peer.
 * This data will be persisted in the PeerStore datastore as follows:
 * /peers/protos/<b32 peer id no padding>
 */
class ProtoBook extends Book {
  /**
  * @constructor
  * @param {PeerStore} peerStore
  */
  constructor (peerStore) {
    /**
     * PeerStore Event emitter, used by the ProtoBook to emit:
     * "change:protocols" - emitted when the known protocols of a peer change.
     */
    super({
      peerStore,
      eventName: 'change:protocols',
      eventProperty: 'protocols',
      protoBuf: Protobuf,
      dsPrefix: '/peers/protos/',
      eventTransformer: (data) => Array.from(data),
      dsSetTransformer: (data) => ({
        protocols: Array.from(data)
      }),
      dsGetTransformer: (data) => new Set(data.protocols)
    })

    /**
     * Map known peers to their known protocols.
     * @type {Map<string, Set<string>>}
     */
    this.data = new Map()
  }

  /**
   * Set known protocols of a provided peer.
   * If the peer was not known before, it will be added.
   * @override
   * @param {PeerId} peerId
   * @param {Array<string>} protocols
   * @returns {ProtoBook}
   */
  set (peerId, protocols) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!protocols) {
      log.error('protocols must be provided to store data')
      throw errcode(new Error('protocols must be provided'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    const recSet = this.data.get(id)
    const newSet = new Set(protocols)

    const isSetEqual = (a, b) => a.size === b.size && [...a].every(value => b.has(value))

    // Already knows the peer and the recorded protocols are the same?
    // If yes, no changes needed!
    if (recSet && isSetEqual(recSet, newSet)) {
      log(`the protocols provided to store are equal to the already stored for ${id}`)
      return this
    }

    this._setData(peerId, newSet)
    log(`stored provided protocols for ${id}`)

    return this
  }

  /**
   * Adds known protocols of a provided peer.
   * If the peer was not known before, it will be added.
   * @override
   * @param {PeerId} peerId
   * @param {Array<string>} protocols
   * @returns {ProtoBook}
   */
  add (peerId, protocols) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), ERR_INVALID_PARAMETERS)
    }

    if (!protocols) {
      log.error('protocols must be provided to store data')
      throw errcode(new Error('protocols must be provided'), ERR_INVALID_PARAMETERS)
    }

    const id = peerId.toB58String()
    const recSet = this.data.get(id) || new Set()
    const newSet = new Set([...recSet, ...protocols]) // Set Union

    // Any new protocol added?
    if (recSet.size === newSet.size) {
      log(`the protocols provided to store are already stored for ${id}`)
      return this
    }

    this._setData(peerId, newSet)
    log(`added provided protocols for ${id}`)

    return this
  }
}

module.exports = ProtoBook
