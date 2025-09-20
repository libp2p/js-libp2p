import { digest } from '@chainsafe/as-sha256'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { messageIdToString } from '../../src/utils/messageIdToString.js'
import type { RPC } from '../../src/message/rpc.js'

export const getMsgId = (msg: RPC.Message): Uint8Array => {
  const from = msg.from ?? new Uint8Array(0)
  const seqno = msg.seqno instanceof Uint8Array ? msg.seqno : uint8ArrayFromString(msg.seqno ?? '')
  const result = new Uint8Array(from.length + seqno.length)
  result.set(from, 0)
  result.set(seqno, from.length)
  return result
}

export const getMsgIdStr = (msg: RPC.Message): string => messageIdToString(getMsgId(msg))

export const fastMsgIdFn = (msg: RPC.Message): string =>

  msg.data != null ? messageIdToString(digest(msg.data)) : '0'
