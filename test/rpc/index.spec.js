/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const pull = require('pull-stream')
const lp = require('pull-length-prefixed')
const Connection = require('interface-connection').Connection
const PeerBook = require('peer-book')
const Swarm = require('libp2p-swarm')
const TCP = require('libp2p-tcp')
const Multiplex = require('libp2p-multiplex')

const Message = require('../../src/message')
const KadDHT = require('../../src')
const rpc = require('../../src/rpc')

const makePeers = require('../utils').makePeers

describe('rpc', () => {
  let peerInfos

  before((done) => {
    makePeers(2, (err, peers) => {
      if (err) {
        return done(err)
      }

      peerInfos = peers
      done()
    })
  })

  describe('protocolHandler', () => {
    it('calls back with the response', (done) => {
      const swarm = new Swarm(peerInfos[0], new PeerBook())
      swarm.transport.add('tcp', new TCP())
      swarm.connection.addStreamMuxer(Multiplex)
      swarm.connection.reuse()
      const dht = new KadDHT(swarm, { kBucketSize: 5 })

      dht.peerBook.put(peerInfos[1])

      const msg = new Message(Message.TYPES.GET_VALUE, Buffer.from('hello'), 5)

      const conn = makeConnection(msg, peerInfos[1], (err, res) => {
        expect(err).to.not.exist()
        expect(res).to.have.length(1)
        const msg = Message.deserialize(res[0])
        expect(msg).to.have.property('key').eql(Buffer.from('hello'))
        expect(msg).to.have.property('closerPeers').eql([])

        done()
      })

      rpc(dht)('protocol', conn)
    })
  })
})

function makeConnection (msg, info, callback) {
  const rawConn = {
    source: pull(
      pull.values([msg.serialize()]),
      lp.encode()
    ),
    sink: pull(
      lp.decode(),
      pull.collect(callback)
    )
  }
  const conn = new Connection(rawConn)
  conn.setPeerInfo(info)
  return conn
}
