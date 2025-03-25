/* eslint-env mocha */

import { expect } from 'aegir/chai'
import * as BasicTypes from '../src/protobuf/split/01-basic-types.js'
import * as UriModule from '../src/protobuf/split/08-uri.js'
import * as HttpMessageModule from '../src/protobuf/split/10-http-message.js'
import type { http } from '../src/http-proto-api.js'

describe('002-Protocol Buffer Messages', () => {
  describe('Basic Types', () => {
    it('should encode and decode Field message', () => {
      const field: http.Field = {
        name: 'Content-Type',
        value: 'text/plain'
      }

      const encoded = BasicTypes.http.Field.encode(field)
      const decoded = BasicTypes.http.Field.decode(encoded)

      expect(decoded).to.deep.equal(field)
    })

    it('should handle empty field values', () => {
      const field: http.Field = {
        name: 'X-Empty',
        value: ''
      }

      const encoded = BasicTypes.http.Field.encode(field)
      const decoded = BasicTypes.http.Field.decode(encoded)

      expect(decoded).to.deep.equal(field)
    })
  })

  describe('URI Components', () => {
    it('should encode and decode Uri message', () => {
      const uri: http.Uri = {
        scheme: 'https',
        authority: 'example.com',
        path: '/path',
        query: 'q=test',
        fragment: 'section'
      }

      const encoded = UriModule.http.Uri.encode(uri)
      const decoded = UriModule.http.Uri.decode(encoded)

      expect(decoded).to.deep.equal(uri)
    })

    it('should handle empty Uri components', () => {
      const uri: http.Uri = {
        scheme: 'https',
        authority: 'example.com',
        path: '',
        query: '',
        fragment: ''
      }

      const encoded = UriModule.http.Uri.encode(uri)
      const decoded = UriModule.http.Uri.decode(encoded)

      expect(decoded).to.deep.equal(uri)
    })
  })

  describe('HTTP Messages', () => {
    it('should encode and decode HttpMessage', () => {
      const message: http.HttpMessage = {
        headers: [
          { name: 'Content-Type', value: 'text/plain' },
          { name: 'Content-Length', value: '5' }
        ],
        content: new TextEncoder().encode('hello'),
        trailers: []
      }

      const encoded = HttpMessageModule.http.HttpMessage.encode(message)
      const decoded = HttpMessageModule.http.HttpMessage.decode(encoded)

      expect(decoded.headers).to.deep.equal(message.headers)
      expect(new Uint8Array(decoded.content ?? [])).to.deep.equal(message.content)
      expect(decoded.trailers).to.deep.equal(message.trailers)
    })
  })
})
