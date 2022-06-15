import { select } from './select.js'
import { handle } from './handle.js'
import { PROTOCOL_ID } from './constants.js'
import type { Duplex } from 'it-stream-types'
import type { AbortOptions } from '@libp2p/interfaces'

export { PROTOCOL_ID }

export interface ProtocolStream {
  stream: Duplex<Uint8Array>
  protocol: string
}

class MultistreamSelect {
  protected stream: Duplex<Uint8Array>
  protected shaken: boolean

  constructor (stream: Duplex<Uint8Array>) {
    this.stream = stream
    this.shaken = false
  }

  /**
   * Perform the multistream-select handshake
   *
   * @param {AbortOptions} [options]
   */
  async _handshake (options?: AbortOptions): Promise<void> {
    if (this.shaken) {
      return
    }

    const { stream } = await select(this.stream, PROTOCOL_ID, undefined, options)
    this.stream = stream
    this.shaken = true
  }
}

export class Dialer extends MultistreamSelect {
  async select (protocols: string | string[], options?: AbortOptions): Promise<ProtocolStream> {
    return await select(this.stream, protocols, this.shaken ? undefined : PROTOCOL_ID, options)
  }
}

export class Listener extends MultistreamSelect {
  async handle (protocols: string | string[], options?: AbortOptions): Promise<ProtocolStream> {
    return await handle(this.stream, protocols, options)
  }
}
