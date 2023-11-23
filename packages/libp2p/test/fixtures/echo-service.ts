import { pipe } from 'it-pipe'
import type { Startable } from '@libp2p/interface/startable'
import type { Registrar } from '@libp2p/interface-internal/registrar'

export const ECHO_PROTOCOL = '/echo/1.0.0'

export interface EchoInit {
  protocol?: string
}

export interface EchoComponents {
  registrar: Registrar
}

class EchoService implements Startable {
  private readonly protocol: string
  private readonly registrar: Registrar

  constructor (components: EchoComponents, init: EchoInit = {}) {
    this.protocol = init.protocol ?? ECHO_PROTOCOL
    this.registrar = components.registrar
  }

  async start (): Promise<void> {
    await this.registrar.handle(this.protocol, ({ stream }) => {
      void pipe(stream, stream)
        // sometimes connections are closed before multistream-select finishes
        // which causes an error
        .catch()
    })
  }

  async stop (): Promise<void> {
    await this.registrar.unhandle(this.protocol)
  }
}

export function echo (init: EchoInit = {}): (components: EchoComponents) => unknown {
  return (components) => {
    return new EchoService(components, init)
  }
}
