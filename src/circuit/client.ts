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
import { PeerSet, PeerMap, PeerList } from '@libp2p/peer-collections'

const log = logger('libp2p:circuit:client')

const noop = () => {}

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
  onError?: (error: Error) => void
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
  private readonly relays: PeerSet
  private readonly reservationMap: PeerMap<ReturnType<typeof setTimeout>>
  private readonly onError: (error: Error) => void
  private started: boolean

  constructor (components: Components, init: CircuitServiceInit) {
    super()
    this.started = false
    this.components = components
    this.addressSorter = init.addressSorter ?? publicAddressesFirst
    this.maxReservations = init.maxReservations ?? DEFAULT_MAX_RESERVATIONS
    this.relays = new PeerSet()
    this.reservationMap = new PeerMap()
    this.onError = init.onError ?? noop

    this._onProtocolChange = this._onProtocolChange.bind(this)
    this._onPeerDisconnected = this._onPeerDisconnected.bind(this)
    this._onPeerConnect = this._onPeerConnect.bind(this)

    this.components.peerStore.addEventListener('change:protocols', (evt) => {
      void this._onProtocolChange(evt.detail).catch(err => {
        log.error('handling protocol change failed', err)
      })
    })

    this.components.connectionManager.addEventListener('peer:disconnect', this._onPeerDisconnected)
    this.components.connectionManager.addEventListener('peer:connect', this._onPeerConnect)
  }

  isStarted () {
    return this.started
  }

  start () {
    void this._listenOnAvailableHopRelays().catch(err => { log.error('error listening on relays', err) })
    this.started = true
  }

  async stop () {
    this.reservationMap.forEach((timer) => clearTimeout(timer))
    this.reservationMap.clear()
    this.relays.clear()
  }

  /**
   * Check if a peer supports the relay protocol.
   * If the protocol is not supported, check if it was supported before and remove it as a listen relay.
   * If the protocol is supported, check if the peer supports **HOP** and add it as a listener if
   * inside the threshold.
   */
  async _onProtocolChange ({ peerId, protocols }: {peerId: PeerId, protocols: string[]}) {
    if (peerId.equals(this.components.peerId)) {
      return
    }

    // Check if it has the protocol
    const hasProtocol = protocols.includes(RELAY_V2_HOP_CODEC)
    log.trace('Peer %p protocol change %p', peerId, this.components.peerId)

    // If no protocol, check if we were keeping the peer before as a listenRelay
    if (!hasProtocol) {
      if (this.relays.has(peerId)) {
        await this._removeListenRelay(peerId)
      }
      return
    }

    if (this.relays.has(peerId)) {
      return
    }

    // If protocol, check if can hop, store info in the metadataBook and listen on it
    try {
      const connections = this.components.connectionManager.getConnections(peerId)

      // if no connections, try to listen on relay
      if (connections.length === 0) {
        void this._tryToListenOnRelay(peerId)
        return
      }
      const connection = connections[0]

      // Do not hop on a relayed connection
      if (connection.remoteAddr.protoCodes().includes(CIRCUIT_PROTO_CODE)) {
        log('relayed connection to %p will not be used to hop on', peerId)
        return
      }

      await this._addListenRelay(connection, peerId)
    } catch (err: any) {
      log.error('could not add %p as relay', peerId)
      this.onError(err)
    }
  }

  /**
   * Handle case when peer connects. If we already have the peer in the protobook,
   * we treat this event as an `onProtocolChange`.
   */
  _onPeerConnect ({ detail: connection }: CustomEvent<Connection>) {
    void this.components.peerStore.protoBook.get(connection.remotePeer)
      .then((protocols) => {
        void this._onProtocolChange({ peerId: connection.remotePeer, protocols })
          .catch((err) => log.error('handling reconnect failed', err))
      },
      (err) => {
        // this is not necessarily an error as we will only have the protocols stored
        // in case of a reconnect
        log.trace('could not fetch protocols for peer: %p', connection.remotePeer, err)
      })
  }

  /**
   * Peer disconnects
   */
  _onPeerDisconnected (evt: CustomEvent<Connection>) {
    const connection = evt.detail
    const peerId = connection.remotePeer
    clearTimeout(this.reservationMap.get(peerId))
    this.reservationMap.delete(peerId)

    // Not listening on this relay
    if (!this.relays.has(peerId)) {
      return
    }

    this._removeListenRelay(peerId).catch(err => {
      log.error(err)
    })
  }

  /**
   * Attempt to listen on the given relay connection
   */
  async _addListenRelay (connection: Connection, peerId: PeerId): Promise<void> {
    log.trace('peerId %p is being added as relay', peerId)
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
        this.relays.add(peerId)
      }
    } catch (err: any) {
      this.relays.delete(peerId)
      log.error('error adding relay for %p %s', peerId, err)
      this.onError(err)
    }
  }

  /**
   * Remove listen relay
   */
  async _removeListenRelay (PeerId: PeerId) {
    const recheck = this.relays.has(PeerId)
    this.relays.delete(PeerId)
    if (recheck) {
      // TODO: this should be responsibility of the connMgr
      await this._listenOnAvailableHopRelays(new PeerList([PeerId]))
    }
  }

  /**
   * Try to listen on available hop relay connections.
   * The following order will happen while we do not have enough relays.
   * 1. Check the metadata store for known relays, try to listen on the ones we are already connected.
   * 2. Dial and try to listen on the peers we know that support hop but are not connected.
   * 3. Search the network.
   */
  async _listenOnAvailableHopRelays (peersToIgnore: PeerList = new PeerList([])) {
    // Check if already listening on enough relays
    if (this.relays.size >= this.maxReservations) {
      return
    }

    const knownHopsToDial: PeerId[] = []
    const peers = (await this.components.peerStore.all())
      // filter by a list of peers supporting RELAY_V2_HOP and ones we are not listening on
      .filter(({ id, protocols }) =>
        protocols.includes(RELAY_V2_HOP_CODEC) && !this.relays.has(id) && !peersToIgnore.includes(id)
      )
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
        if (
          provider.multiaddrs.length > 0 &&
          !provider.id.equals(this.components.peerId)
        ) {
          const peerId = provider.id

          await this.components.peerStore.addressBook.add(peerId, provider.multiaddrs)
          await this._tryToListenOnRelay(peerId)

          // Check if already listening on enough relays
          if (this.relays.size >= this.maxReservations) {
            return
          }
        }
      }
    } catch (err: any) {
      log.error('failed when finding relays on the network', err)
      this.onError(err)
    }
  }

  async _tryToListenOnRelay (peerId: PeerId) {
    try {
      if (peerId.equals(this.components.peerId)) {
        log.trace('Skipping dialling self %p', peerId.toString())
        return
      }
      const connection = await this.components.connectionManager.openConnection(peerId)
      await this._addListenRelay(connection, peerId)
    } catch (err: any) {
      log.error('Could not connect and listen on relay %p', peerId, err)
      this.onError(err)
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
        log('new reservation on %p', peerId)

        // clear any previous timeouts
        const previous = this.reservationMap.get(peerId)
        if (previous != null) {
          clearTimeout(previous)
        }

        const timeout = setTimeout(
          (peerId: PeerId) => {
            void refreshReservation(peerId).catch(err => {
              log.error('error refreshing reservation for %p', peerId, err)
            })
          },
          Math.max(getExpiration(reservation.expire) - 100, 0),
          peerId
        )
        this.reservationMap.set(
          peerId,
          timeout
        )
        this.dispatchEvent(new CustomEvent<unknown>('relay:reservation'))
      }
    } catch (err: any) {
      log.error(err)
      await this._removeListenRelay(peerId)
    }
  }
}
