/* eslint-env mocha */
/* eslint max-nested-callbacks: ["error", 8] */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const parallel = require('async/parallel')
const waterfall = require('async/waterfall')
const _ = require('lodash')
const Buffer = require('safe-buffer').Buffer

const Message = require('../../../src/message')
const handler = require('../../../src/rpc/handlers/add-provider')
const util = require('../../utils')

describe('rpc - handlers - AddProvider', () => {
  let peers
  let values
  let dht

  before((done) => {
    parallel([
      (cb) => util.makePeers(3, cb),
      (cb) => util.makeValues(2, cb)
    ], (err, res) => {
      expect(err).to.not.exist()
      peers = res[0]
      values = res[1]
      done()
    })
  })

  afterEach((done) => util.teardown(done))

  beforeEach((done) => {
    util.setupDHT((err, res) => {
      expect(err).to.not.exist()
      dht = res
      done()
    })
  })

  describe('invalid messages', () => {
    const tests = [{
      message: new Message(Message.TYPES.ADD_PROVIDER, Buffer.alloc(0), 0),
      error: /Missing key/
    }, {
      message: new Message(Message.TYPES.ADD_PROVIDER, Buffer.alloc(0), 0),
      error: /Missing key/
    }, {
      message: new Message(Message.TYPES.ADD_PROVIDER, Buffer.from('hello world'), 0),
      error: /Invalid CID/
    }]

    tests.forEach((t) => it(t.error.toString(), (done) => {
      handler(dht)(peers[0], t.message, (err, res) => {
        expect(err).to.exist()
        expect(err.message).to.match(t.error)
        done()
      })
    }))
  })

  it('ignore providers not from the originator', (done) => {
    const cid = values[0].cid

    const msg = new Message(Message.TYPES.ADD_PROVIDER, cid.buffer, 0)
    const sender = peers[0]
    sender.multiaddrs.add('/ip4/127.0.0.1/tcp/1234')
    const other = peers[1]
    other.multiaddrs.add('/ip4/127.0.0.1/tcp/2345')
    msg.providerPeers = [
      sender,
      other
    ]

    waterfall([
      (cb) => handler(dht)(sender, msg, cb),
      (cb) => dht.providers.getProviders(cid, cb),
      (provs, cb) => {
        expect(provs).to.have.length(1)
        expect(provs[0].id).to.eql(sender.id.id)
        const bookEntry = dht.peerBook.get(sender.id)
        expect(bookEntry.multiaddrs.toArray()).to.eql(
          sender.multiaddrs.toArray()
        )
        cb()
      }
    ], done)
  })

  it('ignore providers with no multiaddrs', (done) => {
    const cid = values[0].cid
    const msg = new Message(Message.TYPES.ADD_PROVIDER, cid.buffer, 0)
    const sender = _.cloneDeep(peers[0])
    sender.multiaddrs.clear()
    msg.providerPeers = [sender]

    waterfall([
      (cb) => handler(dht)(sender, msg, cb),
      (cb) => dht.providers.getProviders(cid, cb),
      (provs, cb) => {
        expect(provs).to.have.length(1)
        expect(provs[0].id).to.eql(sender.id.id)
        expect(
          dht.peerBook.has(sender.id)
        ).to.be.eql(false)
        cb()
      }
    ], done)
  })
})
