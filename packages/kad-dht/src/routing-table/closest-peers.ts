import { PeerSet } from '@libp2p/peer-collections'
import { KEEP_ALIVE_TAG } from '../constants.js'
import { PeerDistanceList } from '../peer-distance-list.js'
import { convertPeerId } from '../utils.js'
import type { RoutingTable } from './index.js'
import type { ComponentLogger, Logger, Metrics, PeerId, PeerStore, Startable } from '@libp2p/interface'

export const PEER_SET_SIZE = 20
export const REFRESH_INTERVAL = 5000
export const KAD_CLOSE_TAG_NAME = 'kad-close'
export const KAD_CLOSE_TAG_VALUE = 50

export interface ClosestPeersInit {
  logPrefix: string
  routingTable: RoutingTable
  peerSetSize?: number
  refreshInterval?: number
  closeTagName?: string
  closeTagValue?: number
}

export interface ClosestPeersComponents {
  peerId: PeerId
  peerStore: PeerStore
  metrics?: Metrics
  logger: ComponentLogger
}

/**
 * Contains a list of the kad-closest peers encountered on the network.
 *
 * Once every few seconds, if the list has changed, it tags the closest peers.
 */
export class ClosestPeers implements Startable {
  private readonly routingTable: RoutingTable
  private readonly components: ClosestPeersComponents
  private closestPeers: PeerSet
  private newPeers?: PeerDistanceList
  private readonly refreshInterval: number
  private readonly peerSetSize: number
  private timeout?: ReturnType<typeof setTimeout>
  private readonly closeTagName: string
  private readonly closeTagValue: number
  private readonly log: Logger
  private running: boolean

  constructor (components: ClosestPeersComponents, init: ClosestPeersInit) {
    this.components = components
    this.log = components.logger.forComponent(`${init.logPrefix}:routing-table`)
    this.routingTable = init.routingTable
    this.refreshInterval = init.refreshInterval ?? REFRESH_INTERVAL
    this.peerSetSize = init.peerSetSize ?? PEER_SET_SIZE
    this.closeTagName = init.closeTagName ?? KAD_CLOSE_TAG_NAME
    this.closeTagValue = init.closeTagValue ?? KAD_CLOSE_TAG_VALUE

    this.closestPeers = new PeerSet()
    this.onPeerPing = this.onPeerPing.bind(this)
    this.running = false
  }

  async start (): Promise<void> {
    if (this.running) {
      return
    }

    this.running = true

    const targetKadId = await convertPeerId(this.components.peerId)
    this.newPeers = new PeerDistanceList(targetKadId, this.peerSetSize)
    this.routingTable.addEventListener('peer:ping', this.onPeerPing)

    this.timeout = setInterval(() => {
      this.updatePeerTags()
        .catch(err => {
          this.log.error('error updating peer tags - %e', err)
        })
    }, this.refreshInterval)
  }

  stop (): void {
    this.running = false
    this.routingTable.removeEventListener('peer:ping', this.onPeerPing)
    clearTimeout(this.timeout)
  }

  onPeerPing (event: CustomEvent<PeerId>): void {
    this.newPeers?.add({ id: event.detail, multiaddrs: [] })
      .catch(err => {
        this.log.error('error adding peer to distance list - %e', err)
      })
  }

  async updatePeerTags (): Promise<void> {
    const newClosest = new PeerSet(this.newPeers?.peers.map(({ peer }) => peer.id))
    const added = newClosest.difference(this.closestPeers)
    const removed = this.closestPeers.difference(newClosest)
    this.closestPeers = newClosest

    await Promise.all([
      ...[...added].map(async peerId => {
        await this.components.peerStore.merge(peerId, {
          tags: {
            [this.closeTagName]: {
              value: this.closeTagValue
            },
            [KEEP_ALIVE_TAG]: {
              value: 1
            }
          }
        })
      }),
      ...[...removed].map(async peerId => {
        await this.components.peerStore.merge(peerId, {
          tags: {
            [this.closeTagName]: undefined,
            [KEEP_ALIVE_TAG]: undefined
          }
        })
      })
    ])
  }
}
