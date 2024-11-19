/* eslint-env mocha */

import { TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { isBrowser, isWebWorker } from 'wherearewe'
import { webSockets } from '../src/index.js'
import type { Transport } from '@libp2p/interface'

describe('libp2p-websockets', () => {
  let ws: Transport

  beforeEach(async () => {
    const events = new TypedEventEmitter()

    ws = webSockets()({
      events,
      logger: defaultLogger()
    })
  })

  it('should filter out no wss websocket addresses', function () {
    const ma1 = multiaddr('/ip4/127.0.0.1/tcp/80/ws')
    const ma2 = multiaddr('/ip4/127.0.0.1/tcp/443/wss')
    const ma3 = multiaddr('/ip6/::1/tcp/80/ws')
    const ma4 = multiaddr('/ip6/::1/tcp/443/wss')

    const valid = ws.dialFilter([ma1, ma2, ma3, ma4])

    if (isBrowser || isWebWorker) {
      expect(valid.length).to.equal(2)
      expect(valid).to.deep.equal([ma2, ma4])
    } else {
      expect(valid.length).to.equal(4)
    }
  })

  it('.createServer throws in browser', () => {
    expect(webSockets()({
      events: new TypedEventEmitter(),
      logger: defaultLogger()
    }).createListener).to.throw()
  })
})
