'use strict'

const delay = require('delay')
const pRetry = require('p-retry')
const pTimeout = require('p-timeout')
const promisify = require('promisify-es6')

const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const PeerBook = require('peer-book')
const Mplex = require('libp2p-mplex')
const Switch = require('libp2p-switch')
const TCP = require('libp2p-tcp')

const DHT = require('../../src')
const { sortClosestPeers } = require('../../src/utils')
/**
 * Like `sortClosestPeers`, expect it takes and returns `PeerInfo`s
 *
 * @param {Array<PeerInfo>} peers
 * @param {Buffer} target
 * @returns {Array<PeerInfo>}
 */
exports.sortClosestPeerInfos = async (peers, target) => {
  const sortedPeerIds = await sortClosestPeers(peers.map(peerInfo => peerInfo.id), target)

  return sortedPeerIds.map((peerId) => {
    return peers.find((peerInfo) => {
      return peerInfo.id.isEqual(peerId)
    })
  })
}

const createDHT = (peerInfo, props = {}) => {
  const sw = new Switch(peerInfo, new PeerBook())
  sw.transport.add('tcp', new TCP())
  sw.connection.addStreamMuxer(Mplex)
  sw.connection.reuse()
  return new DHT({ sw, ...props })
}

exports.createDHT = createDHT

exports.createAndStartDHT = async (peerInfo, props) => {
  const dht = createDHT(peerInfo, props)
  await dht.start()
  return dht
}

// connect two dhts
const connectNoSync = async (a, b) => {
  const publicPeerId = new PeerId(b.peerInfo.id.id, null, b.peerInfo.id.pubKey)
  const target = new PeerInfo(publicPeerId)
  target.multiaddrs = b.peerInfo.multiaddrs
  await promisify(cb => a.switch.dial(target, cb))()
}

const find = (a, b) => {
  return pRetry(async () => {
    const match = await a.routingTable.find(b.peerInfo.id)

    if (!match) {
      await delay(100)
      throw new Error('not found')
    }

    return match
  }, { retries: 50 })
}

// connect two dhts and wait for them to have each other
// in their routing table
exports.connect = async (a, b) => {
  await connectNoSync(a, b)
  await find(a, b)
  await find(b, a)
}

exports.bootstrap = (dhts) => {
  dhts.forEach((dht) => {
    dht.randomWalk._walk(1, 10000)
  })
}

exports.waitForWellFormedTables = (dhts, minPeers, avgPeers, waitTimeout) => {
  return pTimeout(pRetry(async () => {
    let totalPeers = 0

    const ready = dhts.map((dht) => {
      const rtlen = dht.routingTable.size
      totalPeers += rtlen
      if (minPeers > 0 && rtlen < minPeers) {
        return false
      }
      const actualAvgPeers = totalPeers / dhts.length
      if (avgPeers > 0 && actualAvgPeers < avgPeers) {
        return false
      }
      return true
    })

    if (ready.every(Boolean)) {
      return
    }
    await delay(200)
    throw new Error('not done yet')
  }, {
    retries: 50
  }), waitTimeout)
}

// Count how many peers are in b but are not in a
exports.countDiffPeers = (a, b) => {
  const s = new Set()
  a.forEach((p) => s.add(p.toB58String()))

  return b.filter((p) => !s.has(p.toB58String())).length
}
