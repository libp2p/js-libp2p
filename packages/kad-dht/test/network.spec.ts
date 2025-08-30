/* eslint-env mocha */

import { streamPair } from '@libp2p/utils'
import { expect } from 'aegir/chai'
import all from 'it-all'
import * as lp from 'it-length-prefixed'
import pDefer from 'p-defer'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message, MessageType } from '../src/message/dht.js'
import { TestDHT } from './utils/test-dht.js'
import type { KadDHTPeer } from './utils/test-dht.js'
import type { PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

describe('Network', () => {
  let dht: KadDHTPeer
  let testDHT: TestDHT

  before(async function () {
    this.timeout(10 * 1000)
    testDHT = new TestDHT()
    dht = await testDHT.spawn({
      clientMode: false
    })
  })

  after(async () => { await testDHT.teardown() })

  describe('sendRequest', () => {
    it('send and response echo', async () => {
      const msg: Partial<Message> = {
        type: MessageType.PING,
        key: uint8ArrayFromString('hello')
      }

      const events = await all(dht.dht.network.sendRequest(dht.components.peerId, msg, {
        path: {
          index: -1,
          queued: 0,
          running: 0,
          total: 0
        }
      }))
      const response = events
        .filter(event => event.name === 'PEER_RESPONSE')
        .pop()
      expect(response).to.have.property('messageType', MessageType.PING)
    })

    it('send and response different messages', async () => {
      const defer = pDefer()
      let i = 0
      const finish = (): void => {
        if (i++ === 1) {
          defer.resolve()
        }
      }

      const msg: Partial<Message> = {
        type: MessageType.PING,
        key: uint8ArrayFromString('hello')
      }

      // mock it
      dht.dht.components.connectionManager.openStream = async (peer: PeerId | Multiaddr | Multiaddr[]) => {
        const [outboundStream, inboundStream] = await streamPair()

        inboundStream.addEventListener('message', (evt) => {
          for (const buf of lp.decode([evt.data])) {
            expect(Message.decode(buf).type).to.eql(MessageType.PING)
            finish()
          }
        })

        queueMicrotask(() => {
          const msg: Partial<Message> = {
            type: MessageType.FIND_NODE,
            key: uint8ArrayFromString('world')
          }

          inboundStream.send(lp.encode.single(Message.encode(msg)))
        })

        return outboundStream
      }

      const events = await all(dht.dht.network.sendRequest(dht.components.peerId, msg, {
        path: {
          index: -1,
          queued: 0,
          running: 0,
          total: 0
        }
      }))
      const response = events
        .filter(event => event.name === 'PEER_RESPONSE')
        .pop()

      expect(response).to.have.property('messageType', MessageType.FIND_NODE)
      finish()

      return defer.promise
    })
  })
})
