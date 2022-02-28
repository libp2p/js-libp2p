
const Benchmark = require('benchmark')
const crypto = require('crypto')

const DuplexPair = require('it-pair/duplex')

const Floodsub = require('../src')
const { multicodec } = require('../src')
const { createPeerInfo } = require('../test/utils')

const suite = new Benchmark.Suite('pubsub')

// Simple benchmark, how many messages can we send from
// one node to another.

;(async () => {
  const registrarRecordA = {}
  const registrarRecordB = {}

  const registrar = (registrarRecord) => ({
    register: (multicodec, handlers) => {
      registrarRecord[multicodec] = handlers
    },
    unregister: (multicodec) => {
      delete registrarRecord[multicodec]
    }
  })

  const [peerInfoA, peerInfoB] = await Promise.all([
    createPeerInfo(),
    createPeerInfo()
  ])

  const fsA = new Floodsub(peerInfoA, registrar(registrarRecordA))
  const fsB = new Floodsub(peerInfoB, registrar(registrarRecordB))

  // Start pubsub
  await Promise.all([
    fsA.start(),
    fsB.start()
  ])

  // Connect floodsub nodes
  const onConnectA = registrarRecordA[multicodec].onConnect
  const onConnectB = registrarRecordB[multicodec].onConnect

  // Notice peers of connection
  const [d0, d1] = DuplexPair()
  onConnectA(peerInfoB, d0)
  onConnectB(peerInfoA, d1)

  fsA.subscribe('Z')
  fsB.subscribe('Z')

  suite.add('publish and receive', (deferred) => {
    const onMsg = (msg) => {
      deferred.resolve()
      fsB.removeListener('Z', onMsg)
    }

    fsB.on('Z', onMsg)

    fsA.publish('Z', crypto.randomBytes(1024))
  }, {
    defer: true
  })

  suite
    .on('cycle', (event) => {
      console.log(String(event.target)) // eslint-disable-line
    })
    .on('complete', () => {
      process.exit()
    })
    .run({
      async: true
    })
})()
