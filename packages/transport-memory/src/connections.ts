import { ConnectionFailedError } from '@libp2p/interface'
import { multiaddr } from '@multiformats/multiaddr'
import delay from 'delay'
import { pushable } from 'it-pushable'
import { raceSignal } from 'race-signal'
import { DEFAULT_MAX_MESSAGE_SIZE } from './constants.ts'
import { pushableToMaConn } from './pushable-to-conn.ts'
import type { MemoryTransportComponents, MemoryTransportInit } from './index.js'
import type { Logger, MultiaddrConnection, PeerId } from '@libp2p/interface'
import type { Uint8ArrayList } from 'uint8arraylist'

export const connections = new Map<string, MemoryConnection>()

interface MemoryConnectionHandler {
  (maConn: MultiaddrConnection): void
}

interface MemoryConnectionInit extends MemoryTransportInit {
  onConnection: MemoryConnectionHandler
  address: string
}

let connectionId = 0

export class MemoryConnection {
  public readonly latency: number

  private readonly components: MemoryTransportComponents
  private readonly init: MemoryConnectionInit
  private readonly connections: Set<MultiaddrConnection>
  private readonly log: Logger

  constructor (components: MemoryTransportComponents, init: MemoryConnectionInit) {
    this.components = components
    this.init = init
    this.connections = new Set()
    this.latency = init.latency ?? 0
    this.log = components.logger.forComponent('libp2p:memory')
  }

  async dial (dialingPeerId: PeerId, dialingPeerLog: Logger, signal: AbortSignal): Promise<MultiaddrConnection> {
    const self = this

    let dialerEnded = false
    let listenerEnded = false

    const dialerPushable = pushable<Uint8Array | Uint8ArrayList>({
      onEnd (err) {
        dialerEnded = true
        self.connections.delete(dialer)

        if (!listenerEnded) {
          listenerPushable.end(err)
        }
      }
    })
    const listenerPushable = pushable<Uint8Array | Uint8ArrayList>({
      onEnd (err) {
        listenerEnded = true
        self.connections.delete(listener)

        if (!dialerEnded) {
          dialerPushable.end(err)
        }
      }
    })

    const dialer = pushableToMaConn({
      connection: this,
      remoteAddr: multiaddr(`${this.init.address}/p2p/${this.components.peerId}`),
      direction: 'outbound',
      localPushable: dialerPushable,
      remotePushable: listenerPushable,
      log: dialingPeerLog.newScope(`connection:${connectionId}`),
      maxMessageSize: this.init.maxMessageSize ?? DEFAULT_MAX_MESSAGE_SIZE
    })

    const listener = pushableToMaConn({
      connection: this,
      remoteAddr: multiaddr(`${this.init.address}-outgoing/p2p/${dialingPeerId}`),
      direction: 'inbound',
      localPushable: listenerPushable,
      remotePushable: dialerPushable,
      log: this.log.newScope(`connection:${connectionId}`),
      maxMessageSize: this.init.maxMessageSize ?? DEFAULT_MAX_MESSAGE_SIZE
    })

    this.connections.add(dialer)
    this.connections.add(listener)
    connectionId++

    await raceSignal(delay(this.latency), signal)

    this.init.onConnection(listener)

    return dialer
  }

  close (): void {
    [...this.connections].forEach(maConn => {
      maConn.abort(new ConnectionFailedError('Memory Connection closed'))
    })
  }
}
