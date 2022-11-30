/* eslint-disable @typescript-eslint/no-unused-expressions */

import { WebRTCMultiaddrConnection } from './../src/maconn'
import { createConnectedRTCPeerConnectionPair } from './util'

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'chai'

describe('Multiaddr Connection', () => {
  it('can open and close', async () => {
    const peers = await createConnectedRTCPeerConnectionPair();
    console.log(peers)
    // const peerConnection = new RTCPeerConnection()
    // peerConnection.createDataChannel('whatever', { negotiated: true, id: 91 })
    
    const remoteAddr = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ')
    const maConn = new WebRTCMultiaddrConnection({
      peerConnection: peers[0],
      remoteAddr,
      timeline: {
        open: (new Date()).getTime()
      }
    })

    console.log(maConn.peerConnection)
    expect(maConn.timeline.close).to.be.undefined

    await maConn.close()
    console.log(maConn.peerConnection)

    expect(maConn.timeline.close).to.not.be.undefined
  })
})
