/* eslint no-console: ["off"] */
'use strict'

const IPFS = require('ipfs')
const assert = require('assert').strict
const { generate: writeKey } = require('libp2p/src/pnet')
const path = require('path')
const fs = require('fs')
const privateLibp2pBundle = require('./libp2p-bundle')
const { mkdirp } = require('./utils')

// Create two separate repo paths so we can run two nodes and check their output
const repo1 = path.resolve('./tmp', 'repo1', '.ipfs')
const repo2 = path.resolve('./tmp', 'repo2', '.ipfs')
mkdirp(repo1)
mkdirp(repo2)

// Create a buffer and write the swarm key to it
const swarmKey = Buffer.alloc(95)
writeKey(swarmKey)

// This key is for the `TASK` mentioned in the writeFileSync calls below
const otherSwarmKey = Buffer.alloc(95)
writeKey(otherSwarmKey)

// Add the swarm key to both repos
const swarmKey1Path = path.resolve(repo1, 'swarm.key')
const swarmKey2Path = path.resolve(repo2, 'swarm.key')
fs.writeFileSync(swarmKey1Path, swarmKey)
// TASK: switch the commented out line below so we're using a different key, to see the nodes fail to connect
fs.writeFileSync(swarmKey2Path, swarmKey)
// fs.writeFileSync(swarmKey2Path, otherSwarmKey)

// Create the first ipfs node
const node1 = new IPFS({
  repo: repo1,
  libp2p: privateLibp2pBundle(swarmKey1Path),
  config: {
    Addresses: {
      // Set the swarm address so we dont get port collision on the nodes
      Swarm: ['/ip4/0.0.0.0/tcp/9101']
    }
  }
})

// Create the second ipfs node
const node2 = new IPFS({
  repo: repo2,
  libp2p: privateLibp2pBundle(swarmKey2Path),
  config: {
    Addresses: {
      // Set the swarm address so we dont get port collision on the nodes
      Swarm: ['/ip4/0.0.0.0/tcp/9102']
    }
  }
})

console.log('auto starting the nodes...')

// `nodesStarted` keeps track of how many of our nodes have started
let nodesStarted = 0
/**
 * Calls `connectAndTalk` when both nodes have started
 * @returns {void}
 */
const didStartHandler = () => {
  if (++nodesStarted === 2) {
    // If both nodes are up, start talking
    connectAndTalk()
  }
}

/**
 * Exits the process when all started nodes have stopped
 * @returns {void}
 */
const didStopHandler = () => {
  if (--nodesStarted < 1) {
    console.log('all nodes stopped, exiting.')
    process.exit(0)
  }
}

/**
 * Stops the running nodes
 * @param {Error} err An optional error to log to the console
 * @returns {void}
 */
const doStop = (err) => {
  if (err) {
    console.error(err)
  }

  console.log('Shutting down...')
  node1.stop()
  node2.stop()
}

/**
 * Connects the IPFS nodes and transfers data between them
 * @returns {void}
 */
const connectAndTalk = async () => {
  console.log('connecting the nodes...')
  const node2Id = await node2.id()
  const dataToAdd = Buffer.from('Hello, private friend!')

  // Connect the nodes
  // This will error when different private keys are used
  try {
    await node1.swarm.connect(node2Id.addresses[0])
  } catch (err) {
    return doStop(err)
  }
  console.log('the nodes are connected, let\'s add some data')

  // Add some data to node 1
  let addedCID
  try {
    addedCID = await node1.add(dataToAdd)
  } catch (err) {
    return doStop(err)
  }
  console.log(`added ${addedCID[0].path} to the node1`)

  // Retrieve the data from node 2
  let cattedData
  try {
    cattedData = await node2.cat(addedCID[0].path)
  } catch (err) {
    return doStop(err)
  }
  assert.deepEqual(cattedData.toString(), dataToAdd.toString(), 'Should have equal data')
  console.log(`successfully retrieved "${dataToAdd.toString()}" from node2`)

  doStop()
}

// Wait for the nodes to boot
node1.once('start', didStartHandler)
node2.once('start', didStartHandler)

// Listen for the nodes stopping so we can cleanup
node1.once('stop', didStopHandler)
node2.once('stop', didStopHandler)
