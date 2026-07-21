import { generateKeyPair } from '@libp2p/crypto/keys'
import { start } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { pbStream, streamPair } from '@libp2p/utils'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { TypedEventEmitter } from 'main-event'
import Sinon from 'sinon'
import { stubInterface } from 'sinon-ts'
import { KEEP_ALIVE_TAG, RELAY_V2_HOP_CODEC } from '../../src/constants.ts'
import { HopMessage, Status } from '../../src/pb/index.ts'
import { ReservationStore } from '../../src/transport/reservation-store.ts'
import type { ComponentLogger, Connection, Libp2pEvents, Peer, PeerId, PeerStore, Stream } from '@libp2p/interface'
import type { ConnectionManager, TransportManager } from '@libp2p/interface-internal'
import type { TypedEventTarget } from 'main-event'
import type { StubbedInstance } from 'sinon-ts'

export interface StubbedReservationStoreComponents {
  peerId: PeerId
  connectionManager: StubbedInstance<ConnectionManager>
  transportManager: StubbedInstance<TransportManager>
  peerStore: StubbedInstance<PeerStore>
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

describe('transport reservation-store', () => {
  let store: ReservationStore
  let components: StubbedReservationStoreComponents

  beforeEach(async () => {
    const privateKey = await generateKeyPair('Ed25519')

    components = {
      peerId: peerIdFromPrivateKey(privateKey),
      connectionManager: stubInterface(),
      transportManager: stubInterface(),
      peerStore: stubInterface(),
      events: new TypedEventEmitter(),
      logger: defaultLogger()
    }

    store = new ReservationStore(components)
  })

  afterEach(() => {
    if (store != null) {
      // clears the real refresh timers armed by addRelay
      store.stop()
    }

    Sinon.restore()
  })

  const RELAY_ADDR = multiaddr('/ip4/223.223.223.223/tcp/2345')

  // acts as the relay server end of a hop stream: reads the RESERVE and replies
  // with an OK reservation that expires `expireSeconds` from now
  function respondToReserve (relayPeer: PeerId, expireSeconds: number): () => Promise<Stream> {
    return async () => {
      const [outbound, inbound] = await streamPair({ protocol: RELAY_V2_HOP_CODEC })

      void Promise.resolve().then(async () => {
        const relay = pbStream(inbound).pb(HopMessage)
        await relay.read()
        await relay.write({
          type: HopMessage.Type.STATUS,
          status: Status.OK,
          reservation: {
            addrs: [RELAY_ADDR.encapsulate(`/p2p/${relayPeer}`).bytes],
            expire: BigInt(Math.round(Date.now() / 1000) + expireSeconds)
          }
        })
      }).catch(() => {})

      return outbound
    }
  }

  // wires up an open, still-connected relay whose reservation expires soon, so a
  // subsequent addRelay call takes the refresh path
  function addConnectedRelay (relayPeer: PeerId, expireSeconds: number): StubbedInstance<Connection> {
    const connection = stubInterface<Connection>({
      id: `conn-${relayPeer.toString()}`,
      remotePeer: relayPeer,
      remoteAddr: RELAY_ADDR.encapsulate(`/p2p/${relayPeer}`)
    })
    connection.newStream.callsFake(respondToReserve(relayPeer, expireSeconds))

    components.connectionManager.openConnection.withArgs(relayPeer).resolves(connection)
    components.connectionManager.getConnections.withArgs(relayPeer).returns([connection])

    return connection
  }

  it('should remove relay tags on start', async () => {
    const peer: Peer = {
      id: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      addresses: [],
      metadata: new Map(),
      tags: new Map([[KEEP_ALIVE_TAG, { value: 1 }]]),
      protocols: []
    }

    components.peerStore.all.resolves([peer])

    await start(store)

    await delay(100)

    expect(components.peerStore.merge.calledWith(peer.id, {
      tags: {
        [KEEP_ALIVE_TAG]: undefined
      }
    })).to.be.true()
  })

  it('should not drop a still-connected reservation while refreshing it', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    addConnectedRelay(relayPeer, 300)

    // create the initial reservation
    await store.addRelay(relayPeer, 'configured')

    // observe any relay:removed emitted while refreshing
    const removed: PeerId[] = []
    store.addEventListener('relay:removed', (evt) => {
      removed.push(evt.detail.relay)
    })

    // refresh the still-connected, soon-to-expire reservation
    await store.addRelay(relayPeer, 'configured')

    expect(removed).to.have.lengthOf(0)
  })

  it('should refresh a still-connected discovered reservation in place', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    addConnectedRelay(relayPeer, 300)

    // a discovered relay fills a pending reservation slot
    store.reserveRelay()
    await store.addRelay(relayPeer, 'discovered')
    expect(store.hasReservation(relayPeer)).to.equal(true)
    const idBefore = (store as any).reservations.get(relayPeer).id

    // a refresh must not withdraw the address or free the slot for rediscovery
    const events: string[] = []
    store.addEventListener('relay:removed', () => { events.push('removed') })
    store.addEventListener('relay:not-enough-relays', () => { events.push('not-enough') })

    await store.addRelay(relayPeer, 'discovered')

    expect(store.hasReservation(relayPeer)).to.equal(true)
    expect(events).to.have.lengthOf(0)
    // the same slot stays pinned to the relay, not leaked or double-counted
    expect((store as any).reservations.get(relayPeer).id).to.equal(idBefore)
    expect((store as any).pendingReservations).to.have.lengthOf(0)
    expect(store.reservationCount('discovered')).to.equal(1)
  })

