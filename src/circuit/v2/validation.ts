import { Multiaddr } from '@multiformats/multiaddr'
import { Status, StopMessage, HopMessage } from './pb/index.js'
import type { StreamHandlerV2 } from './stream-handler.js'

export function validateStopConnectRequest (request: StopMessage, streamHandler: StreamHandlerV2) {
  if (request.type !== StopMessage.Type.CONNECT) {
    writeStopMessageResponse(streamHandler, Status.UNEXPECTED_MESSAGE)
    throw new Error('Received unexpected stop status msg')
  }
  try {
    if (request.peer?.addrs !== null && request.peer?.addrs !== undefined) {
      request.peer.addrs.forEach((addr) => {
        return new Multiaddr(addr)
      })
    } else {
      throw new Error('Missing peer info in stop request')
    }
  } catch (/** @type {any} */ err) {
    writeStopMessageResponse(streamHandler, Status.MALFORMED_MESSAGE)
    throw err
  }
}

export function validateHopConnectRequest (request: HopMessage, streamHandler: StreamHandlerV2) {
  // TODO: check if relay connection

  try {
    if (request.peer?.addrs !== null && request.peer?.addrs !== undefined) {
      request.peer.addrs.forEach((addr) => {
        return new Multiaddr(addr)
      })
    } else {
      throw new Error('Missing peer info in hop connect request')
    }
  } catch (/** @type {any} */ err) {
    writeHopMessageResponse(streamHandler, Status.MALFORMED_MESSAGE)
    throw err
  }
}

/**
 * Write a response
 *
 */
function writeStopMessageResponse (streamHandler: StreamHandlerV2, status: Status) {
  streamHandler.write(StopMessage.encode(
    {
      type: StopMessage.Type.STATUS,
      status: status
    }
  ))
}

/**
 * Write a response
 *
 * @param {StreamHandler} streamHandler
 * @param {import('./pb').Status} status
 */
function writeHopMessageResponse (streamHandler: StreamHandlerV2, status: Status) {
  streamHandler.write(HopMessage.encode(
    {
      type: HopMessage.Type.STATUS,
      status: status
    }
  ))
}
