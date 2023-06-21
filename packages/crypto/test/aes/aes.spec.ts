/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-disable valid-jsdoc */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import * as crypto from '../../src/index.js'
import fixtures from './../fixtures/aes.js'
import goFixtures from './../fixtures/go-aes.js'
import type { AESCipher } from '../../src/aes/index.js'

const bytes = [{
  length: 16,
  hash: 'AES-128'
}, {
  length: 32,
  hash: 'AES-256'
}]

describe('AES-CTR', () => {
  bytes.forEach(({ length, hash }) => {
    it(`${hash} - encrypt and decrypt`, async () => {
      const key = new Uint8Array(length)
      key.fill(5)

      const iv = new Uint8Array(16)
      iv.fill(1)

      const cipher = await crypto.aes.create(key, iv)

      await encryptAndDecrypt(cipher)
      await encryptAndDecrypt(cipher)
      await encryptAndDecrypt(cipher)
      await encryptAndDecrypt(cipher)
      await encryptAndDecrypt(cipher)
    })
  })

  bytes.forEach(({ length, hash }) => {
    it(`${hash} - fixed - encrypt and decrypt`, async () => {
      const key = new Uint8Array(length)
      key.fill(5)

      const iv = new Uint8Array(16)
      iv.fill(1)

      const cipher = await crypto.aes.create(key, iv)
      // @ts-expect-error cannot index fixtures like this
      const fixture = fixtures[length]

      for (let i = 0; i < fixture.inputs.length; i++) {
        const input = fixture.inputs[i]
        const output = fixture.outputs[i]
        const encrypted = await cipher.encrypt(input)
        expect(encrypted).to.have.length(output.length)
        expect(encrypted).to.eql(output)
        const decrypted = await cipher.decrypt(encrypted)
        expect(decrypted).to.eql(input)
      }
    })
  })

  bytes.forEach(({ length, hash }) => {
    // @ts-expect-error cannot index fixtures like this
    if (goFixtures[length] == null) {
      return
    }

    it(`${hash} - go interop - encrypt and decrypt`, async () => {
      const key = new Uint8Array(length)
      key.fill(5)

      const iv = new Uint8Array(16)
      iv.fill(1)

      const cipher = await crypto.aes.create(key, iv)
      // @ts-expect-error cannot index fixtures like this
      const fixture = goFixtures[length]

      for (let i = 0; i < fixture.inputs.length; i++) {
        const input = fixture.inputs[i]
        const output = fixture.outputs[i]
        const encrypted = await cipher.encrypt(input)
        expect(encrypted).to.have.length(output.length)
        expect(encrypted).to.eql(output)
        const decrypted = await cipher.decrypt(encrypted)
        expect(decrypted).to.eql(input)
      }
    })
  })

  it('checks key length', () => {
    const key = new Uint8Array(5)
    const iv = new Uint8Array(16)
    return expect(crypto.aes.create(key, iv)).to.eventually.be.rejected.with.property('code', 'ERR_INVALID_KEY_LENGTH')
  })
})

async function encryptAndDecrypt (cipher: AESCipher): Promise<void> {
  const data = new Uint8Array(100)
  data.fill(Math.ceil(Math.random() * 100))

  const encrypted = await cipher.encrypt(data)
  const decrypted = await cipher.decrypt(encrypted)

  expect(decrypted).to.be.eql(data)
}
