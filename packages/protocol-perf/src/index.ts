/**
 * @packageDocumentation
 *
 * The `performanceService` implements the [perf protocol](https://github.com/libp2p/specs/blob/master/perf/perf.md), which is used to measure performance within and across libp2p implementations
 * addresses.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { perfService } from '@libp2p/perf'
 *
 * const node = await createLibp2p({
 *   service: [
 *     perfService()
 *   ]
 * })
 * ```
 *
 * The `measurePerformance` function can be used to measure the latency and throughput of a connection.
 * server.  This will not work in browsers.
 *
 * @example
 *
 * ```typescript
 * import { createLibp2p } from 'libp2p'
 * import { perfService } from 'libp2p/perf'
 *
 * const node = await createLibp2p({
 *   services: [
 *     perf: perfService()
 *   ]
 * })
 *
 * const connection = await node.dial(multiaddr(multiaddrAddress))
 *
 * const startTime = Date.now()
 *
 * await node.services.perf.measurePerformance(startTime, connection, BigInt(uploadBytes), BigInt(downloadBytes))
 *
 * ```
 */

import { logger } from '@libp2p/logger'
import { PROTOCOL_NAME, WRITE_BLOCK_SIZE } from './constants.js'
import type { Connection } from '@libp2p/interface/connection'
import type { Startable } from '@libp2p/interface/startable'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-internal/registrar'
import type { AbortOptions } from '@libp2p/interfaces'

const log = logger('libp2p:perf')

export const defaultInit: PerfServiceInit = {
  protocolName: '/perf/1.0.0',
  writeBlockSize: BigInt(64 << 10)
}

export interface PerfService {
  measurePerformance: (startTime: number, connection: Connection, sendBytes: bigint, recvBytes: bigint, options?: AbortOptions) => Promise<number>
}

export interface PerfServiceInit {
  protocolName?: string
  maxInboundStreams?: number
  maxOutboundStreams?: number
  timeout?: number
  writeBlockSize?: bigint
}

export interface PerfServiceComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
}

class DefaultPerfService implements Startable, PerfService {
  public readonly protocol: string
  private readonly components: PerfServiceComponents
  private started: boolean
  private readonly databuf: ArrayBuffer
  private readonly writeBlockSize: bigint

  constructor (components: PerfServiceComponents, init: PerfServiceInit) {
    this.components = components
    this.started = false
    this.protocol = init.protocolName ?? PROTOCOL_NAME
    this.writeBlockSize = init.writeBlockSize ?? WRITE_BLOCK_SIZE
    this.databuf = new ArrayBuffer(Number(init.writeBlockSize))
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, (data: IncomingStreamData) => {
      void this.handleMessage(data).catch((err) => {
        log.error('error handling perf protocol message', err)
      })
    })
    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.protocol)
    this.started = false
  }

  isStarted (): boolean {
    return this.started
  }

  async handleMessage (data: IncomingStreamData): Promise<void> {
    const { stream } = data

    const writeBlockSize = this.writeBlockSize

    let bytesToSendBack: bigint | null = null

    for await (const buf of stream.source) {
      if (bytesToSendBack === null) {
        bytesToSendBack = BigInt(buf.getBigUint64(0, false))
      }
      // Ingest all the bufs and wait for the read side to close
    }

    const uint8Buf = new Uint8Array(this.databuf)

    if (bytesToSendBack === null) {
      throw new Error('bytesToSendBack was not set')
    }

    await stream.sink(async function * () {
      while (bytesToSendBack > 0n) {
        let toSend: bigint = writeBlockSize
        if (toSend > bytesToSendBack) {
          toSend = bytesToSendBack
        }
        bytesToSendBack = bytesToSendBack - toSend
        yield uint8Buf.subarray(0, Number(toSend))
      }
    }())
  }

  async measurePerformance (startTime: number, connection: Connection, sendBytes: bigint, recvBytes: bigint, options: AbortOptions = {}): Promise<number> {
    log('opening stream on protocol %s to %p', this.protocol, connection.remotePeer)

    const uint8Buf = new Uint8Array(this.databuf)

    const writeBlockSize = this.writeBlockSize

    const stream = await connection.newStream([this.protocol], options)

    // Convert sendBytes to uint64 big endian buffer
    const view = new DataView(this.databuf)
    view.setBigInt64(0, recvBytes, false)

    log('sending %i bytes to %p', sendBytes, connection.remotePeer)
    try {
      await stream.sink((async function * () {
        // Send the number of bytes to receive
        yield uint8Buf.subarray(0, 8)
        // Send the number of bytes to send
        while (sendBytes > 0n) {
          let toSend: bigint = writeBlockSize
          if (toSend > sendBytes) {
            toSend = sendBytes
          }
          sendBytes = sendBytes - toSend
          yield uint8Buf.subarray(0, Number(toSend))
        }
      })())

      // Read the received bytes
      let actualRecvdBytes = BigInt(0)
      for await (const buf of stream.source) {
        actualRecvdBytes += BigInt(buf.length)
      }

      if (actualRecvdBytes !== recvBytes) {
        throw new Error(`Expected to receive ${recvBytes} bytes, but received ${actualRecvdBytes}`)
      }
    } catch (err) {
      log('error sending %i bytes to %p: %s', sendBytes, connection.remotePeer, err)
      throw err
    } finally {
      log('performed %s to %p', this.protocol, connection.remotePeer)
      await stream.close()
    }

    // Return the latency
    return Date.now() - startTime
  }
}

export function perfService (init: PerfServiceInit = {}): (components: PerfServiceComponents) => PerfService {
  return (components) => new DefaultPerfService(components, init)
}
