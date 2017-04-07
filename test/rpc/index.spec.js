/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const pull = require('pull-stream')
const lp = require('pull-length-prefixed')
const Connection = require('interface-connection').Connection
const Libp2p = require('libp2p-ipfs-nodejs')

const Message = require('../../src/message')
const Dht = require('../../src')
const rpc = require('../../src/rpc')

const makePeers = require('../util').makePeers

describe('rpc', () => {
  let infos

  before((done) => {
    makePeers(2, (err, peers) => {
      if (err) {
        return done(err)
      }

      infos = peers
      done()
    })
  })

  describe('protocolHandler', () => {
    it('calls back with the response', (done) => {
      const libp2p = new Libp2p(infos[0])
      const dht = new Dht(libp2p)
      dht.peerBook.put(infos[1])

      const msg = new Message(Message.TYPES.GET_VALUE, new Buffer('hello'), 5)

      const conn = makeConnection(msg, infos[1], (err, res) => {
        expect(err).to.not.exist()
        expect(res).to.have.length(1)
        const msg = Message.deserialize(res[0])
        expect(msg).to.have.property('key').eql(new Buffer('hello'))
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
