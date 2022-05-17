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

const log = logger('libp2p:ping')

export interface PingServiceInit {
  protocolPrefix: string
}

export class PingService implements Startable {
  private readonly components: Components
  private readonly protocol: string
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
  async ping (peer: PeerId): Promise<number> {
    log('dialing %s to %p', this.protocol, peer)

    const connection = await this.components.getConnectionManager().openConnection(peer)
    const { stream } = await connection.newStream([this.protocol])
    const start = Date.now()
    const data = randomBytes(PING_LENGTH)

    const result = await pipe(
      [data],
      stream,
      async (source) => await first(source)
    )
    const end = Date.now()

    if (result == null || !uint8ArrayEquals(data, result)) {
      throw errCode(new Error('Received wrong ping ack'), codes.ERR_WRONG_PING_ACK)
    }

    return end - start
  }
}
