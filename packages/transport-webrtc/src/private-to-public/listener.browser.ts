import { EventEmitter } from '@libp2p/interface/events'
import type { Listener, ListenerEvents } from '@libp2p/interface/transport'
import { unimplemented } from '../error.js'
import type { Multiaddr } from '@multiformats/multiaddr'

export class WebRTCDirectListener extends EventEmitter<ListenerEvents> implements Listener {
  constructor () {
    super()

    throw unimplemented('WebRTCDirectListener.constructor')
  }

  async listen (multiaddr: Multiaddr): Promise<void> {
    throw unimplemented('WebRTCDirectListener.listen')
  }

  getAddrs (): [] {
    throw unimplemented('WebRTCDirectListener.getAddrs')
  }

  async close (): Promise<void> {
    throw unimplemented('WebRTCDirectListener.close')
  }
}
