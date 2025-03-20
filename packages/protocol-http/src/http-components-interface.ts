import type { ComponentLogger } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'

export interface HttpComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
  logger: ComponentLogger
}
