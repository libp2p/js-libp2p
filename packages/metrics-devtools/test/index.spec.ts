import { TypedEventEmitter, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { raceEvent } from 'race-event'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { LIBP2P_DEVTOOLS_METRICS_KEY, SOURCE_METRICS, SOURCE_DEVTOOLS, devToolsMetrics, type ApplicationMessage } from '../src/index.js'
import type { ComponentLogger, Libp2pEvents, Metrics, PeerId, PeerStore } from '@libp2p/interface'
import type { ConnectionManager, Registrar, TransportManager } from '@libp2p/interface-internal'

interface StubbedComponents {
  logger: ComponentLogger
  events: TypedEventEmitter<Libp2pEvents>
  peerId: PeerId
  transportManager: StubbedInstance<TransportManager>
  registrar: StubbedInstance<Registrar>
  connectionManager: StubbedInstance<ConnectionManager>
  peerStore: StubbedInstance<PeerStore>
}

describe('devtools-metrics', () => {
  let components: StubbedComponents
  let metrics: Metrics

  beforeEach(async () => {
    components = {
      logger: defaultLogger(),
      events: new TypedEventEmitter(),
      peerId: await createEd25519PeerId(),
      transportManager: stubInterface<TransportManager>(),
      registrar: stubInterface<Registrar>(),
      connectionManager: stubInterface<ConnectionManager>(),
      peerStore: stubInterface<PeerStore>()
    }

    metrics = devToolsMetrics({
      intervalMs: 10
    })(components)

    await start(metrics)
  })

  afterEach(async () => {
    await stop(metrics)
  })

  it('should broadcast metrics', async () => {
    const event = await raceEvent<MessageEvent<ApplicationMessage>>(window, 'message', AbortSignal.timeout(1000), {
      filter: (evt) => {
        return evt.data.source === SOURCE_METRICS && evt.data.type === 'metrics'
      }
    })

    expect(event).to.have.nested.property('data.metrics')
  })

  it('should identify node', async () => {
    components.transportManager.getListeners.returns([])
    components.registrar.getProtocols.returns([])
    components.peerStore.get.withArgs(components.peerId).resolves({
      id: components.peerId,
      addresses: [],
      metadata: new Map(),
      protocols: [],
      tags: new Map()
    })

    // devtools asks the node to reveal itself
    window.postMessage({
      source: SOURCE_DEVTOOLS,
      type: 'identify'
    }, '*')

    const event = await raceEvent<MessageEvent<ApplicationMessage>>(window, 'message', AbortSignal.timeout(1000), {
      filter: (evt) => {
        return evt.data.source === SOURCE_METRICS && evt.data.type === 'self'
      }
    })

    expect(event).to.have.nested.property('data.peer.id')
  })

  it('should signal presence of metrics', () => {
    expect(globalThis).to.have.property(LIBP2P_DEVTOOLS_METRICS_KEY).that.is.true()
  })
})
