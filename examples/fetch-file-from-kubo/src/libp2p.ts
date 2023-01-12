import { webTransport } from '@libp2p/webtransport'
import { noise } from '@chainsafe/libp2p-noise'
import { createLibp2p, Libp2p } from 'libp2p'
import { createBitswap } from 'ipfs-bitswap'
import { MemoryBlockstore } from 'blockstore-core/memory'

type Bitswap = ReturnType<typeof createBitswap>

export async function setup (): Promise<{ libp2p: Libp2p, bitswap: Bitswap }> {
  const store = new MemoryBlockstore()

  const node = await createLibp2p({
    transports: [webTransport()],
    connectionEncryption: [noise()]
  })

  await node.start()

  const bitswap = createBitswap(node, store)
  await bitswap.start()

  return { libp2p: node, bitswap }
}
