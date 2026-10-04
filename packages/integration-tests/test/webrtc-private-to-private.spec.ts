/* eslint-env mocha */
/* eslint max-nested-callbacks: ['error', 6] */

import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { stop } from '@libp2p/interface'
import { plaintext } from '@libp2p/plaintext'
import { webRTC, webRTCDirect } from '@libp2p/webrtc'
import { webSockets } from '@libp2p/websockets'
import { yamux } from '@libp2p/yamux'
import { Circuit, WebRTC } from '@multiformats/multiaddr-matcher'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import { isWebWorker } from 'wherearewe'
import type { Libp2p } from '@libp2p/interface'

describe('webrtc private-to-private', () => {
  if (isWebWorker) {
    it.skip('tests are skipped because WebWorkers cannot use WebRTC', () => {

    })
    return
  }

  let local: Libp2p
  let remote: Libp2p

  afterEach(async () => {
    await stop(local, remote)
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

  it('should dial WebRTC with existing relayed connection', async () => {
    remote = await createLibp2p({
      addresses: {
        listen: [
          `${process.env.LIMITED_RELAY_MULTIADDR}/p2p-circuit`,
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

    local = await createLibp2p({
      transports: [
        circuitRelayTransport(),
        webSockets(),
        webRTC(),
        webRTCDirect()
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

    const relayedAddress = remote.getMultiaddrs().filter(ma => Circuit.exactMatch(ma)).pop()
    const webRTCAddress = remote.getMultiaddrs().filter(ma => WebRTC.exactMatch(ma)).pop()

    if (relayedAddress == null || webRTCAddress == null) {
      throw new Error('Did not have relay and/or WebRTC address')
    }

    const limitedConn = await local.dial(relayedAddress)
    expect(limitedConn).to.have.property('limits').that.is.ok()
    expect(WebRTC.exactMatch(limitedConn.remoteAddr)).to.be.false()

    const webRTCConn = await local.dial(webRTCAddress)
    expect(webRTCConn).to.have.property('limits').that.is.not.ok()
    expect(WebRTC.exactMatch(webRTCConn.remoteAddr)).to.be.true()
  })
})
