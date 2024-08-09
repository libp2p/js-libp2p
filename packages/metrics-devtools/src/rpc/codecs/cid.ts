import { CID } from 'multiformats/cid'
import type { ValueCodec } from 'it-rpc'

export const cidCodec: ValueCodec<CID> = {
  type: 4096,
  canEncode: (val) => val.code != null && val.version != null && val.multihash != null && val['/'] != null,
  encode: (val) => val.bytes,
  decode: (buf) => CID.decode(buf)
}
