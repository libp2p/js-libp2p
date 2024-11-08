import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import tests from '@libp2p/interface-compliance-tests/transport'
import { memory } from '@libp2p/memory'
import { Memory } from '@multiformats/multiaddr-matcher'

describe('memory transport interface compliance tests', () => {
  tests({
    async setup () {
      const dialer = {
        transports: [
          memory()
        ],
        connectionEncrypters: [
          noise()
        ],
        streamMuxers: [
          yamux()
        ]
      }

      return {
        dialer,
        listener: {
          addresses: {
            listen: [
              '/memory/addr-1',
              '/memory/addr-2'
            ]
          },
          ...dialer
        },
        dialMultiaddrMatcher: Memory,
        listenMultiaddrMatcher: Memory
      }
    },
    async teardown () {}
  })
})
