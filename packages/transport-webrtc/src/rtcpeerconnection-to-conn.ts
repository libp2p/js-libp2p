import { AbstractMultiaddrConnection } from '@libp2p/utils/abstract-multiaddr-connection'
import type { RTCPeerConnection } from './webrtc/index.js'
import type { AbortOptions, MultiaddrConnection } from '@libp2p/interface'
import type { AbstractMultiaddrConnectionComponents, AbstractMultiaddrConnectionInit } from '@libp2p/utils/abstract-multiaddr-connection'
import type { Uint8ArrayList } from 'uint8arraylist'

export interface RTCPeerConnectionMultiaddrConnectionComponents extends AbstractMultiaddrConnectionComponents {

}

export interface RTCPeerConnectionMultiaddrConnectionInit extends Omit<AbstractMultiaddrConnectionInit, 'stream'> {
  peerConnection: RTCPeerConnection
}

class RTCPeerConnectionMultiaddrConnection extends AbstractMultiaddrConnection {
  private peerConnection: RTCPeerConnection

  constructor (components: RTCPeerConnectionMultiaddrConnectionComponents, init: RTCPeerConnectionMultiaddrConnectionInit) {
    super(components, {
      ...init
    })

    this.peerConnection = init.peerConnection

    const initialState = init.peerConnection.connectionState

    this.peerConnection.onconnectionstatechange = () => {
      this.log.trace('peer connection state change %s initial state %s', this.peerConnection.connectionState, initialState)

      if (this.peerConnection.connectionState === 'disconnected' || this.peerConnection.connectionState === 'failed' || this.peerConnection.connectionState === 'closed') {
        // nothing else to do but close the connection
        this.remoteCloseRead()
        this.remoteCloseWrite()
      }
    }
  }

  sendData (data: Uint8ArrayList, options?: AbortOptions): void | Promise<void> {

  }

  sendClose (options?: AbortOptions): void | Promise<void> {
    this.peerConnection.close()
  }

  sendReset (options?: AbortOptions): void | Promise<void> {
    this.peerConnection.close()
  }
}

/**
 * Convert a RTCPeerConnection into a MultiaddrConnection
 * https://github.com/libp2p/interface-transport#multiaddrconnection
 */
export const toMultiaddrConnection = (components: RTCPeerConnectionMultiaddrConnectionComponents, init: RTCPeerConnectionMultiaddrConnectionInit): MultiaddrConnection => {
  return new RTCPeerConnectionMultiaddrConnection(components, init)
}
