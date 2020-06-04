/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 5] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
chai.use(require('chai-spies'))
const expect = chai.expect
const { Buffer } = require('buffer')
const pDefer = require('p-defer')
const times = require('lodash/times')

const FloodSub = require('../src')
const { multicodec } = require('../src')
const {
  defOptions,
  first,
  createPeerId,
  createMockRegistrar,
  expectSet,
  ConnectionPair
} = require('./utils')

function shouldNotHappen (_) {
  expect.fail()
}

describe('basics between 2 nodes', () => {
  describe('fresh nodes', () => {
    let peerIdA, peerIdB
    let fsA, fsB

    const registrarRecordA = {}
    const registrarRecordB = {}

    // Mount pubsub protocol
    before(async () => {
      [peerIdA, peerIdB] = await Promise.all([
        createPeerId(),
        createPeerId()
      ])

      fsA = new FloodSub(peerIdA, createMockRegistrar(registrarRecordA), defOptions)
      fsB = new FloodSub(peerIdB, createMockRegistrar(registrarRecordB), defOptions)

      expect(fsA.peers.size).to.be.eql(0)
      expect(fsA.subscriptions.size).to.eql(0)
      expect(fsB.peers.size).to.be.eql(0)
      expect(fsB.subscriptions.size).to.eql(0)
    })

    // Start pubsub
    before(() => Promise.all([
      fsA.start(),
      fsB.start()
    ]))

    // Connect floodsub nodes
    before(async () => {
      const onConnectA = registrarRecordA[multicodec].onConnect
      const onConnectB = registrarRecordB[multicodec].onConnect
      const handleA = registrarRecordA[multicodec].handler
      const handleB = registrarRecordB[multicodec].handler

      // Notice peers of connection
      const [c0, c1] = ConnectionPair()
      await onConnectA(peerIdB, c0)
      await onConnectB(peerIdA, c1)

      await handleB({
        protocol: multicodec,
        stream: c1.stream,
        connection: {
          remotePeer: peerIdA
        }
      })

      await handleA({
        protocol: multicodec,
        stream: c0.stream,
        connection: {
          remotePeer: peerIdB
        }
      })

      expect(fsA.peers.size).to.be.eql(1)
      expect(fsB.peers.size).to.be.eql(1)
    })

    after(() => {
      return Promise.all([
        fsA.started && fsA.stop(),
        fsB.started && fsB.stop()
      ])
    })

    it('Subscribe to a topic:Z in nodeA', () => {
      const defer = pDefer()

      fsA.subscribe('Z')
      fsB.once('floodsub:subscription-change', (changedPeerId, changedTopics, changedSubs) => {
        expectSet(fsA.subscriptions, ['Z'])
        expect(fsB.peers.size).to.equal(1)
        expectSet(first(fsB.peers).topics, ['Z'])
        expect(changedPeerId.toB58String()).to.equal(first(fsB.peers).id.toB58String())
        expectSet(changedTopics, ['Z'])
        expect(changedSubs).to.be.eql([{ topicID: 'Z', subscribe: true }])
        defer.resolve()
      })

      return defer.promise
    })

    it('Publish to a topic:Z in nodeA', () => {
      const defer = pDefer()

      fsA.once('Z', (msg) => {
        expect(msg.data.toString()).to.equal('hey')
        fsB.removeListener('Z', shouldNotHappen)
        defer.resolve()
      })

      fsB.once('Z', shouldNotHappen)

      fsA.publish('Z', Buffer.from('hey'))

      return defer.promise
    })

    it('Publish to a topic:Z in nodeB', () => {
      const defer = pDefer()

      fsA.once('Z', (msg) => {
        fsA.once('Z', shouldNotHappen)
        expect(msg.data.toString()).to.equal('banana')

        setTimeout(() => {
          fsA.removeListener('Z', shouldNotHappen)
          fsB.removeListener('Z', shouldNotHappen)

          defer.resolve()
        }, 100)
      })

      fsB.once('Z', shouldNotHappen)

      fsB.publish('Z', Buffer.from('banana'))

      return defer.promise
    })

    it('Publish 10 msg to a topic:Z in nodeB', () => {
      const defer = pDefer()
      let counter = 0

      fsB.once('Z', shouldNotHappen)
      fsA.on('Z', receivedMsg)

      function receivedMsg (msg) {
        expect(msg.data.toString()).to.equal('banana')
        expect(msg.from).to.be.eql(fsB.peerId.toB58String())
        expect(Buffer.isBuffer(msg.seqno)).to.be.true()
        expect(msg.topicIDs).to.be.eql(['Z'])

        if (++counter === 10) {
          fsA.removeListener('Z', receivedMsg)
          fsB.removeListener('Z', shouldNotHappen)

          defer.resolve()
        }
      }
      times(10, () => fsB.publish('Z', Buffer.from('banana')))

      return defer.promise
    })

    it('Publish 10 msg to a topic:Z in nodeB as array', () => {
      const defer = pDefer()
      let counter = 0

      fsB.once('Z', shouldNotHappen)
      fsA.on('Z', receivedMsg)

      function receivedMsg (msg) {
        expect(msg.data.toString()).to.equal('banana')
        expect(msg.from).to.be.eql(fsB.peerId.toB58String())
        expect(Buffer.isBuffer(msg.seqno)).to.be.true()
        expect(msg.topicIDs).to.be.eql(['Z'])

        if (++counter === 10) {
          fsA.removeListener('Z', receivedMsg)
          fsB.removeListener('Z', shouldNotHappen)

          defer.resolve()
        }
      }

      const msgs = []
      times(10, () => msgs.push(Buffer.from('banana')))
      fsB.publish('Z', msgs)

      return defer.promise
    })

    it('Unsubscribe from topic:Z in nodeA', () => {
      const defer = pDefer()

      fsA.unsubscribe('Z')
      expect(fsA.subscriptions.size).to.equal(0)

      fsB.once('floodsub:subscription-change', (changedPeerId, changedTopics, changedSubs) => {
        expect(fsB.peers.size).to.equal(1)
        expectSet(first(fsB.peers).topics, [])
        expect(changedPeerId.toB58String()).to.equal(first(fsB.peers).id.toB58String())
        expectSet(changedTopics, [])
        expect(changedSubs).to.be.eql([{ topicID: 'Z', subscribe: false }])

        defer.resolve()
      })

      return defer.promise
    })

    it('Publish to a topic:Z in nodeA nodeB', () => {
      const defer = pDefer()

      fsA.once('Z', shouldNotHappen)
      fsB.once('Z', shouldNotHappen)

      setTimeout(() => {
        fsA.removeListener('Z', shouldNotHappen)
        fsB.removeListener('Z', shouldNotHappen)
        defer.resolve()
      }, 100)

      fsB.publish('Z', Buffer.from('banana'))
      fsA.publish('Z', Buffer.from('banana'))

      return defer.promise
    })
  })

  describe('nodes send state on connection', () => {
    let peerIdA, peerIdB
    let fsA, fsB

    const registrarRecordA = {}
    const registrarRecordB = {}

    // Mount pubsub protocol
    before(async () => {
      [peerIdA, peerIdB] = await Promise.all([
        createPeerId(),
        createPeerId()
      ])

      fsA = new FloodSub(peerIdA, createMockRegistrar(registrarRecordA), defOptions)
      fsB = new FloodSub(peerIdB, createMockRegistrar(registrarRecordB), defOptions)
    })

    // Start pubsub
    before(() => Promise.all([
      fsA.start(),
      fsB.start()
    ]))

    // Make subscriptions prior to new nodes
    before(() => {
      fsA.subscribe('Za')
      fsB.subscribe('Zb')

      expect(fsA.peers.size).to.equal(0)
      expectSet(fsA.subscriptions, ['Za'])
      expect(fsB.peers.size).to.equal(0)
      expectSet(fsB.subscriptions, ['Zb'])
    })

    after(() => {
      return Promise.all([
        fsA.started && fsA.stop(),
        fsB.started && fsB.stop()
      ])
    })

    it('existing subscriptions are sent upon peer connection', async () => {
      const dial = async () => {
        const onConnectA = registrarRecordA[multicodec].onConnect
        const onConnectB = registrarRecordB[multicodec].onConnect
        const handleA = registrarRecordA[multicodec].handler
        const handleB = registrarRecordB[multicodec].handler

        // Notice peers of connection
        const [c0, c1] = ConnectionPair()
        await onConnectA(peerIdB, c0)
        await handleB({
          protocol: multicodec,
          stream: c1.stream,
          connection: {
            remotePeer: peerIdA
          }
        })

        await onConnectB(peerIdA, c1)
        await handleA({
          protocol: multicodec,
          stream: c0.stream,
          connection: {
            remotePeer: peerIdB
          }
        })
      }

      await Promise.all([
        dial(),
        new Promise((resolve) => fsA.once('floodsub:subscription-change', resolve)),
        new Promise((resolve) => fsB.once('floodsub:subscription-change', resolve))
      ])

      expect(fsA.peers.size).to.equal(1)
      expect(fsB.peers.size).to.equal(1)

      expectSet(fsA.subscriptions, ['Za'])
      expectSet(first(fsB.peers).topics, ['Za'])

      expectSet(fsB.subscriptions, ['Zb'])
      expectSet(first(fsA.peers).topics, ['Zb'])
    })
  })
})
