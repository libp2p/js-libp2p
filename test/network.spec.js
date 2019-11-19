/* eslint-env mocha */
'use strict'

const chai = require('chai')
chai.use(require('dirty-chai'))
const expect = chai.expect
const Connection = require('interface-connection').Connection
const pull = require('pull-stream')
const lp = require('pull-length-prefixed')
const pDefer = require('p-defer')
const PeerBook = require('peer-book')
const Switch = require('libp2p-switch')
const TCP = require('libp2p-tcp')
const Mplex = require('libp2p-mplex')

const KadDHT = require('../src')
const Message = require('../src/message')

const createPeerInfo = require('./utils/create-peer-info')

describe('Network', () => {
  let dht
  let peerInfos

  before(async function () {
    this.timeout(10 * 1000)
    peerInfos = await createPeerInfo(3)

    const sw = new Switch(peerInfos[0], new PeerBook())
    sw.transport.add('tcp', new TCP())
    sw.connection.addStreamMuxer(Mplex)
    sw.connection.reuse()
    dht = new KadDHT({ sw })

    await sw.start()
    await dht.start()
  })

  after(() => Promise.all([
    dht.stop(),
    dht.switch.stop()
  ]))

  describe('sendRequest', () => {
    it('send and response', async () => {
      const defer = pDefer()
      let i = 0
      const finish = () => {
        if (i++ === 1) {
          defer.resolve()
        }
      }

      const msg = new Message(Message.TYPES.PING, Buffer.from('hello'), 0)

      // mock it
      dht.switch.dial = (peer, protocol, callback) => {
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

      const response = await dht.network.sendRequest(peerInfos[0].id, msg)

      expect(response.type).to.eql(Message.TYPES.FIND_NODE)
      finish()

      return defer.promise
    })

    it('timeout on no message', async () => {
      const defer = pDefer()
      let i = 0
      const finish = () => {
        if (i++ === 1) {
          defer.resolve()
        }
      }

      const msg = new Message(Message.TYPES.PING, Buffer.from('hello'), 0)

      // mock it
      dht.switch.dial = (peer, protocol, callback) => {
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

      try {
        await dht.network.sendRequest(peerInfos[0].id, msg)
      } catch (err) {
        expect(err).to.exist()
        expect(err.message).to.match(/timed out/)

        finish()
      }

      return defer.promise
    })
  })
})
