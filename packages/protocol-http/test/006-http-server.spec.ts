/* eslint-env mocha */
/* eslint-disable no-console */

import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { circuitRelayTransport } from '@libp2p/circuit-relay-v2'
import { identify } from '@libp2p/identify'
import { tcp } from '@libp2p/tcp'
import { webRTC } from '@libp2p/webrtc'
import { expect } from 'aegir/chai'
import { createLibp2p } from 'libp2p'
import { createSandbox } from 'sinon'
import { HttpServerFactory } from '../src/http-server-factory.js'
import { Router } from '../src/router.js'
import type { http } from '../src/http-proto-api.js'
import type { HttpServerInterface } from '../src/interfaces/http-server-interface.js'
import type { RequestHandler } from '../src/interfaces/request-handler-interface.js'
import type { Libp2p, ServiceMap } from '@libp2p/interface'

// Configure node based on environment
interface NodeConfig {
  addresses: {
    listen: string[]
  }
  transports: any[]
  connectionGater?: {
    denyDialMultiaddr(): Promise<boolean>
  }
}

const getNodeConfig = (): NodeConfig => {
  if (typeof window === 'undefined') {
    // Node.js configuration
    return {
      addresses: {
        listen: ['/ip4/127.0.0.1/tcp/0']
      },
      transports: [tcp()]
    }
  }

  // Browser configuration
  return {
    addresses: {
      listen: ['/webrtc']
    },
    transports: [
      webRTC({
        rtcConfiguration: {
          iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }]
        }
      }),
      circuitRelayTransport()
    ],
    connectionGater: {
      denyDialMultiaddr: async () => false
    }
  }
}

describe('006-HTTP Server Implementation', () => {
  const sandbox = createSandbox()
  let node: Libp2p<ServiceMap>
  let server: HttpServerInterface

  beforeEach(async () => {
    // Create a libp2p node with appropriate configuration
    const config = getNodeConfig()
    node = await createLibp2p({
      ...config,
      streamMuxers: [yamux()],
      connectionEncrypters: [noise()],
      services: {
        identify: identify()
      }
    })

    // Create an HTTP server using real components from the node
    const createServer = HttpServerFactory.createServer()
    server = createServer({
      logger: node.logger,
      connectionManager: (node as any).components.connectionManager,
      registrar: (node as any).components.registrar
    })

    // Start the node
    await node.start()
  })

  afterEach(async () => {
    sandbox.restore()
    await node.stop()
  })

  it('should create server instance', () => {
    expect(server).to.exist()
  })

  it('should register handler for path', () => {
    // Create a real router with the real logger
    const router = new Router(node.logger.forComponent('libp2p:http:router'))
    const registerSpy = sandbox.spy(router, 'route')

    // Replace the server's router with our spy-augmented one
    Object.defineProperty(server, 'router', { value: router })

    const handler: RequestHandler = async () => ({
      statusCode: 200,
      reasonPhrase: 'OK',
      protocolVersion: '1.1',
      content: new TextEncoder().encode('Success'),
      status: 200,
      headers: {
        'content-type': 'text/plain'
      },
      baseMessage: {
        headers: [],
        content: new TextEncoder().encode('Success'),
        trailers: []
      }
    })

    // Register the handler
    server.register('/test', handler)

    // Verify the router's route method was called correctly
    expect(registerSpy.calledWith('/test', handler)).to.be.true()
  })

  it('should use router to handle requests', async () => {
    // Create a router with real logger
    const router = new Router(node.logger.forComponent('libp2p:http:router'))
    const handleSpy = sandbox.spy(router, 'handle')

    // Set up a path and handler
    const testPath = '/test-path'
    const testHandler: RequestHandler = async () => ({
      statusCode: 200,
      reasonPhrase: 'OK',
      protocolVersion: '1.1',
      content: new TextEncoder().encode('Success'),
      status: 200,
      headers: {
        'content-type': 'text/plain'
      },
      baseMessage: {
        headers: [],
        content: new TextEncoder().encode('Success'),
        trailers: []
      }
    })

    router.route(testPath, testHandler)

    // Replace the server's router with our spy-augmented one
    Object.defineProperty(server, 'router', { value: router })

    // Register the same handler on the server to ensure the API works
    server.register(testPath, testHandler)

    // Create a test request that should trigger our handler
    const request: http.HttpRequest = {
      method: 'GET',
      targetUri: testPath,
      protocolVersion: '1.1',
      baseMessage: {
        headers: [],
        content: new Uint8Array(),
        trailers: []
      }
    }

    // Call router handle method directly to test it
    const response = await router.handle(request)

    // Verify the response and that the router's handle method was called
    expect(response.statusCode).to.equal(200)
    expect(handleSpy.calledOnce).to.be.true()
  })

  it('should handle errors gracefully', async () => {
    // Create a real router with real logger
    const router = new Router(node.logger.forComponent('libp2p:http:router'))

    // Register a handler that throws an error
    const testPath = '/error'
    router.route(testPath, async () => {
      throw new Error('Test error')
    })

    // Create a request that will trigger the error handler
    const request: http.HttpRequest = {
      method: 'GET',
      targetUri: testPath,
      protocolVersion: '1.1',
      baseMessage: {
        headers: [],
        content: new Uint8Array(),
        trailers: []
      }
    }

    const response = await router.handle(request)
    expect(response.statusCode).to.equal(500)
  })
})
