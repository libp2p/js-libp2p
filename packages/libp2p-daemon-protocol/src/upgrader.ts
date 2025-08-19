import { anySignal } from 'any-signal'
import type { ClearableSignal, Connection, ConnectionEncrypter, MultiaddrConnection, StreamMuxerFactory, Upgrader } from '@libp2p/interface'

export interface OnConnection {
  (conn: MultiaddrConnection): void
}

export class PassThroughUpgrader implements Upgrader {
  private readonly onConnection?: OnConnection

  constructor (handler?: OnConnection) {
    this.onConnection = handler
  }

  async upgradeInbound (maConn: MultiaddrConnection): Promise<void> {
    this.onConnection?.(maConn)
  }

  async upgradeOutbound (maConn: MultiaddrConnection): Promise<Connection> {
    // @ts-expect-error should return a connection
    return maConn
  }

  createInboundAbortSignal (signal: AbortSignal): ClearableSignal {
    return anySignal([signal])
  }

  getStreamMuxers (): Map<string, StreamMuxerFactory> {
    return new Map()
  }

  getConnectionEncrypters (): Map<string, ConnectionEncrypter<unknown>> {
    return new Map()
  }
}
