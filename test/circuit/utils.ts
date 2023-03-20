import type { ContentRouting } from '@libp2p/interface-content-routing'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PeerInfo } from '@libp2p/interface-peer-info'
import type { AbortOptions } from '@libp2p/interfaces'
import type { CID, Version } from 'multiformats'
import type { Libp2pOptions } from '../../src/index.js'
import { createBaseOptions } from '../utils/base-options.js'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { AddressManager } from '@libp2p/interface-address-manager'
import type { Libp2p } from '@libp2p/interface-libp2p'
import type { Options as PWaitForOptions } from 'p-wait-for'
import pWaitFor from 'p-wait-for'
import { peerIdFromString } from '@libp2p/peer-id'
import { RELAY_V2_HOP_CODEC } from '../../src/circuit/constants.js'
import type { Multiaddr } from '@multiformats/multiaddr'

const listenAddr = '/ip4/127.0.0.1/tcp/0'

export function createNodeOptions (...overrides: Libp2pOptions[]): Libp2pOptions {
  return createBaseOptions({
    addresses: {
      listen: [listenAddr]
    }
  }, ...overrides)
}

export async function usingAsRelay (node: Libp2p, relay: Libp2p, opts?: PWaitForOptions<boolean>): Promise<void> {
  // Wait for peer to be used as a relay
  await pWaitFor(() => {
    const relayAddrs = node.getMultiaddrs().filter(addr => addr.protoNames().includes('p2p-circuit'))

    if (relayAddrs.length > 0) {
      const search = `${relay.peerId.toString()}/p2p-circuit`

      if (relayAddrs.find(addr => addr.toString().includes(search)) != null) {
        return true
      }

      throw new Error('node had relay addresses that did not include the expected relay server')
    }

    return false
  }, opts)
}

export async function hasRelay (node: Libp2p, opts?: PWaitForOptions<PeerId>): Promise<PeerId> {
  let relayPeerId: PeerId | undefined

  // Wait for peer to be used as a relay
  await pWaitFor(() => {
    const relayAddrs = node.getMultiaddrs().filter(addr => addr.protoNames().includes('p2p-circuit'))

    if (relayAddrs.length === 0) {
      return false
    }

    if (relayAddrs.length !== 1) {
      throw new Error(`node listening on too many relays - ${relayAddrs.length}`)
    }

    for (const [code, value] of relayAddrs[0].stringTuples()) {
      if (code === 421 && value != null) {
        relayPeerId = peerIdFromString(value)
        break
      }
    }

    if (relayPeerId == null) {
      throw new Error('node had circuit relay address but address had no peer id')
    }

    if (relayPeerId.equals(node.peerId)) {
      throw new Error('node was listening on itself as a relay')
    }

    return true
  }, opts)

  if (relayPeerId == null) {
    throw new Error('could not find relay peer id')
  }

  return relayPeerId
}

export async function discoveredRelayConfig (node: Libp2p, relay: Libp2p, opts?: PWaitForOptions<boolean>): Promise<void> {
  await pWaitFor(async () => {
    const peerData = await node.peerStore.get(relay.peerId)
    return peerData.protocols.includes(RELAY_V2_HOP_CODEC)
  }, opts)
}

export function getRelayAddress (node: Libp2p): Multiaddr {
  const relayAddrs = node.getMultiaddrs().filter(addr => addr.protoNames().includes('p2p-circuit'))

  if (relayAddrs.length === 0) {
    throw new Error('could not find relay address')
  }

  if (relayAddrs.length > 1) {
    throw new Error('had too many relay addresses')
  }

  return relayAddrs[0]
}

export interface MockContentRoutingComponents {
  peerId: PeerId
  addressManager: AddressManager
}

export class MockContentRouting implements ContentRouting {
  static providers: Map<string, PeerInfo[]> = new Map()
  static data: Map<string, Uint8Array> = new Map()

  static reset (): void {
    MockContentRouting.providers.clear()
    MockContentRouting.data.clear()
  }

  private readonly peerId: PeerId
  private readonly addressManager: AddressManager

  constructor (components: MockContentRoutingComponents) {
    this.peerId = components.peerId
    this.addressManager = components.addressManager
  }

  async provide (cid: CID, options?: AbortOptions): Promise<void> {
    let providers = MockContentRouting.providers.get(cid.toString()) ?? []
    providers = providers.filter(peerInfo => !peerInfo.id.equals(this.peerId))

    providers.push({
      id: this.peerId,
      multiaddrs: this.addressManager.getAddresses(),
      protocols: []
    })

    MockContentRouting.providers.set(cid.toString(), providers)
  }

  async * findProviders (cid: CID<unknown, number, number, Version>, options?: AbortOptions | undefined): AsyncGenerator<PeerInfo, void, undefined> {
    yield * MockContentRouting.providers.get(cid.toString()) ?? []
  }

  async put (key: Uint8Array, value: Uint8Array, options?: AbortOptions): Promise<void> {
    MockContentRouting.data.set(uint8ArrayToString(key, 'base58btc'), value)
  }

  async get (key: Uint8Array, options?: AbortOptions): Promise<Uint8Array> {
    const value = MockContentRouting.data.get(uint8ArrayToString(key, 'base58btc'))

    if (value != null) {
      return await Promise.resolve(value)
    }

    return await Promise.reject(new Error('Not found'))
  }
}

export function mockContentRouting (): (components: MockContentRoutingComponents) => ContentRouting {
  return (components: MockContentRoutingComponents) => {
    return new MockContentRouting(components)
  }
}
