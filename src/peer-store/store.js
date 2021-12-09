'use strict'

const debug = require('debug')
const PeerId = require('peer-id')
const errcode = require('err-code')
const { codes } = require('../errors')
const { Key } = require('interface-datastore/key')
const { base32 } = require('multiformats/bases/base32')
const map = require('it-map')
const all = require('it-all')
const { keys: { unmarshalPublicKey, marshalPublicKey } } = require('libp2p-crypto')
const { Multiaddr } = require('multiaddr')
const { Peer: PeerPB } = require('./pb/peer')
// @ts-expect-error no types
const mortice = require('mortice')

const log = Object.assign(debug('libp2p:peer-store:store'), {
  error: debug('libp2p:peer-store:store:err')
})

/**
 * @typedef {import('./types').PeerStore} PeerStore
 * @typedef {import('./types').EventName} EventName
 * @typedef {import('./types').Peer} Peer
 */

const NAMESPACE_COMMON = '/peers/'

class PersistentStore {
  /**
   * @param {import('interface-datastore').Datastore} datastore
   */
  constructor (datastore) {
    this._datastore = datastore
    this.lock = mortice('peer-store', {
      singleProcess: true
    })
  }

  /**
   * @param {PeerId} peerId
   * @returns {Key}
   */
  _peerIdToDatastoreKey (peerId) {
    if (!PeerId.isPeerId(peerId)) {
      log.error('peerId must be an instance of peer-id to store data')
      throw errcode(new Error('peerId must be an instance of peer-id'), codes.ERR_INVALID_PARAMETERS)
    }

    const b32key = peerId.toString()
    return new Key(`${NAMESPACE_COMMON}${b32key}`)
  }

  /**
   * @param {PeerId} peerId
   */
  async has (peerId) {
    return this._datastore.has(this._peerIdToDatastoreKey(peerId))
  }

  /**
   * @param {PeerId} peerId
   */
  async delete (peerId) {
    await this._datastore.delete(this._peerIdToDatastoreKey(peerId))
  }

  /**
   * @param {PeerId} peerId
   * @returns {Promise<import('./types').Peer>} peer
   */
  async load (peerId) {
    const dsKey = this._peerIdToDatastoreKey(peerId)

    if (!(await this._datastore.has(dsKey))) {
      return {
        id: peerId,
        addresses: [],
        protocols: [],
        metadata: new Map()
      }
    }

    const buf = await this._datastore.get(this._peerIdToDatastoreKey(peerId))
    const peer = PeerPB.decode(buf)
    const pubKey = peer.pubKey ? unmarshalPublicKey(peer.pubKey) : peerId.pubKey
    const metadata = new Map()

    for (const meta of peer.metadata) {
      metadata.set(meta.key, meta.value)
    }

    return {
      ...peer,
      id: peerId,
      pubKey,
      addresses: peer.addresses.map(({ multiaddr, isCertified }) => ({
        multiaddr: new Multiaddr(multiaddr),
        isCertified: isCertified || false
      })),
      metadata,
      peerRecordEnvelope: peer.peerRecordEnvelope || undefined
    }
  }

  /**
   * @param {Peer} peer
   */
  async save (peer) {
    const buf = PeerPB.encode({
      ...peer,
      pubKey: peer.pubKey ? marshalPublicKey(peer.pubKey) : undefined,
      addresses: peer.addresses.map(({ multiaddr, isCertified }) => ({
        multiaddr: multiaddr.bytes,
        isCertified
      })),
      metadata: await all(map(peer.metadata.entries(), ([key, value]) => ({ key, value })))
    }).finish()

    await this._datastore.put(this._peerIdToDatastoreKey(peer.id), buf)
  }

  /**
   * @param {PeerId} peerId
   * @param {Partial<Peer>} data
   */
  async merge (peerId, data) {
    const peer = await this.load(peerId)
    const merged = {
      ...peer,
      ...data
    }

    await this.save(merged)
  }

  async * all () {
    for await (const key of this._datastore.queryKeys({
      prefix: NAMESPACE_COMMON
    })) {
      // /peers/${peer-id-as-libp2p-key-cid-string-in-base-32}
      const base32Str = key.toString().split('/')[2]
      const buf = base32.decode(base32Str)

      yield this.load(PeerId.createFromBytes(buf))
    }
  }
}

module.exports = PersistentStore
