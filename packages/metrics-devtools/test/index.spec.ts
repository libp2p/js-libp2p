import { TypedEventEmitter, start, stop } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { createEd25519PeerId } from '@libp2p/peer-id-factory'
import { expect } from 'aegir/chai'
import { stubInterface, type StubbedInstance } from 'sinon-ts'
import { LIBP2P_DEVTOOLS_METRICS_INSTANCE, devToolsMetrics } from '../src/index.js'
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

  it('should signal presence of metrics', () => {
    expect(globalThis).to.have.property(LIBP2P_DEVTOOLS_METRICS_INSTANCE).that.is.ok()
  })

  it('should broadcast metrics', async () => {
    // @ts-expect-error type is ambiguous
    const metrics = globalThis[LIBP2P_DEVTOOLS_METRICS_INSTANCE].getMetrics()

    expect(metrics).to.be.ok()
  })

  it('should identify node', async () => {
    components.transportManager.getListeners.returns([])
    components.registrar.getProtocols.returns([])

    // @ts-expect-error type is ambiguous
    const status = globalThis[LIBP2P_DEVTOOLS_METRICS_INSTANCE].getStatus()

    expect(status).to.have.property('peerId')
  })
})
