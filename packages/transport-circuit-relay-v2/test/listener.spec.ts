import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubInterface } from 'sinon-ts'
import { createListener } from '../src/transport/listener.js'
import type { ReservationStore } from '../src/transport/reservation-store.js'
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
})
