/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const pull = require('pull-stream')
const lp = require('pull-length-prefixed')
const Connection = require('interface-connection').Connection
const PeerBook = require('peer-book')
const Switch = require('libp2p-switch')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')

const Message = require('../../src/message')
const KadDHT = require('../../src')
const rpc = require('../../src/rpc')

const createPeerInfo = require('../utils/create-peer-info')

describe('rpc', () => {
  let peerInfos

  before((done) => {
    createPeerInfo(2, (err, peers) => {
      if (err) {
        return done(err)
      }

      peerInfos = peers
      done()
    })
  })

  describe('protocolHandler', () => {
    it('calls back with the response', (done) => {
      const sw = new Switch(peerInfos[0], new PeerBook())
      sw.transport.add('tcp', new TCP())
      sw.connection.addStreamMuxer(Mplex)
      sw.connection.reuse()
      const dht = new KadDHT(sw, { kBucketSize: 5 })

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
