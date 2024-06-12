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

import { serviceCapabilities, start, stop } from '@libp2p/interface'
import { enable, disable } from '@libp2p/logger'
import { simpleMetrics } from '@libp2p/simple-metrics'
import { base64 } from 'multiformats/bases/base64'
import type { ComponentLogger, Connection, Libp2pEvents, Logger, Metrics, MultiaddrConnection, PeerId, Peer as PeerStorePeer, PeerStore, PeerUpdate, Stream, TypedEventTarget } from '@libp2p/interface'
import type { TransportManager, Registrar, ConnectionManager } from '@libp2p/interface-internal'

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
 * Sent when new metrics are available
 */
export interface MetricsMessage {
  source: typeof SOURCE_METRICS
  type: 'metrics'
  metrics: Record<string, any>
}

/**
 * This message represents the current state of the libp2p node
 */
export interface SelfMessage {
  source: typeof SOURCE_METRICS
  type: 'self'
  peer: SelfPeer
}

/**
 * This message represents the current state of the libp2p node
 */
export interface PeersMessage {
  source: typeof SOURCE_METRICS
  type: 'peers'
  peers: Peer[]
}

/**
 * Sent by the DevTools service worker to the DevTools panel when the inspected
 * page has finished (re)loading
 */
export interface PageLoadedMessage {
  source: '@libp2p/devtools-metrics:devtools'
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
  source: '@libp2p/devtools-metrics:devtools'
  type: 'permissions-error'
  tabId: number
}

/**
 * This message is sent by DevTools when no `self` message has been received
 */
export interface IdentifyMessage {
  source: '@libp2p/devtools-metrics:devtools'
  type: 'identify'
  tabId: number
}

/**
 * This message is sent by DevTools when no `self` message has been received
 */
export interface EnableDebugMessage {
  source: '@libp2p/devtools-metrics:devtools'
  type: 'debug'
  namespace: string
  tabId: number
}

/**
 * We cannot use the web extension API to copy text to the cliboard yet as it's
 * not supported in Firefox yet, so get the page to do it
 *
 * @see https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/Interact_with_the_clipboard#writing_to_the_clipboard
 */
export interface CopyToClipboardMessage {
  source: '@libp2p/devtools-metrics:devtools'
  type: 'copy-to-clipboard'
  value: string
  tabId: number
}

/**
 * Messages that are sent from the application page to the DevTools panel
 */
export type ApplicationMessage = MetricsMessage | SelfMessage | PeersMessage

/**
 * Messages that are sent from the service worker
 */
export type WorkerMessage = PageLoadedMessage | PermissionsErrorMessage

/**
 * Messages that are sent from the DevTools panel page to the application page
 */
export type DevToolsMessage = IdentifyMessage | EnableDebugMessage | CopyToClipboardMessage

export interface SelfPeer {
  /**
   * The identifier of the peer
   */
  id: string

  /**
   * The list of multiaddrs the peer is listening on
   */
  multiaddrs: string[]

  /**
   * Any peer store tags the peer has
   */
  tags: Record<string, number>

  /**
   * Any peer store metadata the peer has
   */
  metadata: Record<string, string>

  /**
   * The protocols the peer supports
   */
  protocols: string[]
}

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

export interface Peer {
  /**
   * The identifier of the remote peer
   */
  id: string

  /**
   * The list of addresses the peer has that we know about
   */
  addresses: Address[]

  /**
   * Any peer store tags the peer has
   */
  tags: Record<string, number>

  /**
   * Any peer store metadata the peer has
   */
  metadata: Record<string, string>

  /**
   * The protocols the peer supports, if known
   */
  protocols: string[]
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
}

class DevToolsMetrics implements Metrics {
  private readonly log: Logger
  private readonly components: DevToolsMetricsComponents
  private readonly simpleMetrics: Metrics
  private readonly intervalMs?: number

