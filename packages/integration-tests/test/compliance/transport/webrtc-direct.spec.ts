import tests from '@libp2p/interface-compliance-tests/transport'
import { webRTCDirect } from '@libp2p/webrtc'
import { multiaddr } from '@multiformats/multiaddr'
import { WebRTCDirect } from '@multiformats/multiaddr-matcher'
import { isNode, isElectronMain, isWebWorker } from 'wherearewe'

describe('WebRTC-Direct interface-transport compliance', () => {
  if (isWebWorker) {
    return
  }

  tests({
    async setup () {
      const canListen = isNode || isElectronMain

      const dialer = {
        transports: [
          webRTCDirect()
        ],
        connectionMonitor: {
          enabled: false
        }
      }

      return {
        dialer,
        listener: canListen
          ? {
              addresses: {
                listen: [
                  '/ip4/127.0.0.1/udp/0/webrtc-direct',
                  '/ip4/127.0.0.1/udp/0/webrtc-direct'
                ]
              },
              ...dialer
            }
          : undefined,
        dialAddrs: canListen
          ? undefined
          : [
              multiaddr(process.env.RELAY_WEBRTC_DIRECT_MULTIADDR_0 ?? ''),
              multiaddr(process.env.RELAY_WEBRTC_DIRECT_MULTIADDR_1 ?? '')
            ],
        dialMultiaddrMatcher: WebRTCDirect,
        listenMultiaddrMatcher: WebRTCDirect
      }
    },
    async teardown () {}
  })
})
