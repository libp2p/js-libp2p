import { logger } from '@libp2p/logger'
import { RELAY_V2_HOP_CODEC } from './multicodec.js'
import { getExpiration, namespaceToCid } from './utils.js'
import {
  CIRCUIT_PROTO_CODE,
  DEFAULT_MAX_RESERVATIONS,
  RELAY_RENDEZVOUS_NS
} from './constants.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { AddressSorter } from '@libp2p/interface-peer-store'
import type { Connection } from '@libp2p/interface-connection'
import sort from 'it-sort'
import all from 'it-all'
import { pipe } from 'it-pipe'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { reserve } from './v2/index.js'
import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Components } from '../components.js'
import type { RelayReservationManagerConfig } from './index.js'

const log = logger('libp2p:circuit:client')

const noop = () => { }

/**
 * CircuitServiceInit initializes the circuit service using values
 * from the provided config and an @type{AddressSorter}.
 */
export interface CircuitServiceInit extends RelayReservationManagerConfig {
  /**
   * Allows prioritizing addresses from the peerstore for dialing. The
   * default behavior is to prioritise public addresses.
   */
  addressSorter?: AddressSorter
  /**
   * A callback to invoke when an error occurs in the circuit service.
   */
  onError?: (error: Error, msg?: string) => void
}

export interface RelayReservationManagerEvents {
  'relay:reservation': CustomEvent
}

/**
 * ReservationManager automatically makes a circuit v2 reservation on any connected
 * peers that support the circuit v2 HOP protocol.
 */
export class RelayReservationManager extends EventEmitter<RelayReservationManagerEvents> implements Startable {
  private readonly components: Components
  private readonly addressSorter: AddressSorter
  private readonly maxReservations: number
  private readonly relays: Set<string>
  private readonly reservationMap: Map<PeerId, ReturnType<typeof setTimeout>>
  private readonly onError: (error: Error, msg?: string) => void
  private started: boolean

  constructor (components: Components, init: CircuitServiceInit) {
    super()
    this.started = false
    this.components = components
    this.addressSorter = init.addressSorter ?? publicAddressesFirst
    this.maxReservations = init.maxReservations ?? DEFAULT_MAX_RESERVATIONS
    this.relays = new Set()
    this.reservationMap = new Map()
    this.onError = init.onError ?? noop

    this._onProtocolChange = this._onProtocolChange.bind(this)
    this._onPeerDisconnected = this._onPeerDisconnected.bind(this)

    this.components.peerStore.addEventListener('change:protocols', (evt) => {
      void this._onProtocolChange(evt.detail).catch(err => {
        log.error(err)
      })
    })

    this.components.connectionManager.addEventListener('peer:disconnect', (evt) => {
      this._onPeerDisconnected(evt)
    })
  }

  isStarted () {
    return this.started
  }

  start () {
    void this._listenOnAvailableHopRelays().catch(err => { log.error('error listening on relays', err) })
    this.started = true
  }

  async stop () {
    for (const timer of this.reservationMap.values()) {
      clearTimeout(timer)
    }
    this.reservationMap.clear()
    this.relays.clear()
  }

