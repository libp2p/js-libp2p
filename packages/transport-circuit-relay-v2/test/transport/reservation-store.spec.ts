import { generateKeyPair } from '@libp2p/crypto/keys'
import { start } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { TypedEventEmitter } from 'main-event'
import { stubInterface } from 'sinon-ts'
import { KEEP_ALIVE_TAG } from '../../src/constants.js'
import { ReservationStore } from '../../src/transport/reservation-store.js'
import type { ComponentLogger, Libp2pEvents, Peer, PeerId, PeerStore } from '@libp2p/interface'
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
})
