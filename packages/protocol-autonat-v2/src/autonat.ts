import { serviceCapabilities, serviceDependencies, start, stop } from '@libp2p/interface'
import { AutoNATv2Client } from './client.ts'
import { DIAL_BACK, DIAL_REQUEST, PROTOCOL_NAME, PROTOCOL_PREFIX, PROTOCOL_VERSION } from './constants.ts'
import { AutoNATv2Server } from './server.ts'
import type { AutoNATv2Components, AutoNATv2ServiceInit } from './index.ts'
import type { Startable } from '@libp2p/interface'

export class AutoNATv2Service implements Startable {
  private readonly client: AutoNATv2Client
  private readonly server: AutoNATv2Server

  constructor (components: AutoNATv2Components, init: AutoNATv2ServiceInit) {
    const dialRequestProtocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}/${DIAL_REQUEST}`
    const dialBackProtocol = `/${init.protocolPrefix ?? PROTOCOL_PREFIX}/${PROTOCOL_NAME}/${PROTOCOL_VERSION}/${DIAL_BACK}`

    this.client = new AutoNATv2Client(components, {
      ...init,
      dialRequestProtocol,
      dialBackProtocol
    })
    this.server = new AutoNATv2Server(components, {
      ...init,
      dialRequestProtocol,
      dialBackProtocol
    })
  }

  readonly [Symbol.toStringTag] = '@libp2p/autonat-v2'

  readonly [serviceCapabilities]: string[] = [
    '@libp2p/autonat'
  ]

  get [serviceDependencies] (): string[] {
    return [
      '@libp2p/identify'
    ]
  }

  async start (): Promise<void> {
    await start(this.client, this.server)
  }

  async stop (): Promise<void> {
    await stop(this.client, this.server)
  }
}
