/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 6] */
/* eslint-disable no-console */

'use strict'
const { promisify } = require('util')
const PeerBook = require('peer-book')
const PeerId = require('peer-id')
const PeerInfo = require('peer-info')
const multihashes = require('multihashes')

const RoutingTable = require('../../src/routing')
const Message = require('../../src/message')
const utils = require('../../src/utils')
const testUtils = require('../../test/utils')
const DHT = require('../../src')

const convertBuffer = promisify(utils.convertBuffer)
const sortClosestPeerInfos = promisify(testUtils.sortClosestPeerInfos)

const NUM_PEERS = 10e3 // Peers to create, not including us
const LATENCY_DEAD_NODE = 120e3 // How long dead nodes should take before erroring
const NUM_DEAD_NODES = Math.floor(NUM_PEERS * 0.3) // 30% undialable
const MAX_PEERS_KNOWN = Math.min(500, NUM_PEERS) // max number of peers a node should be aware of (capped at NUM_PEERS)
const MIN_PEERS_KNOWN = 10 // min number of peers a node should be aware of
const LATENCY_MIN = 100 // min time a good peer should take to respond
const LATENCY_MAX = 10e3 // max time a good peer should take to respond
const KValue = 20 // k Bucket size
const ALPHA = 6 // alpha concurrency
const QUERY_KEY = Buffer.from('a key to search for')
const RUNS = 3 // How many times the simulation should run
const VERBOSE = false // If true, some additional logs will run

let dhtKey
let network
let peers
let ourPeerInfo
let sortedPeers // Peers in the network sorted by closeness to QUERY_KEY
let topIds // Closest 20 peerIds in the network

// Execute the simulation
;(async () => {
  console.log('Starting setup...')
  await setup()

  sortedPeers = await sortClosestPeerInfos(peers, dhtKey)
  topIds = sortedPeers.slice(0, 20).map(peerInfo => peerInfo.id.toB58String())
  const topIdFilter = (value) => topIds.includes(value)

  console.log('Total Nodes=%d, Dead Nodes=%d, Max Siblings per Peer=%d', NUM_PEERS, NUM_DEAD_NODES, MAX_PEERS_KNOWN)
  console.log('Starting %d runs with concurrency %d...', RUNS, ALPHA)
  const topRunIds = []
  for (var i = 0; i < RUNS; i++) {
    const { closestPeers, runTime } = await GetClosestPeersSimulation()
    const foundIds = closestPeers.map(peerId => peerId.toB58String())
    const intersection = foundIds.filter(topIdFilter)
    topRunIds.push(intersection)

    console.log('Found %d of the top %d peers in %d ms', intersection.length, KValue, runTime)
  }

  const commonTopIds = getCommonMembers(topRunIds)
  console.log('All runs found %d common peers', commonTopIds.length)

  process.exit()
})()

/**
 * Setup the data for the test
 */
async function setup () {
  dhtKey = await convertBuffer(QUERY_KEY)
  peers = await createPeers(NUM_PEERS + 1)
  ourPeerInfo = peers.shift()

  // Create the network
  network = await MockNetwork(peers)
}

/**
 * @typedef ClosestPeersSimResult
 * @property {Array<PeerInfo>} closestPeers
 * @property {number} runTime Time in ms the query took
 */

/**
 * @returns {ClosestPeersSimResult}
 */
