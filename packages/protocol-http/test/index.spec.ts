/* eslint-env mocha */

import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { duplexPair } from 'it-pair/duplex'
import sinon from 'sinon'
import { webSocketHttp, WEBSOCKET_CONNECTING, WEBSOCKET_OPEN } from '../src/index.js'
import { pbStream } from 'it-protobuf-stream'
import { WebSocketFrame } from '../src/pb/http.js'
import { Event, MessageEvent, CloseEvent, ErrorEvent } from './event-polyfills.js'
import { WebSocketSignalHandler } from '../src/utils/websocket-signal-handler.js'
import type { Logger } from '@libp2p/interface'
import type { Connection } from '@libp2p/interface'
import type { PendingDial } from '@libp2p/interface'
import { HttpService } from '../src/http-service.js'
import { PeerMap } from '@libp2p/peer-collections'

// Register event polyfills globally before tests
;(globalThis as any).Event = Event
;(globalThis as any).MessageEvent = MessageEvent
;(globalThis as any).CloseEvent = CloseEvent
;(globalThis as any).ErrorEvent = ErrorEvent

describe('http', () => {
  let logger: Logger
  let mockAbortController: AbortController
  let mockSignal: AbortSignal

  beforeEach(() => {
    const logFn = sinon.stub() as unknown as Logger
    logFn.error = sinon.stub()
    logFn.trace = sinon.stub()
    logFn.enabled = true
    
    logger = logFn
    mockAbortController = new AbortController()
    mockSignal = mockAbortController.signal
  })

  afterEach(() => {
    sinon.restore()
  })

  describe('webSocketHttp', () => {
    it('should create a WebSocket implementation', () => {
      const duplex = duplexPair<any>()
      const mockStream = pbStream(duplex[0])
      
      const ws = webSocketHttp(mockStream, mockSignal, logger, 'test-url')
      
      expect(ws.url).to.equal('test-url')
      expect(ws.readyState).to.equal(WEBSOCKET_CONNECTING)
    })

    it('should transition to open state', function (done) {
      this.timeout(5000) // Set 5 second timeout for this test
      
      const duplex = duplexPair<any>()
      const mockStream = pbStream(duplex[0])
      
      const ws = webSocketHttp(mockStream, mockSignal, logger)
      
      // Set a timeout to prevent the test from hanging
      const timeoutId = setTimeout(() => {
        done(new Error('Timeout waiting for open event'))
      }, 4000)
      
      ws.addEventListener('open', () => {
        clearTimeout(timeoutId)
        expect(ws.readyState).to.equal(WEBSOCKET_OPEN)
        done()
      })
      
      ws.addEventListener('error', (err) => {
        console.error('Received error event:', err)
      })
      
      ws.addEventListener('close', () => {
        console.log('Received close event')
      })
    })

    // Test the WebSocketSignalHandler in isolation
    it('should handle abort signals', () => {
      const abortCallbackSpy = sinon.spy()
      
      const abortController = new AbortController()
      const abortSignal = abortController.signal
      
      const signalHandler = new WebSocketSignalHandler(
        abortSignal, 
        logger, 
        abortCallbackSpy
      )
      
      expect(signalHandler.isAborted()).to.equal(false, 'Should not be aborted initially')
      
      abortController.abort()
      
      expect(abortCallbackSpy.calledOnce).to.equal(true, 'Abort callback should be called once')
      expect(signalHandler.isAborted()).to.equal(true, 'Should be marked as aborted')
    })
  })

  describe('HttpService', () => {
    it('should create a server with a default name', () => {
      const components = {
        logger: defaultLogger(),
        registrar: {
          handle: async () => {},
          unhandle: async () => {},
          getProtocols: () => [],
          getHandler: () => ({ handler: () => {}, options: {} }),
          register: async () => { return '' },
          unregister: async () => {},
          getTopologies: () => []
        },
        connectionManager: {
          getConnections: () => [],
          getMaxConnections: () => 100,
          openConnection: async () => { throw new Error('Not implemented') },
          closeConnection: async () => {},
          getConnection: () => undefined,
          get: () => undefined,
          delete: () => {},
          values: () => [],
          closeConnections: async() => {},
          acceptIncomingConnection: () => Promise.resolve(true),
          afterUpgradeInbound: () => {},
          getDialQueue: () => [] as PendingDial[],
          isDialable: async () => false,
          getConnectionsMap: () => new PeerMap<Connection[]>()
        }
      }
      const service = new HttpService(components)
      const server = service.createServer();
      expect(server).to.exist();
      expect(server.address).to.include('server-1');
    });
  });
})
