/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { pipe } from 'it-pipe'
import * as lp from 'it-length-prefixed'
import pDefer from 'p-defer'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import all from 'it-all'
import { Message, MESSAGE_TYPE } from '../src/message/index.js'
import { TestDHT } from './utils/test-dht.js'
import { mockStream } from '@libp2p/interface-mocks'
import type { DualKadDHT } from '../src/dual-kad-dht.js'
import type { Connection } from '@libp2p/interface-connection'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Sink } from 'it-stream-types'
import { Uint8ArrayList } from 'uint8arraylist'
import map from 'it-map'
import type { Multiaddr } from '@multiformats/multiaddr'

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

      const events = await all(dht.lan.network.sendRequest(dht.components.peerId, msg))
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
      dht.components.connectionManager.openConnection = async (peer: PeerId | Multiaddr) => {
        // @ts-expect-error incomplete implementation
        const connection: Connection = {
          newStream: async (protocols: string | string[]) => {
            const protocol = Array.isArray(protocols) ? protocols[0] : protocols
            const msg = new Message(MESSAGE_TYPE.FIND_NODE, uint8ArrayFromString('world'), 0)

            const data = await pipe(
              [msg.serialize()],
              lp.encode(),
              source => map(source, arr => new Uint8ArrayList(arr)),
              async (source) => await all(source)
            )

            const source = (function * () {
              const array = data

              yield * array
            })()

            const sink: Sink<Uint8ArrayList | Uint8Array> = async source => {
              const res = await pipe(
                source,
                lp.decode(),
                async (source) => await all(source)
              )
              expect(Message.deserialize(res[0]).type).to.eql(MESSAGE_TYPE.PING)
              finish()
            }

            const stream = mockStream({ source, sink })

            return {
              ...stream,
              stat: {
                ...stream.stat,
                protocol
              }
            }
          }
        }

        return connection
      }

      const events = await all(dht.lan.network.sendRequest(dht.components.peerId, msg))
      const response = events
        .filter(event => event.name === 'PEER_RESPONSE')
        .pop()

      expect(response).to.have.property('messageType', MESSAGE_TYPE.FIND_NODE)
      finish()

      return await defer.promise
    })
  })
})
