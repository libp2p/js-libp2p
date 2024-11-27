/* eslint-env mocha */

import { TypedEventEmitter } from '@libp2p/interface'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { webSockets } from '../src/index.js'

describe('libp2p-websockets', () => {
  it('.createServer throws in browser', () => {
    expect(webSockets()({
      events: new TypedEventEmitter(),
      logger: defaultLogger()
    }).createListener).to.throw()
  })
})
