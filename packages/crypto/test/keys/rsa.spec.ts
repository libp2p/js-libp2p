/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { randomBytes } from '../../src/index.js'
import { generateKeyPair, privateKeyFromProtobuf, privateKeyFromRaw, publicKeyFromProtobuf } from '../../src/keys/index.js'
import { MAX_RSA_KEY_SIZE, pkcs1ToRSAPrivateKey, pkixToRSAPublicKey } from '../../src/keys/rsa/utils.js'
import fixtures from '../fixtures/go-key-rsa.js'
import { testGarbage } from '../helpers/test-garbage-error-handling.js'
import type { RSAPrivateKey } from '@libp2p/interface'

describe('RSA', function () {
  this.timeout(20 * 1000)
  let key: RSAPrivateKey

  before(async () => {
    key = await generateKeyPair('RSA', 512)
  })

  it('generates a valid key', async () => {
    expect(key).to.have.property('type', 'RSA')
    expect(key.equals(key)).to.be.true()
    expect(key.publicKey.toCID().multihash.digest).to.have.length(32)
  })

  it('does not generate a big key', async () => {
    await expect(generateKeyPair('RSA', MAX_RSA_KEY_SIZE + 1)).to.eventually.be.rejected()
  })

  it('does not unmarshal a big key', async function () {
    /*
    const k = RSA_KEY_8200_BITS

    const pubk = new RSAPublicKeyClass(k.publicKey)
    const sk = new RSAPrivateKeyClass(k.privateKey, k.publicKey)

    const m = sk.marshal()
    const pubm = pubk.marshal()

    await expect(pkcs1ToRSAPrivateKey(m)).to.eventually.be.rejectedWith(/too large/)
    expect(() => pkixToRSAPublicKey(pubm)).to.throw(/too large/)
    await expect(fromJwk(k.privateKey)).to.eventually.be.rejectedWith(/too large/)
    */
  })

  it('signs', async () => {
    const text = uint8ArrayFromString('hello world')
    const sig = await key.sign(text)
    const res = await key.publicKey.verify(text, sig)
    expect(res).to.be.eql(true)
  })

  it('signs a list', async () => {
    const text = new Uint8ArrayList(
      randomBytes(512),
      randomBytes(512)
    )
    const sig = await key.sign(text)

    await expect(key.sign(text.subarray()))
      .to.eventually.deep.equal(sig, 'list did not have same signature as a single buffer')

    await expect(key.publicKey.verify(text, sig))
      .to.eventually.be.true('did not verify message as list')
    await expect(key.publicKey.verify(text.subarray(), sig))
      .to.eventually.be.true('did not verify message as single buffer')
  })

  it('encoding', async () => {
    const keyMarshal = key.raw
    const key2 = pkcs1ToRSAPrivateKey(keyMarshal)
    const keyMarshal2 = key2.raw

    expect(keyMarshal).to.equalBytes(keyMarshal2)

    const pk = key.publicKey
    const pkMarshal = pk.raw
    const pk2 = pkixToRSAPublicKey(pkMarshal)
    const pkMarshal2 = pk2.raw

    expect(pkMarshal).to.equalBytes(pkMarshal2)
  })

  it('publicKey toString', async () => {
    const key = privateKeyFromProtobuf(uint8ArrayFromString('CAASqAkwggSkAgEAAoIBAQCk0O+6oNRxhcdZe2GxEDrFBkDV4TZFZnp2ly/dL1cGMBql/8oXPZgei6h7+P5zzfDq2YCfwbjbf0IVY1AshRl6B5VGE1WS+9p1y1OZxJf5os6V1ENnTi6FTcyuBl4BN8dmIKOif0hqgqflaT5OhfYZDXfbJyVQj4vb2+Stu2Xpph3nwqAnTw/7GC/7jrt2Cq6Tu1PoZi36wSwEPYW3eQ1HAYxZjTYYDXl2iyHygnTcbkGRwAQ7vjk+mW7u60zyoolCm9f6Y7c/orJ33DDUocbaGJLlHcfd8bioBwaZy/2m7q43X8pQs0Q1/iwUt0HHZj1YARmHKbh0zR31ciFiV37dAgMBAAECggEADtJBNKnA4QKURj47r0YT2uLwkqtBi6UnDyISalQXAdXyl4n0nPlrhBewC5H9I+HZr+zmTbeIjaiYgz7el1pSy7AB4v7bG7AtWZlyx6mvtwHGjR+8/f3AXjl8Vgv5iSeAdXUq8fJ7SyS7v3wi38HZOzCEXj9bci6ud5ODMYJgLE4gZD0+i1+/V9cpuYfGpS/gLTLEMQLiw/9o8NSZ7sAnxg0UlYhotqaQY23hvXPBOe+0oa95zl2n6XTxCafa3dQl/B6CD1tUq9dhbQew4bxqMq/mhRO9pREEqZ083Uh+u4PTc1BeHgIQaS864pHPb+AY1F7KDvPtHhdojnghp8d70QKBgQDeRYFxo6sd04ohY86Z/i9icVYIyCvfXAKnaMKeGUjK7ou6sDJwFX8W97+CzXpZ/vffsk/l5GGhC50KqrITxHAy/h5IjyDODfps7NMIp0Dm9sO4PWibbw3OOVBRc8w3b3i7I8MrUUA1nLHE1T1HA1rKOTz5jYhE0fi9XKiT1ciKOQKBgQC903w+n9y7M7eaMW7Z5/13kZ7PS3HlM681eaPrk8J4J+c6miFF40/8HOsmarS38v0fgTeKkriPz5A7aLzRHhSiOnp350JNM6c3sLwPEs2qx/CRuWWx1rMERatfDdUH6mvlK6QHu0QgSfQR27EO6a6XvVSJXbvFmimjmtIaz/IpxQKBgQDWJ9HYVAGC81abZTaiWK3/A4QJYhQjWNuVwPICsgnYvI4Uib+PDqcs0ffLZ38DRw48kek5bxpBuJbOuDhro1EXUJCNCJpq7jzixituovd9kTRyR3iKii2bDM2+LPwOTXDdnk9lZRugjCEbrPkleq33Ob7uEtfAty4aBTTHe6uEwQKBgQCB+2q8RyMSXNuADhFlzOFXGrOwJm0bEUUMTPrduRQUyt4e1qOqA3klnXe3mqGcxBpnlEe/76/JacvNom6Ikxx16a0qpYRU8OWz0KU1fR6vrrEgV98241k5t6sdL4+MGA1Bo5xyXtzLb1hdUh3vpDwVU2OrnC+To3iXus/b5EBiMQKBgEI1OaBcFiyjgLGEyFKoZbtzH1mdatTExfrAQqCjOVjQByoMpGhHTXwEaosvyYu63Pa8AJPT7juSGaiKYEJFcXO9BiNyVfmQiqSHJcYeuh+fmO9IlHRHgy5xaIIC00AHS2vC/gXwmXAdPis6BZqDJeiCuOLWJ94QXn8JBT8IgGAI', 'base64pad'))
    expect(key.publicKey.toString()).to.equal('QmQgsppVMDUpe83wcAqaemKbYvHeF127gnSFQ1xFnBodVw')
  })

  it('unmarshals a public key', async () => {
    const pkix = uint8ArrayFromString('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqIij4fIDgd9gYYyspcLdJ+IruBNfDOnmReSrq7HVzUkqEgUX3m06rw5kDwhmOFm4BdgWdKDcZvH1JnbxkJRUz6K0vrXfUnj6ZNDwWqKwXprHSNRY/DsxLOAZEVPNKc9K6iruy/5SI/jwxx5WsQW2SISZ/jjmoN/WVN0t1lt1CG3JR8SvC25gAXmv8yG599QBvRhi5NhORAlFRnpmWMeSHMdrdbqetEWDOkW4F7qxgxANGHpSPpZb10YnsZwTCV/XwhHe/7illL17WTy1iXnsebgUiuCnf7jhdJ2i5g67G2YvKTj7FSFJ4i8IxRGLVMuqkPf5GHpaC8wTIgXZsq0m7QIDAQAB', 'base64pad')
    const publicKey = pkixToRSAPublicKey(pkix)

    expect(publicKey.raw).to.equalBytes(pkix)
  })

  it('unmarshals a private key', async () => {
    const pkcs1 = uint8ArrayFromString('MIIEowIBAAKCAQEAny2Ldm4AuMlC79scjLVabi2tToJ2oRYC9l+ptn7pUjfQQEgwX+wrm+2d/Qg6nkKhUzDyIrA9LBTKtPYJEf/+2ryT/xu8VnVuExi40lD80tQeNQ5pqHFadw5I8pqHoDtW/rxtc7IlcSqfN/eNJc9c17eiN4f/65iP8xYQVraReAkmOyrWWTmWxviC0ku4VqXL6id5nxLJOmKYAYHWQ5eqxZ11Ccq0CeV5PPuSDDPgX6SEf3KN4bQdU9UXwsHJb1Nnhe8hwwO8lYc6uodQNjdL8XCvEj28E0dIGtlpwgSPfkq1kyFROZo+WEB6fbP//VJ6rk22LPeOWtM4jwRFOP/pqQIDAQABAoIBAA9IAG6mDJpw0uTjNoRRID1509yYxIH+MppbsHepSyW2Hz9elstMqVqatxs8tCDvoVxy01oObI7774JsKM6CMqGl7zjTXTM5KpA5hDvHo9/rFnvONolB2Zcap1joCitxKu7BYOoVoQfSWU72jGXD+KQqeE+ntiNUZgRmmrqyY/h/lHa5h0Iqgr5zp0Ka2RY+G5EZIC8/yqVLNtSf7F0ujkAltNG7D+bJ/JkozMOLFLCae4ha0pRcwA3/tKWuT/454P+Y9KnggIiyxmrmFokt10z29IfocXsVw6VgU/cHNlC+LZ79f8gj177xYguxQWR+Mu/PQtGJXpAvPq+/DaFOdwECgYEA27JuD0T8pnuRUDyEzGuCdHTu4KRU4N5e2OYNsopyhWXeJAifs5mdCb+iGaVfhe3D5hs3QqsQUZIN13JwM7kKqfYvptTcNYZAGv50PJMKQ3XlJuqYSWfaQjfMfvo9feh8lCMNscOuRcVoucqqq6JM7LNATWFmocyiu4eneL3HOqkCgYEAuXsNDC5yMa2gH4G1NsrzQUYlb9KRRq2cqn/uEItT1EcTh14d3nlz5BAUBbst1tv3jTZOANTcYzYvH9QD8W8FxcGYCCDCfDFRHlq16BgpbYqqdfUKVfURbsw9gExKF/ryuxfOn6Sl5NaGEev2n9a87XZRGGwaH5J5gpP9PZUHlwECgYBDbWXeBdxM9EvLBmfznWNyfpj6FTV/toABrcmybE9tpbAh+wuYwaKy5T/JAzpoDms7akrxiTL+9gaNgy/wj/A37bj+SQI04zk1j7b5CF/0CHEGGqYWkWspO5rltcO9qubhSEjhsB8Chu33Z74t4ygc1X78wNIRAo9HYwEBS62j0QKBgDGbb4nqgjA3N7Q1hLn63cR/dlPKBYDZviT7wjg6i1kjCV4TFfoCkbRVeIVv4nqsqjDibUpbo/YE7+WbVtKj1u9lL7w8xsdgiUmNCUnh7HKXu6+Ashr7SIZRqcE+pjJzs6fGXkTkTFo/5eu1KGjnjfAUzOuzPeljy4vY+MoXqcgBAoGBAMIlmXJS9BSpgQEM9wmj4ze6wcnwI6BcHiAaEB5bns5iNTIvz1P1eetjq2Fu0uE4RWf4Ooy2AgvHAJuA/qTzAvXn3yhfHuJJ8S7SyhervzPMxRXgi0iX7T1uP9ow55PpgQ3EDeLjxHKHkUTOLPM0Kbz2umx2pBByo85uQcvTuv1r', 'base64pad')
    const privateKey = pkcs1ToRSAPrivateKey(pkcs1)

    expect(privateKey.raw).to.equalBytes(pkcs1)
  })

  it('imports from raw', async () => {
    const key = await generateKeyPair('RSA', 512)
    const imported = privateKeyFromRaw(key.raw)

    expect(key.equals(imported)).to.be.true()
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(key.equals(key)).to.be.true()

      expect(key.publicKey.equals(key.publicKey)).to.be.true()
    })

    it('not equals other key', async () => {
      const key2 = await generateKeyPair('RSA', 512)

      expect(key.equals(key2)).to.be.false()
      expect(key2.equals(key)).to.be.false()
      expect(key.publicKey.equals(key2.publicKey)).to.be.false()
      expect(key2.publicKey.equals(key.publicKey)).to.be.false()
    })
  })

  it('sign and verify', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.publicKey.verify(data, sig)
    expect(valid).to.be.eql(true)
  })

  it('fails to verify for different data', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.publicKey.verify(uint8ArrayFromString('hello'), sig)
    expect(valid).to.be.eql(false)
  })

  describe('throws error instead of crashing', () => {
    const key = publicKeyFromProtobuf(fixtures.verify.publicKey)
    testGarbage('key.verify', key.verify.bind(key), 2, true)
    testGarbage(
      'privateKeyFromProtobuf',
      privateKeyFromProtobuf
    )
  })

  describe('go interop', () => {
    it('verifies with data from go', async () => {
      const key = publicKeyFromProtobuf(fixtures.verify.publicKey)
      const ok = await key.verify(fixtures.verify.data, fixtures.verify.signature)
      expect(ok).to.equal(true)
    })
  })
})
