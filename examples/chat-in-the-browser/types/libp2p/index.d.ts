/*
 * This is a minimal type declaration file for the chat-in-the-browser example.
 * It is incomplete, but you can use it as a basis for your own TypeScript
 * projects.
 */

import PeerInfo from 'peer-info'
import PeerId from 'peer-id'

export = Libp2p

declare class Libp2p {
  peerInfo: PeerInfo

  static create (options: any): Promise<Libp2p>
  start (): Promise<void>
  handle (
    protocol: string | string[],
    handler: Libp2p.ProtocolHandler
  ): Promise<void>
  dialProtocol (remote: PeerInfo, protocols: string[]): Promise<{ stream: any }>
  on (event: Libp2p.Event, handler: Libp2p.PeerInfoHandler): void
}

declare namespace Libp2p {
  type Event = 'peer:connect' | 'peer:disconnect' | 'peer:discovery'
  type PeerInfoHandler = (peerInfo: PeerInfo) => void
  type Stream = {
    source: AsyncGenerator<any, any, any>
    sink: (source: any) => void
  }
  type ProtocolHandler = (result: {
    connection?: {
      remotePeer: PeerId
    }
    protocol?: string
    stream: Stream
  }) => void
}
