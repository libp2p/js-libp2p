import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import type { Startable } from '@libp2p/interfaces/startable'
import { logger } from '@libp2p/logger'
import { protocols } from '@multiformats/multiaddr'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerStore } from '@libp2p/interface-peer-store'
import type { EventEmitter } from '@libp2p/interfaces/events'
import type { Libp2pEvents } from '@libp2p/interface-libp2p'

const log = logger('libp2p:peer-record-updater')

export interface PeerRecordUpdaterComponents {
  peerId: PeerId
  peerStore: PeerStore
  addressManager: AddressManager
  events: EventEmitter<Libp2pEvents>
}

export class PeerRecordUpdater implements Startable {
  private readonly components: PeerRecordUpdaterComponents
  private started: boolean

  constructor (components: PeerRecordUpdaterComponents) {
    this.components = components
    this.started = false
    this.update = this.update.bind(this)
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    this.started = true
    this.components.events.addEventListener('transport:listening', this.update)
    this.components.events.addEventListener('transport:close', this.update)
    this.components.events.addEventListener('self:peer:update', this.update)
  }

  async stop (): Promise<void> {
    this.started = false
    this.components.events.removeEventListener('transport:listening', this.update)
    this.components.events.removeEventListener('transport:close', this.update)
    this.components.events.removeEventListener('self:peer:update', this.update)
  }

  /**
   * Create (or update if existing) self peer record and store it in the AddressBook.
   */
  update (): void {
    Promise.resolve()
      .then(async () => {
        const peerRecord = new PeerRecord({
          peerId: this.components.peerId,
          multiaddrs: this.components.addressManager.getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
        })

        const envelope = await RecordEnvelope.seal(peerRecord, this.components.peerId)
        await this.components.peerStore.addressBook.consumePeerRecord(envelope)
      })
      .catch(err => {
        log.error('Could not update self peer record: %o', err)
      })
  }
}
