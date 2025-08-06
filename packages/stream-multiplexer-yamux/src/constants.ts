// Protocol violation errors

import { BothClientsError, DecodeInvalidVersionError, InvalidFrameError, NotMatchingPingError, ReceiveWindowExceededError, StreamAlreadyExistsError, UnrequestedPingError } from './errors.js'

export const PROTOCOL_ERRORS = new Set([
  InvalidFrameError.name,
  UnrequestedPingError.name,
  NotMatchingPingError.name,
  StreamAlreadyExistsError.name,
  DecodeInvalidVersionError.name,
  BothClientsError.name,
  ReceiveWindowExceededError.name
])

/**
 * INITIAL_STREAM_WINDOW is the initial stream window size.
 *
 * Not an implementation choice, this is defined in the specification
 */
export const INITIAL_STREAM_WINDOW = 256 * 1024

/**
 * Default max stream window
 */
export const MAX_STREAM_WINDOW = 16 * 1024 * 1024
