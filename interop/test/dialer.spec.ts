/* eslint-disable no-console */
/* eslint-env mocha */

import { multiaddr } from '@multiformats/multiaddr'
import { getLibp2p } from './fixtures/get-libp2p.js'
import { redisProxy } from './fixtures/redis-proxy.js'
import type { Libp2p } from '@libp2p/interface'
import type { PingService } from '@libp2p/ping'

const isDialer: boolean = process.env.is_dialer === 'true'
const timeoutSecs: string = process.env.test_timeout_secs ?? '180'

describe('ping test (dialer)', function () {
  if (!isDialer) {
    return
  }

  // make the default timeout longer than the listener timeout
  this.timeout((parseInt(timeoutSecs) * 1000) + 30000)
  let node: Libp2p<{ ping: PingService }>

  beforeEach(async () => {
    node = await getLibp2p()
  })

  afterEach(async () => {
    // Shutdown libp2p node
    try {
      // We don't care if this fails
      await node.stop()
    } catch { }
  })

  it('should dial and ping', async function () {
    let [, otherMaStr]: string[] = await redisProxy(['BLPOP', 'listenerAddr', timeoutSecs])

    // Hack until these are merged:
    // - https://github.com/multiformats/js-multiaddr-to-uri/pull/120
    otherMaStr = otherMaStr.replace('/tls/ws', '/wss')

    const otherMa = multiaddr(otherMaStr)
    const handshakeStartInstant = Date.now()

    console.error(`node ${node.peerId.toString()} dials: ${otherMa}`)
    await node.dial(otherMa)

    console.error(`node ${node.peerId.toString()} pings: ${otherMa}`)
    const pingRTT = await node.services.ping.ping(multiaddr(otherMa))
    const handshakePlusOneRTT = Date.now() - handshakeStartInstant
    console.log(JSON.stringify({
      handshakePlusOneRTTMillis: handshakePlusOneRTT,
      pingRTTMilllis: pingRTT
    }))
  })
})
