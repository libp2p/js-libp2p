/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { pair } from 'it-pair'
import { pipe } from 'it-pipe'
import * as lp from 'it-length-prefixed'
import pDefer from 'p-defer'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import all from 'it-all'
import { Message, MESSAGE_TYPE } from '../src/message/index.js'
import { TestDHT } from './utils/test-dht.js'
import { mockStream } from '@libp2p/interface-compliance-tests/mocks'
import type { DualKadDHT } from '../src/dual-kad-dht.js'
import type { Sink } from 'it-stream-types'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { PeerId } from '@libp2p/interfaces/peer-id'

describe('Network', () => {
  let dht: DualKadDHT
  let tdht: TestDHT

  before(async function () {
    this.timeout(10 * 1000)
    tdht = new TestDHT()
    dht = await tdht.spawn({
      clientMode: false
    })
  })

  after(async () => await tdht.teardown())

  describe('sendRequest', () => {
    it('send and response echo', async () => {
      const msg = new Message(MESSAGE_TYPE.PING, uint8ArrayFromString('hello'), 0)

      // mock dial
      dht.components.getDialer().dialProtocol = async (peer: PeerId | Multiaddr, protocols: string | string[]) => {
        const protocol = Array.isArray(protocols) ? protocols[0] : protocols

        // {source, sink} streams that are internally connected
        return {
          stream: mockStream(pair()),
          protocol
        }
      }

      const events = await all(dht.lan.network.sendRequest(dht.components.getPeerId(), msg))
      const response = events
        .filter(event => event.name === 'PEER_RESPONSE')
        .pop()
      expect(response).to.have.property('messageType', MESSAGE_TYPE.PING)
    })

    it('send and response different messages', async () => {
      const defer = pDefer()
      let i = 0
      const finish = () => {
        if (i++ === 1) {
          defer.resolve()
        }
      }

      const msg = new Message(MESSAGE_TYPE.PING, uint8ArrayFromString('hello'), 0)

      // mock it
      dht.components.getDialer().dialProtocol = async (peer: PeerId | Multiaddr, protocols: string | string[]) => {
        const protocol = Array.isArray(protocols) ? protocols[0] : protocols
        const msg = new Message(MESSAGE_TYPE.FIND_NODE, uint8ArrayFromString('world'), 0)

        const data = await pipe(
          [msg.serialize()],
          lp.encode(),
          async (source) => await all(source)
        )

        const source = (function * () {
          const array = data

          yield * array
        })()

        const sink: Sink<Uint8Array> = async source => {
          const res = await pipe(
            source,
            lp.decode(),
            async (source) => await all(source)
          )
          expect(Message.deserialize(res[0]).type).to.eql(MESSAGE_TYPE.PING)
          finish()
        }

        return {
          protocol,
          stream: mockStream({ source, sink })
        }
      }

      const events = await all(dht.lan.network.sendRequest(dht.components.getPeerId(), msg))
      const response = events
        .filter(event => event.name === 'PEER_RESPONSE')
        .pop()

      expect(response).to.have.property('messageType', MESSAGE_TYPE.FIND_NODE)
      finish()

      return await defer.promise
    })
  })
})
