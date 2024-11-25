/* eslint-env mocha */

import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { webSockets } from '../src/index.js'

describe('libp2p-websockets', () => {
  it('.createServer throws in browser', () => {
    expect(webSockets()({
      logger: defaultLogger()
    }).createListener).to.throw()
  })
})
