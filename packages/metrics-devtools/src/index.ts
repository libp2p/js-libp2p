/**
 * @packageDocumentation
 *
 * Configure your browser-based libp2p node with DevTools metrics:
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { devToolsMetrics } from '@libp2p/devtools-metrics'
 *
 * const node = await createLibp2p({
 *   metrics: devToolsMetrics()
 * })
 * ```
 *
 * Then use the [DevTools plugin](https://github.com/ipfs-shipyard/js-libp2p-devtools)
 * for Chrome or Firefox to inspect the state of your running node.
 */

import { isPubSub, serviceCapabilities, start, stop } from '@libp2p/interface'
import { simpleMetrics } from '@libp2p/simple-metrics'
import { pipe } from 'it-pipe'
import { pushable } from 'it-pushable'
import { rpc, type RPC } from 'it-rpc'
import { base64 } from 'multiformats/bases/base64'
import { valueCodecs } from './rpc/index.js'
import { metricsRpc } from './rpc/rpc.js'
import { debounce } from './utils/debounce.js'
import { findCapability } from './utils/find-capability.js'
import { getPeers } from './utils/get-peers.js'
import { getSelf } from './utils/get-self.js'
import type { DevToolsRPC } from './rpc/index.js'
import type { ComponentLogger, Connection, Libp2pEvents, Logger, Metrics, MultiaddrConnection, PeerId, PeerStore, Stream, ContentRouting, PeerRouting, TypedEventTarget, Startable, Message, SubscriptionChangeData } from '@libp2p/interface'
import type { TransportManager, Registrar, ConnectionManager, AddressManager } from '@libp2p/interface-internal'
import type { Pushable } from 'it-pushable'

export * from './rpc/index.js'

export const SOURCE_DEVTOOLS = '@libp2p/devtools-metrics:devtools'
export const SOURCE_SERVICE_WORKER = '@libp2p/devtools-metrics:worker'
export const SOURCE_CONTENT_SCRIPT = '@libp2p/devtools-metrics:content'
export const SOURCE_METRICS = '@libp2p/devtools-metrics:metrics'
export const LIBP2P_DEVTOOLS_METRICS_KEY = '________libp2p_devtools_metrics'

// let devtools know we are here
Object.defineProperty(globalThis, LIBP2P_DEVTOOLS_METRICS_KEY, {
  value: true,
  enumerable: false,
  writable: false
})

/**
 * Sent by the DevTools service worker to the DevTools panel when the inspected
 * page has finished (re)loading
 */
export interface PageLoadedMessage {
  source: typeof SOURCE_DEVTOOLS
  type: 'page-loaded'
  tabId: number
}

/**
 * Sent by the DevTools service worker to the DevTools panel when it has failed
 * to send a message to the inspected page as there is no receiving end present.
 *
 * This normally means the content script has not been loaded due to the user
 * not having granted permission for the script to run.
 */
export interface PermissionsErrorMessage {
  source: typeof SOURCE_DEVTOOLS
  type: 'permissions-error'
  tabId: number
}

/**
 * This event is intercepted by the service worker which injects a content
 * script into the current page which copies the passed value to the clipboard.
 */
export interface CopyToClipboardMessage {
  source: typeof SOURCE_DEVTOOLS
  type: 'copy-to-clipboard'
  tabId: number
  value: string
}

/**
 * Invoke a method on the libp2p object
 */
export interface RPCMessage {
  source: typeof SOURCE_DEVTOOLS | typeof SOURCE_METRICS
  type: 'libp2p-rpc'
  tabId: number

  /**
   * The RPC message encoded as a multibase string
   */
  message: string
}

/**
 * Messages that are sent from the application page to the DevTools panel
 */
export type ApplicationMessage = RPCMessage

/**
 * Messages that are sent from the service worker
 */
export type WorkerMessage = PageLoadedMessage | PermissionsErrorMessage

/**
 * Messages that are sent from the DevTools panel page to the application page
 */
export type DevToolsMessage = CopyToClipboardMessage | RPCMessage

export interface Address {
  /**
   * The multiaddr this address represents
   */
  multiaddr: string

  /**
   * If `true`, this multiaddr came from a signed peer record
   */
  isCertified?: boolean

  /**
   * If `true`, the current node has an active connection to this peer via this
   * address
   */
  isConnected?: boolean
}

export interface DevToolsMetricsInit {
  /**
   * How often to pass metrics to the DevTools panel
   */
  intervalMs?: number
}

export interface DevToolsMetricsComponents {
  logger: ComponentLogger
  events: TypedEventTarget<Libp2pEvents>
  peerId: PeerId
  transportManager: TransportManager
  registrar: Registrar
  connectionManager: ConnectionManager
  peerStore: PeerStore

  contentRouting: ContentRouting
  peerRouting: PeerRouting
  addressManager: AddressManager
}

class DevToolsMetrics implements Metrics, Startable {
  private readonly log: Logger
  private readonly components: DevToolsMetricsComponents
  private readonly simpleMetrics: Metrics
  private readonly intervalMs?: number
  private readonly rpcQueue: Pushable<Uint8Array>
  private readonly rpc: RPC
  private readonly devTools: DevToolsRPC

