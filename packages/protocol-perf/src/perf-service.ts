import { pushable } from 'it-pushable'
import { raceEvent } from 'race-event'
import { Uint8ArrayList } from 'uint8arraylist'
import { MAX_INBOUND_STREAMS, MAX_OUTBOUND_STREAMS, PROTOCOL_NAME, RUN_ON_LIMITED_CONNECTION, WRITE_BLOCK_SIZE } from './constants.js'
import type { PerfOptions, PerfOutput, PerfComponents, PerfInit, Perf as PerfInterface } from './index.js'
import type { Connection, Logger, Startable, Stream } from '@libp2p/interface'
import type { Multiaddr } from '@multiformats/multiaddr'

export class Perf implements Startable, PerfInterface {
  private readonly log: Logger
  public readonly protocol: string
  private readonly components: PerfComponents
  private started: boolean
  private readonly buf: ArrayBuffer
  private readonly writeBlockSize: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly runOnLimitedConnection: boolean

  constructor (components: PerfComponents, init: PerfInit = {}) {
    this.components = components
    this.log = components.logger.forComponent('libp2p:perf')
    this.started = false
    this.protocol = init.protocolName ?? PROTOCOL_NAME
    this.writeBlockSize = init.writeBlockSize ?? WRITE_BLOCK_SIZE
    this.buf = new ArrayBuffer(this.writeBlockSize)
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.runOnLimitedConnection = init.runOnLimitedConnection ?? RUN_ON_LIMITED_CONNECTION
  }

  readonly [Symbol.toStringTag] = '@libp2p/perf'

  async start (): Promise<void> {
    await this.components.registrar.handle(this.protocol, (stream: Stream, connection: Connection) => {
      this.handleMessage(stream, connection)
        .catch((err) => {
          this.log.error('error handling perf protocol message - %e', err)
        })
    }, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams,
      runOnLimitedConnection: this.runOnLimitedConnection
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

  async handleMessage (stream: Stream, connection: Connection): Promise<void> {
    try {
      const writeBlockSize = this.writeBlockSize

      let bytesToSendBack: number | undefined

      for await (const buf of stream) {
        if (bytesToSendBack == null) {
          const list = new Uint8ArrayList(buf)
          // downcast 64 to 52 bits to avoid bigint arithmetic performance penalty
          bytesToSendBack = Number(list.getBigUint64(0, false))
        }

        // Ingest all the data and wait for the read side to close
      }

      if (bytesToSendBack == null) {
        throw new Error('bytesToSendBack was not set')
      }

      const uint8Buf = new Uint8Array(this.buf, 0, this.buf.byteLength)

      while (bytesToSendBack > 0) {
        let toSend: number = writeBlockSize
        if (toSend > bytesToSendBack) {
          toSend = bytesToSendBack
        }

        bytesToSendBack = bytesToSendBack - toSend
        const buf = uint8Buf.subarray(0, toSend)

        const sendMore = stream.send(buf)

        if (!sendMore) {
          await raceEvent(stream, 'drain')
        }
      }
    } catch (err: any) {
      stream.abort(err)
    }
  }

  async * measurePerformance (ma: Multiaddr, sendBytes: number, receiveBytes: number, options: PerfOptions = {}): AsyncGenerator<PerfOutput> {
    const uint8Buf = new Uint8Array(this.buf)
    const writeBlockSize = this.writeBlockSize

    const initialStartTime = Date.now()
    let lastReportedTime = Date.now()
    const connection = await this.components.connectionManager.openConnection(ma, {
      ...options,
      force: options.reuseExistingConnection !== true
    })

    const log = connection.log.newScope('perf')

    log('opened connection after %d ms', Date.now() - lastReportedTime)
    lastReportedTime = Date.now()

    const stream = await connection.newStream(this.protocol, options)

    log('opened stream after %d ms', Date.now() - lastReportedTime)
    lastReportedTime = Date.now()

    let lastAmountOfBytesSent = 0
    let totalBytesSent = 0
    const uploadStart = Date.now()

    // tell the remote how many bytes we will send. Up cast to 64 bit number
    // as if we send as ui32 we limit total transfer size to 4GB
    const view = new DataView(this.buf)
    view.setBigUint64(0, BigInt(receiveBytes), false)

    log('sending %i bytes to %p', sendBytes, connection.remotePeer)

    try {
      const output = pushable<PerfOutput>({
        objectMode: true
      })

      Promise.resolve().then(async () => {
        const sendMore = stream.send(uint8Buf.subarray(0, 8))

        if (!sendMore) {
          await raceEvent(stream, 'drain')
        }

        while (sendBytes > 0) {
          let toSend: number = writeBlockSize

          if (toSend > sendBytes) {
            toSend = sendBytes
          }

          const sendMore = stream.send(uint8Buf.subarray(0, toSend))

          if (!sendMore) {
            await raceEvent(stream, 'drain')
          }

          sendBytes -= toSend

          if (Date.now() - lastReportedTime > 1000) {
            output.push({
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

        output.end()
      })
        .catch(err => {
          output.end(err)
        })

      yield * output

      log('upload complete after %d ms', Date.now() - uploadStart)

      // Read the received bytes
      let lastAmountOfBytesReceived = 0
      lastReportedTime = Date.now()
      let totalBytesReceived = 0
      const downloadStart = Date.now()

      for await (const buf of stream) {
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

      log('download complete after %d ms', Date.now() - downloadStart)

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
