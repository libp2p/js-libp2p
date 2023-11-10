import { TypedEventEmitter } from '@libp2p/interface/events'
import { logger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import delay from 'delay'
import all from 'it-all'
import Queue from 'p-queue'
import Sinon from 'sinon'
import { isNode } from 'wherearewe'
import { queueToGenerator } from '../../src/query/utils.js'
import type { CleanUpEvents } from '../../src/query/manager.js'

describe('query utils', () => {
  describe('queue to generator', () => {
    it('converts a queue to a generator', async () => {
      const queue = new Queue()
      const controller = new AbortController()
      const signal = controller.signal
      const cleanUp = new TypedEventEmitter<CleanUpEvents>()
      const log = logger('test-logger')

      void queue.add(async () => {
        await delay(10)
        return true
      })

      const results = await all(queueToGenerator(queue, signal, cleanUp, log))

      expect(results).to.deep.equal([true])
    })

    it('aborts during read', async () => {
      const listener = Sinon.stub()

      if (isNode) {
        process.on('unhandledRejection', listener)
      }

      const queue = new Queue({
        concurrency: 1
      })
      const controller = new AbortController()
      const signal = controller.signal
      const cleanUp = new TypedEventEmitter<CleanUpEvents>()
      const log = logger('test-logger')

      void queue.add(async () => {
        await delay(10)
        return 1
      })
      void queue.add(async () => {
        await delay(10)
        return 2
      })

      let count = 1

      await expect((async () => {
        for await (const result of queueToGenerator(queue, signal, cleanUp, log) as any) {
          expect(result).to.equal(count)
          count++

          // get the first result
          if (result === 1) {
            // abort the queue
            controller.abort()
          }
        }
      })()).to.eventually.be.rejected
        .with.property('code', 'ERR_QUERY_ABORTED')

      if (isNode) {
        process.removeListener('unhandledRejection', listener)
        expect(listener.called).to.be.false('unhandled promise rejection detected')
      }
    })
  })
})
