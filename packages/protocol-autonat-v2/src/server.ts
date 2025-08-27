import { ProtocolError } from '@libp2p/interface'
import { isPrivateIp, pbStream } from '@libp2p/utils'
import { CODE_IP4, CODE_IP6, multiaddr } from '@multiformats/multiaddr'
import { setMaxListeners } from 'main-event'
import { MAX_INBOUND_STREAMS, MAX_MESSAGE_SIZE, MAX_OUTBOUND_STREAMS, TIMEOUT } from './constants.ts'
import { DialBack, DialBackResponse, DialResponse, DialStatus, Message } from './pb/index.ts'
import { randomNumber } from './utils.ts'
import type { AutoNATv2Components, AutoNATv2ServiceInit } from './index.ts'
import type { Logger, Connection, Startable, AbortOptions, Stream } from '@libp2p/interface'
import type { ProtobufMessageStream } from '@libp2p/utils'
import type { Multiaddr } from '@multiformats/multiaddr'

export interface AutoNATv2ServerInit extends AutoNATv2ServiceInit {
  dialRequestProtocol: string
  dialBackProtocol: string
}

export class AutoNATv2Server implements Startable {
  private readonly components: AutoNATv2Components
  private readonly dialRequestProtocol: string
  private readonly dialBackProtocol: string
  private readonly timeout: number
  private readonly maxInboundStreams: number
  private readonly maxOutboundStreams: number
  private readonly maxMessageSize: number
  private started: boolean
  private readonly log: Logger

  constructor (components: AutoNATv2Components, init: AutoNATv2ServerInit) {
    this.components = components
    this.log = components.logger.forComponent('libp2p:auto-nat-v2:server')
    this.started = false
    this.dialRequestProtocol = init.dialRequestProtocol
    this.dialBackProtocol = init.dialBackProtocol
    this.timeout = init.timeout ?? TIMEOUT
    this.maxInboundStreams = init.maxInboundStreams ?? MAX_INBOUND_STREAMS
    this.maxOutboundStreams = init.maxOutboundStreams ?? MAX_OUTBOUND_STREAMS
    this.maxMessageSize = init.maxMessageSize ?? MAX_MESSAGE_SIZE

    this.handleDialRequestStream = this.handleDialRequestStream.bind(this)
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    // AutoNat server
    await this.components.registrar.handle(this.dialRequestProtocol, this.handleDialRequestStream, {
      maxInboundStreams: this.maxInboundStreams,
      maxOutboundStreams: this.maxOutboundStreams
    })

    this.started = true
  }

  async stop (): Promise<void> {
    await this.components.registrar.unhandle(this.dialRequestProtocol)

    this.started = false
  }

  /**
   * Handle an incoming AutoNAT request
   */
  async handleDialRequestStream (stream: Stream, connection: Connection): Promise<void> {
    const signal = AbortSignal.timeout(this.timeout)
    setMaxListeners(Infinity, signal)

    const messages = pbStream(stream, {
      maxDataLength: this.maxMessageSize
    }).pb(Message)

    const connectionIp = getIpAddress(connection.remoteAddr)

    if (connectionIp == null) {
      throw new ProtocolError(`Could not find IP address in connection address "${connection.remoteAddr}"`)
    }

    const { dialRequest } = await messages.read({
      signal
    })

    if (dialRequest == null) {
      throw new ProtocolError('Did not receive DialRequest message on incoming dial request stream')
    }

    if (dialRequest.addrs.length === 0) {
      throw new ProtocolError('Did not receive any addresses to dial')
    }

    for (let i = 0; i < dialRequest.addrs.length; i++) {
      try {
        const ma = multiaddr(dialRequest.addrs[i])
        const isDialable = await this.components.connectionManager.isDialable(ma, {
          signal
        })

        if (!isDialable) {
          await messages.write({
            dialResponse: {
              addrIdx: i,
              status: DialResponse.ResponseStatus.E_DIAL_REFUSED,
              dialStatus: DialStatus.UNUSED
            }
          }, {
            signal
          })

          continue
        }

        const ip = getIpAddress(ma)

        if (ip == null) {
          throw new ProtocolError(`Could not find IP address in requested address "${ma}"`)
        }

        if (isPrivateIp(ip)) {
          throw new ProtocolError(`Requested address had private IP "${ma}"`)
        }

        if (ip !== connectionIp) {
          // amplification attack protection - request the client sends us a
          // random number of bytes before we'll dial the address
          await this.preventAmplificationAttack(messages, i, {
            signal
          })
        }

        const dialStatus = await this.dialClientBack(ma, dialRequest.nonce, {
          signal
        })

        await messages.write({
          dialResponse: {
            addrIdx: i,
            status: DialResponse.ResponseStatus.OK,
            dialStatus
          }
        }, {
          signal
        })
      } catch (err) {
        this.log.error('error handling incoming dialback request - %e', err)
      }
    }

    await stream.close({
      signal
    })
  }

  private async preventAmplificationAttack (messages: ProtobufMessageStream<Message, Stream>, index: number, options: AbortOptions): Promise<void> {
    const numBytes = randomNumber(30_000, 100_000)

    await messages.write({
      dialDataRequest: {
        addrIdx: index,
        numBytes: BigInt(numBytes)
      }
    }, options)

    let received = 0

    while (received < numBytes) {
      const { dialDataResponse } = await messages.read(options)

      if (dialDataResponse == null) {
        throw new ProtocolError('Did not receive DialDataResponse message on incoming dial request stream')
      }

      received += dialDataResponse.data.byteLength
    }
  }

  private async dialClientBack (ma: Multiaddr, nonce: bigint, options: AbortOptions): Promise<DialStatus> {
    let connection: Connection

    try {
      connection = await this.components.connectionManager.openConnection(ma, {
        force: true,
        ...options
      })
    } catch (err: any) {
      this.log.error('failed to open connection to %a - %e', err, ma)

      return DialStatus.E_DIAL_ERROR
    }

    try {
      const stream = await connection.newStream(this.dialBackProtocol, options)
      const dialBackMessages = pbStream(stream, {
        maxDataLength: this.maxMessageSize
      })

      await dialBackMessages.write({
        nonce
      }, DialBack, options)

      const response = await dialBackMessages.read(DialBackResponse, options)

      if (response.status !== DialBackResponse.DialBackStatus.OK) {
        throw new ProtocolError('DialBackResponse status was not OK')
      }

      await connection.close(options)
    } catch (err: any) {
      this.log.error('could not perform dial back - %e', err)

      connection.abort(err)

      return DialStatus.E_DIAL_BACK_ERROR
    }

    // dial back was successful
    return DialStatus.OK
  }
}

function getIpAddress (ma: Multiaddr): string | undefined {
  return ma.getComponents()
    .filter(component => {
      return component.code === CODE_IP4 || component.code === CODE_IP6
    })
    .map(component => component.value)
    .pop()
}
