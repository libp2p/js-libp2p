/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const { Buffer } = require('buffer')
const pDefer = require('p-defer')

const FloodSub = require('../src')
const { multicodec } = require('../src')
const {
  createPeerId,
  createMockRegistrar,
  first,
  expectSet,
  ConnectionPair
} = require('./utils')

async function spawnPubSubNode (peerId, reg) {
  const ps = new FloodSub(peerId, reg, { emitSelf: true })

  await ps.start()
  return ps
}

describe('multiple nodes (more than 2)', () => {
  describe('every peer subscribes to the topic', () => {
    describe('line', () => {
      // line
      // ◉────◉────◉
      // a    b    c
      let psA, psB, psC
      let peerIdA, peerIdB, peerIdC

      const registrarRecordA = {}
      const registrarRecordB = {}
      const registrarRecordC = {}

      before(async () => {
        [peerIdA, peerIdB, peerIdC] = await Promise.all([
          createPeerId(),
          createPeerId(),
          createPeerId()
        ]);

        [psA, psB, psC] = await Promise.all([
          spawnPubSubNode(peerIdA, createMockRegistrar(registrarRecordA)),
          spawnPubSubNode(peerIdB, createMockRegistrar(registrarRecordB)),
          spawnPubSubNode(peerIdC, createMockRegistrar(registrarRecordC))
        ])
      })

      // connect nodes
      before(async () => {
        const onConnectA = registrarRecordA[multicodec].onConnect
        const onConnectB = registrarRecordB[multicodec].onConnect
        const onConnectC = registrarRecordC[multicodec].onConnect
        const handleA = registrarRecordA[multicodec].handler
        const handleB = registrarRecordB[multicodec].handler
        const handleC = registrarRecordC[multicodec].handler

        // Notice peers of connection
        const [d0, d1] = ConnectionPair()
        await onConnectA(peerIdB, d0)
        await handleB({
          protocol: multicodec,
          stream: d1.stream,
          connection: {
            remotePeer: peerIdA
          }
        })
        await onConnectB(peerIdA, d1)
        await handleA({
          protocol: multicodec,
          stream: d0.stream,
          connection: {
            remotePeer: peerIdB
          }
        })

        const [d2, d3] = ConnectionPair()
        await onConnectB(peerIdC, d2)
        await handleC({
          protocol: multicodec,
          stream: d3.stream,
          connection: {
            remotePeer: peerIdB
          }
        })
        await onConnectC(peerIdB, d3)
        await handleB({
          protocol: multicodec,
          stream: d2.stream,
          connection: {
            remotePeer: peerIdC
          }
        })
      })

      after(() => Promise.all([
        psA.stop(),
        psB.stop(),
        psC.stop()
      ]))

      it('subscribe to the topic on node a', () => {
        const defer = pDefer()

        psA.subscribe('Z')
        expectSet(psA.subscriptions, ['Z'])

        psB.once('floodsub:subscription-change', () => {
          expect(psB.peers.size).to.equal(2)
          const aPeerId = psA.peerId.toB58String()
          const topics = psB.peers.get(aPeerId).topics
          expectSet(topics, ['Z'])

          expect(psC.peers.size).to.equal(1)
          expectSet(first(psC.peers).topics, [])

          defer.resolve()
        })

        return defer.promise
      })

      it('subscribe to the topic on node b', async () => {
        psB.subscribe('Z')
        expectSet(psB.subscriptions, ['Z'])

        await Promise.all([
          new Promise((resolve) => psA.once('floodsub:subscription-change', resolve)),
          new Promise((resolve) => psC.once('floodsub:subscription-change', resolve))
        ])

        expect(psA.peers.size).to.equal(1)
        expectSet(first(psA.peers).topics, ['Z'])

        expect(psC.peers.size).to.equal(1)
        expectSet(first(psC.peers).topics, ['Z'])
      })

      it('subscribe to the topic on node c', () => {
        const defer = pDefer()

        psC.subscribe('Z')
        expectSet(psC.subscriptions, ['Z'])

        psB.once('floodsub:subscription-change', () => {
          expect(psA.peers.size).to.equal(1)
          expectSet(first(psA.peers).topics, ['Z'])

          expect(psB.peers.size).to.equal(2)
          psB.peers.forEach((peer) => {
            expectSet(peer.topics, ['Z'])
          })

          defer.resolve()
        })

        return defer.promise
      })

      it('publish on node a', () => {
        const defer = pDefer()

        let counter = 0

        psA.on('Z', incMsg)
        psB.on('Z', incMsg)
        psC.on('Z', incMsg)

        psA.publish('Z', Buffer.from('hey'))

        function incMsg (msg) {
          expect(msg.data.toString()).to.equal('hey')
          check()
        }

        function check () {
          if (++counter === 3) {
            psA.removeListener('Z', incMsg)
            psB.removeListener('Z', incMsg)
            psC.removeListener('Z', incMsg)
            defer.resolve()
          }
        }

        return defer.promise
      })

      it('publish array on node a', () => {
        const defer = pDefer()
        let counter = 0

        psA.on('Z', incMsg)
        psB.on('Z', incMsg)
        psC.on('Z', incMsg)

        psA.publish('Z', [Buffer.from('hey'), Buffer.from('hey')])

        function incMsg (msg) {
          expect(msg.data.toString()).to.equal('hey')
          check()
        }

        function check () {
          if (++counter === 6) {
            psA.removeListener('Z', incMsg)
            psB.removeListener('Z', incMsg)
            psC.removeListener('Z', incMsg)
            defer.resolve()
          }
        }

        return defer.promise
      })

      // since the topology is the same, just the publish
      // gets sent by other peer, we reused the same peers
      describe('1 level tree', () => {
        // 1 level tree
        //     ┌◉┐
        //     │b│
        //   ◉─┘ └─◉
        //   a     c

        it('publish on node b', () => {
          const defer = pDefer()
          let counter = 0

          psA.on('Z', incMsg)
          psB.on('Z', incMsg)
          psC.on('Z', incMsg)

          psB.publish('Z', Buffer.from('hey'))

          function incMsg (msg) {
            expect(msg.data.toString()).to.equal('hey')
            check()
          }

          function check () {
            if (++counter === 3) {
              psA.removeListener('Z', incMsg)
              psB.removeListener('Z', incMsg)
              psC.removeListener('Z', incMsg)
              defer.resolve()
            }
          }

          return defer.promise
        })
      })
    })

    describe('2 level tree', () => {
      // 2 levels tree
      //      ┌◉┐
      //      │c│
      //   ┌◉─┘ └─◉┐
      //   │b     d│
      // ◉─┘       └─◉
      // a
      let psA, psB, psC, psD, psE
      let peerIdA, peerIdB, peerIdC, peerIdD, peerIdE

      const registrarRecordA = {}
      const registrarRecordB = {}
      const registrarRecordC = {}
      const registrarRecordD = {}
      const registrarRecordE = {}

      before(async () => {
        [peerIdA, peerIdB, peerIdC, peerIdD, peerIdE] = await Promise.all([
          createPeerId(),
          createPeerId(),
          createPeerId(),
          createPeerId(),
          createPeerId()
        ]);

        [psA, psB, psC, psD, psE] = await Promise.all([
          spawnPubSubNode(peerIdA, createMockRegistrar(registrarRecordA)),
          spawnPubSubNode(peerIdB, createMockRegistrar(registrarRecordB)),
          spawnPubSubNode(peerIdC, createMockRegistrar(registrarRecordC)),
          spawnPubSubNode(peerIdD, createMockRegistrar(registrarRecordD)),
          spawnPubSubNode(peerIdE, createMockRegistrar(registrarRecordE))
        ])
      })

      // connect nodes
      before(async () => {
        const onConnectA = registrarRecordA[multicodec].onConnect
        const onConnectB = registrarRecordB[multicodec].onConnect
        const onConnectC = registrarRecordC[multicodec].onConnect
        const onConnectD = registrarRecordD[multicodec].onConnect
        const onConnectE = registrarRecordE[multicodec].onConnect
        const handleA = registrarRecordA[multicodec].handler
        const handleB = registrarRecordB[multicodec].handler
        const handleC = registrarRecordC[multicodec].handler
        const handleD = registrarRecordD[multicodec].handler
        const handleE = registrarRecordE[multicodec].handler

        // Notice peers of connection
        const [d0, d1] = ConnectionPair() // A <-> B
        await onConnectA(peerIdB, d0)
        await handleB({
          protocol: multicodec,
          stream: d1.stream,
          connection: {
            remotePeer: peerIdA
          }
        })
        await onConnectB(peerIdA, d1)
        await handleA({
          protocol: multicodec,
          stream: d0.stream,
          connection: {
            remotePeer: peerIdB
          }
        })

        const [d2, d3] = ConnectionPair() // B <-> C
        await onConnectB(peerIdC, d2)
        await handleC({
          protocol: multicodec,
          stream: d3.stream,
          connection: {
            remotePeer: peerIdB
          }
        })
        await onConnectC(peerIdB, d3)
        await handleB({
          protocol: multicodec,
          stream: d2.stream,
          connection: {
            remotePeer: peerIdC
          }
        })

        const [d4, d5] = ConnectionPair() // C <-> D
        await onConnectC(peerIdD, d4)
        await handleD({
          protocol: multicodec,
          stream: d5.stream,
          connection: {
            remotePeer: peerIdC
          }
        })
        await onConnectD(peerIdC, d5)
        await handleC({
          protocol: multicodec,
          stream: d4.stream,
          connection: {
            remotePeer: peerIdD
          }
        })

        const [d6, d7] = ConnectionPair() // D <-> E
        await onConnectD(peerIdE, d6)
        await handleE({
          protocol: multicodec,
          stream: d7.stream,
          connection: {
            remotePeer: peerIdD
          }
        })
        await onConnectE(peerIdD, d7)
        await handleD({
          protocol: multicodec,
          stream: d6.stream,
          connection: {
            remotePeer: peerIdE
          }
        })
      })

      after(() => Promise.all([
        psA.stop(),
        psB.stop(),
        psC.stop(),
        psD.stop(),
        psE.stop()
      ]))

      it('subscribes', () => {
        psA.subscribe('Z')
        expectSet(psA.subscriptions, ['Z'])
        psB.subscribe('Z')
        expectSet(psB.subscriptions, ['Z'])
        psC.subscribe('Z')
        expectSet(psC.subscriptions, ['Z'])
        psD.subscribe('Z')
        expectSet(psD.subscriptions, ['Z'])
        psE.subscribe('Z')
        expectSet(psE.subscriptions, ['Z'])
      })

      it('publishes from c', function () {
        this.timeout(30 * 1000)
        const defer = pDefer()
        let counter = 0

        psA.on('Z', incMsg)
        psB.on('Z', incMsg)
        psC.on('Z', incMsg)
        psD.on('Z', incMsg)
        psE.on('Z', incMsg)

        psC.publish('Z', Buffer.from('hey from c'))

        function incMsg (msg) {
          expect(msg.data.toString()).to.equal('hey from c')
          check()
        }

        function check () {
          if (++counter === 5) {
            psA.removeListener('Z', incMsg)
            psB.removeListener('Z', incMsg)
            psC.removeListener('Z', incMsg)
            psD.removeListener('Z', incMsg)
            psE.removeListener('Z', incMsg)
            defer.resolve()
          }
        }

        return defer.promise
      })
    })
  })

  describe('only some nodes subscribe the networks', () => {
    describe('line', () => {
      // line
      // ◉────◎────◉
      // a    b    c

      before(() => { })
      after(() => { })
    })

    describe('1 level tree', () => {
      // 1 level tree
      //     ┌◉┐
      //     │b│
      //   ◎─┘ └─◉
      //   a     c

      before(() => { })
      after(() => { })
    })

    describe('2 level tree', () => {
      // 2 levels tree
      //      ┌◉┐
      //      │c│
      //   ┌◎─┘ └─◉┐
      //   │b     d│
      // ◉─┘       └─◎
      // a           e

      before(() => { })
      after(() => { })
    })
  })
})
