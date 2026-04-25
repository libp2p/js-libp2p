import tests from '@libp2p/interface-compliance-tests/transport'
import { quic } from '@libp2p/quic'
import { QUIC_V1 } from '@multiformats/multiaddr-matcher'
import { isBrowser, isElectron, isWebWorker } from 'wherearewe'

describe('quic transport interface compliance IPv4', () => {
  if (isBrowser || isWebWorker || isElectron) {
    return
  }

  tests({
    async setup () {
      const dialer = {
        transports: [
          quic()
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
              '/ip4/127.0.0.1/udp/0/quic-v1',
              '/ip4/127.0.0.1/udp/0/quic-v1'
            ]
          },
          ...dialer
        },
        dialMultiaddrMatcher: QUIC_V1,
        listenMultiaddrMatcher: QUIC_V1
      }
    },
    async teardown () {}
  })
})

describe('quic transport interface compliance IPv6', () => {
  if (isBrowser || isWebWorker || isElectron) {
    return
  }

  tests({
    async setup () {
      const dialer = {
        transports: [
          quic()
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
              '/ip6/::/udp/0/quic-v1',
              '/ip6/::/udp/0/quic-v1'
            ]
          },
          ...dialer
        },
        dialMultiaddrMatcher: QUIC_V1,
        listenMultiaddrMatcher: QUIC_V1
      }
    },
    async teardown () {}
  })
})
