import { expect } from 'aegir/chai'
import { normaliseString } from '../src/utils.js'

describe('utils', () => {
  describe('normaliseString', () => {
    it('should normalise string', () => {
      expect(normaliseString('hello-world')).to.equal('hello_world')
      expect(normaliseString('hello---world')).to.equal('hello_world')
      expect(normaliseString('hello-world_0.0.0.0:1234-some-metric')).to.equal('hello_world_0_0_0_0_1234_some_metric')
    })
  })
})