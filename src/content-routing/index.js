'use strict'

const errcode = require('err-code')
const pTimeout = require('p-timeout')

const c = require('../constants')
const LimitedPeerList = require('../peer-list/limited-peer-list')
const Message = require('../message')
const Query = require('../query')
const utils = require('../utils')

/**
 * @typedef {import('multiformats/cid').CID} CID
 * @typedef {import('peer-id')} PeerId
 * @typedef {import('multiaddr').Multiaddr} Multiaddr
 */

/**
 * @param {import('../')} dht
 */
module.exports = (dht) => {
  /**
   * Check for providers from a single node.
   *
   * @param {PeerId} peer
   * @param {CID} key
   *
   * @private
   */
  const findProvidersSingle = async (peer, key) => { // eslint-disable-line require-await
    const msg = new Message(Message.TYPES.GET_PROVIDERS, key.bytes, 0)
    return dht.network.sendRequest(peer, msg)
  }

  return {
    /**
     * Announce to the network that we can provide the value for a given key
     *
     * @param {CID} key
     */
    async provide (key) {
      dht._log(`provide: ${key}`)

      /** @type {Error[]} */
      const errors = []

      // Add peer as provider
      await dht.providers.addProvider(key, dht.peerId)

      const multiaddrs = dht.libp2p ? dht.libp2p.multiaddrs : []
      const msg = new Message(Message.TYPES.ADD_PROVIDER, key.bytes, 0)
      msg.providerPeers = [{
        id: dht.peerId,
        multiaddrs
      }]

      /**
       * @param {PeerId} peer
       */
      async function mapPeer (peer) {
        dht._log(`putProvider ${key} to ${peer.toB58String()}`)
        try {
          await dht.network.sendMessage(peer, msg)
        } catch (err) {
          errors.push(err)
        }
      }

      // Notify closest peers
      await utils.mapParallel(dht.getClosestPeers(key.bytes), mapPeer)

      if (errors.length) {
        // TODO:
        // This should be infrequent. This means a peer we previously connected
        // to failed to exchange the provide message. If getClosestPeers was an
        // iterator, we could continue to pull until we announce to kBucketSize peers.
        throw errcode(new Error(`Failed to provide to ${errors.length} of ${dht.kBucketSize} peers`), 'ERR_SOME_PROVIDES_FAILED', { errors })
      }
    },

    /**
     * Search the dht for up to `K` providers of the given CID.
     *
     * @param {CID} key
     * @param {Object} [options] - findProviders options
     * @param {number} [options.timeout=60000] - how long the query should maximally run, in milliseconds
     * @param {number} [options.maxNumProviders=5] - maximum number of providers to find
     * @returns {AsyncIterable<{ id: PeerId, multiaddrs: Multiaddr[] }>}
     */
    async * findProviders (key, options = { timeout: 60000, maxNumProviders: 5 }) {
      const providerTimeout = options.timeout || c.minute
      const n = options.maxNumProviders || c.K

      dht._log(`findProviders ${key}`)

      const out = new LimitedPeerList(n)
      const provs = await dht.providers.getProviders(key)

      provs
        .forEach(id => {
          /** @type {{ id: PeerId, addresses: { multiaddr: Multiaddr }[] }} */
          const peerData = dht.peerStore.get(id)

          if (peerData) {
            out.push({
              id: peerData.id,
              multiaddrs: peerData.addresses
                .map((address) => address.multiaddr)
            })
          } else {
            out.push({
              id,
              multiaddrs: []
            })
          }
        })

      // All done
      if (out.length >= n) {
        // yield values
        for (const pData of out.toArray()) {
          yield pData
        }
        return
      }

      // need more, query the network
      /** @type {LimitedPeerList[]} */
      const paths = []

      /**
       *
       * @param {number} pathIndex
       * @param {number} numPaths
       */
      function makePath (pathIndex, numPaths) {
        // This function body runs once per disjoint path
        const pathSize = utils.pathSize(n - out.length, numPaths)
        const pathProviders = new LimitedPeerList(pathSize)
        paths.push(pathProviders)

        /**
         * The query function to use on this particular disjoint path
         *
         * @param {PeerId} peer
         */
        async function queryDisjointPath (peer) {
          const msg = await findProvidersSingle(peer, key)
          const provs = msg.providerPeers
          dht._log(`Found ${provs.length} provider entries for ${key}`)

          provs.forEach((prov) => {
            pathProviders.push({
              ...prov
            })
          })

          // hooray we have all that we want
          if (pathProviders.length >= pathSize) {
            return { pathComplete: true }
          }

          // it looks like we want some more
          return { closerPeers: msg.closerPeers }
        }

        return queryDisjointPath
      }

      const query = new Query(dht, key.bytes, makePath)
      const peers = dht.routingTable.closestPeers(key.bytes, dht.kBucketSize)

      try {
        await pTimeout(
          query.run(peers),
          providerTimeout
        )
      } catch (err) {
        if (err.name !== pTimeout.TimeoutError.name) {
          throw err
        }
      } finally {
        query.stop()
      }

      // combine peers from each path
      paths.forEach((path) => {
        path.toArray().forEach((peer) => {
          out.push(peer)
        })
      })

      for (const pData of out.toArray()) {
        yield pData
      }
    }
  }
}
