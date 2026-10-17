import { expect } from 'aegir/chai'
import { publicKeyFromProtobuf, rsaCrypto } from '../src/index.ts'
import { PublicKeyMessage } from '../src/pb.ts'
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

  it('rejects a public key with an oversized DER length quickly', async () => {
    // INTEGER inside a SEQUENCE claiming a 2 GiB long-form length
    const buf = PublicKeyMessage.encode({
      Type: 0,
      Data: Uint8Array.from([0x30, 0x10, 0x02, 0x84, 0x7f, 0xff, 0xff, 0xff, 0x01])
    })
    const start = Date.now()

    await expect(publicKeyFromProtobuf(buf)).to.eventually.be.rejected()
    expect(Date.now() - start).to.be.lessThan(1000)
  })

  it('rejects public key data of 1062 bytes or more before decoding', async () => {
    const buf = PublicKeyMessage.encode({
      Type: 0,
      Data: new Uint8Array(1062)
    })

    await expect(rsaCrypto().publicKeyFromProtobuf(buf)).to.eventually.be.rejected
      .with.property('message').that.matches(/Key size is too large/)
  })
})
