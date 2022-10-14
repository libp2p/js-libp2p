import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import type { Startable } from '@libp2p/interfaces/startable'
import { logger } from '@libp2p/logger'
import { protocols } from '@multiformats/multiaddr'
import type { TransportManager } from '@libp2p/interface-transport'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerStore } from '@libp2p/interface-peer-store'

const log = logger('libp2p:peer-record-updater')

export interface PeerRecordUpdaterComponents {
  peerId: PeerId
  peerStore: PeerStore
  transportManager: TransportManager
  addressManager: AddressManager
}

export class PeerRecordUpdater implements Startable {
  private readonly components: PeerRecordUpdaterComponents
  private started: boolean

  constructor (components: PeerRecordUpdaterComponents) {
    this.components = components
    this.started = false
    this.update = this.update.bind(this)
  }

  isStarted () {
    return this.started
  }

  async start () {
    this.started = true
    this.components.transportManager.addEventListener('listener:listening', this.update)
    this.components.transportManager.addEventListener('listener:close', this.update)
    this.components.addressManager.addEventListener('change:addresses', this.update)
  }

  async stop () {
    this.started = false
    this.components.transportManager.removeEventListener('listener:listening', this.update)
    this.components.transportManager.removeEventListener('listener:close', this.update)
    this.components.addressManager.removeEventListener('change:addresses', this.update)
  }

  /**
   * Create (or update if existing) self peer record and store it in the AddressBook.
   */
  update () {
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