  /**
   * Check if a peer supports the relay protocol.
   * If the protocol is not supported, check if it was supported before and remove it as a listen relay.
   * If the protocol is supported, check if the peer supports **HOP** and add it as a listener if
   * inside the threshold.
   */
  async _onProtocolChange ({ peerId, protocols }: { peerId: PeerId, protocols: string[] }) {
    const id = peerId.toString()

    if (peerId.equals(this.components.peerId)) {
      return
    }

    // Check if it has the protocol
    const hasProtocol = protocols.includes(RELAY_V2_HOP_CODEC)
    log.trace('Peer %p protocol change %p', peerId, this.components.peerId)

    // If no protocol, check if we were keeping the peer before as a listenRelay
    if (!hasProtocol) {
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
      const connections = this.components.connectionManager.getConnections(peerId)

      const connection = connections[0]

      if (connection == null) {
        void this._tryToListenOnRelay(peerId)
        return
      }

      // Do not hop on a relayed connection
      if (connection.remoteAddr.protoCodes().includes(CIRCUIT_PROTO_CODE)) {
        log(`relayed connection to ${id} will not be used to hop on`)
        return
      }
      log.trace(`Peer ${peerId.toString()} adding as relay`)
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
    clearTimeout(this.reservationMap.get(peerId))
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
    log.trace(`Peer ${peerId.toString()} is being added as relay`)
    try {
      // Check if already enough relay reservations
      if (this.relays.size >= this.maxReservations) {
        return
      }

      await this.createOrRefreshReservation(peerId)

      // Get peer known addresses and sort them with public addresses first
      const remoteAddrs = await pipe(
        await this.components.peerStore.addressBook.get(connection.remotePeer),
        (source) => sort(source, this.addressSorter),
        async (source) => await all(source)
      )

      // Attempt to listen on relay
      const result = await Promise.all(
        remoteAddrs.map(async addr => {
          let multiaddr = addr.multiaddr

          if (multiaddr.getPeerId() == null) {
            multiaddr = multiaddr.encapsulate(`/p2p/${connection.remotePeer.toString()}`)
          }
          multiaddr = multiaddr.encapsulate('/p2p-circuit')
          try {
            // Announce multiaddrs will update on listen success by TransportManager event being triggered
            await this.components.transportManager.listen([multiaddr])
            return true
          } catch (err: any) {
            log.error('error listening on circuit address', multiaddr, err)
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
      /* eslint-disable-next-line no-warning-comments */
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

    const knownHopsToDial: PeerId[] = []
    const peers = (await this.components.peerStore.all())
      // filter by a list of peers supporting RELAY_V2_HOP and ones we are not listening on
      .filter(({ id, protocols }) => {
        const idString = id.toString()
        return protocols.includes(RELAY_V2_HOP_CODEC) && !this.relays.has(idString) && !peersToIgnore.includes(idString)
      })
      .map(({ id }) => {
        const connections = this.components.connectionManager.getConnections(id)
        if (connections.length === 0) {
          knownHopsToDial.push(id)
          return [id, null]
        }
        return [id, connections[0]]
      })
      .sort(() => Math.random() - 0.5)

    // Check if we have known hop peers to use and attempt to listen on the already connected
    for (const [id, conn] of peers) {
      await this._addListenRelay(conn as Connection, id as PeerId)

      // Check if already listening on enough relays
      if (this.relays.size >= this.maxReservations) {
        return
      }
    }

    // Try to listen on known peers that are not connected
    for (const peerId of knownHopsToDial) {
      // Check if already listening on enough relays
      if (this.relays.size >= this.maxReservations) {
        return
      }

      await this._tryToListenOnRelay(peerId)
    }

    // Try to find relays to hop on the network
    try {
      const cid = await namespaceToCid(RELAY_RENDEZVOUS_NS)
      for await (const provider of this.components.contentRouting.findProviders(cid)) {
        if (provider.multiaddrs.length === 0) {
          /* eslint-disable-next-line no-continue */
          continue
        }

        const peerId = provider.id

        if (peerId.equals(this.components.peerId)) {
          // Skip the provider if it's us as dialing will fail
          /* eslint-disable-next-line no-continue */
          continue
        }

        await this.components.peerStore.addressBook.add(peerId, provider.multiaddrs)

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
      if (peerId.equals(this.components.peerId)) {
        log.trace('Skipping dialling self', peerId.toString())
        return
      }
      const connection = await this.components.connectionManager.openConnection(peerId)
      await this._addListenRelay(connection, peerId)
    } catch (err: any) {
      log.error('Could not use %p as relay', peerId, err)
      this.onError(err, `could not connect and listen on known hop relay ${peerId.toString()}`)
    }
  }

  private readonly createOrRefreshReservation = async (peerId: PeerId) => {
    try {
      const connections = this.components.connectionManager.getConnections(peerId)

      if (connections.length === 0) {
        throw new Error('No connections to peer')
      }

      const connection = connections[0]

      const reservation = await reserve(connection)

      const refreshReservation = this.createOrRefreshReservation

      if (reservation != null) {
        log('new reservation on ', peerId.toString())
        this.reservationMap.set(
          peerId,
          setTimeout(
            (peerId) => { void refreshReservation(peerId) },
            Math.max(getExpiration(reservation.expire) - 100, 0),
            peerId
          )
        )
        this.dispatchEvent(new CustomEvent<any>('relay:reservation'))
      }
    } catch (err: any) {
      log.error(err)
      await this._removeListenRelay(peerId.toString())
    }
  }
}
