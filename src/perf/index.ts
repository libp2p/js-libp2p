import { logger } from '@libp2p/logger'
import type { IncomingStreamData, Registrar } from '@libp2p/interface-registrar'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Startable } from '@libp2p/interfaces/startable'
import type { AbortOptions } from '@libp2p/interfaces'
import type { ConnectionManager } from '@libp2p/interface-connection-manager'

export const PROTOCOL = '/perf/1.0.0'

const log = logger('libp2p:perf')

const writeBlockSize = BigInt(64 << 10)
const maxStreams = 1 << 10

export interface PerfComponents {
  registrar: Registrar
  connectionManager: ConnectionManager
}

export class PerfService implements Startable {
  public readonly protocol: string
  private readonly components: PerfComponents
  private started: boolean
  private readonly databuf: ArrayBuffer

  constructor (components: PerfComponents) {
    this.components = components
    this.started = false
    this.protocol = PROTOCOL
    this.databuf = new ArrayBuffer(Number(writeBlockSize))
  }

  async start () {
    await this.components.registrar.handle(this.protocol, (data: IncomingStreamData) => { void this.handleMessage(data) }, {
      maxInboundStreams: maxStreams,
      maxOutboundStreams: maxStreams
    })
    this.started = true
  }

  async stop () {
    await this.components.registrar.unhandle(this.protocol)
    this.started = false
  }

  isStarted () {
    return this.started
  }

  async handleMessage (data: IncomingStreamData) {
    const { stream } = data

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

  async startPerfOnStream (peer: PeerId, sendBytes: bigint, recvBytes: bigint, options: AbortOptions = {}): Promise<void> {
    log('dialing %s to %p', this.protocol, peer)

    const uint8Buf = new Uint8Array(this.databuf)

    const connection = await this.components.connectionManager.openConnection(peer, options)
    const signal = options.signal
    const stream = await connection.newStream([this.protocol], {
      signal
    })

    // Convert sendBytes to uint64 big endian buffer
    const view = new DataView(this.databuf)
    view.setBigInt64(0, recvBytes, false)

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

    stream.close()
  }

  // measureDownloadBandwidth returns the measured bandwidth in bits per second
  async measureDownloadBandwidth (peer: PeerId, size: bigint) {
    const now = Date.now()
    await this.startPerfOnStream(peer, 0n, size)
    return Number((8000n * size) / BigInt(Date.now() - now))
  }

  // measureUploadBandwidth returns the measured bandwidth in bit per second
  async measureUploadBandwidth (peer: PeerId, size: bigint) {
    const now = Date.now()
    await this.startPerfOnStream(peer, size, 0n)
    return Number((8000n * size) / BigInt(Date.now() - now))
  }
}
