import tests from '@libp2p/interface-compliance-tests/transport'
import { memory } from '@libp2p/memory'
import { noise } from '@libp2p/noise'
import { yamux } from '@libp2p/yamux'
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
        ],
        connectionMonitor: {
          enabled: false
        }
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
