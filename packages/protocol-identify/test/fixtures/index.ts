import drain from 'it-drain'
import * as lp from 'it-length-prefixed'
import { pushable } from 'it-pushable'
import Sinon from 'sinon'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { Identify as IdentifyMessage } from '../../src/pb/message.js'
import type { ComponentLogger, Libp2pEvents, NodeInfo } from '@libp2p/interface'
import type { TypedEventTarget } from '@libp2p/interface/events'
import type { PeerId } from '@libp2p/interface/peer-id'
import type { PeerStore } from '@libp2p/interface/peer-store'
import type { Connection, Stream } from '@libp2p/interface/src/connection'
import type { AddressManager } from '@libp2p/interface-internal/address-manager'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { Registrar } from '@libp2p/interface-internal/registrar'

export function matchPeerId (peerId: PeerId): Sinon.SinonMatcher {
  return Sinon.match(p => p.toString() === peerId.toString())
}

export interface StubbedIdentifyComponents {
  peerId: PeerId
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

  const input = stream.source = pushable()
  input.push(lp.encode.single(IdentifyMessage.encode(message)))

  return connection
}
