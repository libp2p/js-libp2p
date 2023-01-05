
import { Status, StopMessage } from './pb/index.js'
import type { Connection } from '@libp2p/interface-connection'

import { logger } from '@libp2p/logger'
import { StreamHandlerV2 } from './stream-handler.js'
import { RELAY_V2_STOP_CODEC } from '../multicodec.js'
import { validateStopConnectRequest } from './validation.js'

const log = logger('libp2p:circuitv2:stop')

export interface HandleStopOptions {
  connection: Connection
  request: StopMessage
  streamHandler: StreamHandlerV2
}

export async function handleStop ({
  connection,
  request,
  streamHandler
}: HandleStopOptions) {
  log('new circuit relay v2 stop stream from %s', connection.remotePeer)
  // Validate the STOP request has the required input
  try {
    validateStopConnectRequest(request, streamHandler)
  } catch (/** @type {any} */ err) {
    return log.error('invalid stop connect request via peer %s', connection.remotePeer, err)
  }
  log('stop request is valid')

  /* eslint-disable-next-line no-warning-comments */
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
}: StopOptions) {
  const stream = await connection.newStream([RELAY_V2_STOP_CODEC])
  log('starting circuit relay v2 stop request to %s', connection.remotePeer)
  const streamHandler = new StreamHandlerV2({ stream })
  streamHandler.write(StopMessage.encode(request))
  let response
  try {
    response = StopMessage.decode(await streamHandler.read())
  } catch (/** @type {any} */ err) {
    log.error('error parsing stop message response from %s', connection.remotePeer)
  }

  if (response == null) {
    streamHandler.close()
    return undefined
  }
  if (response.status === Status.OK) {
    log('stop request to %s was successful', connection.remotePeer)
    return streamHandler.rest()
  }

  log('stop request failed with code %d', response.status)
  streamHandler.close()
  return undefined
}
