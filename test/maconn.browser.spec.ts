/* eslint-disable @typescript-eslint/no-unused-expressions */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'chai'
import { WebRTCMultiaddrConnection } from './../src/maconn'

describe('Multiaddr Connection', () => {
  it('can open and close', async () => {
    const peerConnection = new RTCPeerConnection()
    peerConnection.createDataChannel('whatever', { negotiated: true, id: 91 })
    const remoteAddr = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ')
    const maConn = new WebRTCMultiaddrConnection({
      peerConnection: peerConnection,
      remoteAddr,
      timeline: {
        open: (new Date()).getTime()
      }
    })

    expect(maConn.timeline.close).to.be.undefined

    await maConn.close()

    expect(maConn.timeline.close).to.not.be.undefined
  })
})
