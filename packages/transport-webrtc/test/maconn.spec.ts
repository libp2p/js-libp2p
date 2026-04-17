/* eslint-disable @typescript-eslint/no-unused-expressions */

import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import delay from 'delay'
import { stubObject } from 'sinon-ts'
import { toMultiaddrConnection } from '../src/rtcpeerconnection-to-conn.ts'
import { RTCPeerConnection } from '../src/webrtc/index.js'
import type { CounterGroup } from '@libp2p/interface'

describe('Multiaddr Connection', () => {
  it('can open and close', async () => {
    const peerConnection = new RTCPeerConnection()
    peerConnection.createDataChannel('whatever', { negotiated: true, id: 91 })
    const remoteAddr = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ')
    const metrics = stubObject<CounterGroup>({
      increment: () => {},
      reset: () => {}
    })
    const maConn = toMultiaddrConnection({
      // @ts-expect-error https://github.com/murat-dogan/node-datachannel/pull/370
      peerConnection,
      remoteAddr,
      metrics,
      direction: 'outbound',
      log: defaultLogger().forComponent('libp2p:webrtc:connection')
    })

    expect(maConn.timeline.close).to.be.undefined

    await maConn.close()

    expect(maConn.timeline.close).to.not.be.undefined
    expect(metrics.increment.calledWith({ close: true })).to.be.true
  })

  it('closes immediately when peer connection is already in failed state at construction time', async () => {
    const peerConnection = {
      connectionState: 'failed' as RTCPeerConnectionState,
      onconnectionstatechange: null as any,
      close: () => {}
    }

    const remoteAddr = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ')

    const maConn = toMultiaddrConnection({
      // @ts-expect-error - intentional mock
      peerConnection,
      remoteAddr,
      direction: 'outbound',
      log: defaultLogger().forComponent('libp2p:webrtc:connection')
    })

    // Give any microtasks or synchronous operations a chance to complete
    await delay(0)

    expect(maConn.timeline.close).to.not.be.undefined
  })

  it('closes when peer connection transitions to failed state after construction', async () => {
    const peerConnection: any = {
      connectionState: 'connected' as RTCPeerConnectionState,
      onconnectionstatechange: null as any,
      close: () => {}
    }

    const remoteAddr = multiaddr('/ip4/1.2.3.4/udp/1234/webrtc/certhash/uEiAUqV7kzvM1wI5DYDc1RbcekYVmXli_Qprlw3IkiEg6tQ')

    const maConn = toMultiaddrConnection({
      peerConnection,
      remoteAddr,
      direction: 'outbound',
      log: defaultLogger().forComponent('libp2p:webrtc:connection')
    })

    expect(maConn.timeline.close).to.be.undefined

    // Simulate peerConnection going to 'failed' after construction
    peerConnection.connectionState = 'failed'
    peerConnection.onconnectionstatechange?.()

    await delay(0)

    expect(maConn.timeline.close).to.not.be.undefined
  })
})
