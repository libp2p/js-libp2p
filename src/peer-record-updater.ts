import { RecordEnvelope, PeerRecord } from '@libp2p/peer-record'
import type { Components } from '@libp2p/interfaces/components'
import type { Startable } from '@libp2p/interfaces/startable'
import { logger } from '@libp2p/logger'
import { protocols } from '@multiformats/multiaddr'

const log = logger('libp2p:peer-record-updater')

export class PeerRecordUpdater implements Startable {
  private readonly components: Components
  private started: boolean

  constructor (components: Components) {
    this.components = components
    this.started = false
    this.update = this.update.bind(this)
  }

  isStarted () {
    return this.started
  }

  async start () {
    this.started = true
    this.components.getTransportManager().addEventListener('listener:listening', this.update)
    this.components.getTransportManager().addEventListener('listener:close', this.update)
    this.components.getAddressManager().addEventListener('change:addresses', this.update)
  }

  async stop () {
    this.started = false
    this.components.getTransportManager().removeEventListener('listener:listening', this.update)
    this.components.getTransportManager().removeEventListener('listener:close', this.update)
    this.components.getAddressManager().removeEventListener('change:addresses', this.update)
  }

  /**
   * Create (or update if existing) self peer record and store it in the AddressBook.
   */
  update () {
    Promise.resolve()
      .then(async () => {
        const peerRecord = new PeerRecord({
          peerId: this.components.getPeerId(),
          multiaddrs: this.components.getAddressManager().getAddresses().map(ma => ma.decapsulateCode(protocols('p2p').code))
        })

        const envelope = await RecordEnvelope.seal(peerRecord, this.components.getPeerId())
        await this.components.getPeerStore().addressBook.consumePeerRecord(envelope)
      })
      .catch(err => {
        log.error('Could not update self peer record: %o', err)
      })
  }
}
