import { logger } from '@libp2p/logger'
import { relayV2HopCodec } from './multicodec.js'
import { getExpiration, namespaceToCid } from './utils.js'
import {
  CIRCUIT_PROTO_CODE,
  RELAY_RENDEZVOUS_NS
} from './constants.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { AddressSorter, PeerProtocolsChangeData } from '@libp2p/interfaces/peer-store'
import type { Connection } from '@libp2p/interfaces/connection'
import type { Components } from '@libp2p/interfaces/components'
import sort from 'it-sort'
import all from 'it-all'
import { pipe } from 'it-pipe'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { reserve } from './v2/index.js'

const log = logger('libp2p:auto-relay')

const noop = () => {}

export interface AutoRelayInit {
  addressSorter?: AddressSorter
  maxReservations?: number
  onError?: (error: Error, msg?: string) => void
}

export class CircuitClient {
  private readonly components: Components
  private readonly addressSorter: AddressSorter
  private readonly maxReservations: number
  private readonly relays: Set<string>
  private readonly reservationMap: Map<PeerId, ReturnType<typeof setTimeout>>
  private readonly onError: (error: Error, msg?: string) => void

  constructor (components: Components, init: AutoRelayInit) {
    this.components = components
    this.addressSorter = init.addressSorter ?? publicAddressesFirst
    this.maxReservations = init.maxReservations ?? 1
    this.relays = new Set()
    this.reservationMap = new Map()
    this.onError = init.onError ?? noop

    this._onProtocolChange = this._onProtocolChange.bind(this)
    this._onPeerDisconnected = this._onPeerDisconnected.bind(this)

    this.components.getPeerStore().addEventListener('change:protocols', (evt) => {
      void this._onProtocolChange(evt).catch(err => {
        log.error(err)
      })
    })
    this.components.getConnectionManager().addEventListener('peer:disconnect', this._onPeerDisconnected)
  }

  /**
   * Check if a peer supports the relay protocol.
   * If the protocol is not supported, check if it was supported before and remove it as a listen relay.
   * If the protocol is supported, check if the peer supports **HOP** and add it as a listener if
   * inside the threshold.
   */
  async _onProtocolChange (evt: CustomEvent<PeerProtocolsChangeData>) {
    const {
      peerId,
      protocols
    } = evt.detail
    const id = peerId.toString()

    // Check if it has the protocol
    const hasProtocol = protocols.find(protocol => protocol === relayV2HopCodec)

    // If no protocol, check if we were keeping the peer before as a listenRelay
    if (hasProtocol == null) {
      if (this.relays.has(id)) {
        await this._removeListenRelay(id)
      }

      return
    }

    if (this.relays.has(id)) {
      return
    }

    // If protocol, check if can hop, store info in the metadataBook and listen on it
    try {
      const connections = this.components.getConnectionManager().getConnections(peerId)

      if (connections.length === 0) {
        return
      }

      const connection = connections[0]

      // Do not hop on a relayed connection
      if (connection.remoteAddr.protoCodes().includes(CIRCUIT_PROTO_CODE)) {
        log(`relayed connection to ${id} will not be used to hop on`)
        return
      }

      await this._addListenRelay(connection, peerId)
    } catch (err: any) {
      this.onError(err)
    }
  }

  /**
   * Peer disconnects
   */
  _onPeerDisconnected (evt: CustomEvent<Connection>) {
    const connection = evt.detail
    const peerId = connection.remotePeer
    const id = peerId.toString()
    this.reservationMap.delete(peerId)

    // Not listening on this relay
    if (!this.relays.has(id)) {
      return
    }

    this._removeListenRelay(id).catch(err => {
      log.error(err)
    })
  }

