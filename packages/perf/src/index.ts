import { logger } from '@libp2p/logger'
import { anySignal } from 'any-signal'
import { MAX_INBOUND_STREAMS, PROTOCOL_NAME, TIMEOUT, WRITE_BLOCK_SIZE } from './constants.js'
import type { Connection } from '@libp2p/interface/src/connection/index.js'
import type { Startable } from '@libp2p/interface/startable'
import type { ConnectionManager } from '@libp2p/interface-internal/connection-manager'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-internal/registrar'
import type { AbortOptions } from '@libp2p/interfaces'

const log = logger('libp2p:perf')

export const defaultInit: PerfServiceInit = {
  protocolName: '/perf/1.0.0',
  maxInboundStreams: 1 << 10,
  maxOutboundStreams: 1 << 10,
  timeout: 10000,
  writeBlockSize: BigInt(64 << 10)
}

export interface PerfService {
  perf: (connection: Connection, sendBytes: bigint, recvBytes: bigint, options?: AbortOptions) => Promise<void>
  measureDownloadBandwidth: (connection: Connection, size: bigint) => Promise<number>
  measureUploadBandwidth: (connection: Connection, size: bigint) => Promise<number>
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

export class DefaultPerfService implements Startable, PerfService {
  public readonly protocol: string
  private readonly components: PerfServiceComponents
  private started: boolean
  private readonly databuf: ArrayBuffer
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly timeout: number
  private readonly writeBlockSize: bigint

  constructor (components: PerfServiceComponents, init: PerfServiceInit) {
    this.components = components
    this.started = false
    this.protocol = init.protocolName ?? PROTOCOL_NAME
    this.databuf = new ArrayBuffer(Number(init.writeBlockSize ?? WRITE_BLOCK_SIZE))
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_INBOUND_STREAMS
    this.timeout = init.timeout ?? TIMEOUT
    this.writeBlockSize = init.writeBlockSize ?? WRITE_BLOCK_SIZE
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, (data: IncomingStreamData) => { void this.handleMessage(data) }, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams
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
      throw new Error('bytesToSendBack was null')
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

  async perf (connection: Connection, sendBytes: bigint, recvBytes: bigint, options: AbortOptions = {}): Promise<void> {
    log('opening stream on protocol %s to %p', this.protocol, connection.remotePeer)

    const uint8Buf = new Uint8Array(this.databuf)

    const writeBlockSize = this.writeBlockSize

    const signal = anySignal([AbortSignal.timeout(this.timeout), options?.signal])
    const stream = await connection.newStream([this.protocol], {
      signal
    })

    // Convert sendBytes to uint64 big endian buffer
    const view = new DataView(this.databuf)
    view.setBigInt64(0, recvBytes, false)

    log('sending %i bytes to %p', sendBytes, connection.remotePeer)

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

    log('performed %s to %p', this.protocol, connection.remotePeer)
    await stream.close()
  }

  // measureDownloadBandwidth returns the measured bandwidth in bits per second
  async measureDownloadBandwidth (connection: Connection, size: bigint): Promise<number> {
    const now = Date.now()
    await this.perf(connection, 0n, size)
    return Number((8000n * size) / BigInt(Date.now() - now))
  }

  // measureUploadBandwidth returns the measured bandwidth in bit per second
  async measureUploadBandwidth (connection: Connection, size: bigint): Promise<number> {
    const now = Date.now()
    await this.perf(connection, size, 0n)
    return Number((8000n * size) / BigInt(Date.now() - now))
  }
}

export function perfService (init: PerfServiceInit = {}): (components: PerfServiceComponents) => PerfService {
  return (components) => new DefaultPerfService(components, init)
}
