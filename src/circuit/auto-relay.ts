import { logger } from '@libp2p/logger'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { RELAY_CODEC } from './multicodec.js'
import { canHop } from './circuit/hop.js'
import { namespaceToCid } from './utils.js'
import {
  CIRCUIT_PROTO_CODE,
  HOP_METADATA_KEY,
  HOP_METADATA_VALUE,
  RELAY_RENDEZVOUS_NS
} from './constants.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { AddressSorter, PeerProtocolsChangeData } from '@libp2p/interface-peer-store'
import type { Connection } from '@libp2p/interface-connection'
import type { Components } from '@libp2p/components'
import sort from 'it-sort'
import all from 'it-all'
import { pipe } from 'it-pipe'
import { publicAddressesFirst } from '@libp2p/utils/address-sort'

const log = logger('libp2p:auto-relay')

const noop = () => {}

export interface AutoRelayInit {
  addressSorter?: AddressSorter
  maxListeners?: number
  onError?: (error: Error, msg?: string) => void
}

export class AutoRelay {
  private readonly components: Components
  private readonly addressSorter: AddressSorter
  private readonly maxListeners: number
  private readonly listenRelays: Set<string>
  private readonly onError: (error: Error, msg?: string) => void

  constructor (components: Components, init: AutoRelayInit) {
    this.components = components
    this.addressSorter = init.addressSorter ?? publicAddressesFirst
    this.maxListeners = init.maxListeners ?? 1
    this.listenRelays = new Set()
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
    const hasProtocol = protocols.find(protocol => protocol === RELAY_CODEC)

    // If no protocol, check if we were keeping the peer before as a listenRelay
    if (hasProtocol == null) {
      if (this.listenRelays.has(id)) {
        await this._removeListenRelay(id)
      }

      return
    }

    if (this.listenRelays.has(id)) {
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

      const supportsHop = await canHop({ connection })

      if (supportsHop) {
        await this.components.getPeerStore().metadataBook.setValue(peerId, HOP_METADATA_KEY, uint8ArrayFromString(HOP_METADATA_VALUE))
        await this._addListenRelay(connection, id)
      }
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

    // Not listening on this relay
    if (!this.listenRelays.has(id)) {
      return
    }

    this._removeListenRelay(id).catch(err => {
      log.error(err)
    })
  }

  /**
   * Attempt to listen on the given relay connection
   */
  async _addListenRelay (connection: Connection, id: string): Promise<void> {
    try {
      // Check if already listening on enough relays
      if (this.listenRelays.size >= this.maxListeners) {
        return
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
        this.listenRelays.add(id)
      }
    } catch (err: any) {
      this.onError(err)
      this.listenRelays.delete(id)
    }
  }

  /**
   * Remove listen relay
   */
  async _removeListenRelay (id: string) {
    if (this.listenRelays.delete(id)) {
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
    // TODO: The peer redial issue on disconnect should be handled by connection gating
    // Check if already listening on enough relays
    if (this.listenRelays.size >= this.maxListeners) {
      return
    }

    const knownHopsToDial = []
    const peers = await this.components.getPeerStore().all()

    // Check if we have known hop peers to use and attempt to listen on the already connected
    for (const { id, metadata } of peers) {
      const idStr = id.toString()

      // Continue to next if listening on this or peer to ignore
      if (this.listenRelays.has(idStr)) {
        continue
      }

      if (peersToIgnore.includes(idStr)) {
        continue
      }

      const supportsHop = metadata.get(HOP_METADATA_KEY)

      // Continue to next if it does not support Hop
      if ((supportsHop == null) || uint8ArrayToString(supportsHop) !== HOP_METADATA_VALUE) {
        continue
      }

      const connections = this.components.getConnectionManager().getConnections(id)

      // If not connected, store for possible later use.
      if (connections.length === 0) {
        knownHopsToDial.push(id)
        continue
      }

      await this._addListenRelay(connections[0], idStr)

      // Check if already listening on enough relays
      if (this.listenRelays.size >= this.maxListeners) {
        return
      }
    }

    // Try to listen on known peers that are not connected
    for (const peerId of knownHopsToDial) {
      await this._tryToListenOnRelay(peerId)

      // Check if already listening on enough relays
      if (this.listenRelays.size >= this.maxListeners) {
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

        if (peerId.equals(this.components.getPeerId())) {
          // Skip the provider if it's us as dialing will fail
          continue
        }

        await this.components.getPeerStore().addressBook.add(peerId, provider.multiaddrs)

        await this._tryToListenOnRelay(peerId)

        // Check if already listening on enough relays
        if (this.listenRelays.size >= this.maxListeners) {
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
      await this._addListenRelay(connection, peerId.toString())
    } catch (err: any) {
      log.error('Could not use %p as relay', peerId, err)
      this.onError(err, `could not connect and listen on known hop relay ${peerId.toString()}`)
    }
  }
}
