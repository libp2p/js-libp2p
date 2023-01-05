import { multiaddr } from '@multiformats/multiaddr'
import { CircuitRelay } from './pb/index.js'
import type { StreamHandlerV1 } from './stream-handler.js'

/**
 * Write a response
 */
function writeResponse (streamHandler: StreamHandlerV1, status: CircuitRelay.Status) {
  streamHandler.write({
    type: CircuitRelay.Type.STATUS,
    code: status
  })
}

/**
 * Validate incomming HOP/STOP message
 */
export function validateAddrs (msg: CircuitRelay, streamHandler: StreamHandlerV1) {
  try {
    if (msg.dstPeer?.addrs != null) {
      msg.dstPeer.addrs.forEach((addr) => {
        return multiaddr(addr)
      })
    }
  } catch (err: any) {
    writeResponse(streamHandler, msg.type === CircuitRelay.Type.HOP
      ? CircuitRelay.Status.HOP_DST_MULTIADDR_INVALID
      : CircuitRelay.Status.STOP_DST_MULTIADDR_INVALID)
    throw err
  }

  try {
    if (msg.srcPeer?.addrs != null) {
      msg.srcPeer.addrs.forEach((addr) => {
        return multiaddr(addr)
      })
    }
  } catch (err: any) {
    writeResponse(streamHandler, msg.type === CircuitRelay.Type.HOP
      ? CircuitRelay.Status.HOP_SRC_MULTIADDR_INVALID
      : CircuitRelay.Status.STOP_SRC_MULTIADDR_INVALID)
    throw err
  }
}
