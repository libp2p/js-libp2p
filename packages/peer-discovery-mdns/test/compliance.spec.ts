/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import tests from '@libp2p/interface-compliance-tests/peer-discovery'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { stubInterface } from 'sinon-ts'
import { MulticastDNS } from '../src/mdns.js'
import type { AddressManager } from '@libp2p/interface-internal'

let discovery: MulticastDNS

describe('compliance tests', () => {
  let intervalId: ReturnType<typeof setInterval>

  tests({
    async setup () {
      const peerId1 = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
      const peerId2 = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

      const addressManager = stubInterface<AddressManager>()
      addressManager.getAddresses.returns([
        multiaddr(`/ip4/127.0.0.1/tcp/13921/p2p/${peerId1.toString()}`)
      ])

      discovery = new MulticastDNS({
        addressManager,
        logger: defaultLogger()
      }, {
        broadcast: false,
        port: 50001
      })

      // Trigger discovery
      const maStr = '/ip4/127.0.0.1/tcp/15555/ws/p2p-webrtc-star'

      intervalId = setInterval(() => {
        if (!discovery.isStarted()) {
          return
        }

        discovery.dispatchEvent(new CustomEvent('peer', {
          detail: {
            id: peerId2,
            multiaddrs: [multiaddr(maStr)],
            protocols: []
          }
        }))
      }, 1000)

      return discovery
    },
    async teardown () {
      clearInterval(intervalId)
      await new Promise(resolve => setTimeout(resolve, 10))
    }
  })
})