  constructor (components: DevToolsMetricsComponents, init?: Partial<DevToolsMetricsInit>) {
    this.log = components.logger.forComponent('libp2p:devtools-metrics')
    this.intervalMs = init?.intervalMs
    this.components = components

    // create RPC endpoint
    this.rpcQueue = pushable()
    this.rpc = rpc({
      valueCodecs
    })
    this.devTools = this.rpc.createClient('devTools')

    // collect information on current peers and sent it to the dev tools panel
    this.onPeersUpdate = debounce(this.onPeersUpdate.bind(this), 1000)
    this.onSelfUpdate = debounce(this.onSelfUpdate.bind(this), 1000)
    this.onIncomingMessage = this.onIncomingMessage.bind(this)

    // relay pubsub messages to dev tools panel
    this.onPubSubMessage = this.onPubSubMessage.bind(this)
    this.onPubSubSubscriptionChange = this.onPubSubSubscriptionChange.bind(this)

    // collect metrics
    this.simpleMetrics = simpleMetrics({
      intervalMs: this.intervalMs,
      onMetrics: (metrics) => {
        this.devTools.safeDispatchEvent('metrics', {
          detail: metrics
        }).catch(err => {
          this.log.error('error sending metrics', err)
        })
      }
    })({})
  }

  readonly [Symbol.toStringTag] = '@libp2p/devtools-metrics'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/metrics'
  ]

  trackMultiaddrConnection (maConn: MultiaddrConnection): void {
    this.simpleMetrics.trackMultiaddrConnection(maConn)
  }

  trackProtocolStream (stream: Stream, connection: Connection): void {
    this.simpleMetrics.trackProtocolStream(stream, connection)
  }

  registerMetric (name: any, options: any): any {
    return this.simpleMetrics.registerMetric(name, options)
  }

  registerMetricGroup (name: any, options: any): any {
    return this.simpleMetrics.registerMetricGroup(name, options)
  }

  registerCounter (name: any, options: any): any {
    return this.simpleMetrics.registerCounter(name, options)
  }

  registerCounterGroup (name: any, options: any): any {
    return this.simpleMetrics.registerCounterGroup(name, options)
  }

  registerHistogram (name: any, options: any): any {
    return this.simpleMetrics.registerHistogram(name, options)
  }

  registerHistogramGroup (name: any, options: any): any {
    return this.simpleMetrics.registerHistogramGroup(name, options)
  }

  registerSummary (name: any, options: any): any {
    return this.simpleMetrics.registerSummary(name, options)
  }

  registerSummaryGroup (name: any, options: any): any {
    return this.simpleMetrics.registerSummaryGroup(name, options)
  }

  async start (): Promise<void> {
    // send peer updates
    this.components.events.addEventListener('peer:connect', this.onPeersUpdate)
    this.components.events.addEventListener('peer:disconnect', this.onPeersUpdate)
    this.components.events.addEventListener('peer:identify', this.onPeersUpdate)
    this.components.events.addEventListener('peer:update', this.onPeersUpdate)

    // send node status updates
    this.components.events.addEventListener('self:peer:update', this.onSelfUpdate)

    // process incoming messages from devtools
    window.addEventListener('message', this.onIncomingMessage)

    // create rpc target
    this.rpc.createTarget('metrics', metricsRpc(this.components))

    // send metrics
    await start(this.simpleMetrics)

    // send RPC messages
    Promise.resolve()
      .then(async () => {
        await pipe(
          this.rpcQueue,
          this.rpc,
          async source => {
            for await (const buf of source) {
              window.postMessage({
                source: SOURCE_METRICS,
                type: 'libp2p-rpc',
                message: base64.encode(buf)
              })
            }
          }
        )
      })
      .catch(err => {
        this.log.error('error while reading RPC messages', err)
      })

    const pubsub = findCapability('@libp2p/pubsub', this.components)

    if (isPubSub(pubsub)) {
      pubsub.addEventListener('message', this.onPubSubMessage)
      pubsub.addEventListener('subscription-change', this.onPubSubSubscriptionChange)
    }
  }

  async stop (): Promise<void> {
    window.removeEventListener('message', this.onIncomingMessage)
    this.components.events.removeEventListener('self:peer:update', this.onSelfUpdate)
    this.components.events.removeEventListener('peer:connect', this.onPeersUpdate)
    this.components.events.removeEventListener('peer:disconnect', this.onPeersUpdate)
    this.components.events.removeEventListener('peer:identify', this.onPeersUpdate)
    this.components.events.removeEventListener('peer:update', this.onPeersUpdate)
    await stop(this.simpleMetrics)
  }

  private onIncomingMessage (event: MessageEvent<DevToolsMessage>): void {
    // Only accept messages from same frame
    if (event.source !== window) {
      return
    }

    const message = event.data

    // Only accept messages of correct format (our messages)
    if (message?.source !== SOURCE_DEVTOOLS) {
      return
    }

    if (message.type === 'libp2p-rpc') {
      this.rpcQueue.push(base64.decode(message.message))
    }
  }

  private onPubSubMessage (event: CustomEvent<Message>): void {
    this.devTools.safeDispatchEvent('pubsub:message', {
      detail: event.detail
    })
      .catch(err => {
        this.log.error('error relaying pubsub message', err)
      })
  }

  private onPubSubSubscriptionChange (event: CustomEvent<SubscriptionChangeData>): void {
    this.devTools.safeDispatchEvent('pubsub:subscription-change', {
      detail: event.detail
    })
      .catch(err => {
        this.log.error('error relaying pubsub subscription change', err)
      })
  }

  private onSelfUpdate (): void {
    Promise.resolve()
      .then(async () => {
        await this.devTools.safeDispatchEvent('self', {
          detail: await getSelf(this.components)
        })
      })
      .catch(err => {
        this.log.error('error sending peers message', err)
      })
  }

  private onPeersUpdate (): void {
    Promise.resolve()
      .then(async () => {
        await this.devTools.safeDispatchEvent('peers', {
          detail: await getPeers(this.components, this.log)
        })
      })
      .catch(err => {
        this.log.error('error sending peers message', err)
      })
  }
}

export function devToolsMetrics (init?: Partial<DevToolsMetricsInit>): (components: DevToolsMetricsComponents) => Metrics {
  return (components) => {
    return new DevToolsMetrics(components, init)
  }
}
