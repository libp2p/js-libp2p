import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { array, looseObject, optional } from 'valibot'
import { multiaddrInput, nonNegativeNumber, validateOptions } from '../src/valibot.ts'

const schema = looseObject({
  listen: optional(array(multiaddrInput)),
  timeout: nonNegativeNumber
})

describe('valibot', () => {
  it('should accept multiaddr strings and Multiaddr instances', () => {
    const config = {
      listen: ['/ip4/0.0.0.0/tcp/0', multiaddr('/ip4/127.0.0.1/tcp/0')]
    }

    expect(validateOptions(schema, config, 'test')).to.deep.equal(config)
  })

  it('should reject a string that is not a multiaddr and name the field', () => {
    expect(() => validateOptions(schema, { listen: ['/ip4/0.0.0.0/tcp/0', 'nope'] }, 'test'))
      .to.throw('Invalid test config: listen.1 is not a valid multiaddr: nope')
      .with.property('name', 'InvalidParametersError')
  })

  it('should reject a value that is neither a string nor a Multiaddr', () => {
    expect(() => validateOptions(schema, { listen: [1234] }, 'test'))
      .to.throw('Invalid test config: listen.0 is not a valid multiaddr: 1234')
  })

  it('should accept 0 and Infinity as non-negative numbers', () => {
    expect(validateOptions(schema, { timeout: 0 }, 'test')).to.have.property('timeout', 0)
    expect(validateOptions(schema, { timeout: Infinity }, 'test')).to.have.property('timeout', Infinity)
  })

  it('should reject negative numbers and numbers passed as strings', () => {
    expect(() => validateOptions(schema, { timeout: -1 }, 'test'))
      .to.throw('Invalid test config: timeout must be greater than or equal to 0')
    expect(() => validateOptions(schema, { timeout: '1000' }, 'test'))
      .to.throw('Invalid test config: timeout')
  })

  it('should allow keys it does not know about', () => {
    expect(validateOptions(schema, { somethingElse: true }, 'test')).to.deep.equal({ somethingElse: true })
  })
})
