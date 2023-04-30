import { multiaddr } from '@multiformats/multiaddr'
import Peers from '../../fixtures/peers.js'
import { createBaseOptions } from '../base-options.browser.js'
import { createEd25519PeerId, createFromJSON, createRSAPeerId } from '@libp2p/peer-id-factory'
import { createLibp2pNode, Libp2pNode } from '../../../src/libp2p.js'
import pTimes from 'p-times'
import type { Libp2pOptions } from '../../../src/index.js'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { AddressManagerInit } from '../../../src/address-manager/index.js'
import type { Libp2p, ServiceMap } from '@libp2p/interface-libp2p'

const listenAddr = multiaddr('/ip4/127.0.0.1/tcp/0')

export interface CreatePeerOptions <T extends ServiceMap> {
  /**
   * number of peers (default: 1)
   */
  number?: number

  /**
   * fixture index for peer-id generation
   */
  fixture?: number

  /**
   * nodes should start (default: true)
   */
  started?: boolean

  config?: Libp2pOptions<T>
}

/**
 * Create libp2p nodes.
 */
export async function createNode <T extends ServiceMap> (options: CreatePeerOptions<T> = {}): Promise<Libp2pNode<T>> {
  const started = options.started ?? true
  const config = options.config ?? {}
  const peerId = await createPeerId({ fixture: options.fixture })
  const addresses: AddressManagerInit = started
    ? {
        listen: [listenAddr.toString()],
        announce: [],
        noAnnounce: [],
        announceFilter: (addrs) => addrs
      }
    : {
        listen: [],
        announce: [],
        noAnnounce: [],
        announceFilter: (addrs) => addrs
      }
  const peer = await createLibp2pNode(createBaseOptions({
    peerId,
    addresses,
    start: started,
    ...config
  }))

  if (started) {
    await peer.start()
  }

  return peer
}

export async function populateAddressBooks (peers: Libp2p[]): Promise<void> {
  for (let i = 0; i < peers.length; i++) {
    for (let j = 0; j < peers.length; j++) {
      if (i !== j) {
        await peers[i].peerStore.patch(peers[j].peerId, {
          multiaddrs: peers[j].getMultiaddrs()
        })
      }
    }
  }
}

export interface CreatePeerIdOptions {

  /**
   * fixture index for peer-id generation (default: 0)
   */
  fixture?: number

  /**
   * Options to pass to the PeerId constructor
   */
  opts?: {
    type?: 'rsa' | 'ed25519'
    bits?: number
  }
}

/**
 * Create Peer-id
 */
export async function createPeerId (options: CreatePeerIdOptions = {}): Promise<PeerId> {
  const opts = options.opts ?? {}

  if (options.fixture == null) {
    return opts.type === 'rsa' ? await createRSAPeerId({ bits: opts.bits ?? 512 }) : await createEd25519PeerId()
  }

  return await createFromJSON(Peers[options.fixture])
}

/**
 * Create Peer-ids
 */
export async function createPeerIds (count: number, options: Omit<CreatePeerIdOptions, 'fixture'> = {}): Promise<PeerId[]> {
  const opts = options.opts ?? {}

  return await pTimes(count, async (i) => await createPeerId({
    ...opts,
    fixture: i
  }))
}
