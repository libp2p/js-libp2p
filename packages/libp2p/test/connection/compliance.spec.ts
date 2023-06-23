import tests from '@libp2p/interface-compliance-tests/connection'
import peers from '@libp2p/interface-compliance-tests/peers'
import * as PeerIdFactory from '@libp2p/peer-id-factory'
import { pair } from '@libp2p/utils/stream'
import { multiaddr } from '@multiformats/multiaddr'
import { createConnection } from '../../src/connection/index.js'
import type { Stream } from '@libp2p/interface/connection'

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
        timeline: {
          open: Date.now() - 10,
          upgraded: Date.now()
        },
        direction: 'outbound',
        encryption: '/secio/1.0.0',
        multiplexer: '/mplex/6.7.0',
        status: 'OPEN',
        newStream: async (protocols) => {
          const id = `${streamId++}`
          const stream: Stream = {
            ...pair(),
            close: async () => {
              await Promise.all([
                stream.readable.cancel(),
                stream.writable.close()
              ])

              connection.removeStream(stream.id)
              openStreams = openStreams.filter(s => s.id !== id)
            },
            abort: () => {},
            id,
            direction: 'inbound',
            timeline: {
              open: Date.now()
            },
            metadata: {},
            protocol: protocols[0]
          }

          openStreams.push(stream)

          return stream
        },
        close: async () => {},
        abort: () => {},
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
