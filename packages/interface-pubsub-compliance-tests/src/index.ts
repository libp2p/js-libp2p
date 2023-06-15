import apiTest from './api.js'
import connectionHandlersTest from './connection-handlers.js'
import emitSelfTest from './emit-self.js'
import messagesTest from './messages.js'
import multipleNodesTest from './multiple-nodes.js'
import twoNodesTest from './two-nodes.js'
import type { TestSetup } from '@libp2p/interface-compliance-tests'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { PubSub, PubSubInit } from '@libp2p/interface-pubsub'
import type { Registrar } from '@libp2p/interface-registrar'

export interface PubSubComponents {
  peerId: PeerId
  registrar: Registrar
  connectionManager: ConnectionManager
  pubsub?: PubSub
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
