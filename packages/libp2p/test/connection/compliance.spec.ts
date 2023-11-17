import tests from '@libp2p/interface-compliance-tests/connection'
import peers from '@libp2p/interface-compliance-tests/peers'
import { logger, peerLogger } from '@libp2p/logger'
import * as PeerIdFactory from '@libp2p/peer-id-factory'
import { multiaddr } from '@multiformats/multiaddr'
import { createConnection } from '../../src/connection/index.js'
import { pair } from './fixtures/pair.js'
import type { Stream } from '@libp2p/interface/connection'

describe('connection compliance', () => {
  tests({
    /**
     * Test setup. `properties` allows the compliance test to override
     * certain values for testing.
     */
    async setup (properties) {
      const localPeer = await PeerIdFactory.createEd25519PeerId()
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
        status: 'open',
        logger: peerLogger(localPeer),
        newStream: async (protocols) => {
          const id = `${streamId++}`
          const stream: Stream = {
            ...pair(),
            close: async () => {
              void stream.sink(async function * () {}())
              openStreams = openStreams.filter(s => s.id !== id)
            },
            closeRead: async () => {},
            closeWrite: async () => {
              void stream.sink(async function * () {}())
            },
            id,
            abort: () => {},
            direction: 'outbound',
            protocol: protocols[0],
            timeline: {
              open: 0
            },
            metadata: {},
            status: 'open',
            writeStatus: 'ready',
            readStatus: 'ready',
            log: logger('test')
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
