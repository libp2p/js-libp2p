/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter, type PeerId } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import delay from 'delay'
import pDefer from 'p-defer'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { finalPeerEvent } from '../src/query/events.js'
import { QuerySelf } from '../src/query-self.js'
import type { PeerRouting } from '../src/peer-routing/index.js'
import type { RoutingTable } from '../src/routing-table/index.js'
import type { DeferredPromise } from 'p-defer'

describe('Query Self', () => {
  let peerId: PeerId
  let querySelf: QuerySelf
  let peerRouting: StubbedInstance<PeerRouting>
  let routingTable: StubbedInstance<RoutingTable>
  let initialQuerySelfHasRun: DeferredPromise<void>

  beforeEach(async () => {
    peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    initialQuerySelfHasRun = pDefer()
    routingTable = stubInterface<RoutingTable>()
    peerRouting = stubInterface<PeerRouting>()

    const components = {
      peerId,
      logger: defaultLogger(),
      events: new TypedEventEmitter()
    }

    const init = {
      lan: false,
      peerRouting,
      routingTable,
      initialQuerySelfHasRun,
      logPrefix: '',
      operationMetrics: {}
    }

    querySelf = new QuerySelf(components, init)
  })

  afterEach(() => {
    if (querySelf != null) {
      querySelf.stop()
    }
  })

  it('should not run if not started', async () => {
    await querySelf.querySelf()

    expect(peerRouting.getClosestPeers).to.have.property('callCount', 0)
  })

  it('should join an existing query promise and not run twice', async () => {
    querySelf.start()

    const remotePeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

    // self query results
    peerRouting.getClosestPeers.withArgs(peerId.toMultihash().bytes).returns(async function * () {
      await delay(10)

      yield finalPeerEvent({
        from: remotePeer,
        peer: {
          id: remotePeer,
          multiaddrs: []
        },
        path: {
          index: -1,
          queued: 0,
          running: 0,
          total: 0
        }
      })
    }())

    const querySelfPromise1 = querySelf.querySelf()
    const querySelfPromise2 = querySelf.querySelf()

    // both self-query promises should resolve
    await Promise.all([querySelfPromise1, querySelfPromise2])

    // should only have made one query
    expect(peerRouting.getClosestPeers).to.have.property('callCount', 1)
  })
})
