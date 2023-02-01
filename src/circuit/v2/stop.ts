
import { Status, StopMessage } from './pb/index.js'
import type { Connection } from '@libp2p/interface-connection'

import { logger } from '@libp2p/logger'
import { StreamHandlerV2 } from './stream-handler.js'
import { RELAY_V2_STOP_CODEC } from '../multicodec.js'
import type { Uint8ArrayList } from 'uint8arraylist'
import type { Duplex } from 'it-stream-types'
import { multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:circuit:v2:stop')

export interface HandleStopOptions {
  connection: Connection
  request: StopMessage
  streamHandler: StreamHandlerV2
}

const isValidStop = (request: StopMessage): boolean => {
  if (request.peer == null) {
    return false
  }
  try {
    request.peer.addrs.forEach(multiaddr)
  } catch (_err) {
    return false
  }
  return true
}
export async function handleStop ({
  connection,
  request,
  streamHandler
}: HandleStopOptions) {
  log('new circuit relay v2 stop stream from %s', connection.remotePeer)
  // Validate the STOP request has the required input
  if (request.type !== StopMessage.Type.CONNECT) {
    log.error('invalid stop connect request via peer %s', connection.remotePeer)
    streamHandler.write(StopMessage.encode({ type: StopMessage.Type.STATUS, status: Status.UNEXPECTED_MESSAGE }))
    return
  }
  if (!isValidStop(request)) {
    log.error('invalid stop connect request via peer %s', connection.remotePeer)
    streamHandler.write(StopMessage.encode({ type: StopMessage.Type.STATUS, status: Status.MALFORMED_MESSAGE }))
    return
  }

  // TODO: go-libp2p marks connection transient if there is limit field present in request.
  // Cannot find any reference to transient connections in js-libp2p

  streamHandler.write(StopMessage.encode(
    {
      type: StopMessage.Type.STATUS,
      status: Status.OK
    }
  ))
  return streamHandler.rest()
}

export interface StopOptions {
  connection: Connection
  request: StopMessage
}

/**
 * Creates a STOP request
 *
 */
export async function stop ({
  connection,
  request
}: StopOptions): Promise<Duplex<Uint8ArrayList, Uint8ArrayList | Uint8Array> | undefined> {
  const stream = await connection.newStream([RELAY_V2_STOP_CODEC])
  log('starting circuit relay v2 stop request to %s', connection.remotePeer)
  const streamHandler = new StreamHandlerV2({ stream })
  streamHandler.write(StopMessage.encode(request))
  let response
  try {
    response = StopMessage.decode(await streamHandler.read())
  } catch (err) {
    log.error('error parsing stop message response from %s', connection.remotePeer)
  }

  if (response == null) {
    log.error('could not read response from %s', connection.remotePeer)
    streamHandler.close()
    return
  }
  if (response.status === Status.OK) {
    log('stop request to %s was successful', connection.remotePeer)
    return streamHandler.rest()
  }

  log('stop request failed with code %d', response.status)
  streamHandler.close()
}
