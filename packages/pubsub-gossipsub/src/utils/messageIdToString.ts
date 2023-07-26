import { toString } from 'uint8arrays/to-string'

/**
 * Browser friendly function to convert Uint8Array message id to base64 string.
 */
export function messageIdToString(msgId: Uint8Array): string {
  return toString(msgId, 'base64')
}
