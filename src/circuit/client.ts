import { logger } from '@libp2p/logger'
import { RELAY_V2_HOP_CODEC } from './multicodec.js'
import { getExpiration, namespaceToCid } from './utils.js'
import {
  CIRCUIT_PROTO_CODE,
  RELAY_RENDEZVOUS_NS
} from './constants.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { AddressSorter } from '@libp2p/interface-peer-store'
import type { Connection } from '@libp2p/interface-connection'
import type { Components } from '@libp2p/components'
import sort from 'it-sort'
import all from 'it-all'
import { pipe } from 'it-pipe'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'
import { reserve } from './v2/index.js'
import { EventEmitter, CustomEvent } from '@libp2p/interfaces/events'
import type { Startable } from '@libp2p/interfaces/startable'

const log = logger('libp2p:circuit_client')

const noop = () => {}

export interface CircuitServiceInit {
  addressSorter?: AddressSorter
  maxReservations?: number
  onError?: (error: Error, msg?: string) => void
}

export interface CircuitServiceEvents {
  'relay:reservation': CustomEvent
}

export class CircuitService extends EventEmitter<CircuitServiceEvents> implements Startable {
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
    this.maxReservations = init.maxReservations ?? 1
    this.relays = new Set()
    this.reservationMap = new Map()
    this.onError = init.onError ?? noop

    this._onProtocolChange = this._onProtocolChange.bind(this)
    this._onPeerDisconnected = this._onPeerDisconnected.bind(this)

    this.components.getPeerStore().addEventListener('change:protocols', (evt) => {
      void this._onProtocolChange(evt.detail).catch(err => {
        log.error(err)
      })
    })

    this.components.getConnectionManager().addEventListener('peer:disconnect', (evt) => {
      this._onPeerDisconnected(evt)
    })

    this.components.getConnectionManager().addEventListener('peer:connect', (evt) => {
      log.trace('Connected', evt.detail.remotePeer.toString(), this.components.getPeerId().toString())
    })
  }

  isStarted () {
    return this.started
  }

  start () {
    void this._listenOnAvailableHopRelays()
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
  async _onProtocolChange ({ peerId, protocols }: {peerId: PeerId, protocols: string[]}) {
    const id = peerId.toString()

    if (peerId.equals(this.components.getPeerId())) {
      return
    }

    // Check if it has the protocol
    const hasProtocol = protocols.find(protocol => protocol === RELAY_V2_HOP_CODEC)
    log.trace(`Peer ${peerId.toString()} protocol change`, this.components.getPeerId().toString())

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
      log.trace('Checking if peer relay', idStr, protocols, { me: this.components.getPeerId().toString() })

      // Continue to next if listening on this or peer to ignore
      if (this.relays.has(idStr)) {
        continue
      }

      if (peersToIgnore.includes(idStr)) {
        continue
      }

      const hasProtocol = protocols.find(protocol => protocol === RELAY_V2_HOP_CODEC)

      // Continue to next if it does not support Hop
      if (hasProtocol == null) {
        continue
      }
      log.trace('Found peer with relay codec', id)

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
      if (peerId.equals(this.components.getPeerId())) {
        log.trace('Skipping dialling self', peerId.toString())
        return
      }
      const connection = await this.components.getConnectionManager().openConnection(peerId)
      await this._addListenRelay(connection, peerId)
    } catch (err: any) {
      log.error('Could not use %p as relay', peerId, err)
      this.onError(err, `could not connect and listen on known hop relay ${peerId.toString()}`)
    }
  }

  private readonly createOrRefreshReservation = async (peerId: PeerId) => {
    try {
      const connections = this.components.getConnectionManager().getConnections(peerId)

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
