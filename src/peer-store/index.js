'use strict'

const assert = require('assert')
const debug = require('debug')
const log = debug('libp2p:peer-store')
log.error = debug('libp2p:peer-store:error')

const { EventEmitter } = require('events')

const PeerId = require('peer-id')
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
   * If already exist, its info is updated. If `silent` is set to
   * true, no 'peer' event will be emitted. This can be useful if you
   * are already in the process of dialing the peer. The peer is technically
   * known, but may not have been added to the PeerStore yet.
   * @param {PeerInfo} peerInfo
   * @param {object} [options]
   * @param {boolean} [options.silent] (Default=false)
   * @return {PeerInfo}
   */
  put (peerInfo, options = { silent: false }) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')

    let peer
    // Already know the peer?
    if (this.has(peerInfo.id)) {
      peer = this.update(peerInfo)
    } else {
      peer = this.add(peerInfo)

      // Emit the peer if silent = false
      !options.silent && this.emit('peer', peerInfo)
    }
    return peer
  }

  /**
   * Add a new peer to the store.
   * @param {PeerInfo} peerInfo
   * @return {PeerInfo}
   */
  add (peerInfo) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')

    // Create new instance and add values to it
    const newPeerInfo = new PeerInfo(peerInfo.id)

    peerInfo.multiaddrs.forEach((ma) => newPeerInfo.multiaddrs.add(ma))
    peerInfo.protocols.forEach((p) => newPeerInfo.protocols.add(p))

    const connectedMa = peerInfo.isConnected()
    connectedMa && newPeerInfo.connect(connectedMa)

    const peerProxy = new Proxy(newPeerInfo, {
      set: (obj, prop, value) => {
        if (prop === 'multiaddrs') {
          this.emit('change:multiaddrs', {
            peerInfo: obj,
            multiaddrs: value.toArray()
          })
        } else if (prop === 'protocols') {
          this.emit('change:protocols', {
            peerInfo: obj,
            protocols: Array.from(value)
          })
        }
        return Reflect.set(...arguments)
      }
    })

    this.peers.set(peerInfo.id.toB58String(), peerProxy)
    return peerProxy
  }

  /**
   * Updates an already known peer.
   * @param {PeerInfo} peerInfo
   * @return {PeerInfo}
   */
  update (peerInfo) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')
    const id = peerInfo.id.toB58String()
    const recorded = this.peers.get(id)

    // pass active connection state
    const ma = peerInfo.isConnected()
    if (ma) {
      recorded.connect(ma)
    }

    // Verify new multiaddrs
    // TODO: better track added and removed multiaddrs
    const multiaddrsIntersection = [
      ...recorded.multiaddrs.toArray()
    ].filter((m) => peerInfo.multiaddrs.has(m))

    if (multiaddrsIntersection.length !== peerInfo.multiaddrs.size ||
      multiaddrsIntersection.length !== recorded.multiaddrs.size) {
      for (const ma of peerInfo.multiaddrs.toArray()) {
        recorded.multiaddrs.add(ma)
      }

      this.emit('change:multiaddrs', {
        peerInfo: recorded,
        multiaddrs: recorded.multiaddrs.toArray()
      })
    }

    // Update protocols
    // TODO: better track added and removed protocols
    const protocolsIntersection = new Set(
      [...recorded.protocols].filter((p) => peerInfo.protocols.has(p))
    )

    if (protocolsIntersection.size !== peerInfo.protocols.size ||
      protocolsIntersection.size !== recorded.protocols.size) {
      for (const protocol of peerInfo.protocols) {
        recorded.protocols.add(protocol)
      }

      this.emit('change:protocols', {
        peerInfo: recorded,
        protocols: Array.from(recorded.protocols)
      })
    }

    // Add the public key if missing
    if (!recorded.id.pubKey && peerInfo.id.pubKey) {
      recorded.id.pubKey = peerInfo.id.pubKey
    }

    return recorded
  }

  /**
   * Get the info to the given id.
   * @param {PeerId|string} peerId b58str id
   * @returns {PeerInfo}
   */
  get (peerId) {
    // TODO: deprecate this and just accept `PeerId` instances
    if (PeerId.isPeerId(peerId)) {
      peerId = peerId.toB58String()
    }

    return this.peers.get(peerId)
  }

  /**
   * Has the info to the given id.
   * @param {PeerId|string} peerId b58str id
   * @returns {boolean}
   */
  has (peerId) {
    // TODO: deprecate this and just accept `PeerId` instances
    if (PeerId.isPeerId(peerId)) {
      peerId = peerId.toB58String()
    }

    return this.peers.has(peerId)
  }

  /**
   * Removes the Peer with the matching `peerId` from the PeerStore
   * @param {PeerId|string} peerId b58str id
   * @returns {boolean} true if found and removed
   */
  remove (peerId) {
    // TODO: deprecate this and just accept `PeerId` instances
    if (PeerId.isPeerId(peerId)) {
      peerId = peerId.toB58String()
    }

    return this.peers.delete(peerId)
  }

  /**
   * Completely replaces the existing peers metadata with the given `peerInfo`
   * @param {PeerInfo} peerInfo
   * @returns {void}
   */
  replace (peerInfo) {
    assert(PeerInfo.isPeerInfo(peerInfo), 'peerInfo must be an instance of peer-info')

    this.remove(peerInfo.id.toB58String())
    this.add(peerInfo)

    // This should be cleaned up in PeerStore v2
    this.emit('change:multiaddrs', {
      peerInfo,
      multiaddrs: peerInfo.multiaddrs.toArray()
    })
    this.emit('change:protocols', {
      peerInfo,
      protocols: Array.from(peerInfo.protocols)
    })
  }

  /**
   * Returns the known multiaddrs for a given `PeerInfo`. All returned multiaddrs
   * will include the encapsulated `PeerId` of the peer.
   * @param {PeerInfo} peer
   * @returns {Array<Multiaddr>}
   */
  multiaddrsForPeer (peer) {
    return this.put(peer, true).multiaddrs.toArray().map(addr => {
      if (addr.getPeerId()) return addr
      return addr.encapsulate(`/p2p/${peer.id.toB58String()}`)
    })
  }
}

module.exports = PeerStore
