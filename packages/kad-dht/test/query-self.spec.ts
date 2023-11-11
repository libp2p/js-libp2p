/* eslint-env mocha */

import { CustomEvent } from '@libp2p/interface/events'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import pDefer from 'p-defer'
import { stubInterface, type StubbedInstance } from 'ts-sinon'
import { finalPeerEvent } from '../src/query/events.js'
import { QuerySelf } from '../src/query-self.js'
import type { PeerRouting } from '../src/peer-routing/index.js'
import type { RoutingTable } from '../src/routing-table/index.js'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { DeferredPromise } from 'p-defer'

describe('Query Self', () => {
  let peerId: PeerId
  let querySelf: QuerySelf
  let peerRouting: StubbedInstance<PeerRouting>
  let routingTable: StubbedInstance<RoutingTable>
  let initialQuerySelfHasRun: DeferredPromise<void>

  beforeEach(async () => {
    peerId = await createEd25519PeerId()
    initialQuerySelfHasRun = pDefer()
    routingTable = stubInterface<RoutingTable>()
    peerRouting = stubInterface<PeerRouting>()

    const components = {
      peerId,
      logger: defaultLogger()
    }

    const init = {
      lan: false,
      peerRouting,
      routingTable,
      initialQuerySelfHasRun
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

  it('should wait for routing table peers before running first query', async () => {
    querySelf.start()

    // @ts-expect-error read-only property
    routingTable.size = 0

    const querySelfPromise = querySelf.querySelf()
    const remotePeer = await createEd25519PeerId()

    let initialQuerySelfHasRunResolved = false

    void initialQuerySelfHasRun.promise.then(() => {
      initialQuerySelfHasRunResolved = true
    })

    // should have registered a peer:add listener
    // @ts-expect-error ts-sinon makes every property access a function and p-event checks this one first
    expect(routingTable.on).to.have.property('callCount', 2)
    // @ts-expect-error ts-sinon makes every property access a function and p-event checks this one first
    expect(routingTable.on.getCall(0)).to.have.nested.property('args[0]', 'peer:add')

    // self query results
    peerRouting.getClosestPeers.withArgs(peerId.toBytes()).returns(async function * () {
      yield finalPeerEvent({
        from: remotePeer,
        peer: {
          id: remotePeer,
          multiaddrs: []
        }
      })
    }())

    // @ts-expect-error args[1] type could be an object
    routingTable.on.getCall(0).args[1](new CustomEvent('peer:add', { detail: remotePeer }))

    // self-query should complete
    await querySelfPromise

    // should have resolved initial query self promise
    expect(initialQuerySelfHasRunResolved).to.be.true()
  })

  it('should join an existing query promise and not run twise', async () => {
    querySelf.start()

    // @ts-expect-error read-only property
    routingTable.size = 0

    const querySelfPromise1 = querySelf.querySelf()
    const querySelfPromise2 = querySelf.querySelf()
    const remotePeer = await createEd25519PeerId()

    // self query results
    peerRouting.getClosestPeers.withArgs(peerId.toBytes()).returns(async function * () {
      yield finalPeerEvent({
        from: remotePeer,
        peer: {
          id: remotePeer,
          multiaddrs: []
        }
      })
    }())

    // @ts-expect-error args[1] type could be an object
    routingTable.on.getCall(0).args[1](new CustomEvent('peer:add', { detail: remotePeer }))

    // both self-query promises should resolve
    await Promise.all([querySelfPromise1, querySelfPromise2])

    // should only have made one query
    expect(peerRouting.getClosestPeers).to.have.property('callCount', 1)
  })
})
