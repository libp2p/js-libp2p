/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Libp2p = require('libp2p-ipfs-nodejs')
const Connection = require('interface-connection').Connection
const pull = require('pull-stream')
const lp = require('pull-length-prefixed')
const series = require('async/series')

const DHT = require('../src')
const Message = require('../src/message')

const makePeers = require('./util').makePeers

describe('Network', () => {
  let libp2p
  let network
  let dht
  let infos

  before((done) => {
    makePeers(3, (err, peers) => {
      if (err) {
        return done(err)
      }

      infos = peers
      libp2p = new Libp2p(infos[0])
      dht = new DHT(libp2p)
      network = dht.network
      series([
        (cb) => libp2p.start(cb),
        (cb) => dht.start(cb)
      ], done)
    })
  })

  after((done) => series([
    (cb) => dht.stop(cb),
    (cb) => libp2p.stop(cb)
  ], done))

  describe('sendRequest', () => {
    it('send and response', (done) => {
      let i = 0
      const finish = () => {
        if (i++ === 1) {
          done()
        }
      }

      const msg = new Message(Message.TYPES.PING, new Buffer('hello'), 0)

      // mock it
      libp2p.dial = (peer, protocol, callback) => {
        expect(protocol).to.eql('/ipfs/kad/1.0.0')
        const msg = new Message(Message.TYPES.FIND_NODE, new Buffer('world'), 0)

        const rawConn = {
          source: pull(
            pull.values([msg.serialize()]),
            lp.encode()
          ),
          sink: pull(
            lp.decode(),
            pull.collect((err, res) => {
              expect(err).to.not.exist()
              expect(Message.deserialize(res[0]).type).to.eql(Message.TYPES.PING)
              finish()
            })
          )
        }
        const conn = new Connection(rawConn)
        callback(null, conn)
      }

      network.sendRequest(infos[0].id, msg, (err, response) => {
        expect(err).to.not.exist()
        expect(response.type).to.eql(Message.TYPES.FIND_NODE)

        finish()
      })
    })

    it('timeout on no message', (done) => {
      let i = 0
      const finish = () => {
        if (i++ === 1) {
          done()
        }
      }

      const msg = new Message(Message.TYPES.PING, new Buffer('hello'), 0)

      // mock it
      libp2p.dial = (peer, protocol, callback) => {
        expect(protocol).to.eql('/ipfs/kad/1.0.0')
        const rawConn = {
          // hanging
          source: (end, cb) => {},
          sink: pull(
            lp.decode(),
            pull.collect((err, res) => {
              expect(err).to.not.exist()
              expect(Message.deserialize(res[0]).type).to.eql(Message.TYPES.PING)
              finish()
            })
          )
        }
        const conn = new Connection(rawConn)
        callback(null, conn)
      }

      network.readMessageTimeout = 100

      network.sendRequest(infos[0].id, msg, (err, response) => {
        expect(err).to.exist()
        expect(err.message).to.match(/timed out/)

        finish()
      })
    })
  })
})
