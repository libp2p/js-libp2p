import { AbstractMultiaddrConnection } from '@libp2p/utils'
import type { AbortOptions, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionInit, SendResult } from '@libp2p/utils'
import type { Uint8ArrayList } from 'uint8arraylist'

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
        this.onTransportClosed()

        // only necessary with node-datachannel
        // https://github.com/murat-dogan/node-datachannel/issues/366#issuecomment-3228453155
        this.peerConnection.close()
      }
    }
  }

  sendData (data: Uint8ArrayList): SendResult {
    return {
      sentBytes: data.byteLength,
      canSendMore: true
    }
  }

  async sendClose (options?: AbortOptions): Promise<void> {
    this.peerConnection.close()
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