  /**
   * Attempt to listen on the given relay connection
   */
  async _addListenRelay (connection: Connection, peerId: PeerId): Promise<void> {
    const id = peerId.toString()
    try {
      // Check if already enough relay reservations
      if (this.relays.size >= this.maxReservations) {
        return
      }

      const reservation = await reserve(connection)
      if (reservation != null) {
        this.reservationMap.set(peerId, setTimeout(() => {
          // refresh reservation
        }, Math.min(getExpiration(reservation.expire) - 100, 0)))
      }

      // Get peer known addresses and sort them with public addresses first
      const remoteAddrs = await pipe(
        await this.components.getPeerStore().addressBook.get(connection.remotePeer),
        (source) => sort(source, this.addressSorter),
        async (source) => await all(source)
      )

      // Attempt to listen on relay
      const result = await Promise.all(
        remoteAddrs.map(async addr => {
          try {
            let multiaddr = addr.multiaddr

            if (multiaddr.getPeerId() == null) {
              multiaddr = multiaddr.encapsulate(`/p2p/${connection.remotePeer.toString()}`)
            }

            multiaddr = multiaddr.encapsulate('/p2p-circuit')

            // Announce multiaddrs will update on listen success by TransportManager event being triggered
            await this.components.getTransportManager().listen([multiaddr])
            return true
          } catch (err: any) {
            log.error('error listening on circuit address', err)
            this.onError(err)
          }

          return false
        })
      )

      if (result.includes(true)) {
        this.relays.add(id)
      }
    } catch (err: any) {
      this.onError(err)
      this.relays.delete(id)
    }
  }

  /**
   * Remove listen relay
   */
  async _removeListenRelay (id: string) {
    if (this.relays.delete(id)) {
      // TODO: this should be responsibility of the connMgr
      await this._listenOnAvailableHopRelays([id])
    }
  }

  /**
   * Try to listen on available hop relay connections.
   * The following order will happen while we do not have enough relays.
   * 1. Check the metadata store for known relays, try to listen on the ones we are already connected.
   * 2. Dial and try to listen on the peers we know that support hop but are not connected.
   * 3. Search the network.
   */
  async _listenOnAvailableHopRelays (peersToIgnore: string[] = []) {
    // Check if already listening on enough relays
    if (this.relays.size >= this.maxReservations) {
      return
    }

    const knownHopsToDial = []
    const peers = await this.components.getPeerStore().all()

    // Check if we have known hop peers to use and attempt to listen on the already connected
    for (const { id, protocols } of peers) {
      const idStr = id.toString()

      // Continue to next if listening on this or peer to ignore
      if (this.relays.has(idStr)) {
        continue
      }

      if (peersToIgnore.includes(idStr)) {
        continue
      }

      const hasProtocol = protocols.find(protocol => protocol === relayV2HopCodec)

      // Continue to next if it does not support Hop
      if (hasProtocol == null) {
        continue
      }

      const connections = this.components.getConnectionManager().getConnections(id)

      // If not connected, store for possible later use.
      if (connections.length === 0) {
        knownHopsToDial.push(id)
        continue
      }

      await this._addListenRelay(connections[0], id)

      // Check if already listening on enough relays
      if (this.relays.size >= this.maxReservations) {
        return
      }
    }

    // Try to listen on known peers that are not connected
    for (const peerId of knownHopsToDial) {
      await this._tryToListenOnRelay(peerId)

      // Check if already listening on enough relays
      if (this.relays.size >= this.maxReservations) {
        return
      }
    }

    // Try to find relays to hop on the network
    try {
      const cid = await namespaceToCid(RELAY_RENDEZVOUS_NS)
      for await (const provider of this.components.getContentRouting().findProviders(cid)) {
        if (provider.multiaddrs.length === 0) {
          continue
        }

        const peerId = provider.id
        await this.components.getPeerStore().addressBook.add(peerId, provider.multiaddrs)

        await this._tryToListenOnRelay(peerId)

        // Check if already listening on enough relays
        if (this.relays.size >= this.maxReservations) {
          return
        }
      }
    } catch (err: any) {
      this.onError(err)
    }
  }

  async _tryToListenOnRelay (peerId: PeerId) {
    try {
      const connection = await this.components.getConnectionManager().openConnection(peerId)
      await this._addListenRelay(connection, peerId)
    } catch (err: any) {
      log.error('Could not use %p as relay', peerId, err)
      this.onError(err, `could not connect and listen on known hop relay ${peerId.toString()}`)
    }
  }
}
