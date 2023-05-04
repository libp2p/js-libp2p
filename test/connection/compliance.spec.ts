import tests from '@libp2p/interface-connection-compliance-tests'
import { createConnection } from '../../src/connection/index.js'
import peers from '@libp2p/interface-compliance-tests/peers'
import * as PeerIdFactory from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { pair } from './fixtures/pair.js'
import type { Stream } from '@libp2p/interface-connection'

describe('connection compliance', () => {
  tests({
    /**
     * Test setup. `properties` allows the compliance test to override
     * certain values for testing.
     */
    async setup (properties) {
      const remoteAddr = multiaddr('/ip4/127.0.0.1/tcp/8081')
      const remotePeer = await PeerIdFactory.createFromJSON(peers[0])
      let openStreams: Stream[] = []
      let streamId = 0

      const connection = createConnection({
        remotePeer,
        remoteAddr,
        stat: {
          timeline: {
            open: Date.now() - 10,
            upgraded: Date.now()
          },
          direction: 'outbound',
          encryption: '/secio/1.0.0',
          multiplexer: '/mplex/6.7.0',
          status: 'OPEN'
        },
        newStream: async (protocols) => {
          const id = `${streamId++}`
          const stream: Stream = {
            ...pair(),
            close: () => {
              void stream.sink(async function * () {}())
              connection.removeStream(stream.id)
              openStreams = openStreams.filter(s => s.id !== id)
            },
            closeRead: () => {},
            closeWrite: () => {
              void stream.sink(async function * () {}())
            },
            id,
            abort: () => {},
            reset: () => {},
            stat: {
              direction: 'outbound',
              protocol: protocols[0],
              timeline: {
                open: 0
              }
            },
            metadata: {}
          }

          openStreams.push(stream)

          return stream
        },
        close: async () => {},
        getStreams: () => openStreams,
        ...properties
      })
      return connection
    },
    async teardown () {
      // cleanup resources created by setup()
    }
  })
})
