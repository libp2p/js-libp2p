/* eslint-env mocha */

import tests from '@libp2p/interface-compliance-tests/transport'
import { multiaddr } from '@multiformats/multiaddr'
import {  mockUpgrader } from '@libp2p/interface-compliance-tests/mocks'
import {  mockRegistrar } from '@libp2p/interface-compliance-tests/mocks'
import {  WebRTCTransport } from '../src/private-to-private/transport.js'
import { stubInterface } from 'sinon-ts'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import { createRelayNode } from './basics.spec.js'
import { WebRTC } from '@multiformats/multiaddr-matcher'
import type { Connection } from '@libp2p/interface/connection'


describe('interface-transport compliance', () => {
  tests({
    async setup() {

      const relayNode = await createRelayNode()

      const node = await createRelayNode()

      await node.start()

      const remoteAddr = relayNode.getMultiaddrs()
        .filter(ma => WebRTC.matches(ma)).pop()

      if (remoteAddr == null) {
        throw new Error('Remote peer could not listen on relay')
      }

      const connection = await node.dial(remoteAddr)

      const peerA: any = {
        peerId: node.peerId,
        registrar: mockRegistrar(),
        upgrader: mockUpgrader(),
      }

      peerA.connectionManager = stubInterface<ConnectionManager>()

      peerA.connectionManager.getConnections.returns([connection])

      const wrtc = new WebRTCTransport(peerA)

      await wrtc.start()

      const addrs = [
        multiaddr(`/ip4/1.2.3.4/udp/1234/webrtc-direct/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ/p2p/${node.peerId.toString()}`)
      ]

      const listeningAddrs = [
        remoteAddr,
      ]

      // Used by the dial tests to simulate a delayed connect
      const connector = {
        delay() { },
        restore() { }
      }

      return { transport: wrtc, addrs, connector, listeningAddrs }
    },
    async teardown() { }
  })
})