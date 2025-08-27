import { InvalidParametersError } from '@libp2p/interface'
import { INITIAL_STREAM_WINDOW, MAX_STREAM_WINDOW } from './constants.js'
import type { StreamMuxerOptions } from '@libp2p/interface'

// TODO use config items or delete them
export interface Config extends StreamMuxerOptions {
  /**
   * Used to do periodic keep alive messages using a ping.
   */
  enableKeepAlive?: boolean

  /**
   * How often to perform the keep alive
   *
   * measured in milliseconds
   */
  keepAliveInterval?: number

  /**
   * Used to control the initial window size that we allow for a stream.
   *
   * measured in bytes
   */
  initialStreamWindowSize?: number

  /**
   * Used to control the maximum window size that we allow for a stream.
   */
  maxStreamWindowSize?: number
}

export const defaultConfig: Required<Config> = {
  enableKeepAlive: true,
  keepAliveInterval: 30_000,
  maxInboundStreams: 1_000,
  maxOutboundStreams: 1_000,
  initialStreamWindowSize: INITIAL_STREAM_WINDOW,
  maxStreamWindowSize: MAX_STREAM_WINDOW,
  maxMessageSize: 64 * 1024,
  maxEarlyStreams: 10,
  streamOptions: {}
}

export function verifyConfig (config: Config): void {
  if (config.keepAliveInterval != null && config.keepAliveInterval <= 0) {
    throw new InvalidParametersError('keep-alive interval must be positive')
  }
  if (config.maxInboundStreams != null && config.maxInboundStreams < 0) {
    throw new InvalidParametersError('max inbound streams must be larger or equal 0')
  }
  if (config.maxOutboundStreams != null && config.maxOutboundStreams < 0) {
    throw new InvalidParametersError('max outbound streams must be larger or equal 0')
  }
  if (config.initialStreamWindowSize != null && config.initialStreamWindowSize < INITIAL_STREAM_WINDOW) {
    throw new InvalidParametersError('InitialStreamWindowSize must be larger or equal 256 kB')
  }
  if (config.maxStreamWindowSize != null && config.initialStreamWindowSize != null && config.maxStreamWindowSize < config.initialStreamWindowSize) {
    throw new InvalidParametersError('MaxStreamWindowSize must be larger than the InitialStreamWindowSize')
  }
  if (config.maxStreamWindowSize != null && config.maxStreamWindowSize > 2 ** 32 - 1) {
    throw new InvalidParametersError('MaxStreamWindowSize must be less than equal MAX_UINT32')
  }
  if (config.maxMessageSize != null && config.maxMessageSize < 1024) {
    throw new InvalidParametersError('MaxMessageSize must be greater than a kilobyte')
  }
}
