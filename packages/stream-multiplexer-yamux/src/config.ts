import { InvalidParametersError } from '@libp2p/interface'
import { INITIAL_STREAM_WINDOW, MAX_STREAM_WINDOW } from './constants.js'

// TOOD use config items or delete them
export interface Config {
  /**
   * Used to do periodic keep alive messages using a ping.
   */
  enableKeepAlive: boolean

  /**
   * How often to perform the keep alive
   *
   * measured in milliseconds
   */
  keepAliveInterval: number

  /**
   * Maximum number of concurrent inbound streams that we accept.
   * If the peer tries to open more streams, those will be reset immediately.
   */
  maxInboundStreams: number

  /**
   * Maximum number of concurrent outbound streams that we accept.
   * If the application tries to open more streams, the call to `newStream` will throw
   */
  maxOutboundStreams: number

  /**
   * Used to control the initial window size that we allow for a stream.
   *
   * measured in bytes
   */
  initialStreamWindowSize: number

  /**
   * Used to control the maximum window size that we allow for a stream.
   */
  maxStreamWindowSize: number

  /**
   * Maximum size of a message that we'll send on a stream.
   * This ensures that a single stream doesn't hog a connection.
   */
  maxMessageSize: number
}

export const defaultConfig: Config = {
  enableKeepAlive: true,
  keepAliveInterval: 30_000,
  maxInboundStreams: 1_000,
  maxOutboundStreams: 1_000,
  initialStreamWindowSize: INITIAL_STREAM_WINDOW,
  maxStreamWindowSize: MAX_STREAM_WINDOW,
  maxMessageSize: 64 * 1024
}

export function verifyConfig (config: Config): void {
  if (config.keepAliveInterval <= 0) {
    throw new InvalidParametersError('keep-alive interval must be positive')
  }
  if (config.maxInboundStreams < 0) {
    throw new InvalidParametersError('max inbound streams must be larger or equal 0')
  }
  if (config.maxOutboundStreams < 0) {
    throw new InvalidParametersError('max outbound streams must be larger or equal 0')
  }
  if (config.initialStreamWindowSize < INITIAL_STREAM_WINDOW) {
    throw new InvalidParametersError('InitialStreamWindowSize must be larger or equal 256 kB')
  }
  if (config.maxStreamWindowSize < config.initialStreamWindowSize) {
    throw new InvalidParametersError('MaxStreamWindowSize must be larger than the InitialStreamWindowSize')
  }
  if (config.maxStreamWindowSize > 2 ** 32 - 1) {
    throw new InvalidParametersError('MaxStreamWindowSize must be less than equal MAX_UINT32')
  }
  if (config.maxMessageSize < 1024) {
    throw new InvalidParametersError('MaxMessageSize must be greater than a kilobyte')
  }
}
