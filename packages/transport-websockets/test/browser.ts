import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { TypedEventEmitter } from 'main-event'
import { webSockets } from '../src/index.ts'
import { registerWebSocketPollTests } from './websocket-to-conn.ts'

registerWebSocketPollTests()

describe('libp2p-websockets', () => {
  it('.createServer throws in browser', () => {
    expect(webSockets()({
      events: new TypedEventEmitter(),
      logger: defaultLogger()
    }).createListener).to.throw()
  })
})
