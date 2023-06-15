/* eslint-env mocha */
/* eslint max-nested-callbacks: ['error', 6] */

import { yamux } from '@chainsafe/libp2p-yamux'
import { mplex } from '@libp2p/mplex'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { Circuit } from '@multiformats/mafmt'
import { expect } from 'aegir/chai'
import { pEvent } from 'p-event'
import { circuitRelayTransport } from '../../src/circuit-relay/index.js'
import { identifyService } from '../../src/identify/index.js'
import { createLibp2p } from '../../src/index.js'
import { plaintext } from '../../src/insecure/index.js'
import { hasRelay } from './utils.js'
import type { Connection } from '@libp2p/interface-connection'
import type { Libp2p } from '@libp2p/interface-libp2p'
import type { PeerId } from '@libp2p/interface-peer-id'

describe('circuit-relay', () => {
  let local: Libp2p
  let remote: Libp2p

  beforeEach(async () => {
    [local, remote] = await Promise.all([
      createLibp2p({
        transports: [
          webSockets({
            filter: filters.all
          }),
          circuitRelayTransport()
        ],
        streamMuxers: [
          yamux(),
          mplex()
        ],
        connectionEncryption: [
          plaintext()
        ],
        connectionGater: {
          denyDialMultiaddr: () => false
        },
        services: {
          identify: identifyService()
        }
      }),
      createLibp2p({
        addresses: {
          listen: [
            `${process.env.RELAY_MULTIADDR}/p2p-circuit`
          ]
        },
        transports: [
          webSockets({
            filter: filters.all
          }),
          circuitRelayTransport()
        ],
        streamMuxers: [
          yamux(),
          mplex()
        ],
        connectionEncryption: [
          plaintext()
        ],
        connectionGater: {
          denyDialMultiaddr: () => false
        },
        services: {
          identify: identifyService()
        }
      })
    ])
  })

  afterEach(async () => {
    // Stop each node
    return Promise.all([local, remote].map(async libp2p => {
      if (libp2p != null) {
        await libp2p.stop()
      }
    }))
  })

  it('should emit a peer:disconnect event when the remote peer disconnects', async () => {
    await hasRelay(remote)

    // dial remote through relay
    await local.dial(remote.getMultiaddrs().filter(ma => Circuit.matches(ma)))

    const eventPromise = pEvent<'peer:disconnect', CustomEvent<PeerId>>(local, 'peer:disconnect')

    // shut down remote
    await remote.stop()

    // wait for event
    const event = await eventPromise

    // should have received peer:disconnect from remote peer
    expect(event.detail.toString()).to.equal(remote.peerId.toString())
  })

  it('should emit a connection:close event when the remote peer disconnects', async () => {
    await hasRelay(remote)

    // dial remote through relay
    await local.dial(remote.getMultiaddrs().filter(ma => Circuit.matches(ma)))

    const eventPromise = pEvent<'connection:close', CustomEvent<Connection>>(local, 'connection:close')

    // shut down remote
    await remote.stop()

    // wait for event
    const event = await eventPromise

    // connection should have been to remote
    expect(event.detail.remotePeer.toString()).to.equal(remote.peerId.toString())
  })
})
