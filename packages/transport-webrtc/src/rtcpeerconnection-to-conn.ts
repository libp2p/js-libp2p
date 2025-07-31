import { AbstractMultiaddrConnection } from '@libp2p/utils'
import type { RTCPeerConnection } from './webrtc/index.js'
import type { AbortOptions, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit } from '@libp2p/utils'

export interface RTCPeerConnectionMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'stream'> {
  peerConnection: RTCPeerConnection
}

class RTCPeerConnectionMultiaddrConnection extends AbstractMultiaddrConnection {
  private peerConnection: RTCPeerConnection

  constructor (init: RTCPeerConnectionMultiaddrConnectionInit) {
    super(init)

    this.peerConnection = init.peerConnection

    const initialState = init.peerConnection.connectionState

    this.peerConnection.onconnectionstatechange = () => {
      this.log.trace('peer connection state change %s initial state %s', this.peerConnection.connectionState, initialState)

      if (this.peerConnection.connectionState === 'disconnected' || this.peerConnection.connectionState === 'failed' || this.peerConnection.connectionState === 'closed') {
        // nothing else to do but close the connection
        this.onRemoteClose()
      }
    }
  }

  sendData (): boolean {
    return true
  }

  async sendCloseWrite (options?: AbortOptions): Promise<void> {
    this.peerConnection.close()
    options?.signal?.throwIfAborted()
  }

  async sendCloseRead (options?: AbortOptions): Promise<void> {
    options?.signal?.throwIfAborted()
  }

  sendReset (): void {
    this.peerConnection.close()
  }

  sendPause (): void {
    // TODO: readable backpressure?
  }

  sendResume (): void {
    // TODO: readable backpressure?
  }
}

/**
 * Convert a RTCPeerConnection into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (init: RTCPeerConnectionMultiaddrConnectionInit): MultiaddrConnection => {
  return new RTCPeerConnectionMultiaddrConnection(init)
}
