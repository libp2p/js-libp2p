
import { IStopMessage, Status, StopMessage } from './pb/index.js'
import type { Connection } from '@libp2p/interfaces/connection'

import { logger } from '@libp2p/logger'
import { StreamHandlerV2 } from './stream-handler.js'
import { protocolIDv2Stop } from '../multicodec.js'
import { validateStopConnectRequest } from './validation.js'

const log = logger('libp2p:circuitv2:stop')

export interface HandleStopOptions {
  connection: Connection
  request: IStopMessage
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

  // TODO: go-libp2p marks connection transient if there is limit field present in request.
  // Cannot find any reference to transient connections in js-libp2p

  streamHandler.write(StopMessage.encode(
    {
      type: StopMessage.Type.STATUS,
      status: Status.OK
    }
  ).finish())
  return streamHandler.rest()
}

export interface StopOptions {
  connection: Connection
  request: IStopMessage
}

/**
 * Creates a STOP request
 *
 */
export async function stop ({
  connection,
  request
}: StopOptions) {
  const { stream } = await connection.newStream([protocolIDv2Stop])
  log('starting circuit relay v2 stop request to %s', connection.remotePeer)
  const streamHandler = new StreamHandlerV2({ stream })
  streamHandler.write(StopMessage.encode(request).finish())
  let response
  try {
    response = StopMessage.decode(await streamHandler.read())
  } catch (/** @type {any} */ err) {
    log.error('error parsing stop message response from %s', connection.remotePeer)
  }

  if (response == null) {
    return streamHandler.close()
  }

  if (response.status === Status.OK) {
    log('stop request to %s was successful', connection.remotePeer)
    return streamHandler.rest()
  }

  log('stop request failed with code %d', response.status)
  streamHandler.close()
}
