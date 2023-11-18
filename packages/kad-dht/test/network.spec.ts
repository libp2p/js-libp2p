/* eslint-env mocha */

import { mockStream } from '@libp2p/interface-compliance-tests/mocks'
import { expect } from 'aegir/chai'
import all from 'it-all'
import * as lp from 'it-length-prefixed'
import pDefer from 'p-defer'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message, MESSAGE_TYPE } from '../src/message/index.js'
import { TestDHT } from './utils/test-dht.js'
import type { DefaultDualKadDHT } from '../src/dual-kad-dht.js'
import type { Connection } from '@libp2p/interface/connection'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Sink, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

describe('Network', () => {
  let dht: DefaultDualKadDHT
  let tdht: TestDHT

  before(async function () {
    this.timeout(10 * 1000)
    tdht = new TestDHT()
    dht = await tdht.spawn({
      clientMode: false
    })
  })

  after(async () => { await tdht.teardown() })

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
      const finish = (): void => {
        if (i++ === 1) {
          defer.resolve()
        }
      }

      const msg = new Message(MESSAGE_TYPE.PING, uint8ArrayFromString('hello'), 0)

      // mock it
      dht.components.connectionManager.openConnection = async (peer: PeerId | Multiaddr | Multiaddr[]) => {
        // @ts-expect-error incomplete implementation
        const connection: Connection = {
          newStream: async (protocols: string | string[]) => {
            const protocol = Array.isArray(protocols) ? protocols[0] : protocols
            const msg = new Message(MESSAGE_TYPE.FIND_NODE, uint8ArrayFromString('world'), 0)

            const source = (async function * () {
              yield lp.encode.single(msg.serialize())
            })()

            const sink: Sink<Source<Uint8ArrayList | Uint8Array>, Promise<void>> = async source => {
              for await (const buf of lp.decode(source)) {
                expect(Message.deserialize(buf).type).to.eql(MESSAGE_TYPE.PING)
                finish()
              }
            }

            const stream = mockStream({ source, sink })

            return {
              ...stream,
              protocol
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

      return defer.promise
    })
  })
})
