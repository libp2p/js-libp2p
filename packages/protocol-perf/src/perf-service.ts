import { logger } from '@libp2p/logger'
import { pushable } from 'it-pushable'
import { MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS, PROTOCOL_NAME, RUN_ON_TRANSIENT_CONNECTION, WRITE_BLOCK_SIZE } from './constants.js'
import type { PerfOptions, PerfOutput, PerfServiceComponents, PerfServiceInit, PerfService as PerfServiceInterface } from './index.js'
import type { Startable } from '@libp2p/interface/startable'
import type { IncomingStreamData } from '@libp2p/interface-internal/registrar'
import type { Multiaddr } from '@multiformats/multiaddr'

const log = logger('libp2p:perf')

export class PerfService implements Startable, PerfServiceInterface {
  public readonly protocol: string
  private readonly components: PerfServiceComponents
  private started: boolean
  private readonly databuf: ArrayBuffer
  private readonly writeBlockSize: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly runOnTransientConnection: boolean

  constructor (components: PerfServiceComponents, init: PerfServiceInit = {}) {
    this.components = components
    this.started = false
    this.protocol = init.protocolName ?? PROTOCOL_NAME
    this.writeBlockSize = init.writeBlockSize ?? WRITE_BLOCK_SIZE
    this.databuf = new ArrayBuffer(this.writeBlockSize)
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.runOnTransientConnection = init.runOnTransientConnection ?? RUN_ON_TRANSIENT_CONNECTION
  }

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, (data: IncomingStreamData) => {
      void this.handleMessage(data).catch((err) => {
        log.error('error handling perf protocol message', err)
      })
    }, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnTransientConnection: this.runOnTransientConnection
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

    try {
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

      const uint8Buf = new Uint8Array(this.databuf)

      await stream.sink(async function * () {
        while (bytesToSendBack > 0) {
          let toSend: number = writeBlockSize
          if (toSend > bytesToSendBack) {
            toSend = bytesToSendBack
          }

          bytesToSendBack = bytesToSendBack - toSend
          yield uint8Buf.subarray(0, toSend)
        }
      }())
    } catch (err: any) {
      stream.abort(err)
    }
  }

  async * measurePerformance (ma: Multiaddr, sendBytes: number, receiveBytes: number, options: PerfOptions = {}): AsyncGenerator<PerfOutput> {
    log('opening stream on protocol %s to %a', this.protocol, ma)

    const uint8Buf = new Uint8Array(this.databuf)
    const writeBlockSize = this.writeBlockSize

    // start time should include connection establishment
    const initialStartTime = Date.now()
    const connection = await this.components.connectionManager.openConnection(ma, {
      ...options,
      force: options.reuseExistingConnection !== true
    })
    const stream = await connection.newStream(this.protocol, options)

    let lastAmountOfBytesSent = 0
    let lastReportedTime = Date.now()
    let totalBytesSent = 0

    // tell the remote how many bytes we will send. Up cast to 64 bit number
    // as if we send as ui32 we limit total transfer size to 4GB
    const view = new DataView(this.databuf)
    view.setBigUint64(0, BigInt(receiveBytes), false)

    log('sending %i bytes to %p', sendBytes, connection.remotePeer)

    try {
      const sendOutput = pushable<PerfOutput>({
        objectMode: true
      })

      void stream.sink(async function * () {
        // Send the number of bytes to receive
        yield uint8Buf.subarray(0, 8)

        while (sendBytes > 0) {
          options.signal?.throwIfAborted()

          let toSend: number = writeBlockSize
          if (toSend > sendBytes) {
            toSend = sendBytes
          }
          sendBytes = sendBytes - toSend
          yield uint8Buf.subarray(0, toSend)

          if (Date.now() - lastReportedTime > 1000) {
            sendOutput.push({
              type: 'intermediary',
              timeSeconds: (Date.now() - lastReportedTime) / 1000,
              uploadBytes: lastAmountOfBytesSent,
              downloadBytes: 0
            })

            // record last reported time after `console.log` because it can
            // affect benchmark timings
            lastReportedTime = Date.now()
            lastAmountOfBytesSent = 0
          }

          lastAmountOfBytesSent += toSend
          totalBytesSent += toSend
        }

        sendOutput.end()
      }())
        .catch(err => {
          sendOutput.end(err)
        })

      yield * sendOutput

      // Read the received bytes
      let lastAmountOfBytesReceived = 0
      lastReportedTime = Date.now()
      let totalBytesReceived = 0

      for await (const buf of stream.source) {
        options.signal?.throwIfAborted()

        if (Date.now() - lastReportedTime > 1000) {
          yield {
            type: 'intermediary',
            timeSeconds: (Date.now() - lastReportedTime) / 1000,
            uploadBytes: 0,
            downloadBytes: lastAmountOfBytesReceived
          }

          // record last reported time after `console.log` because it can
          // affect benchmark timings
          lastReportedTime = Date.now()
          lastAmountOfBytesReceived = 0
        }

        lastAmountOfBytesReceived += buf.byteLength
        totalBytesReceived += buf.byteLength
      }

      if (totalBytesReceived !== receiveBytes) {
        throw new Error(`Expected to receive ${receiveBytes} bytes, but received ${totalBytesReceived}`)
      }

      yield {
        type: 'final',
        timeSeconds: (Date.now() - initialStartTime) / 1000,
        uploadBytes: totalBytesSent,
        downloadBytes: totalBytesReceived
      }

      log('performed %s to %p', this.protocol, connection.remotePeer)
      await stream.close()
    } catch (err: any) {
      log('error sending %d/%d bytes to %p: %s', totalBytesSent, sendBytes, connection.remotePeer, err)
      stream.abort(err)
      throw err
    }
  }
}
