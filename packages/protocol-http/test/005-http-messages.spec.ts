/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { HttpMessageUtils } from '../src/utils/http-message-utils.js'
import type { http } from '../src/http-proto-api.js'

describe('005-HTTP Message Utilities', () => {
  describe('Status Code Handling', () => {
    it('should convert between numeric and enum status codes', () => {
      const numericCode = 404
      const enumCode = HttpMessageUtils.numberToStatusCode(numericCode)
      const backToNumber = HttpMessageUtils.statusCodeToNumber(enumCode)
      expect(backToNumber).to.equal(numericCode)
    })

    it('should get appropriate status text', () => {
      expect(HttpMessageUtils.getStatusText(200)).to.equal('OK')
      expect(HttpMessageUtils.getStatusText(404)).to.equal('Not Found')
      expect(HttpMessageUtils.getStatusText(500)).to.equal('Internal Server Error')
    })

    it('should identify error status codes', () => {
      expect(HttpMessageUtils.isErrorStatus(400)).to.equal(true)
      expect(HttpMessageUtils.isErrorStatus(404)).to.equal(true)
      expect(HttpMessageUtils.isErrorStatus(500)).to.equal(true)
      expect(HttpMessageUtils.isErrorStatus(200)).to.equal(false)
      expect(HttpMessageUtils.isErrorStatus(302)).to.equal(false)
    })
  })

  describe('Message Creation', () => {
    it('should create base HTTP message', () => {
      const message = HttpMessageUtils.create({
        headers: [{ name: 'Content-Type', value: 'text/plain' }],
        content: new TextEncoder().encode('Hello')
      })

      expect(message.headers).to.have.lengthOf(1)
      expect(message.headers[0].name).to.equal('Content-Type')
      expect(message.content).to.be.instanceOf(Uint8Array)
      expect(message.trailers).to.deep.equal([])
    })

    it('should create HTTP request', () => {
      const request = HttpMessageUtils.createRequest('GET', '/path', {
        protocolVersion: 'HTTP/1.1',
        baseMessage: {
          headers: [{ name: 'Accept', value: 'text/plain' }],
          content: new Uint8Array(),
          trailers: []
        }
      })

      expect(request.method).to.equal('GET')
      expect(request.targetUri).to.equal('/path')
      expect(request.protocolVersion).to.equal('HTTP/1.1')
      expect(request.baseMessage?.headers).to.have.lengthOf(1)
    })

    it('should create HTTP response', () => {
      const response = HttpMessageUtils.createResponse(200, {
        reasonPhrase: 'OK',
        protocolVersion: 'HTTP/1.1',
        content: new TextEncoder().encode('Success')
      })

      expect(response.statusCode).to.equal(200)
      expect(response.reasonPhrase).to.equal('OK')
      expect(response.protocolVersion).to.equal('HTTP/1.1')
      expect(response.content).to.be.instanceOf(Uint8Array)
    })
  })

  describe('Message Framing', () => {
    it('should detect content-length framing', () => {
      const headers: http.Field[] = [
        { name: 'Content-Length', value: '100' }
      ]
      const framing = HttpMessageUtils.determineMessageFraming(headers)
      expect(framing.method).to.equal('content-length')
      expect(framing.length).to.equal(100)
    })

    it('should detect chunked encoding', () => {
      const headers: http.Field[] = [
        { name: 'Transfer-Encoding', value: 'chunked' }
      ]
      const framing = HttpMessageUtils.determineMessageFraming(headers)
      expect(framing.method).to.equal('chunked')
    })

    it('should default to connection-close framing', () => {
      const headers: http.Field[] = []
      const framing = HttpMessageUtils.determineMessageFraming(headers)
      expect(framing.method).to.equal('connection-close')
    })
  })
})
