'use strict'

const assert = require('assert')
const debug = require('debug')
const log = debug('libp2p:peer-store')
log.error = debug('libp2p:peer-store:error')
const errCode = require('err-code')

const { EventEmitter } = require('events')

const PeerInfo = require('peer-info')

/**
 * Responsible for managing known peers, as well as their addresses and metadata
 * @fires PeerStore#peer Emitted when a peer is connected to this node
 * @fires PeerStore#change:protocols
 * @fires PeerStore#change:multiaddrs
 */
class PeerStore extends EventEmitter {
  constructor () {
    super()

    /**
     * Map of peers
     *
     * @type {Map<string, PeerInfo>}
     */
    this.peers = new Map()

    // TODO: Track ourselves. We should split `peerInfo` up into its pieces so we get better
    // control and observability. This will be the initial step for removing PeerInfo
    // https://github.com/libp2p/go-libp2p-core/blob/master/peerstore/peerstore.go
    // this.addressBook = new Map()
    // this.protoBook = new Map()
  }

  /**
   * Stores the peerInfo of a new peer.
   * If already exist, its info is updated.
   * @param {PeerInfo} peerInfo
   */
  put (peerInfo) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')

    // Already know the peer?
    if (this.peers.has(peerInfo.id.toB58String())) {
      this.update(peerInfo)
    } else {
      this.add(peerInfo)

      // Emit the new peer found
      this.emit('peer', peerInfo)
    }
  }

  /**
   * Add a new peer to the store.
   * @param {PeerInfo} peerInfo
   */
  add (peerInfo) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')

    this.peers.set(peerInfo.id.toB58String(), peerInfo)
  }

  /**
   * Updates an already known peer.
   * If already exist, updates ids info if outdated.
   * @param {PeerInfo} peerInfo
   */
  update (peerInfo) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')

    const recorded = this.peers.get(peerInfo.id.toB58String())

    // pass active connection state
    const ma = peerInfo.isConnected()
    if (ma) {
      recorded.connect(ma)
    }

    // Verify new multiaddrs
    // TODO: better track added and removed multiaddrs
    if (peerInfo.multiaddrs.size || recorded.multiaddrs.size) {
      recorded.multiaddrs = peerInfo.multiaddrs

      this.emit('change:multiaddrs', {
        peerInfo: recorded,
        multiaddrs: Array.from(recorded.multiaddrs)
      })
    }

    // Update protocols
    // TODO: better track added and removed protocols
    if (peerInfo.protocols.size || recorded.protocols.size) {
      recorded.protocols = new Set(peerInfo.protocols)

      this.emit('change:protocols', {
        peerInfo: recorded,
        protocols: Array.from(recorded.protocols)
      })
    }

    // Add the public key if missing
    if (!recorded.id.pubKey && peerInfo.id.pubKey) {
      recorded.id.pubKey = peerInfo.id.pubKey
    }
  }

  /**
   * Get the info to the given id.
   * @param {string} peerId b58str id
   * @returns {PeerInfo}
   */
  get (peerId) {
    const peerInfo = this.peers.get(peerId)

    if (peerInfo) {
      return peerInfo
    }

    throw errCode(new Error('PeerInfo was not found'), 'ERR_NO_PEER_INFO')
  }

  /**
   * Get an array with all peers known.
   * @returns {Array<PeerInfo>}
   */
  getAllArray () {
    return Array.from(this.peers.values())
  }

  /**
   * Remove the info of the peer with the given id.
   * @param {string} peerId b58str id
   * @returns {boolean} true if found and removed
   */
  remove (peerId) {
    return this.peers.delete(peerId)
  }

  /**
   * Replace the info stored of the given peer.
   * @param {PeerInfo} peerInfo
   * @returns {void}
   */
  replace (peerInfo) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')

    this.remove(peerInfo.id.toB58String())
    this.add(peerInfo)
  }
}

module.exports = PeerStore
