import { isPeerId } from '@libp2p/interface'
import { peerIdFromBytes } from '@libp2p/peer-id'
import type { PeerId } from '@libp2p/interface'
import type { ValueCodec } from 'it-rpc'

export const peerIdCodec: ValueCodec<PeerId> = {
  type: 4098,
  canEncode: (val) => isPeerId(val),
  encode: (val) => val.toBytes(),
  decode: (buf) => peerIdFromBytes(buf)
}
