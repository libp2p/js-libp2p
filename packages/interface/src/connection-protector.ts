import type { AbortOptions, MessageStream } from './index.ts'

export interface ConnectionProtector {
  /**
   * Takes a MultiaddrConnection and creates a private encryption stream between
   * the two peers from the shared key the Protector instance was created with.
   */
  protect(connection: MessageStream, options?: AbortOptions): Promise<MessageStream>
}
