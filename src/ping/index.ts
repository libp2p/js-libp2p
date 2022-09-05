import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import { codes } from '../errors.js'
import { randomBytes } from '@libp2p/crypto'
import { pipe } from 'it-pipe'
import first from 'it-first'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { PROTOCOL_NAME, PING_LENGTH, PROTOCOL_VERSION } from './constants.js'
import type { IncomingStreamData } from '@libp2p/interface-registrar'
import type { PeerId } from '@libp2p/interface-peer-id'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Components } from '@libp2p/components'
import type { AbortOptions } from '@libp2p/interfaces'
import { abortableDuplex } from 'abortable-iterator'
import { TimeoutController } from 'timeout-abort-controller'
import type { Stream } from '@libp2p/interface-connection'
import { setMaxListeners } from 'events'

const log = logger('libp2p:ping')

export interface PingServiceInit {
  protocolPrefix: string
  maxInboundStreams: number
  maxOutboundStreams: number

  /**
   * How long we should wait for a ping response
   */
  timeout: number
}

export class PingService implements Startable {
  public readonly protocol: string
  private readonly components: Components
  private started: boolean
  private readonly init: PingServiceInit

  constructor (components: Components, init: PingServiceInit) {
    this.components = components
    this.started = false
    this.protocol = `/${init.protocolPrefix}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
    this.init = init
  }

  async start () {
    await this.components.getRegistrar().handle(this.protocol, this.handleMessage, {
      maxInboundStreams: this.init.maxInboundStreams,
      maxOutboundStreams: this.init.maxOutboundStreams
    })
    this.started = true
  }

  async stop () {
    await this.components.getRegistrar().unhandle(this.protocol)
    this.started = false
  }

  isStarted () {
    return this.started
  }

  /**
   * A handler to register with Libp2p to process ping messages
   */
  handleMessage (data: IncomingStreamData) {
    const { stream } = data

    void pipe(stream, stream)
      .catch(err => {
        log.error(err)
      })
  }

  /**
   * Ping a given peer and wait for its response, getting the operation latency.
   *
   * @param {PeerId|Multiaddr} peer
   * @returns {Promise<number>}
   */
  async ping (peer: PeerId, options: AbortOptions = {}): Promise<number> {
    log('dialing %s to %p', this.protocol, peer)

    const start = Date.now()
    const data = randomBytes(PING_LENGTH)
    const connection = await this.components.getConnectionManager().openConnection(peer, options)
    let timeoutController
    let signal = options.signal
    let stream: Stream | undefined

    // create a timeout if no abort signal passed
    if (signal == null) {
      timeoutController = new TimeoutController(this.init.timeout)
      signal = timeoutController.signal

      try {
        // fails on node < 15.4
        setMaxListeners?.(Infinity, timeoutController.signal)
      } catch {}
    }

    try {
      stream = await connection.newStream([this.protocol], {
        signal
      })

      // make stream abortable
      const source = abortableDuplex(stream, signal)

      const result = await pipe(
        [data],
        source,
        async (source) => await first(source)
      )
      const end = Date.now()

      if (result == null || !uint8ArrayEquals(data, result.subarray())) {
        throw errCode(new Error('Received wrong ping ack'), codes.ERR_WRONG_PING_ACK)
      }

      return end - start
    } finally {
      if (timeoutController != null) {
        timeoutController.clear()
      }

      if (stream != null) {
        stream.close()
      }
    }
  }
}
