'use strict'

const debug = require('debug')
const PeerId = require('peer-id')
const errcode = require('err-code')
const { codes } = require('../errors')
const { Key } = require('interface-datastore/key')
const { base32 } = require('multiformats/bases/base32')
const { keys: { unmarshalPublicKey, marshalPublicKey } } = require('libp2p-crypto')
const { Multiaddr } = require('multiaddr')
const { Peer: PeerPB } = require('./pb/peer')
// @ts-expect-error no types
const mortice = require('mortice')
const { equals: uint8arrayEquals } = require('uint8arrays/equals')

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
    if (peer.pubKey != null && peer.id.pubKey != null && !uint8arrayEquals(peer.pubKey.bytes, peer.id.pubKey.bytes)) {
      log.error('peer publicKey bytes do not match peer id publicKey bytes')
      throw errcode(new Error('publicKey bytes do not match peer id publicKey bytes'), codes.ERR_INVALID_PARAMETERS)
    }

    // dedupe addresses
    const addressSet = new Set()

    const buf = PeerPB.encode({
      addresses: peer.addresses
        .filter(address => {
          if (addressSet.has(address.multiaddr.toString())) {
            return false
          }

          addressSet.add(address.multiaddr.toString())
          return true
        })
        .sort((a, b) => {
          return a.multiaddr.toString().localeCompare(b.multiaddr.toString())
        })
        .map(({ multiaddr, isCertified }) => ({
          multiaddr: multiaddr.bytes,
          isCertified
        })),
      protocols: peer.protocols.sort(),
      pubKey: peer.pubKey ? marshalPublicKey(peer.pubKey) : undefined,
      metadata: [...peer.metadata.keys()].sort().map(key => ({ key, value: peer.metadata.get(key) })),
      peerRecordEnvelope: peer.peerRecordEnvelope
    }).finish()

    await this._datastore.put(this._peerIdToDatastoreKey(peer.id), buf)

    return this.load(peer.id)
  }

  /**
   * @param {PeerId} peerId
   * @param {Partial<Peer>} data
   */
  async patch (peerId, data) {
    const peer = await this.load(peerId)

    return await this._patch(peerId, data, peer)
  }

  /**
   * @param {PeerId} peerId
   * @param {Partial<Peer>} data
   */
  async patchOrCreate (peerId, data) {
    /** @type {Peer} */
    let peer

    try {
      peer = await this.load(peerId)
    } catch (/** @type {any} */ err) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }

      peer = { id: peerId, addresses: [], protocols: [], metadata: new Map() }
    }

    return await this._patch(peerId, data, peer)
  }

  /**
   * @param {PeerId} peerId
   * @param {Partial<Peer>} data
   * @param {Peer} peer
   */
  async _patch (peerId, data, peer) {
    return await this.save({
      ...peer,
      ...data,
      id: peerId
    })
  }

  /**
   * @param {PeerId} peerId
   * @param {Partial<Peer>} data
   */
  async merge (peerId, data) {
    const peer = await this.load(peerId)

    return this._merge(peerId, data, peer)
  }

  /**
   * @param {PeerId} peerId
   * @param {Partial<Peer>} data
   */
  async mergeOrCreate (peerId, data) {
    /** @type {Peer} */
    let peer

    try {
      peer = await this.load(peerId)
    } catch (/** @type {any} */ err) {
      if (err.code !== codes.ERR_NOT_FOUND) {
        throw err
      }

      peer = { id: peerId, addresses: [], protocols: [], metadata: new Map() }
    }

    return await this._merge(peerId, data, peer)
  }

  /**
   * @param {PeerId} peerId
   * @param {Partial<Peer>} data
   * @param {Peer} peer
   */
  async _merge (peerId, data, peer) {
    // if the peer has certified addresses, use those in
    // favour of the supplied versions
    /** @type {Map<string, boolean>} */
    const addresses = new Map()

    ;(data.addresses || []).forEach(addr => {
      addresses.set(addr.multiaddr.toString(), addr.isCertified)
    })

    peer.addresses.forEach(({ multiaddr, isCertified }) => {
      const addrStr = multiaddr.toString()
      addresses.set(addrStr, Boolean(addresses.get(addrStr) || isCertified))
    })

    return await this.save({
      id: peerId,
      addresses: Array.from(addresses.entries()).map(([addrStr, isCertified]) => {
        return {
          multiaddr: new Multiaddr(addrStr),
          isCertified
        }
      }),
      protocols: Array.from(new Set([
        ...(peer.protocols || []),
        ...(data.protocols || [])
      ])),
      metadata: new Map([
        ...(peer.metadata ? peer.metadata.entries() : []),
        ...(data.metadata ? data.metadata.entries() : [])
      ]),
      pubKey: data.pubKey || (peer != null ? peer.pubKey : undefined),
      peerRecordEnvelope: data.peerRecordEnvelope || (peer != null ? peer.peerRecordEnvelope : undefined)
    })
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
