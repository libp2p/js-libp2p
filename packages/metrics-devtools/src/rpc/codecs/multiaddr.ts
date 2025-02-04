import { isMultiaddr, multiaddr } from '@multiformats/multiaddr'
import type { Multiaddr } from '@multiformats/multiaddr'
import type { ValueCodec } from 'it-rpc'

export const multiaddrCodec: ValueCodec<Multiaddr> = {
  type: 4097,
  canEncode: (val) => isMultiaddr(val),
  encode: (val) => val.bytes,
  decode: (buf) => multiaddr(buf)
}
