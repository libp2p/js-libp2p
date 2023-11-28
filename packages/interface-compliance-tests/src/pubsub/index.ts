import apiTest from './api.js'
import connectionHandlersTest from './connection-handlers.js'
import emitSelfTest from './emit-self.js'
import messagesTest from './messages.js'
import multipleNodesTest from './multiple-nodes.js'
import twoNodesTest from './two-nodes.js'
import type { TestSetup } from '../index.js'
import type { ComponentLogger, PeerId, PubSub, PubSubInit } from '@libp2p/interface'
import type { ConnectionManager, Registrar } from '@libp2p/interface-internal'

export interface PubSubComponents {
  peerId: PeerId
  registrar: Registrar
  connectionManager: ConnectionManager
  pubsub?: PubSub
  logger: ComponentLogger
}

export interface PubSubArgs {
  components: PubSubComponents
  init: PubSubInit
}

export default (common: TestSetup<PubSub, PubSubArgs>): void => {
  describe('interface-pubsub compliance tests', () => {
    apiTest(common)
    emitSelfTest(common)
    messagesTest(common)
    connectionHandlersTest(common)
    twoNodesTest(common)
    multipleNodesTest(common)
  })
}
