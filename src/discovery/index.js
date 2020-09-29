'use strict'

const debug = require('debug')
const log = debug('libp2p:discovery')
log.error = debug('libp2p:discovery:error')
const errCode = require('err-code')

// const AbortController = require('abort-controller')
const { parallelMerge } = require('streaming-iterables')

const Rendezvous = require('./rendezvous')
const Routing = require('./routing')
const { codes } = require('../errors')

module.exports = (libp2p) => {
  const addressBook = libp2p.peerStore.addressBook
  const routing = Routing(libp2p)
  const rendezvous = Rendezvous(libp2p)

  const getDiscoveryAvailableIts = (namespace, options) => {
    if (routing.isEnabled && rendezvous.isEnabled) {
      return parallelMerge(
        routing.findPeers(namespace, options),
        rendezvous.findPeers(namespace, options)
      )
    } else if (routing.isEnabled) {
      return routing.findPeers(namespace, options)
    }
    return rendezvous.findPeers(namespace, options)
  }

  return {
    /**
     * Advertise services on the network.
     * @param {string} namespace
     * @param {object} [options]
     * @returns {Promise<void>}
     */
    async advertise (namespace, options) {
      if (!routing.isEnabled && !rendezvous.isEnabled) {
        throw errCode(new Error('no discovery implementations available'), codes.ERR_NO_DISCOVERY_IMPLEMENTATIONS)
      }
      return Promise.all([
        routing.isEnabled && routing.advertise(namespace, options),
        rendezvous.isEnabled && rendezvous.advertise(namespace, options)
      ])
    },

    /**
     * Discover peers providing a given service.
     * @param {string} namespace
     * @param {object} [options]
     * @param {number} [options.limit] number of distinct peers to find
     * @param {AsyncIterable<PeerId>}
     */
    async * findPeers (namespace, options = {}) {
      if (!routing.isEnabled && !rendezvous.isEnabled) {
        throw errCode(new Error('no discovery implementations available'), codes.ERR_NO_DISCOVERY_IMPLEMENTATIONS)
      }

      const discoveredPeers = new Set()
      // TODO: add abort controller
      const discAsyncIt = getDiscoveryAvailableIts(namespace, options)      

      // Store in the AddressBook: signed record or uncertified
      for await (const { signedPeerRecord, id, multiaddrs } of discAsyncIt) {
        if (signedPeerRecord) {
          const idStr = signedPeerRecord.peerId.toB58String()
          const isNew = !discoveredPeers.has(idStr)
          discoveredPeers.add(idStr)

          // Consume peer record and yield if new
          if (addressBook.consumePeerRecord(signedPeerRecord) && isNew) {
            yield signedPeerRecord.peerId
          }
        } else if (id && multiaddrs) {
          const idStr = id.toB58String()
          const isNew = !discoveredPeers.has(idStr)
          discoveredPeers.add(idStr)
          
          addressBook.add(id, multiaddrs)
          
          if (isNew) {
            yield
          }
        }
        // Abort if enough
        if (options.limit && options.limit <= discoveredPeers.size) {
          console.log('abort')
        }
      }
    }
  }
}

// TODO: who handles reprovide??
