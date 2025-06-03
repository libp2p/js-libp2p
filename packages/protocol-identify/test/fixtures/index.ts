import drain from 'it-drain'
import * as lp from 'it-length-prefixed'
import { pushable } from 'it-pushable'
import { stubInterface } from 'sinon-ts'
import { Uint8ArrayList } from 'uint8arraylist'
import { Identify as IdentifyMessage } from '../../src/pb/message.js'
import type { ComponentLogger, Libp2pEvents, NodeInfo, PeerId, PeerStore, Connection, Stream, PrivateKey } from '@libp2p/interface'
import type { AddressManager, ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { TypedEventTarget } from 'main-event'
import type { StubbedInstance } from 'sinon-ts'

export interface StubbedIdentifyComponents {
  peerId: PeerId
  privateKey: PrivateKey
  peerStore: StubbedInstance<PeerStore>
  connectionManager: StubbedInstance<ConnectionManager>
  registrar: StubbedInstance<Registrar>
  addressManager: StubbedInstance<AddressManager>
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
  nodeInfo: NodeInfo
}

export function connectionStream (remotePeer: PeerId, protocol: string): { connection: StubbedInstance<Connection>, stream: StubbedInstance<Stream> } {
  const connection = stubInterface<Connection>({
    remotePeer
  })
  const stream = stubInterface<Stream>()
  connection.newStream.withArgs(protocol).resolves(stream)

  stream.sink.callsFake(async (source) => {
    await drain(source)
  })

  return { connection, stream }
}

export function identifyStream (remotePeer: PeerId): { connection: StubbedInstance<Connection>, stream: StubbedInstance<Stream> } {
  return connectionStream(remotePeer, '/ipfs/id/1.0.0')
}

export function identifyPushStream (remotePeer: PeerId): { connection: StubbedInstance<Connection>, stream: StubbedInstance<Stream> } {
  return connectionStream(remotePeer, '/ipfs/id/push/1.0.0')
}

export function identifyConnection (remotePeer: PeerId, message: IdentifyMessage): StubbedInstance<Connection> {
  const { connection, stream } = identifyStream(remotePeer)

  const input = stream.source = pushable<Uint8ArrayList>()
  void input.push(new Uint8ArrayList(lp.encode.single(IdentifyMessage.encode(message))))

  return connection
}
