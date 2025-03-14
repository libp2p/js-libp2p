/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { Router } from '../src/router.js'
import type { http } from '../src/http-proto-api.js'
import type { Middleware } from '../src/interfaces/middleware-interface.js'
import type { RequestHandler } from '../src/interfaces/request-handler-interface.js'
import type { Logger } from '@libp2p/interface'

describe('008-HTTP Router', () => {
  // Use a minimal logger that satisfies the interface
  const mockLogger = Object.assign(
    (...args: any[]): void => {},
    {
      trace: (...args: any[]): void => {},
      error: (...args: any[]): void => {},
      enabled: true
    }
  ) as Logger

  describe('Route Registration', () => {
    it('should register and find handlers', async () => {
      const router = new Router(mockLogger)
      const handler: RequestHandler = async () => ({
        statusCode: 200,
        reasonPhrase: 'OK',
        protocolVersion: '1.1',
        content: new Uint8Array(),
        status: 200,
        headers: {},
        baseMessage: {
          headers: [],
          content: new Uint8Array(),
          trailers: []
        }
      })

      router.route('/test', handler)

      // Test functionality through the public API
      const request: http.HttpRequest = {
        method: 'GET',
        targetUri: '/test',
        protocolVersion: '1.1',
        baseMessage: {
          headers: [],
          content: new Uint8Array(),
          trailers: []
        }
      }

      const response = await router.handle(request)
      expect(response.statusCode).to.equal(200)
    })

    it('should handle exact path matches', async () => {
      const router = new Router(mockLogger)
      const handler: RequestHandler = async () => ({
        statusCode: 200,
        reasonPhrase: 'OK',
        protocolVersion: '1.1',
        content: new TextEncoder().encode('exact match'),
        status: 200,
        headers: { 'content-type': 'text/plain' },
        baseMessage: {
          headers: [],
          content: new TextEncoder().encode('exact match'),
          trailers: []
        }
      })

      router.route('/exact', handler)

      const request: http.HttpRequest = {
        method: 'GET',
        targetUri: '/exact',
        protocolVersion: '1.1',
        baseMessage: {
          headers: [],
          content: new Uint8Array(),
          trailers: []
        }
      }

      const response = await router.handle(request)
      expect(response.statusCode).to.equal(200)
      expect(new TextDecoder().decode(response.baseMessage?.content)).to.equal('exact match')
    })

    it('should return 404 for non-existent routes', async () => {
      const router = new Router(mockLogger)
      const request: http.HttpRequest = {
        method: 'GET',
        targetUri: '/non-existent',
        protocolVersion: '1.1',
        baseMessage: {
          headers: [],
          content: new Uint8Array(),
          trailers: []
        }
      }

      const response = await router.handle(request)
      expect(response.statusCode).to.equal(404)
    })
  })

  describe('Middleware', () => {
    it('should execute middleware in order', async () => {
      const router = new Router(mockLogger)
      const order: number[] = []

      const middleware1: Middleware = async (req, next) => {
        order.push(1)
        return next()
      }

      const middleware2: Middleware = async (req, next) => {
        order.push(2)
        return next()
      }

      const handler: RequestHandler = async () => {
        order.push(3)
        return {
          statusCode: 200,
          reasonPhrase: 'OK',
          protocolVersion: '1.1',
          content: new Uint8Array(),
          status: 200,
          headers: {},
          baseMessage: {
            headers: [],
            content: new Uint8Array(),
            trailers: []
          }
        }
      }

      router.use(middleware1)
      router.use(middleware2)
      router.route('/test', handler)

      const request: http.HttpRequest = {
        method: 'GET',
        targetUri: '/test',
        protocolVersion: '1.1',
        baseMessage: {
          headers: [],
          content: new Uint8Array(),
          trailers: []
        }
      }

      await router.handle(request)
      expect(order).to.deep.equal([1, 2, 3])
    })

    it('should allow middleware to modify request', async () => {
      const router = new Router(mockLogger)

      const middleware: Middleware = async (req, next) => {
        if (req.baseMessage !== null && req.baseMessage !== undefined) {
          req.baseMessage.headers.push({ name: 'X-Modified', value: 'true' })
        }
        return next()
      }

      const handler: RequestHandler = async (req) => {
        const isModified = req.baseMessage?.headers.some(h => h.name === 'X-Modified') ?? false
        return {
          statusCode: isModified ? 200 : 400,
          reasonPhrase: isModified ? 'OK' : 'Bad Request',
          protocolVersion: '1.1',
          content: new Uint8Array(),
          status: isModified ? 200 : 400,
          headers: {},
          baseMessage: {
            headers: [],
            content: new Uint8Array(),
            trailers: []
          }
        }
      }

      router.use(middleware)
      router.route('/test', handler)

      const request: http.HttpRequest = {
        method: 'GET',
        targetUri: '/test',
        protocolVersion: '1.1',
        baseMessage: {
          headers: [],
          content: new Uint8Array(),
          trailers: []
        }
      }

      const response = await router.handle(request)
      expect(response.statusCode).to.equal(200)
    })
  })
})
