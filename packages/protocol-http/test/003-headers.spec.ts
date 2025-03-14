/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { HeaderUtils } from '../src/utils/header-utils.js'
import type { http } from '../src/http-proto-api.js'

describe('003-Header Utilities', () => {
  describe('findHeader', () => {
    const headers: http.Field[] = [
      { name: 'Content-Type', value: 'text/plain' },
      { name: 'X-Custom', value: 'value1' },
      { name: 'x-custom', value: 'value2' }
    ]

    it('should find header case-insensitively', () => {
      const header = HeaderUtils.findHeader(headers, 'content-type')
      expect(header?.value).to.equal('text/plain')
    })

    it('should return undefined for non-existent header', () => {
      const header = HeaderUtils.findHeader(headers, 'not-exist')
      expect(header).to.be.undefined
    })
  })

  describe('setHeader', () => {
    it('should add new header if not exists', () => {
      const headers: http.Field[] = []
      const result = HeaderUtils.setHeader(headers, 'Content-Type', 'text/plain')
      expect(result).to.have.lengthOf(1)
      expect(result[0]).to.deep.equal({ name: 'Content-Type', value: 'text/plain' })
    })

    it('should replace existing header', () => {
      const headers: http.Field[] = [{ name: 'Content-Type', value: 'text/plain' }]
      const result = HeaderUtils.setHeader(headers, 'content-type', 'application/json')
      expect(result).to.have.lengthOf(1)
      expect(result[0]).to.deep.equal({ name: 'content-type', value: 'application/json' })
    })
  })

  describe('parseCommaSeparatedHeader', () => {
    it('should parse simple values', () => {
      const result = HeaderUtils.parseCommaSeparatedHeader('value1,value2,value3')
      expect(result).to.deep.equal(['value1', 'value2', 'value3'])
    })

    it('should handle whitespace', () => {
      const result = HeaderUtils.parseCommaSeparatedHeader(' value1 , value2 , value3 ')
      expect(result).to.deep.equal(['value1', 'value2', 'value3'])
    })
  })

  describe('fieldsToHeaders', () => {
    it('should convert Field array to header record', () => {
      const fields: http.Field[] = [
        { name: 'Content-Type', value: 'text/plain' },
        { name: 'Accept', value: 'application/json' }
      ]
      const result = HeaderUtils.fieldsToHeaders(fields)
      expect(result).to.deep.equal({
        'content-type': 'text/plain',
        'accept': 'application/json'
      })
    })

    it('should combine multiple headers with same name', () => {
      const fields: http.Field[] = [
        { name: 'Accept', value: 'text/plain' },
        { name: 'Accept', value: 'application/json' }
      ]
      const result = HeaderUtils.fieldsToHeaders(fields)
      expect(result['accept']).to.equal('text/plain, application/json')
    })
  })
})