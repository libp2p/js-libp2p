/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Connection = require('interface-connection').Connection
const pull = require('pull-stream')
const lp = require('pull-length-prefixed')
const series = require('async/series')
const Buffer = require('safe-buffer').Buffer
const PeerBook = require('peer-book')
const Swarm = require('libp2p-swarm')
const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-multiplex')

const KadDHT = require('../src')
const Message = require('../src/message')

const makePeers = require('./utils').makePeers

describe('Network', () => {
  let dht
  let peerInfos

  before(function (done) {
    this.timeout(10 * 1000)
    makePeers(3, (err, result) => {
      if (err) {
        return done(err)
      }

      peerInfos = result
      const swarm = new Swarm(peerInfos[0], new PeerBook())
      swarm.transport.add('tcp', new TCP())
      swarm.connection.addStreamMuxer(Multiplex)
      swarm.connection.reuse()
      dht = new KadDHT(swarm)

      series([
        (cb) => swarm.listen(cb),
        (cb) => dht.start(cb)
      ], done)
    })
  })

  after(function (done) {
    this.timeout(10 * 1000)
    series([
      (cb) => dht.stop(cb),
      (cb) => dht.swarm.close(cb)
    ], done)
  })

  describe('sendRequest', () => {
    it('send and response', (done) => {
      let i = 0
      const finish = () => {
        if (i++ === 1) {
          done()
        }
      }

      const msg = new Message(Message.TYPES.PING, Buffer.from('hello'), 0)

      // mock it
      dht.swarm.dial = (peer, protocol, callback) => {
        expect(protocol).to.eql('/ipfs/kad/1.0.0')
        const msg = new Message(Message.TYPES.FIND_NODE, Buffer.from('world'), 0)

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

      dht.network.sendRequest(peerInfos[0].id, msg, (err, response) => {
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

      const msg = new Message(Message.TYPES.PING, Buffer.from('hello'), 0)

      // mock it
      dht.swarm.dial = (peer, protocol, callback) => {
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

      dht.network.readMessageTimeout = 100

      dht.network.sendRequest(peerInfos[0].id, msg, (err, response) => {
        expect(err).to.exist()
        expect(err.message).to.match(/timed out/)

        finish()
      })
    })
  })
})
