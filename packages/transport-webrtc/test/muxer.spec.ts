import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import pRetry from 'p-retry'
import { stubInterface } from 'sinon-ts'
import { DataChannelMuxerFactory } from '../src/muxer.js'
import type { MultiaddrConnection } from '@libp2p/interface'

describe('muxer', () => {
  it.skip('should delay notification of early streams', async () => {
    let onIncomingStreamInvoked = false

    // @ts-expect-error incomplete implementation
    const peerConnection: RTCPeerConnection = {}

    const muxerFactory = new DataChannelMuxerFactory({
      peerConnection
    })

    // simulate early connection
    // @ts-expect-error incomplete implementation
    const event: RTCDataChannelEvent = {
      channel: stubInterface<RTCDataChannel>({
        readyState: 'connecting'
      })
    }
    peerConnection.ondatachannel?.(event)

    const muxer = muxerFactory.createStreamMuxer(stubInterface<MultiaddrConnection>({
      log: defaultLogger().forComponent('libp2p:maconn')
    }))

    muxer.addEventListener('stream', () => {
      onIncomingStreamInvoked = true
    })

    expect(onIncomingStreamInvoked).to.be.false()

    await pRetry(() => {
      if (!onIncomingStreamInvoked) {
        throw new Error('onIncomingStreamInvoked was still false')
      }
    })

    expect(onIncomingStreamInvoked).to.be.true()
  })
})
