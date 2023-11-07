/**
 * @packageDocumentation
 *
 * The `performanceService` implements the [perf protocol](https://github.com/libp2p/specs/blob/master/perf/perf.md), which is used to measure performance within and across libp2p implementations.
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
 * await node.services.perf.measurePerformance(connection, uploadBytes, downloadBytes)
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
  writeBlockSize: WRITE_BLOCK_SIZE
}

export interface PerfService {
  measurePerformance(connection: Connection, sendBytes: number, recvBytes: number, options?: AbortOptions): Promise<PerfOutput>
}

export interface PerfOutput {
  type: 'intermediary' | 'final'
  timeSeconds: number
  uploadBytes: number
  downloadBytes: number
}

export interface PerfServiceInit {
  protocolName?: string
  maxInboundStreams?: number
  maxOutboundStreams?: number
  timeout?: number

  /**
   * Chunk size to send on each iteration
   */
  writeBlockSize?: number
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
  private readonly writeBlockSize: number

  constructor (components: PerfServiceComponents, init: PerfServiceInit) {
    this.components = components
    this.started = false
    this.protocol = init.protocolName ?? PROTOCOL_NAME
    this.writeBlockSize = init.writeBlockSize ?? WRITE_BLOCK_SIZE
    this.databuf = new ArrayBuffer(this.writeBlockSize)
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

    let bytesToSendBack: number | undefined

    for await (const buf of stream.source) {
      if (bytesToSendBack == null) {
        // downcast 64 to 52 bits to avoid bigint arithmetic performance penalty
        bytesToSendBack = Number(buf.getBigUint64(0, false))
      }
      // Ingest all the bufs and wait for the read side to close
    }

    if (bytesToSendBack == null) {
      throw new Error('bytesToSendBack was not set')
    }

    let lastAmountOfBytesSent = 0
    let lastReportedTime = Date.now()
    let totalBytesSent = 0

    const uint8Buf = new Uint8Array(this.databuf)
    const initialStartTime = Date.now()

    await stream.sink(async function * () {
      while (bytesToSendBack > 0) {
        let toSend: number = writeBlockSize
        if (toSend > bytesToSendBack) {
          toSend = bytesToSendBack
        }

        bytesToSendBack = bytesToSendBack - toSend
        yield uint8Buf.subarray(0, toSend)

        if (Date.now() - lastReportedTime > 1000) {
          const output: PerfOutput = {
            type: 'intermediary',
            timeSeconds: (Date.now() - lastReportedTime) / 1000,
            uploadBytes: 0,
            downloadBytes: lastAmountOfBytesSent
          }

          // eslint-disable-next-line no-console
          console.log(JSON.stringify(output))

          // record last reported time after `console.log` because it can
          // affect benchmark timings
          lastReportedTime = Date.now()
          lastAmountOfBytesSent = 0
        }

        lastAmountOfBytesSent += toSend
        totalBytesSent += toSend
      }
    }())

    const finalOutput: PerfOutput = {
      type: 'final',
      timeSeconds: (Date.now() - initialStartTime) / 1000,
      uploadBytes: 0,
      downloadBytes: totalBytesSent
    }

    // eslint-disable-next-line no-console
    console.log(JSON.stringify(finalOutput))
  }

  async measurePerformance (connection: Connection, sendBytes: number, recvBytes: number, options: AbortOptions = {}): Promise<PerfOutput> {
    log('opening stream on protocol %s to %p', this.protocol, connection.remotePeer)

    let finalOutput: PerfOutput

    const uint8Buf = new Uint8Array(this.databuf)
    const writeBlockSize = this.writeBlockSize
    const stream = await connection.newStream([this.protocol], options)

    let lastAmountOfBytesSent = 0
    let lastReportedTime = Date.now()
    let totalBytesSent = 0

    const initialStartTime = lastReportedTime

    // tell the remote how many bytes we will send. Up cast to 64 bit number
    // as if we send as ui32 we limit total transfer size to 4GB
    const view = new DataView(this.databuf)
    view.setBigUint64(0, BigInt(recvBytes), false)

    log('sending %i bytes to %p', sendBytes, connection.remotePeer)

    try {
      await stream.sink((async function * () {
        // Send the number of bytes to receive
        yield uint8Buf.subarray(0, 8)

        while (sendBytes > 0) {
          let toSend: number = writeBlockSize
          if (toSend > sendBytes) {
            toSend = sendBytes
          }
          sendBytes = sendBytes - toSend
          yield uint8Buf.subarray(0, toSend)

          if (Date.now() - lastReportedTime > 1000) {
            const output: PerfOutput = {
              type: 'intermediary',
              timeSeconds: (Date.now() - lastReportedTime) / 1000,
              uploadBytes: lastAmountOfBytesSent,
              downloadBytes: 0
            }

            // eslint-disable-next-line no-console
            console.log(JSON.stringify(output))

            // record last reported time after `console.log` because it can
            // affect benchmark timings
            lastReportedTime = Date.now()
            lastAmountOfBytesSent = 0
          }

          lastAmountOfBytesSent += toSend
          totalBytesSent += toSend
        }
      })())

      // Read the received bytes
      let actualRecvdBytes = 0
      for await (const buf of stream.source) {
        actualRecvdBytes += buf.byteLength
      }

      if (actualRecvdBytes !== recvBytes) {
        throw new Error(`Expected to receive ${recvBytes} bytes, but received ${actualRecvdBytes}`)
      }
    } catch (err) {
      log('error sending %s bytes to %p: %s', totalBytesSent, connection.remotePeer, err)
      throw err
    } finally {
      finalOutput = {
        type: 'final',
        timeSeconds: (Date.now() - initialStartTime) / 1000,
        uploadBytes: totalBytesSent,
        downloadBytes: 0
      }

      log('performed %s to %p', this.protocol, connection.remotePeer)
      await stream.close()
    }

    return finalOutput
  }
}

export function perfService (init: PerfServiceInit = {}): (components: PerfServiceComponents) => PerfService {
  return (components) => new DefaultPerfService(components, init)
}
