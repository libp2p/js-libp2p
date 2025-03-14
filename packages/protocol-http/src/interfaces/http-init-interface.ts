/**
 * HTTP initialization options type
 */

/**
 * HTTP initialization options
 */
export interface HttpInit {
  /**
   * Maximum number of inbound streams to allow
   */
  maxInboundStreams?: number

  /**
   * Maximum number of outbound streams to allow
   */
  maxOutboundStreams?: number

  /**
   * Default timeout for HTTP operations (in milliseconds)
   */
  timeout?: number
}
