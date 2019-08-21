/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(require('chai-checkmark'))
chai.use(dirtyChai)
const sinon = require('sinon')

const PeerBook = require('peer-book')
const Queue = require('../../src/switch/dialer/queue')
const QueueManager = require('../../src/switch/dialer/queueManager')
const Switch = require('../../src/switch')
const { PRIORITY_HIGH, PRIORITY_LOW } = require('../../src/switch/constants')

const utils = require('./utils')
const createInfos = utils.createInfos

describe('dialer', () => {
  let switchA
  let switchB

  before((done) => createInfos(2, (err, infos) => {
    expect(err).to.not.exist()

    switchA = new Switch(infos[0], new PeerBook())
    switchB = new Switch(infos[1], new PeerBook())

    done()
  }))

  afterEach(() => {
    sinon.restore()
  })

  describe('connect', () => {
    afterEach(() => {
      switchA.dialer.clearDenylist(switchB._peerInfo)
    })

    it('should use default options', (done) => {
      switchA.dialer.connect(switchB._peerInfo, (err) => {
        expect(err).to.exist()
        done()
      })
    })

    it('should be able to use custom options', (done) => {
      switchA.dialer.connect(switchB._peerInfo, { useFSM: true, priority: PRIORITY_HIGH }, (err) => {
        expect(err).to.exist()
        done()
      })
    })
  })

  describe('queue', () => {
    it('should denylist forever after 5 denylists', () => {
      const queue = new Queue('QM', switchA)
      for (var i = 0; i < 4; i++) {
        queue.denylist()
        expect(queue.denylisted).to.be.a('number')
        expect(queue.denylisted).to.not.eql(Infinity)
      }

      queue.denylist()
      expect(queue.denylisted).to.eql(Infinity)
    })
  })

  describe('queue manager', () => {
    let queueManager
    before(() => {
      queueManager = new QueueManager(switchA)
    })

    it('should abort cold calls when the queue is full', (done) => {
      sinon.stub(queueManager._coldCallQueue, 'size').value(switchA.dialer.MAX_COLD_CALLS)
      const dialRequest = {
        peerInfo: {
          id: { toB58String: () => 'QmA' }
        },
        protocol: null,
        options: { useFSM: true, priority: PRIORITY_LOW },
        callback: (err) => {
          expect(err.code).to.eql('DIAL_ABORTED')
          done()
        }
      }

      queueManager.add(dialRequest)
    })

    it('should add a protocol dial to the normal queue', () => {
      const dialRequest = {
        peerInfo: {
          id: { toB58String: () => 'QmA' },
          isConnected: () => null
        },
        protocol: '/echo/1.0.0',
        options: { useFSM: true, priority: PRIORITY_HIGH },
        callback: () => {}
      }

      const runSpy = sinon.stub(queueManager, 'run')
      const addSpy = sinon.stub(queueManager._queue, 'add')
      const deleteSpy = sinon.stub(queueManager._coldCallQueue, 'delete')

      queueManager.add(dialRequest)

      expect(runSpy.called).to.eql(true)
      expect(addSpy.called).to.eql(true)
      expect(addSpy.getCall(0).args[0]).to.eql('QmA')
      expect(deleteSpy.called).to.eql(true)
      expect(deleteSpy.getCall(0).args[0]).to.eql('QmA')
    })

    it('should add a cold call to the cold call queue', () => {
      const dialRequest = {
        peerInfo: {
          id: { toB58String: () => 'QmA' },
          isConnected: () => null
        },
        protocol: null,
        options: { useFSM: true, priority: PRIORITY_LOW },
        callback: () => {}
      }

      const runSpy = sinon.stub(queueManager, 'run')
      const addSpy = sinon.stub(queueManager._coldCallQueue, 'add')

      queueManager.add(dialRequest)

      expect(runSpy.called).to.eql(true)
      expect(addSpy.called).to.eql(true)
      expect(addSpy.getCall(0).args[0]).to.eql('QmA')
    })

    it('should abort a cold call if it\'s in the normal queue', (done) => {
      const dialRequest = {
        peerInfo: {
          id: { toB58String: () => 'QmA' },
          isConnected: () => null
        },
        protocol: null,
        options: { useFSM: true, priority: PRIORITY_LOW },
        callback: (err) => {
          expect(runSpy.called).to.eql(false)
          expect(hasSpy.called).to.eql(true)
          expect(hasSpy.getCall(0).args[0]).to.eql('QmA')
          expect(err.code).to.eql('DIAL_ABORTED')
          done()
        }
      }

      const runSpy = sinon.stub(queueManager, 'run')
      const hasSpy = sinon.stub(queueManager._queue, 'has').returns(true)

      queueManager.add(dialRequest)
    })

    it('should remove a queue that has reached max denylist', () => {
      const queue = new Queue('QmA', switchA)
      queue.denylisted = Infinity

      const abortSpy = sinon.spy(queue, 'abort')
      const queueManager = new QueueManager(switchA)
      queueManager._queues[queue.id] = queue

      queueManager._clean()

      expect(abortSpy.called).to.eql(true)
      expect(queueManager._queues).to.eql({})
    })

    it('should not remove a queue that is denylisted below max', () => {
      const queue = new Queue('QmA', switchA)
      queue.denylisted = Date.now() + 10e3

      const abortSpy = sinon.spy(queue, 'abort')
      const queueManager = new QueueManager(switchA)
      queueManager._queues[queue.id] = queue

      queueManager._clean()

      expect(abortSpy.called).to.eql(false)
      expect(queueManager._queues).to.eql({
        QmA: queue
      })
    })

    it('should remove a queue that is not running and the peer is not connected', () => {
      const disconnectedPeer = {
        id: { toB58String: () => 'QmA' },
        isConnected: () => null
      }
      const queue = new Queue(disconnectedPeer.id.toB58String(), switchA)

      const abortSpy = sinon.spy(queue, 'abort')
      const queueManager = new QueueManager(switchA)
      queueManager._queues[queue.id] = queue

      queueManager._clean()

      expect(abortSpy.called).to.eql(true)
      expect(queueManager._queues).to.eql({})
    })

    it('should not remove a queue that is not running but the peer is connected', () => {
      const connectedPeer = {
        id: { toB58String: () => 'QmA' },
        isConnected: () => true
      }
      const queue = new Queue(connectedPeer.id.toB58String(), switchA)

      switchA._peerBook.put(connectedPeer)

      const abortSpy = sinon.spy(queue, 'abort')
      const queueManager = new QueueManager(switchA)
      queueManager._queues[queue.id] = queue

      queueManager._clean()

      expect(abortSpy.called).to.eql(false)
      expect(queueManager._queues).to.eql({
        QmA: queue
      })
    })
  })
})
