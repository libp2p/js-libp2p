import { expect } from 'aegir/chai'
import { rsaCrypto } from '../src/index.ts'
import { pkcs1FromJwk } from './fixtures/rsa-jwk.ts'

describe('RSA', function () {
  this.timeout(60_000)

  it('keeps a non-default public exponent', async () => {
    const key = await crypto.subtle.generateKey({
      name: 'RSASSA-PKCS1-v1_5',
      modulusLength: 1024,
      publicExponent: new Uint8Array([3]),
      hash: 'SHA-256'
    }, true, ['sign', 'verify'])
    const jwk = await crypto.subtle.exportKey('jwk', key.privateKey)
    const imported = await rsaCrypto().privateKeyFromProtobuf(pkcs1FromJwk(jwk))

    expect(imported.publicKey.toJWK().e).to.equal('Aw')
    const data = new TextEncoder().encode('hello')
    expect(await imported.publicKey.verify(data, await imported.sign(data))).to.be.true()
  })
})
