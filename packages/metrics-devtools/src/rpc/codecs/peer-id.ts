import { isPeerId } from '@libp2p/interface'
import { peerIdFromMultihash } from '@libp2p/peer-id'
import * as Digest from 'multiformats/hashes/digest'
import type { PeerId } from '@libp2p/interface'
import type { ValueCodec } from 'it-rpc'

export const peerIdCodec: ValueCodec<PeerId> = {
  type: 4098,
  canEncode: (val) => isPeerId(val),
  encode: (val) => val.toMultihash().bytes,
  decode: (buf) => peerIdFromMultihash(Digest.decode(buf))
}
