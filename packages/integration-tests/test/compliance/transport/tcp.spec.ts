import tests from '@libp2p/interface-compliance-tests/transport'
import { noise } from '@libp2p/noise'
import { tcp } from '@libp2p/tcp'
import { yamux } from '@libp2p/yamux'
import { TCP } from '@multiformats/multiaddr-matcher'
import { isBrowser, isWebWorker } from 'wherearewe'

describe('tcp transport interface compliance IPv4', () => {
  if (isBrowser || isWebWorker) {
    return
  }

  tests({
    async setup () {
      const dialer = {
        transports: [
          tcp()
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
              '/ip4/127.0.0.1/tcp/0',
              '/ip4/127.0.0.1/tcp/0'
            ]
          },
          ...dialer
        },
        dialMultiaddrMatcher: TCP,
        listenMultiaddrMatcher: TCP
      }
    },
    async teardown () {}
  })
})

describe('tcp transport interface compliance IPv6', () => {
  if (isBrowser || isWebWorker) {
    return
  }

  tests({
    async setup () {
      const dialer = {
        transports: [
          tcp()
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
              '/ip6/::/tcp/0',
              '/ip6/::/tcp/0'
            ]
          },
          ...dialer
        },
        dialMultiaddrMatcher: TCP,
        listenMultiaddrMatcher: TCP
      }
    },
    async teardown () {}
  })
})
