/* eslint-env mocha */
'use strict'

const expect = require('chai').expect

const crypto = require('../src')
const rsa = crypto.keys.rsa

describe('RSA', () => {
  let key
  before(() => {
    key = crypto.generateKeyPair('RSA', 2048)
  })

  it('generates a valid key', () => {
    expect(
      key
    ).to.be.an.instanceof(
      rsa.RsaPrivateKey
    )

    expect(
      key.hash()
    ).to.have.length(
      34
    )
  })

  it('signs', () => {
    const pk = key.public
    const text = key.genSecret()
    const sig = key.sign(text)

    expect(
      pk.verify(text, sig)
    ).to.be.eql(
      true
    )
  })

  it('encoding', () => {
    const keyMarshal = key.marshal()
    const key2 = rsa.unmarshalRsaPrivateKey(keyMarshal)
    const keyMarshal2 = key2.marshal()

    expect(
      keyMarshal
    ).to.be.eql(
      keyMarshal2
    )

    const pk = key.public
    const pkMarshal = pk.marshal()
    const pk2 = rsa.unmarshalRsaPublicKey(pkMarshal)
    const pkMarshal2 = pk2.marshal()

    expect(
      pkMarshal
    ).to.be.eql(
      pkMarshal2
    )
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(
        key.equals(key)
      ).to.be.eql(
        true
      )

      expect(
        key.public.equals(key.public)
      ).to.be.eql(
        true
      )
    })

    it('not equals other key', () => {
      const key2 = crypto.generateKeyPair('RSA', 2048)

      expect(
        key.equals(key2)
      ).to.be.eql(
        false
      )

      expect(
        key2.equals(key)
      ).to.be.eql(
        false
      )

      expect(
        key.public.equals(key2.public)
      ).to.be.eql(
        false
      )

      expect(
        key2.public.equals(key.public)
      ).to.be.eql(
        false
      )
    })
  })

  it('sign and verify', () => {
    const data = new Buffer('hello world')
    const sig = key.sign(data)

    expect(
      key.public.verify(data, sig)
    ).to.be.eql(
      true
    )
  })

  it('does fails to verify for different data', () => {
    const data = new Buffer('hello world')
    const sig = key.sign(data)

    expect(
      key.public.verify(new Buffer('hello'), sig)
    ).to.be.eql(
      false
    )
  })
})
