import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { createListener } from '../src/transport/listener.ts'
import type { ReservationStore } from '../src/transport/reservation-store.ts'
import type { ComponentLogger, Connection, Listener, PeerId } from '@libp2p/interface'
import type { AddressManager, ConnectionManager } from '@libp2p/interface-internal'
import type { StubbedInstance } from 'sinon-ts'

export interface CircuitRelayTransportListenerComponents {
  peerId: PeerId
  connectionManager: StubbedInstance<ConnectionManager>
  addressManager: StubbedInstance<AddressManager>
  reservationStore: StubbedInstance<ReservationStore>
  logger: ComponentLogger
}

describe('listener', () => {
  let listener: Listener
  let components: CircuitRelayTransportListenerComponents

  beforeEach(async () => {
    components = {
      peerId: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
      connectionManager: stubInterface(),
      addressManager: stubInterface(),
      reservationStore: stubInterface(),
      logger: defaultLogger()
    }

    listener = createListener(components)
  })

  it('should auto-confirm discovered relay addresses', async () => {
    await listener.listen(multiaddr('/p2p-circuit'))

    expect(components.reservationStore.reserveRelay).to.have.property('called', true, 'did not begin relay search')

    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const relayAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${relayPeer}`)

    const createdReservationListener = components.reservationStore.addEventListener.getCall(1).args[1]

    if (typeof createdReservationListener === 'function') {
      createdReservationListener(
        new CustomEvent('relay:created-reservation', {
          detail: {
            relay: relayPeer,
            details: {
              type: 'discovered',
              reservation: {
                addrs: [
                  relayAddr
                ]
              }
            }
          }
        })
      )
    }

    expect(components.addressManager.confirmObservedAddr.calledWith(
      relayAddr.encapsulate('/p2p-circuit')
    )).to.be.true()
  })

  it('should auto-confirm configured relay addresses', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const relayAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${relayPeer}/p2p-circuit`)
    const conn = stubInterface<Connection>({
      id: 'connection-id-1234',
      remotePeer: relayPeer
    })

    components.connectionManager.openConnection.withArgs(relayAddr.decapsulate('/p2p-circuit')).resolves(conn)

    components.reservationStore.addRelay.withArgs(relayPeer).resolves({
      relay: relayPeer,
      details: {
        type: 'configured',
        reservation: {
          addrs: [
            relayAddr.bytes
          ],
          expire: 100n
        },
        timeout: 0 as any,
        connection: conn.id
      }
    })

    await listener.listen(relayAddr)

    expect(components.addressManager.confirmObservedAddr.calledWith(
      relayAddr.encapsulate('/p2p-circuit')
    )).to.be.true()
  })

  it('should re-confirm a configured relay reservation when it is refreshed', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const relayAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${relayPeer}/p2p-circuit`)
    const conn = stubInterface<Connection>({
      id: 'connection-id-1234',
      remotePeer: relayPeer
    })

    components.connectionManager.openConnection.withArgs(relayAddr.decapsulate('/p2p-circuit')).resolves(conn)

    components.reservationStore.addRelay.withArgs(relayPeer).resolves({
      relay: relayPeer,
      details: {
        type: 'configured',
        reservation: {
          addrs: [
            relayAddr.bytes
          ],
          expire: 100n
        },
        timeout: 0 as any,
        connection: conn.id
      }
    })

    // establish the configured relay
    await listener.listen(relayAddr)

    // the relay reservation is refreshed with a new address for the same relay
    const refreshedAddr = multiaddr(`/ip4/124.124.124.124/tcp/4321/p2p/${relayPeer}/p2p-circuit`)
    const createdReservationListener = components.reservationStore.addEventListener.getCall(1).args[1]

    if (typeof createdReservationListener !== 'function') {
      throw new Error('did not register a relay:created-reservation listener')
    }

    createdReservationListener(
      new CustomEvent('relay:created-reservation', {
        detail: {
          relay: relayPeer,
          details: {
            type: 'configured',
            reservation: {
              addrs: [
                refreshedAddr.bytes
              ],
              expire: 200n
            },
            timeout: 0 as any,
            connection: conn.id
          }
        }
      })
    )

    const confirmedAddrs = components.addressManager.confirmObservedAddr.getCalls()
      .map(call => call.args[0].toString())

    expect(confirmedAddrs).to.include(refreshedAddr.encapsulate('/p2p-circuit').toString())

    // the previous, now-stale address is withdrawn, not left advertised
    const withdrawnAddrs = components.addressManager.removeObservedAddr.getCalls()
      .map(call => call.args[0].toString())
    expect(withdrawnAddrs).to.include(relayAddr.encapsulate('/p2p-circuit').toString())
  })

  it('should not withdraw an unchanged configured relay address on refresh', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const relayAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${relayPeer}/p2p-circuit`)
    const conn = stubInterface<Connection>({
      id: 'connection-id-1234',
      remotePeer: relayPeer
    })

    components.connectionManager.openConnection.withArgs(relayAddr.decapsulate('/p2p-circuit')).resolves(conn)
    components.reservationStore.addRelay.withArgs(relayPeer).resolves({
      relay: relayPeer,
      details: {
        type: 'configured',
        reservation: {
          addrs: [
            relayAddr.bytes
          ],
          expire: 100n
        },
        timeout: 0 as any,
        connection: conn.id
      }
    })

    await listener.listen(relayAddr)

    const createdReservationListener = components.reservationStore.addEventListener.getCall(1).args[1]

    if (typeof createdReservationListener !== 'function') {
      throw new Error('did not register a relay:created-reservation listener')
    }

    // a refresh returning the SAME address must not withdraw it
    createdReservationListener(
      new CustomEvent('relay:created-reservation', {
        detail: {
          relay: relayPeer,
          details: {
            type: 'configured',
            reservation: {
              addrs: [
                relayAddr.bytes
              ],
              expire: 200n
            },
            timeout: 0 as any,
            connection: conn.id
          }
        }
      })
    )

    const withdrawnAddrs = components.addressManager.removeObservedAddr.getCalls()
      .map(call => call.args[0].toString())
    expect(withdrawnAddrs).to.not.include(relayAddr.encapsulate('/p2p-circuit').toString())

    // and it stays confirmed
    const confirmedAddrs = components.addressManager.confirmObservedAddr.getCalls()
      .map(call => call.args[0].toString())
    expect(confirmedAddrs).to.include(relayAddr.encapsulate('/p2p-circuit').toString())
  })

  it('should ignore a configured reservation refresh for a different relay', async () => {
    const relayPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const relayAddr = multiaddr(`/ip4/123.123.123.123/tcp/1234/p2p/${relayPeer}/p2p-circuit`)
    const conn = stubInterface<Connection>({
      id: 'connection-id-1234',
      remotePeer: relayPeer
    })

    components.connectionManager.openConnection.withArgs(relayAddr.decapsulate('/p2p-circuit')).resolves(conn)

    components.reservationStore.addRelay.withArgs(relayPeer).resolves({
      relay: relayPeer,
      details: {
        type: 'configured',
        reservation: {
          addrs: [
            relayAddr.bytes
          ],
          expire: 100n
        },
        timeout: 0 as any,
        connection: conn.id
      }
    })

    await listener.listen(relayAddr)

    // a configured refresh for a different relay must not be applied as ours
    const otherPeer = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))
    const otherAddr = multiaddr(`/ip4/124.124.124.124/tcp/4321/p2p/${otherPeer}/p2p-circuit`)
    const createdReservationListener = components.reservationStore.addEventListener.getCall(1).args[1]

    if (typeof createdReservationListener !== 'function') {
      throw new Error('did not register a relay:created-reservation listener')
    }

    createdReservationListener(
      new CustomEvent('relay:created-reservation', {
        detail: {
          relay: otherPeer,
          details: {
            type: 'configured',
            reservation: {
              addrs: [
                otherAddr.bytes
              ],
              expire: 200n
            },
            timeout: 0 as any,
            connection: 'connection-id-5678'
          }
        }
      })
    )

    const confirmedAddrs = components.addressManager.confirmObservedAddr.getCalls()
      .map(call => call.args[0].toString())

    expect(confirmedAddrs).to.not.include(otherAddr.encapsulate('/p2p-circuit').toString())
  })
})