  it('should remove a discovered reservation when its refresh fails', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const connection = addConnectedRelay(relayPeer, 300)
    store.reserveRelay()
    await store.addRelay(relayPeer, 'discovered')

    // make the next (refresh) reservation attempt fail, recording when it runs
    const order: string[] = []
    connection.newStream.reset()
    connection.newStream.callsFake(async () => {
      order.push('attempt')
      throw new Error('stream failed')
    })

    const removed: PeerId[] = []
    store.addEventListener('relay:removed', (evt) => {
      removed.push(evt.detail.relay)
      order.push('removed')
    })
    let notEnough = 0
    store.addEventListener('relay:not-enough-relays', () => { notEnough++ })

    await store.addRelay(relayPeer, 'discovered').catch(() => {})
    await delay(0)

    expect(removed).to.have.lengthOf(1)
    expect(store.hasReservation(relayPeer)).to.equal(false)
    // the freed slot returns to the pool so rediscovery can replace the relay
    expect((store as any).pendingReservations).to.have.lengthOf(1)
    expect(notEnough).to.be.greaterThan(0)
    // keep-until-failure: a still-connected reservation is removed only after
    // the refresh attempt runs, not dropped up front before trying
    expect(order).to.deep.equal(['attempt', 'removed'])
  })

  it('should reclaim the slot when a disconnected discovered reservation refreshes', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    addConnectedRelay(relayPeer, 300)
    store.reserveRelay()
    await store.addRelay(relayPeer, 'discovered')
    expect((store as any).pendingReservations).to.have.lengthOf(0)

    // the reservation's original connection is gone by the time it refreshes, so
    // it is removed up front (returning its slot to the pool) and must be
    // re-reserved from the pool, not have its id duplicated back in
    components.connectionManager.getConnections.withArgs(relayPeer).returns([])

    await store.addRelay(relayPeer, 'discovered')

    expect(store.hasReservation(relayPeer)).to.equal(true)
    // the slot id must not be live and pending at the same time
    expect((store as any).pendingReservations).to.have.lengthOf(0)
  })

  it('should reclaim the slot when connection:close removes a discovered reservation mid-refresh', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const connection = addConnectedRelay(relayPeer, 300)
    store.reserveRelay()
    await store.addRelay(relayPeer, 'discovered')
    expect((store as any).pendingReservations).to.have.lengthOf(0)

    // connected is true at the top so nothing is removed up front, but a
    // connection:close during the refresh await removes the reservation and
    // returns its id to the pool. the id must be reclaimed, not duplicated.
    connection.newStream.reset()
    connection.newStream.callsFake(() => {
      components.events.dispatchEvent(new CustomEvent('connection:close', { detail: connection }))
      return respondToReserve(relayPeer, 300)()
    })

    await store.addRelay(relayPeer, 'discovered')

    expect(store.hasReservation(relayPeer)).to.equal(true)
    expect((store as any).pendingReservations).to.have.lengthOf(0)
    expect(store.reservationCount('discovered')).to.equal(1)
  })

  it('should not consume an unrelated pending slot when refreshing', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    addConnectedRelay(relayPeer, 300)

    // two discovery slots are outstanding, the reserved relay holds one
    store.reserveRelay()
    store.reserveRelay()
    await store.addRelay(relayPeer, 'discovered')
    expect((store as any).pendingReservations).to.have.lengthOf(1)

    // a live refresh must not withdraw the address...
    const removed: string[] = []
    store.addEventListener('relay:removed', () => { removed.push('removed') })

    // ...nor touch the other still-pending slot
    await store.addRelay(relayPeer, 'discovered')

    expect((store as any).pendingReservations).to.have.lengthOf(1)
    expect(store.hasReservation(relayPeer)).to.equal(true)
    expect(removed).to.have.lengthOf(0)
  })

  it('should clear the previous refresh timer when a reservation is refreshed', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const connection = addConnectedRelay(relayPeer, 450)

    const clearTimeoutSpy = Sinon.spy(globalThis, 'clearTimeout')

    // create the initial reservation and capture the exact refresh timer it arms
    await store.addRelay(relayPeer, 'configured')
    const previousTimer = (store as any).reservations.get(relayPeer)?.timeout

    // refresh it - the previous refresh timer must be cleared, not left armed
    await store.addRelay(relayPeer, 'configured')

    // the refresh path must have been taken, not the return-existing branch
    expect(connection.newStream.callCount).to.equal(2)

    const clearedRefreshTimer = clearTimeoutSpy.getCalls()
      .some(call => call.args[0] === previousTimer)

    // defensively clear the old timer in case a regression left it armed
    // (afterEach -> store.stop() clears the new one)
    clearTimeout(previousTimer)

    expect(clearedRefreshTimer).to.equal(true)
  })

  it('should remove a still-connected reservation when its refresh fails', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const connection = addConnectedRelay(relayPeer, 300)
    await store.addRelay(relayPeer, 'configured')

    // make the next (refresh) reservation attempt fail, recording when it runs
    const order: string[] = []
    connection.newStream.reset()
    connection.newStream.callsFake(async () => {
      order.push('attempt')
      throw new Error('stream failed')
    })

    const removed: PeerId[] = []
    store.addEventListener('relay:removed', (evt) => {
      removed.push(evt.detail.relay)
      order.push('removed')
    })

    // the refresh rejects; the catch path must clean up the stale reservation
    await store.addRelay(relayPeer, 'configured').catch(() => {})

    // the catch removes via a fire-and-forget call, so let it settle
    await delay(0)

    expect(removed).to.have.lengthOf(1)
    expect(store.hasReservation(relayPeer)).to.equal(false)
    // keep-until-failure: the still-connected reservation is removed only after
    // the refresh attempt runs, not dropped up front before trying
    expect(order).to.deep.equal(['attempt', 'removed'])
  })

  it('should withdraw the address and re-check the count even when the datastore untag fails', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const connection = addConnectedRelay(relayPeer, 300)
    store.reserveRelay()
    await store.addRelay(relayPeer, 'discovered')
    expect((store as any).pendingReservations).to.have.lengthOf(0)

    // the datastore rejects the untag write performed during removal
    components.peerStore.merge.rejects(new Error('datastore down'))

    const removed: PeerId[] = []
    store.addEventListener('relay:removed', (evt) => {
      removed.push(evt.detail.relay)
    })
    let notEnough = 0
    store.addEventListener('relay:not-enough-relays', () => { notEnough++ })

    // the relay connection closes, triggering removal; the untag rejection must
    // not prevent withdrawing the address or freeing the slot for rediscovery
    components.events.dispatchEvent(new CustomEvent('connection:close', { detail: connection }))
    await delay(0)

    expect(removed).to.have.lengthOf(1)
    expect(store.hasReservation(relayPeer)).to.equal(false)
    // the freed slot returns to the pool despite the failed datastore write
    expect((store as any).pendingReservations).to.have.lengthOf(1)
    expect(notEnough).to.be.greaterThan(0)
  })
})
