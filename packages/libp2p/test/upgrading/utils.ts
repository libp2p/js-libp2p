/* eslint-env mocha */

import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { peerIdFromPrivateKey } from '@libp2p/peer-id'
import { TypedEventEmitter } from 'main-event'
import { stubInterface } from 'sinon-ts'
import type { UpgraderComponents } from '../../src/upgrader.js'
import type { ConnectionGater, PeerId, PeerStore, Libp2pEvents, ComponentLogger, Metrics, ConnectionProtector } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'
import type { TypedEventTarget } from 'main-event'
import type { StubbedInstance } from 'sinon-ts'

export interface StubbedUpgraderComponents {
  peerId: PeerId
  metrics?: StubbedInstance<Metrics>
  connectionManager: StubbedInstance<ConnectionManager>
  connectionGater: StubbedInstance<ConnectionGater>
  connectionProtector?: StubbedInstance<ConnectionProtector>
  registrar: StubbedInstance<Registrar>
  peerStore: StubbedInstance<PeerStore>
  events: TypedEventTarget<Libp2pEvents>
  logger: ComponentLogger
}

export async function createDefaultUpgraderComponents (options?: Partial<UpgraderComponents>): Promise<StubbedUpgraderComponents> {
  return {
    peerId: peerIdFromPrivateKey(await generateKeyPair('Ed25519')),
    connectionManager: stubInterface<ConnectionManager>({
      acceptIncomingConnection: async () => true
    }),
    connectionGater: stubInterface<ConnectionGater>(),
    registrar: stubInterface<Registrar>(),
    peerStore: stubInterface<PeerStore>({
      all: async () => []
    }),
    events: new TypedEventEmitter(),
    logger: defaultLogger(),
    ...options
  } as unknown as any
}
