// test/common/node-config.js
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { FaultTolerance } from '@libp2p/interface'
import { tcp } from '@libp2p/tcp'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'

/**
 * @typedef {object} NodeConfigOptions
 * @property {boolean} [isServer] - Whether this is a server node configuration
 */

/**
 * Get the libp2p node configuration based on environment and role.
 *
 * @param {NodeConfigOptions} options - Configuration options
 */
export function getNodeConfig (options = { isServer: false }) {
  const isBrowser = typeof process === 'undefined' || process.versions == null || process.versions.node == null
  const { isServer } = options

  const baseConfig = {
    services: {
      identify: identify()
    },
    streamMuxers: [yamux()],
    connectionEncrypters: [noise()],
    transportManager: {
      faultTolerance: FaultTolerance.NO_FATAL
    }
  }

  if (isBrowser) {
    // In browser environments, set up with WebRTC
    const addresses = isServer ? ['/webrtc-direct/ip4/127.0.0.1/tcp/0'] : []

    return {
      ...baseConfig,
      addresses: {
        listen: addresses
      },
      transports: [
        webRTC(),
        webRTCDirect(),
        circuitRelayTransport()
      ]
    }
  }

  // Node.js configuration
  const addresses = [
    '/ip4/127.0.0.1/tcp/0',
    '/ip4/127.0.0.1/tcp/0/ws'
  ]

  return {
    ...baseConfig,
    addresses: {
      listen: addresses
    },
    transports: [
      tcp(),
      webSockets({
        filter: filters.all
      }),
      circuitRelayTransport()
    ]
  }
}
