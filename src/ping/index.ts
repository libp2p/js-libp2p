import { logger } from '@libp2p/logger'
import errCode from 'err-code'
import { codes } from '../errors.js'
import { randomBytes } from '@libp2p/crypto'
import { pipe } from 'it-pipe'
import first from 'it-first'
import { equals as uint8ArrayEquals } from 'uint8arrays/equals'
import { PROTOCOL_NAME, PING_LENGTH, PROTOCOL_VERSION } from './constants.js'
import type { IncomingStreamData } from '@libp2p/interfaces/registrar'
import type { PeerId } from '@libp2p/interfaces/peer-id'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Components } from '@libp2p/interfaces/components'
import type { AbortOptions } from '@libp2p/interfaces'
import type { Duplex } from 'it-stream-types'
import { abortableDuplex } from 'abortable-iterator'

const log = logger('libp2p:ping')

export interface PingServiceInit {
  protocolPrefix: string
}

export class PingService implements Startable {
  public readonly protocol: string
  private readonly components: Components
  private started: boolean

  constructor (components: Components, init: PingServiceInit) {
    this.components = components
    this.started = false
    this.protocol = `/${init.protocolPrefix}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}`
  }

  async start () {
    await this.components.getRegistrar().handle(this.protocol, this.handleMessage)
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

    const connection = await this.components.getConnectionManager().openConnection(peer, options)
    const { stream } = await connection.newStream([this.protocol], options)
    const start = Date.now()
    const data = randomBytes(PING_LENGTH)

    let source: Duplex<Uint8Array> = stream

    // make stream abortable if AbortSignal passed
    if (options.signal != null) {
      source = abortableDuplex(stream, options.signal)
    }

    try {
      const result = await pipe(
        [data],
        source,
        async (source) => await first(source)
      )
      const end = Date.now()

      if (result == null || !uint8ArrayEquals(data, result)) {
        throw errCode(new Error('Received wrong ping ack'), codes.ERR_WRONG_PING_ACK)
      }

      return end - start
    } finally {
      stream.close()
    }
  }
}
