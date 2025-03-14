/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { ContentUtils } from '../src/utils/content-utils.js'
import type { http } from '../src/http-proto-api.js'

describe('004-Content Utilities', () => {
  describe('parseContentType', () => {
    it('should parse basic content type', () => {
      const result = ContentUtils.parseContentType('text/plain')
      expect(result).to.deep.equal({
        type: 'text',
        subtype: 'plain',
        parameters: {}
      })
    })

    it('should parse content type with parameters', () => {
      const result = ContentUtils.parseContentType('text/plain; charset=utf-8; boundary=123')
      expect(result).to.deep.equal({
        type: 'text',
        subtype: 'plain',
        parameters: {
          charset: 'utf-8',
          boundary: '123'
        }
      })
    })

    it('should handle quoted parameter values', () => {
      const result = ContentUtils.parseContentType('text/plain; charset="utf-8"; filename="test.txt"')
      expect(result).to.deep.equal({
        type: 'text',
        subtype: 'plain',
        parameters: {
          charset: 'utf-8',
          filename: 'test.txt'
        }
      })
    })
  })

  describe('Content Type Detection', () => {
    it('should detect JSON content types', () => {
      expect(ContentUtils.isJson('application/json')).to.be.true
      expect(ContentUtils.isJson('application/some+json')).to.be.true
      expect(ContentUtils.isJson('text/plain')).to.be.false
    })

    it('should detect text content types', () => {
      expect(ContentUtils.isText('text/plain')).to.be.true
      expect(ContentUtils.isText('text/html')).to.be.true
      expect(ContentUtils.isText('application/json')).to.be.true
      expect(ContentUtils.isText('application/xml')).to.be.true
      expect(ContentUtils.isText('image/png')).to.be.false
    })
  })

  describe('Content Conversion', () => {
    it('should convert text content', () => {
      const text = 'Hello World'
      const { content, contentType } = ContentUtils.textToContent(text)
      expect(new TextDecoder().decode(content)).to.equal(text)
      expect(contentType).to.equal('text/plain;charset=utf-8')
    })

    it('should convert JSON content', () => {
      const data = { hello: 'world' }
      const { content, contentType } = ContentUtils.jsonToContent(data)
      expect(JSON.parse(new TextDecoder().decode(content))).to.deep.equal(data)
      expect(contentType).to.equal('application/json;charset=utf-8')
    })
  })

  describe('Message Content Handling', () => {
    const message: http.HttpMessage = {
      headers: [
        { name: 'Content-Type', value: 'text/plain; charset=utf-8' }
      ],
      content: new TextEncoder().encode('Hello World'),
      trailers: []
    }

    it('should extract content type from message', () => {
      const contentType = ContentUtils.getMessageContentType(message)
      expect(contentType).to.equal('text/plain; charset=utf-8')
    })

    it('should convert message content to text', () => {
      const text = ContentUtils.messageContentToText(message)
      expect(text).to.equal('Hello World')
    })
  })
})