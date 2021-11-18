/* eslint-env mocha */
'use strict'

const { expect } = require('aegir/utils/chai')
const pair = require('it-pair')
const pipe = require('it-pipe')
const lp = require('it-length-prefixed')
const pDefer = require('p-defer')
const { fromString: uint8ArrayFromString } = require('uint8arrays/from-string')
const all = require('it-all')

const { Message } = require('../src/message')

const TestDHT = require('./utils/test-dht')

describe('Network', () => {
  let dht
  let tdht

  before(async function () {
    this.timeout(10 * 1000)
    tdht = new TestDHT()
    ;[dht] = await tdht.spawn(1, {
      clientMode: false
    })
  })

  after(() => tdht.teardown())

  describe('sendRequest', () => {
    it('send and response echo', async () => {
      const msg = new Message(Message.TYPES.PING, uint8ArrayFromString('hello'), 0)

      // mock dial
      dht._libp2p.dialProtocol = () => {
        return { stream: pair() } // {source, sink} streams that are internally connected
      }

      const events = await all(dht._lan._network.sendRequest(dht._libp2p.peerId, msg))
      const response = events
        .filter(event => event.name === 'PEER_RESPONSE')
        .pop()
      expect(response.messageType).to.eql(Message.TYPES.PING)
    })

    it('send and response different messages', async () => {
      const defer = pDefer()
      let i = 0
      const finish = () => {
        if (i++ === 1) {
          defer.resolve()
        }
      }

      const msg = new Message(Message.TYPES.PING, uint8ArrayFromString('hello'), 0)

      // mock it
      dht._libp2p.dialProtocol = async () => {
        const msg = new Message(Message.TYPES.FIND_NODE, uint8ArrayFromString('world'), 0)

        const data = []
        await pipe(
          [msg.serialize()],
          lp.encode(),
          async source => {
            for await (const chunk of source) {
              data.push(chunk.slice())
            }
          }
        )

        const source = (function * () {
          const array = data

          while (array.length) {
            yield array.shift()
          }
        })()

        const sink = async source => {
          const res = []
          await pipe(
            source,
            lp.decode(),
            async source => {
              for await (const chunk of source) {
                res.push(chunk.slice())
              }
            }
          )
          expect(Message.deserialize(res[0]).type).to.eql(Message.TYPES.PING)
          finish()
        }

        return { stream: { source, sink } }
      }

      const events = await all(dht._lan._network.sendRequest(dht._libp2p.peerId, msg))
      const response = events
        .filter(event => event.name === 'PEER_RESPONSE')
        .pop()

      expect(response.messageType).to.eql(Message.TYPES.FIND_NODE)
      finish()

      return defer.promise
    })
  })
})
