/* eslint-env mocha */
/* eslint max-nested-callbacks: ['error', 6] */

import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { mplex } from '@libp2p/mplex'
import { plaintext } from '@libp2p/plaintext'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { Circuit } from '@multiformats/mafmt'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import { pEvent } from 'p-event'
import { hasRelay } from './fixtures/utils.js'
import type { Libp2p, Connection, PeerId } from '@libp2p/interface'

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
          // @ts-expect-error TODO: yamux needs to be upgraded
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
          identify: identify()
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
          // @ts-expect-error TODO: yamux needs to be upgraded
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
          identify: identify()
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
