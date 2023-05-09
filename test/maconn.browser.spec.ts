/* eslint-disable @typescript-eslint/no-unused-expressions */

import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { stubObject } from 'sinon-ts'
import { WebRTCMultiaddrConnection } from './../src/maconn.js'
import type { CounterGroup } from '@libp2p/interface-metrics'

describe('Multiaddr Connection', () => {
  it('can open and close', async () => {
    const peerConnection = new RTCPeerConnection()
    peerConnection.createDataChannel('whatever', { negotiated: true, id: 91 })
    const remoteAddr = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ')
    const metrics = stubObject<CounterGroup>({
      increment: () => {},
      reset: () => {}
    })
    const maConn = new WebRTCMultiaddrConnection({
      peerConnection,
      remoteAddr,
      timeline: {
        open: (new Date()).getTime()
      },
      metrics
    })

    expect(maConn.timeline.close).to.be.undefined

    await maConn.close()

    expect(maConn.timeline.close).to.not.be.undefined
    expect(metrics.increment.calledWith({ close: true })).to.be.true
  })
})
