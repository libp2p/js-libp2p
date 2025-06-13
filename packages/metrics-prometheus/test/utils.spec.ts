import { expect } from 'aegir/chai'
import { normalizeString } from '../src/utils.js'

describe('utils', () => {
  describe('normalizeString', () => {
    it('should normalize string', () => {
      expect(normalizeString('hello-world')).to.equal('hello_world')
      expect(normalizeString('hello---world')).to.equal('hello_world')
      expect(normalizeString('hello-world_0.0.0.0:1234-some-metric')).to.equal('hello_world_0_0_0_0_1234_some_metric')
    })
  })
})
