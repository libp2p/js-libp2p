import { generateKeyPair } from '@libp2p/crypto/keys'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import type { RPC } from '../../src/message/rpc.js'
import type { TopicStr } from '../../src/types.js'
import type { PeerId } from '@libp2p/interface'

export * from './msgId.js'

export const createPeerId = async (): Promise<PeerId> => {
  const peerId = peerIdFromPrivateKey(await generateKeyPair('Ed25519'))

  return peerId
}

let seq = 0n
const defaultPeer = uint8ArrayFromString('12D3KooWBsYhazxNL7aeisdwttzc6DejNaM48889t5ifiS6tTrBf', 'base58btc')

export function makeTestMessage (i: number, topic: TopicStr, from?: PeerId): RPC.Message {
  return {
    seqno: uint8ArrayFromString((seq++).toString(16).padStart(16, '0'), 'base16'),
    data: Uint8Array.from([i]),
    from: from?.toMultihash().bytes ?? defaultPeer,
    topic
  }
}
