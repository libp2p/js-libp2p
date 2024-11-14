/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import type { DefaultConnectionManagerComponents } from '../../src/connection-manager/index.js'
import type { ConnectionGater, PeerId, PeerStore, PeerRouting, TypedEventTarget, Libp2pEvents, ComponentLogger } from '@libp2p/interface'
import type { TransportManager } from '@libp2p/interface-internal'

export interface StubbedDefaultConnectionManagerComponents {
  peerId: PeerId
  peerStore: StubbedInstance<PeerStore>
  peerRouting: StubbedInstance<PeerRouting>
  transportManager: StubbedInstance<TransportManager>
  connectionGater: StubbedInstance<ConnectionGater>
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

export async function createDefaultConnectionManagerComponents (options?: Partial<DefaultConnectionManagerComponents>): Promise<StubbedDefaultConnectionManagerComponents> {
  return {
    peerId: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
    peerStore: stubInterface<PeerStore>({
      all: async () => []
    }),
    peerRouting: stubInterface<PeerRouting>(),
    transportManager: stubInterface<TransportManager>(),
    connectionGater: stubInterface<ConnectionGater>(),
    events: new TypedEventEmitter(),
    logger: defaultLogger(),
    ...options
  } as unknown as any
}
