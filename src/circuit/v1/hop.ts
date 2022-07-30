import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import { StreamHandlerV1 } from './stream-handler.js'
import { CircuitRelay } from './pb/index.js'
import { codes as Errors } from '../../errors.js'
import type { Stream } from '@libp2p/interface-connection'
import type { Duplex } from 'it-stream-types'

const log = logger('libp2p:circuit:hop')
export interface HopConfig {
  stream: Stream
  request: CircuitRelay
}

/**
 * Performs a HOP request to a relay peer, to request a connection to another
 * peer. A new, virtual, connection will be created between the two via the relay.
 */
export async function hop (options: HopConfig): Promise<Duplex<Uint8Array>> {
  const {
    stream,
    request
  } = options

  // Send the HOP request
  const streamHandler = new StreamHandlerV1({ stream })
  streamHandler.write(request)

  const response = await streamHandler.read()

  if (response == null) {
    throw errCode(new Error('HOP request had no response'), Errors.ERR_HOP_REQUEST_FAILED)
  }

  if (response.code === CircuitRelay.Status.SUCCESS) {
    log('hop request was successful')
    return streamHandler.rest()
  }

  log('hop request failed with code %d, closing stream', response.code)
  streamHandler.close()

  throw errCode(new Error(`HOP request failed with code "${response.code ?? 'unknown'}"`), Errors.ERR_HOP_REQUEST_FAILED)
}
