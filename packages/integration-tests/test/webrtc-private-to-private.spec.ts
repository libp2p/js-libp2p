/* eslint-env mocha */
/* eslint max-nested-callbacks: ['error', 6] */

import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { plaintext } from '@libp2p/plaintext'
import { webRTC } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import type { Libp2p } from '@libp2p/interface'

describe('webrtc private-to-private', () => {
  let local: Libp2p

  afterEach(async () => {
    await local?.stop()
  })

  it('should listen on two webrtc addresses', async () => {
    local = await createLibp2p({
      addresses: {
        listen: [
          `${process.env.RELAY_MULTIADDR}/p2p-circuit`,
          // this is a misconfiguration, it's only necessary to specify this
          // once as the WebRTC transport is really just a protocol handler so
          // in effect it will always bind to all addresses
          '/webrtc',
          '/webrtc'
        ]
      },
      transports: [
        circuitRelayTransport(),
        webSockets(),
        webRTC()
      ],
      streamMuxers: [
        yamux()
      ],
      connectionEncrypters: [
        plaintext()
      ],
      connectionGater: {
        denyDialMultiaddr: () => false
      },
      services: {
        identify: identify()
      }
    })

    expect(local.getMultiaddrs().filter(WebRTC.exactMatch))
      .to.have.property('length').that.is.greaterThan(1)
  })
})
