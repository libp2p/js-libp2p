/*
 * This is a minimal type declaration file for the chat-in-the-browser example.
 * It is incomplete, but you can use it as a basis for your own TypeScript
 * projects.
 */

export const protocol: string

export function secureInbound (
  localPeer: any,
  duplex: any,
  remotePeer: any
): any

export function secureOutbound (
  localPeer: any,
  duplex: any,
  remotePeer: any
): any
