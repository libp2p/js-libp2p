/* eslint-env mocha */

import { mockStream } from '@libp2p/interface-compliance-tests/mocks'
import { expect } from 'aegir/chai'
import all from 'it-all'
import * as lp from 'it-length-prefixed'
import pDefer from 'p-defer'
import { stubInterface } from 'sinon-ts'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { Message, MessageType } from '../src/message/dht.js'
import { TestDHT } from './utils/test-dht.js'
import type { KadDHT } from '../src/kad-dht.js'
import type { Connection, PeerId } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { Sink, Source } from 'it-stream-types'
import type { Uint8ArrayList } from 'uint8arraylist'

describe('Network', () => {
  let dht: KadDHT
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
      const msg: Partial<Message> = {
        type: MessageType.PING,
        key: uint8ArrayFromString('hello')
      }

      const events = await all(dht.network.sendRequest(dht.components.peerId, msg))
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
      dht.components.connectionManager.openConnection = async (peer: PeerId | Multiaddr | Multiaddr[]) => {
        const connection: Connection = stubInterface<Connection>({
          newStream: async (protocols: string | string[]) => {
            const protocol = Array.isArray(protocols) ? protocols[0] : protocols
            const msg: Partial<Message> = {
              type: MessageType.FIND_NODE,
              key: uint8ArrayFromString('world')
            }

            const source = (async function * () {
              yield lp.encode.single(Message.encode(msg))
            })()

            const sink: Sink<Source<Uint8ArrayList | Uint8Array>, Promise<void>> = async source => {
              for await (const buf of lp.decode(source)) {
                expect(Message.decode(buf).type).to.eql(MessageType.PING)
                finish()
              }
            }

            const stream = mockStream({ source, sink })

            return {
              ...stream,
              protocol
            }
          },
          streams: []
        })

        return connection
      }

      const events = await all(dht.network.sendRequest(dht.components.peerId, msg))
      const response = events
        .filter(event => event.name === 'PEER_RESPONSE')
        .pop()

      expect(response).to.have.property('messageType', MessageType.FIND_NODE)
      finish()

      return defer.promise
    })
  })
})
