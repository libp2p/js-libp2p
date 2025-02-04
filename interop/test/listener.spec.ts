/* eslint-disable no-console */
/* eslint-env mocha */

import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { getLibp2p } from './fixtures/get-libp2p.js'
import { redisProxy } from './fixtures/redis-proxy.js'
import type { Libp2p } from '@libp2p/interface'
import type { PingService } from '@libp2p/ping'

const isDialer: boolean = process.env.is_dialer === 'true'
const timeoutSecs: string = process.env.test_timeout_secs ?? '180'

describe('ping test (listener)', function () {
  if (isDialer) {
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

  it('should listen for ping', async function () {
    const sortByNonLocalIp = (a: Multiaddr, b: Multiaddr): -1 | 0 | 1 => {
      if (a.toString().includes('127.0.0.1')) {
        return 1
      }

      return -1
    }

    let multiaddrs = node.getMultiaddrs().sort(sortByNonLocalIp).map(ma => ma.toString())

    const transport = process.env.transport
    if (transport === 'webrtc') {
      const relayAddr = process.env.RELAY_ADDR
      const hasWebrtcMultiaddr = new Promise<string[]>((resolve) => {
        const abortController = new AbortController()
        node.addEventListener('self:peer:update', (event) => {
          const webrtcMas = node.getMultiaddrs().filter(ma => ma.toString().includes('/webrtc'))
          if (webrtcMas.length > 0) {
            resolve(webrtcMas.sort(sortByNonLocalIp).map(ma => ma.toString()))
          }
          abortController.abort()
        }, { signal: abortController.signal })
      })

      if (relayAddr == null || relayAddr === '') {
        throw new Error('No relayAddr')
      }
      // const conn = await node.dial(multiaddr(relayAddr))
      console.error('dial relay')
      await node.dial(multiaddr(relayAddr))
      console.error('wait for relay reservation')
      multiaddrs = await hasWebrtcMultiaddr
    }

    console.error('inform redis of dial address')
    // Send the listener addr over the proxy server so this works on both the Browser and Node
    await redisProxy(['RPUSH', 'listenerAddr', multiaddrs[0]])
    // Wait
    console.error('wait for incoming ping')
    await new Promise(resolve => setTimeout(resolve, 1000 * parseInt(timeoutSecs, 10)))
  })
})
