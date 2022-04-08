import { Multiaddr } from '@multiformats/multiaddr'
import Peers from '../../fixtures/peers.js'
import { createBaseOptions } from '../base-options.browser.js'
import { createEd25519PeerId, createFromJSON, createRSAPeerId } from '@libp2p/peer-id-factory'
import { createLibp2pNode, Libp2pNode } from '../../../src/libp2p.js'
import type { AddressesConfig, Libp2pOptions } from '../../../src/index.js'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import pTimes from 'p-times'

const listenAddr = new Multiaddr('/ip4/127.0.0.1/tcp/0')

export interface CreatePeerOptions {
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

  config?: Libp2pOptions
}

/**
 * Create libp2p nodes.
 */
export async function createNode (options: CreatePeerOptions = {}): Promise<Libp2pNode> {
  const started = options.started ?? true
  const config = options.config ?? {}
  const peerId = await createPeerId({ fixture: options.fixture })
  const addresses: AddressesConfig = started
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
    ...config
  }))

  if (started) {
    await peer.start()
  }

  return peer
}

export async function populateAddressBooks (peers: Libp2pNode[]) {
  for (let i = 0; i < peers.length; i++) {
    for (let j = 0; j < peers.length; j++) {
      if (i !== j) {
        await peers[i].components.getPeerStore().addressBook.set(peers[j].peerId, peers[j].components.getAddressManager().getAddresses())
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
