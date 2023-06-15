/* eslint max-nested-callbacks: ["error", 6] */
import { mockNetwork } from '@libp2p/interface-mocks'
import { start, stop } from '@libp2p/interfaces/startable'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pDefer from 'p-defer'
import pWaitFor from 'p-wait-for'
import sinon from 'sinon'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { createComponents, waitForSubscriptionUpdate } from './utils.js'
import type { PubSubArgs, PubSubComponents } from './index.js'
import type { TestSetup } from '@libp2p/interface-compliance-tests'
import type { Message, PubSub } from '@libp2p/interface-pubsub'

export default (common: TestSetup<PubSub, PubSubArgs>): void => {
  describe('pubsub with multiple nodes', function () {
    describe('every peer subscribes to the topic', () => {
      describe('line', () => {
        // line
        // ◉────◉────◉
        // a    b    c
        let psA: PubSub
        let psB: PubSub
        let psC: PubSub
        let componentsA: PubSubComponents
        let componentsB: PubSubComponents
        let componentsC: PubSubComponents

        // Create and start pubsub nodes
        beforeEach(async () => {
          mockNetwork.reset()

          componentsA = await createComponents()
          componentsB = await createComponents()
          componentsC = await createComponents()

          psA = componentsA.pubsub = await common.setup({
            components: componentsA,
            init: {
              emitSelf: true
            }
          })
          psB = componentsB.pubsub = await common.setup({
            components: componentsB,
            init: {
              emitSelf: true
            }
          })
          psC = componentsC.pubsub = await common.setup({
            components: componentsC,
            init: {
              emitSelf: true
            }
          })

          // Start pubsub modes
          await start(...Object.values(componentsA), ...Object.values(componentsB), ...Object.values(componentsC))

          // Connect nodes
          await componentsA.connectionManager.openConnection(componentsB.peerId)
          await componentsB.connectionManager.openConnection(componentsC.peerId)

          // Wait for peers to be ready in pubsub
          await pWaitFor(() =>
            psA.getPeers().length === 1 &&
            psC.getPeers().length === 1 &&
            psA.getPeers().length === 1
          )
        })

        afterEach(async () => {
          sinon.restore()
          await stop(...Object.values(componentsA), ...Object.values(componentsB), ...Object.values(componentsC))
          await common.teardown()
          mockNetwork.reset()
        })

        it('subscribe to the topic on node a', async () => {
          const topic = 'Z'

          psA.subscribe(topic)
          expect(psA.getTopics()).to.deep.equal([topic])

          await waitForSubscriptionUpdate(psB, componentsA.peerId)

          expect(psB.getPeers().length).to.equal(2)
          expect(psB.getSubscribers(topic).map(p => p.toString())).to.deep.equal([componentsA.peerId.toString()])

          expect(psC.getPeers().length).to.equal(1)
          expect(psC.getSubscribers(topic)).to.be.empty()
        })

        it('subscribe to the topic on node b', async () => {
          const topic = 'Z'
          psB.subscribe(topic)
          expect(psB.getTopics()).to.deep.equal([topic])

          await Promise.all([
            waitForSubscriptionUpdate(psA, componentsB.peerId),
            waitForSubscriptionUpdate(psC, componentsB.peerId)
          ])

          expect(psA.getPeers().length).to.equal(1)
          expect(psA.getSubscribers(topic).map(p => p.toString())).to.deep.equal([componentsB.peerId.toString()])

          expect(psC.getPeers().length).to.equal(1)
          expect(psC.getSubscribers(topic).map(p => p.toString())).to.deep.equal([componentsB.peerId.toString()])
        })

        it('subscribe to the topic on node c', async () => {
          const topic = 'Z'
          const defer = pDefer()

          psC.subscribe(topic)
          expect(psC.getTopics()).to.deep.equal([topic])

          psB.addEventListener('subscription-change', () => {
            expect(psA.getPeers().length).to.equal(1)
            expect(psB.getPeers().length).to.equal(2)
            expect(psB.getSubscribers(topic).map(p => p.toString())).to.deep.equal([componentsC.peerId.toString()])

            defer.resolve()
          }, {
            once: true
          })

          return defer.promise
        })

        it('publish on node a', async () => {
          const topic = 'Z'
          const defer = pDefer()

          psA.subscribe(topic)
          psB.subscribe(topic)
          psC.subscribe(topic)

          await Promise.all([
            waitForSubscriptionUpdate(psA, componentsB.peerId),
            waitForSubscriptionUpdate(psB, componentsA.peerId),
            waitForSubscriptionUpdate(psC, componentsB.peerId)
          ])

          // GossipSub needs time to build the mesh overlay
          await delay(1000)

          let counter = 0

          psA.addEventListener('message', incMsg)
          psB.addEventListener('message', incMsg)
          psC.addEventListener('message', incMsg)

          const result = await psA.publish(topic, uint8ArrayFromString('hey'))

          expect(result).to.have.property('recipients').with.property('length').greaterThanOrEqual(1)

          function incMsg (evt: CustomEvent<Message>): void {
            const msg = evt.detail

            if (msg.topic !== topic) {
              return
            }

            expect(uint8ArrayToString(msg.data)).to.equal('hey')
            check()
          }

          function check (): void {
            if (++counter === 3) {
              psA.removeEventListener('message', incMsg)
              psB.removeEventListener('message', incMsg)
              psC.removeEventListener('message', incMsg)
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

          it('publish on node b', async () => {
            const topic = 'Z'
            const defer = pDefer()
            let counter = 0

            psA.subscribe(topic)
            psB.subscribe(topic)
            psC.subscribe(topic)

            await Promise.all([
              waitForSubscriptionUpdate(psA, componentsB.peerId),
              waitForSubscriptionUpdate(psB, componentsA.peerId),
              waitForSubscriptionUpdate(psC, componentsB.peerId)
            ])

            // GossipSub needs time to build the mesh overlay
            await delay(1000)

            psA.addEventListener('message', incMsg)
            psB.addEventListener('message', incMsg)
            psC.addEventListener('message', incMsg)

            await psB.publish(topic, uint8ArrayFromString('hey'))

            function incMsg (evt: CustomEvent<Message>): void {
              const msg = evt.detail

              if (msg.topic !== topic) {
                return
              }

              expect(uint8ArrayToString(msg.data)).to.equal('hey')
              check()
            }

            function check (): void {
              if (++counter === 3) {
                psA.removeEventListener('message', incMsg)
                psB.removeEventListener('message', incMsg)
                psC.removeEventListener('message', incMsg)
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
        let psA: PubSub
        let psB: PubSub
        let psC: PubSub
        let psD: PubSub
        let psE: PubSub
        let componentsA: PubSubComponents
        let componentsB: PubSubComponents
        let componentsC: PubSubComponents
        let componentsD: PubSubComponents
        let componentsE: PubSubComponents

        // Create and start pubsub nodes
        beforeEach(async () => {
          mockNetwork.reset()

          componentsA = await createComponents()
          componentsB = await createComponents()
          componentsC = await createComponents()
          componentsD = await createComponents()
          componentsE = await createComponents()

          psA = componentsA.pubsub = await common.setup({
            components: componentsA,
            init: {
              emitSelf: true
            }
          })
          psB = componentsB.pubsub = await common.setup({
            components: componentsB,
            init: {
              emitSelf: true
            }
          })
          psC = componentsC.pubsub = await common.setup({
            components: componentsC,
            init: {
              emitSelf: true
            }
          })
          psD = componentsD.pubsub = await common.setup({
            components: componentsD,
            init: {
              emitSelf: true
            }
          })
          psE = componentsE.pubsub = await common.setup({
            components: componentsE,
            init: {
              emitSelf: true
            }
          })

          // Start pubsub nodes
          await start(
            ...Object.values(componentsA),
            ...Object.values(componentsB),
            ...Object.values(componentsC),
            ...Object.values(componentsD),
            ...Object.values(componentsE)
          )

          // connect nodes
          await componentsA.connectionManager.openConnection(componentsB.peerId)
          await componentsB.connectionManager.openConnection(componentsC.peerId)
          await componentsC.connectionManager.openConnection(componentsD.peerId)
          await componentsD.connectionManager.openConnection(componentsE.peerId)

          // Wait for peers to be ready in pubsub
          await pWaitFor(() =>
            psA.getPeers().length === 1 &&
            psB.getPeers().length === 2 &&
            psC.getPeers().length === 2 &&
            psD.getPeers().length === 2 &&
            psE.getPeers().length === 1
          )
        })

        afterEach(async () => {
          await stop(
            ...Object.values(componentsA),
            ...Object.values(componentsB),
            ...Object.values(componentsC),
            ...Object.values(componentsD),
            ...Object.values(componentsE)
          )
          await common.teardown()
          mockNetwork.reset()
        })

        it('subscribes', () => {
          psA.subscribe('Z')
          expect(psA.getTopics()).to.deep.equal(['Z'])
          psB.subscribe('Z')
          expect(psB.getTopics()).to.deep.equal(['Z'])
          psC.subscribe('Z')
          expect(psC.getTopics()).to.deep.equal(['Z'])
          psD.subscribe('Z')
          expect(psD.getTopics()).to.deep.equal(['Z'])
          psE.subscribe('Z')
          expect(psE.getTopics()).to.deep.equal(['Z'])
        })

        it('publishes from c', async function () {
          const defer = pDefer()
          let counter = 0
          const topic = 'Z'

          psA.subscribe(topic)
          psA.addEventListener('message', incMsg)
          psB.subscribe(topic)
          psB.addEventListener('message', incMsg)
          psC.subscribe(topic)
          psC.addEventListener('message', incMsg)
          psD.subscribe(topic)
          psD.addEventListener('message', incMsg)
          psE.subscribe(topic)
          psE.addEventListener('message', incMsg)

          await Promise.all([
            waitForSubscriptionUpdate(psA, componentsB.peerId),
            waitForSubscriptionUpdate(psB, componentsA.peerId),
            waitForSubscriptionUpdate(psC, componentsB.peerId),
            waitForSubscriptionUpdate(psD, componentsC.peerId),
            waitForSubscriptionUpdate(psE, componentsD.peerId)
          ])

          // GossipSub needs time to build the mesh overlay
          await delay(1000)

          await psC.publish('Z', uint8ArrayFromString('hey from c'))

          function incMsg (evt: CustomEvent<Message>): void {
            const msg = evt.detail

            if (msg.topic !== topic) {
              return
            }

            expect(uint8ArrayToString(msg.data)).to.equal('hey from c')
            check()
          }

          function check (): void {
            if (++counter === 5) {
              psA.unsubscribe('Z')
              psB.unsubscribe('Z')
              psC.unsubscribe('Z')
              psD.unsubscribe('Z')
              psE.unsubscribe('Z')
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
}
