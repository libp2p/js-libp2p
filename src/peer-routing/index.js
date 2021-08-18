'use strict'

const errcode = require('err-code')
const pTimeout = require('p-timeout')

const PeerId = require('peer-id')
const crypto = require('libp2p-crypto')
const { toString: uint8ArrayToString } = require('uint8arrays/to-string')

const c = require('../constants')
const Message = require('../message')
const Query = require('../query')

const utils = require('../utils')

/**
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

/**
 * @param {import('../index')} dht
 */
module.exports = (dht) => {
  /**
   * Look if we are connected to a peer with the given id.
   * Returns its id and addresses, if found, otherwise `undefined`.
   *
   * @param {PeerId} peer
   */
  const findPeerLocal = async (peer) => {
    dht._log(`findPeerLocal ${peer.toB58String()}`)
    const p = await dht.routingTable.find(peer)

    /** @type {{ id: PeerId, addresses: { multiaddr: Multiaddr }[] }} */
    const peerData = p && dht.peerStore.get(p)

    if (peerData) {
      return {
        id: peerData.id,
        multiaddrs: peerData.addresses.map((address) => address.multiaddr)
      }
    }
  }

  /**
   * Get a value via rpc call for the given parameters.
   *
   * @param {PeerId} peer
   * @param {Uint8Array} key
   * @returns {Promise<Message>}
   * @private
   */
  const getValueSingle = async (peer, key) => { // eslint-disable-line require-await
    const msg = new Message(Message.TYPES.GET_VALUE, key, 0)
    return dht.network.sendRequest(peer, msg)
  }

  /**
   * Find close peers for a given peer
   *
   * @param {Uint8Array} key
   * @param {PeerId} peer
   * @returns {Promise<Array<{ id: PeerId, multiaddrs: Multiaddr[] }>>}
   * @private
   */

  const closerPeersSingle = async (key, peer) => {
    dht._log(`closerPeersSingle ${uint8ArrayToString(key, 'base32')} from ${peer.toB58String()}`)
    const msg = await dht.peerRouting._findPeerSingle(peer, new PeerId(key))

    return msg.closerPeers
      .filter((peerData) => !dht._isSelf(peerData.id))
      .map((peerData) => {
        dht.peerStore.addressBook.add(peerData.id, peerData.multiaddrs)

        return peerData
      })
  }

  /**
   * Get the public key directly from a node.
   *
   * @param {PeerId} peer
   */
  const getPublicKeyFromNode = async (peer) => {
    const pkKey = utils.keyForPublicKey(peer)
    const msg = await getValueSingle(peer, pkKey)

    if (!msg.record || !msg.record.value) {
      throw errcode(new Error(`Node not responding with its public key: ${peer.toB58String()}`), 'ERR_INVALID_RECORD')
    }

    const recPeer = await PeerId.createFromPubKey(msg.record.value)

    // compare hashes of the pub key
    if (!recPeer.equals(peer)) {
      throw errcode(new Error('public key does not match id'), 'ERR_PUBLIC_KEY_DOES_NOT_MATCH_ID')
    }

    return recPeer.pubKey
  }

  return {
  /**
   * Ask peer `peer` if they know where the peer with id `target` is.
   *
   * @param {PeerId} peer
   * @param {PeerId} target
   * @returns {Promise<Message>}
   * @private
   */
    async _findPeerSingle (peer, target) { // eslint-disable-line require-await
      dht._log('findPeerSingle %s', peer.toB58String())
      const msg = new Message(Message.TYPES.FIND_NODE, target.id, 0)

      return dht.network.sendRequest(peer, msg)
    },

    /**
     * Search for a peer with the given ID.
     *
     * @param {PeerId} id
     * @param {Object} [options] - findPeer options
     * @param {number} [options.timeout=60000] - how long the query should maximally run, in milliseconds
     * @returns {Promise<{ id: PeerId, multiaddrs: Multiaddr[] }>}
     */
    async findPeer (id, options = { timeout: 60000 }) {
      options.timeout = options.timeout || c.minute
      dht._log('findPeer %s', id.toB58String())

      // Try to find locally
      const pi = await findPeerLocal(id)

      // already got it
      if (pi != null) {
        dht._log('found local')
        return pi
      }

      const key = await utils.convertPeerId(id)
      const peers = dht.routingTable.closestPeers(key, dht.kBucketSize)

      if (peers.length === 0) {
        throw errcode(new Error('Peer lookup failed'), 'ERR_LOOKUP_FAILED')
      }

      // sanity check
      const match = peers.find((p) => p.isEqual(id))
      if (match) {
        /** @type {{ id: PeerId, addresses: { multiaddr: Multiaddr }[] }} */
        const peer = dht.peerStore.get(id)

        if (peer) {
          dht._log('found in peerStore')
          return {
            id: peer.id,
            multiaddrs: peer.addresses.map((address) => address.multiaddr)
          }
        }
      }

      // query the network
      const query = new Query(dht, id.id, () => {
        /**
         * There is no distinction between the disjoint paths, so there are no per-path
         * variables in dht scope. Just return the actual query function.
         *
         * @param {PeerId} peer
         */
        const queryFn = async (peer) => {
          const msg = await this._findPeerSingle(peer, id)
          const match = msg.closerPeers.find((p) => p.id.isEqual(id))

          // found it
          if (match) {
            return {
              peer: match,
              queryComplete: true
            }
          }

          return {
            closerPeers: msg.closerPeers
          }
        }

        return queryFn
      })

      let result
      try {
        result = await pTimeout(query.run(peers), options.timeout)
      } finally {
        query.stop()
      }

      let success = false
      result.paths.forEach((result) => {
        if (result.success && result.peer) {
          success = true
          dht.peerStore.addressBook.add(result.peer.id, result.peer.multiaddrs)
        }
      })
      dht._log('findPeer %s: %s', id.toB58String(), success)

      if (!success) {
        throw errcode(new Error('No peer found'), 'ERR_NOT_FOUND')
      }

      /** @type {{ id: PeerId, addresses: { multiaddr: Multiaddr }[] }} */
      const peerData = dht.peerStore.get(id)

      if (!peerData) {
        throw errcode(new Error('No peer found in peer store'), 'ERR_NOT_FOUND')
      }

      return {
        id: peerData.id,
        multiaddrs: peerData.addresses.map((address) => address.multiaddr)
      }
    },

    /**
     * Kademlia 'node lookup' operation.
     *
     * @param {Uint8Array} key
     * @param {Object} [options]
     * @param {boolean} [options.shallow=false] - shallow query
     * @returns {AsyncIterable<PeerId>}
     */
    async * getClosestPeers (key, options = { shallow: false }) {
      dht._log('getClosestPeers to %b', key)

      const id = await utils.convertBuffer(key)
      const tablePeers = dht.routingTable.closestPeers(id, dht.kBucketSize)

      const q = new Query(dht, key, () => {
        // There is no distinction between the disjoint paths,
        // so there are no per-path variables in dht scope.
        // Just return the actual query function.
        return async (peer) => {
          const closer = await closerPeersSingle(key, peer)

          return {
            closerPeers: closer,
            pathComplete: options.shallow ? true : undefined
          }
        }
      })

      const res = await q.run(tablePeers)
      if (!res || !res.finalSet) {
        return []
      }

      const sorted = await utils.sortClosestPeers(Array.from(res.finalSet), id)

      for (const pId of sorted.slice(0, dht.kBucketSize)) {
        yield pId
      }
    },

    /**
     * Get the public key for the given peer id.
     *
     * @param {PeerId} peer
     */
    async getPublicKey (peer) {
      dht._log('getPublicKey %s', peer.toB58String())

      // local check
      /** @type {{ id: PeerId, addresses: { multiaddr: Multiaddr }[] }} */
      const peerData = dht.peerStore.get(peer)

      if (peerData && peerData.id.pubKey) {
        dht._log('getPublicKey: found local copy')
        return peerData.id.pubKey
      }

      // try the node directly
      let pk

      try {
        pk = await getPublicKeyFromNode(peer)
      } catch (err) {
        // try dht directly
        const pkKey = utils.keyForPublicKey(peer)
        const value = await dht.get(pkKey)
        pk = crypto.keys.unmarshalPublicKey(value)
      }

      const peerId = new PeerId(peer.id, undefined, pk)
      const addrs = ((peerData && peerData.addresses) || []).map((address) => address.multiaddr)
      dht.peerStore.addressBook.add(peerId, addrs)
      dht.peerStore.keyBook.set(peerId, pk)

      return pk
    }
  }
}