  constructor (components: DevToolsMetricsComponents, init?: Partial<DevToolsMetricsInit>) {
    this.log = components.logger.forComponent('libp2p:devtools-metrics')
    this.intervalMs = init?.intervalMs
    this.components = components

    // collect information on current peers and sent it to the dev tools panel
    this.onPeersUpdate = debounce(this.onPeersUpdate.bind(this), 1000)
    this.onSelfUpdate = this.onSelfUpdate.bind(this)
    this.onIncomingMessage = this.onIncomingMessage.bind(this)

    // collect metrics
    this.simpleMetrics = simpleMetrics({
      intervalMs: this.intervalMs,
      onMetrics: (metrics) => {
        const message: MetricsMessage = {
          source: SOURCE_METRICS,
          type: 'metrics',
          metrics
        }

        this.log('post metrics message')
        window.postMessage(message, '*')
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

    // send metrics
    await start(this.simpleMetrics)
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

  private onPeersUpdate (): void {
    Promise.resolve().then(async () => {
      const message: PeersMessage = {
        source: SOURCE_METRICS,
        type: 'peers',
        peers: []
      }

      const connections = this.components.connectionManager.getConnectionsMap()
      const connectedAddresses = [...connections.values()].flatMap(conn => conn).map(conn => conn.remoteAddr.toString())

      for (const [peerId, conns] of connections.entries()) {
        try {
          const peer = await this.components.peerStore.get(peerId)

          message.peers.push({
            id: peerId.toString(),
            addresses: peer.addresses.map(({ isCertified, multiaddr }) => {
              const addr = multiaddr.toString()

              return {
                multiaddr: addr,
                isCertified,
                isConnected: connectedAddresses.includes(addr)
              }
            }),
            protocols: [...peer.protocols],
            tags: toObject(peer.tags, (t) => t.value),
            metadata: toObject(peer.metadata, (buf) => base64.encode(buf))
          })
        } catch (err) {
          this.log.error('could not load peer data from peer store', err)

          message.peers.push({
            id: peerId.toString(),
            addresses: conns.map(conn => {
              const addr = conn.remoteAddr.toString()

              return {
                multiaddr: addr,
                isConnected: connectedAddresses.includes(addr)
              }
            }),
            protocols: [],
            tags: {},
            metadata: {}
          })
        }
      }

      window.postMessage(message, '*')
    })
      .catch(err => {
        this.log.error('error sending peers message', err)
      })
  }

  private onSelfUpdate (evt: CustomEvent<PeerUpdate>): void {
    this.sendSelfUpdate(evt.detail.peer)
  }

  private sendSelfUpdate (peer: PeerStorePeer): void {
    Promise.resolve()
      .then(async () => {
        const message: SelfMessage = {
          source: SOURCE_METRICS,
          type: 'self',
          peer: {
            id: peer.id.toString(),
            multiaddrs: peer.addresses.map(({ multiaddr }) => multiaddr.toString()),
            protocols: [...peer.protocols],
            tags: toObject(peer.tags, (t) => t.value),
            metadata: toObject(peer.metadata, (buf) => base64.encode(buf))
          }
        }

        this.log('post node update message')
        window.postMessage(message, '*')
      })
      .catch(err => {
        this.log.error('error sending self update', err)
      })
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

    // respond to identify request
    if (message.type === 'identify') {
      Promise.resolve()
        .then(async () => {
          const peer = await this.components.peerStore.get(this.components.peerId)

          this.sendSelfUpdate(peer)
          // also send our current peer list
          this.onPeersUpdate()
        })
        .catch(err => {
          this.log.error('error sending identify response', err)
        })
    }

    // handle enabling/disabling debug namespaces
    if (message.type === 'debug') {
      if (message.namespace.length > 0) {
        enable(message.namespace)
      } else {
        disable()
      }
    }
  }
}

export function devToolsMetrics (init?: Partial<DevToolsMetricsInit>): (components: DevToolsMetricsComponents) => Metrics {
  return (components) => {
    return new DevToolsMetrics(components, init)
  }
}

function toObject <T, R> (map: Map<string, T>, transform: (value: T) => R): Record<string, R> {
  const output: Record<string, any> = {}

  for (const [key, value] of map.entries()) {
    output[key] = transform(value)
  }

  return output
}

function debounce (callback: () => void, wait: number = 100): () => void {
  let timeout: ReturnType<typeof setTimeout>
  let start: number | undefined

  return (): void => {
    if (start == null) {
      start = Date.now()
    }

    if (timeout != null && Date.now() - start > wait) {
      clearTimeout(timeout)
      start = undefined
      callback()
      return
    }

    clearTimeout(timeout)
    timeout = setTimeout(() => {
      start = undefined
      callback()
    }, wait)
  }
}
