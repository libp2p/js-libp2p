import type { Connection, Stream, AbortOptions } from '@libp2p/interface'

/**
 * Close the passed stream, falling back to aborting the stream if closing
 * cleanly fails.
 */
export async function safelyCloseStream (stream?: Stream, options?: AbortOptions): Promise<void> {
  try {
    await stream?.close(options)
  } catch (err: any) {
    stream?.abort(err)
  }
}

/**
 * These are speculative protocols that are run automatically on connection open
 * so are usually not the reason the connection was opened.
 *
 * Consequently when requested it should be safe to close connections that only
 * have these protocol streams open.
 */
const DEFAULT_CLOSABLE_PROTOCOLS = [
  // identify
  '/ipfs/id/1.0.0',

  // identify-push
  '/ipfs/id/push/1.0.0',

  // autonat
  '/libp2p/autonat/1.0.0',

  // dcutr
  '/libp2p/dcutr'
]

export interface SafelyCloseConnectionOptions extends AbortOptions {
  /**
   * Only close the stream if it either has no protocol streams open or only
   * ones in this list.
   *
   * @default ['/ipfs/id/1.0.0']
   */
  closableProtocols?: string[]
}

/**
 * Close the passed connection if it has no streams, or only closable protocol
 * streams, falling back to aborting the connection if closing it cleanly fails.
 */
export async function safelyCloseConnectionIfUnused (connection?: Connection, options?: SafelyCloseConnectionOptions): Promise<void> {
  const streamProtocols = connection?.streams?.map(stream => stream.protocol) ?? []
  const closableProtocols = options?.closableProtocols ?? DEFAULT_CLOSABLE_PROTOCOLS

  // if the connection has protocols not in the closable protocols list, do not
  // close the connection
  if (streamProtocols.filter(proto => proto != null && !closableProtocols.includes(proto)).length > 0) {
    return
  }

  try {
    await connection?.close(options)
  } catch (err: any) {
    connection?.abort(err)
  }
}