async function GetClosestPeersSimulation () {
  const dht = new DHT({
    _peerInfo: ourPeerInfo,
    _peerBook: new PeerBook(),
    handle: () => {},
    on: () => {}
  }, {
    kBucketSize: KValue,
    concurrency: ALPHA,
    randomWalk: {
      enabled: false
    }
  })

  // Add random peers to our table
  const ourPeers = randomMembers(peers, randomInteger(MIN_PEERS_KNOWN, MAX_PEERS_KNOWN))
  for (const peer of ourPeers) {
    await promisify((peer, callback) => dht._add(peer, callback))(peer)
  }

  dht.network.sendRequest = (to, message, callback) => {
    const networkPeer = network.peers[to.toB58String()]
    let response = null

    if (networkPeer.routingTable) {
      response = new Message(message.type, Buffer.alloc(0), message.clusterLevel)
      response.closerPeers = networkPeer.routingTable.closestPeers(dhtKey, KValue).map(peerId => {
        return new PeerInfo(peerId)
      })
    }

    VERBOSE && console.log(`sendRequest latency:${networkPeer.latency} peerId:${to.toB58String()} closestPeers:${response ? response.closerPeers.length : null}`)

    return setTimeout(() => {
      if (response) {
        return callback(null, response)
      }
      callback(new Error('ERR_TIMEOUT'))
    }, networkPeer.latency)
  }

  // Start the dht
  await promisify((callback) => dht.start(callback))()

  const startTime = Date.now()
  const closestPeers = await new Promise((resolve, reject) => {
    dht.getClosestPeers(QUERY_KEY, (err, res) => {
      if (err) return reject(err)
      resolve(res)
    })
  })
  const runTime = Date.now() - startTime

  return { closestPeers, runTime }
}

/**
 * Create `num` PeerInfos
 * @param {integer} num How many peers to create
 * @returns {Array<PeerInfo>}
 */
function createPeers (num) {
  const crypto = require('crypto')
  const peers = [...new Array(num)].map(() => {
    return new PeerInfo(
      PeerId.createFromB58String(
        multihashes.toB58String(crypto.randomBytes(34))
      )
    )
  })

  return peers
}

/**
 * Creates a mock network
 * @param {Array<PeerInfo>} peers
 * @returns {Network}
 */
async function MockNetwork (peers) {
  const network = {
    peers: {}
  }

  // Make nodes dead
  for (const peer of peers.slice(0, NUM_DEAD_NODES)) {
    network.peers[peer.id.toB58String()] = {
      latency: LATENCY_DEAD_NODE
    }
  }

  // Give the remaining nodes:
  for (const peer of peers.slice(NUM_DEAD_NODES)) {
    const netPeer = network.peers[peer.id.toB58String()] = {
      // dial latency
      latency: randomInteger(LATENCY_MIN, LATENCY_MAX),
      // random sibling peers from the full list
      routingTable: new RoutingTable(peer.id, KValue)
    }
    const siblings = randomMembers(peers, randomInteger(MIN_PEERS_KNOWN, MAX_PEERS_KNOWN))
    for (const peer of siblings) {
      await promisify((callback) => netPeer.routingTable.add(peer.id, callback))()
    }
  }

  return network
}

/**
 * Returns a random integer between `min` and `max`
 * @param {number} min
 * @param {number} max
 * @returns {int}
 */
function randomInteger (min, max) {
  return Math.floor(Math.random() * (max - min)) + min
}

/**
 * Return a unique array of random `num` members from `list`
 * @param {Array<any>} list array to pull random members from
 * @param {number} num number of random members to get
 * @returns {Array<any>}
 */
function randomMembers (list, num) {
  const randomMembers = []

  if (list.length < num) throw new Error(`cant get random members, ${num} is less than ${list.length}`)

  while (randomMembers.length < num) {
    const randomMember = list[Math.floor(Math.random() * list.length)]
    if (!randomMembers.includes(randomMember)) {
      randomMembers.push(randomMember)
    }
  }

  return randomMembers
}

/**
 * Finds the common members of all arrays
 * @param {Array<Array>} arrays An array of arrays to find common members
 * @returns {Array<any>}
 */
function getCommonMembers (arrays) {
  return arrays.shift().reduce(function (accumulator, val1) {
    if (accumulator.indexOf(val1) === -1 &&
      arrays.every(function (val2) {
        return val2.indexOf(val1) !== -1
      })
    ) {
      accumulator.push(val1)
    }

    return accumulator
  }, [])
}
