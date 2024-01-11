/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { Uint8ArrayList } from 'uint8arraylist'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import * as crypto from '../../src/index.js'
import { MAX_RSA_KEY_SIZE, RsaPrivateKey, RsaPublicKey } from '../../src/keys/rsa-class.js'
import fixtures from '../fixtures/go-key-rsa.js'
import { RSA_KEY_8200_BITS } from '../fixtures/rsa.js'
import { testGarbage } from '../helpers/test-garbage-error-handling.js'
import { importFromPem } from '../../src/keys/rsa-utils.js'

const rsa = crypto.keys.supportedKeys.rsa

describe('RSA', function () {
  this.timeout(20 * 1000)
  let key: RsaPrivateKey

  before(async () => {
    key = await rsa.generateKeyPair(512)
  })

  it('generates a valid key', async () => {
    expect(key).to.be.an.instanceof(rsa.RsaPrivateKey)
    const digest = await key.hash()
    expect(digest).to.have.length(34)
  })

  it('does not generate a big key', async () => {
    await expect(rsa.generateKeyPair(MAX_RSA_KEY_SIZE + 1)).to.eventually.be.rejected()
  })

  it('does not unmarshal a big key', async function () {
    const k = RSA_KEY_8200_BITS
    const sk = new RsaPrivateKey(k.privateKey, k.publicKey)
    const pubk = new RsaPublicKey(k.publicKey)
    const m = sk.marshal()
    const pubm = pubk.marshal()

    await expect(rsa.unmarshalRsaPrivateKey(m)).to.eventually.be.rejectedWith(/too large/)
    expect(() => rsa.unmarshalRsaPublicKey(pubm)).to.throw(/too large/)
    await expect(rsa.fromJwk(k.privateKey)).to.eventually.be.rejectedWith(/too large/)
  })

  it('signs', async () => {
    const text = key.genSecret()
    const sig = await key.sign(text)
    const res = await key.public.verify(text, sig)
    expect(res).to.be.eql(true)
  })

  it('signs a list', async () => {
    const text = new Uint8ArrayList(
      crypto.randomBytes(512),
      crypto.randomBytes(512)
    )
    const sig = await key.sign(text)

    await expect(key.sign(text.subarray()))
      .to.eventually.deep.equal(sig, 'list did not have same signature as a single buffer')

    await expect(key.public.verify(text, sig))
      .to.eventually.be.true('did not verify message as list')
    await expect(key.public.verify(text.subarray(), sig))
      .to.eventually.be.true('did not verify message as single buffer')
  })

  it('encoding', async () => {
    const keyMarshal = key.marshal()
    const key2 = await rsa.unmarshalRsaPrivateKey(keyMarshal)
    const keyMarshal2 = key2.marshal()

    expect(keyMarshal).to.eql(keyMarshal2)

    const pk = key.public
    const pkMarshal = pk.marshal()
    const pk2 = rsa.unmarshalRsaPublicKey(pkMarshal)
    const pkMarshal2 = pk2.marshal()

    expect(pkMarshal).to.eql(pkMarshal2)
  })

  it('key id', async () => {
    const key = await crypto.keys.unmarshalPrivateKey(uint8ArrayFromString('CAASqAkwggSkAgEAAoIBAQCk0O+6oNRxhcdZe2GxEDrFBkDV4TZFZnp2ly/dL1cGMBql/8oXPZgei6h7+P5zzfDq2YCfwbjbf0IVY1AshRl6B5VGE1WS+9p1y1OZxJf5os6V1ENnTi6FTcyuBl4BN8dmIKOif0hqgqflaT5OhfYZDXfbJyVQj4vb2+Stu2Xpph3nwqAnTw/7GC/7jrt2Cq6Tu1PoZi36wSwEPYW3eQ1HAYxZjTYYDXl2iyHygnTcbkGRwAQ7vjk+mW7u60zyoolCm9f6Y7c/orJ33DDUocbaGJLlHcfd8bioBwaZy/2m7q43X8pQs0Q1/iwUt0HHZj1YARmHKbh0zR31ciFiV37dAgMBAAECggEADtJBNKnA4QKURj47r0YT2uLwkqtBi6UnDyISalQXAdXyl4n0nPlrhBewC5H9I+HZr+zmTbeIjaiYgz7el1pSy7AB4v7bG7AtWZlyx6mvtwHGjR+8/f3AXjl8Vgv5iSeAdXUq8fJ7SyS7v3wi38HZOzCEXj9bci6ud5ODMYJgLE4gZD0+i1+/V9cpuYfGpS/gLTLEMQLiw/9o8NSZ7sAnxg0UlYhotqaQY23hvXPBOe+0oa95zl2n6XTxCafa3dQl/B6CD1tUq9dhbQew4bxqMq/mhRO9pREEqZ083Uh+u4PTc1BeHgIQaS864pHPb+AY1F7KDvPtHhdojnghp8d70QKBgQDeRYFxo6sd04ohY86Z/i9icVYIyCvfXAKnaMKeGUjK7ou6sDJwFX8W97+CzXpZ/vffsk/l5GGhC50KqrITxHAy/h5IjyDODfps7NMIp0Dm9sO4PWibbw3OOVBRc8w3b3i7I8MrUUA1nLHE1T1HA1rKOTz5jYhE0fi9XKiT1ciKOQKBgQC903w+n9y7M7eaMW7Z5/13kZ7PS3HlM681eaPrk8J4J+c6miFF40/8HOsmarS38v0fgTeKkriPz5A7aLzRHhSiOnp350JNM6c3sLwPEs2qx/CRuWWx1rMERatfDdUH6mvlK6QHu0QgSfQR27EO6a6XvVSJXbvFmimjmtIaz/IpxQKBgQDWJ9HYVAGC81abZTaiWK3/A4QJYhQjWNuVwPICsgnYvI4Uib+PDqcs0ffLZ38DRw48kek5bxpBuJbOuDhro1EXUJCNCJpq7jzixituovd9kTRyR3iKii2bDM2+LPwOTXDdnk9lZRugjCEbrPkleq33Ob7uEtfAty4aBTTHe6uEwQKBgQCB+2q8RyMSXNuADhFlzOFXGrOwJm0bEUUMTPrduRQUyt4e1qOqA3klnXe3mqGcxBpnlEe/76/JacvNom6Ikxx16a0qpYRU8OWz0KU1fR6vrrEgV98241k5t6sdL4+MGA1Bo5xyXtzLb1hdUh3vpDwVU2OrnC+To3iXus/b5EBiMQKBgEI1OaBcFiyjgLGEyFKoZbtzH1mdatTExfrAQqCjOVjQByoMpGhHTXwEaosvyYu63Pa8AJPT7juSGaiKYEJFcXO9BiNyVfmQiqSHJcYeuh+fmO9IlHRHgy5xaIIC00AHS2vC/gXwmXAdPis6BZqDJeiCuOLWJ94QXn8JBT8IgGAI', 'base64pad'))
    const id = await key.id()
    expect(id).to.eql('QmQgsppVMDUpe83wcAqaemKbYvHeF127gnSFQ1xFnBodVw')
  })

  it('unmarshals a public key', async () => {
    const pkix = uint8ArrayFromString('MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAqIij4fIDgd9gYYyspcLdJ+IruBNfDOnmReSrq7HVzUkqEgUX3m06rw5kDwhmOFm4BdgWdKDcZvH1JnbxkJRUz6K0vrXfUnj6ZNDwWqKwXprHSNRY/DsxLOAZEVPNKc9K6iruy/5SI/jwxx5WsQW2SISZ/jjmoN/WVN0t1lt1CG3JR8SvC25gAXmv8yG599QBvRhi5NhORAlFRnpmWMeSHMdrdbqetEWDOkW4F7qxgxANGHpSPpZb10YnsZwTCV/XwhHe/7illL17WTy1iXnsebgUiuCnf7jhdJ2i5g67G2YvKTj7FSFJ4i8IxRGLVMuqkPf5GHpaC8wTIgXZsq0m7QIDAQAB', 'base64pad')
    const publicKey = rsa.unmarshalRsaPublicKey(pkix)

    expect(publicKey.marshal()).to.equalBytes(pkix)
  })

  it('unmarshals a private key', async () => {
    const pkcs1 = uint8ArrayFromString('MIIEowIBAAKCAQEAny2Ldm4AuMlC79scjLVabi2tToJ2oRYC9l+ptn7pUjfQQEgwX+wrm+2d/Qg6nkKhUzDyIrA9LBTKtPYJEf/+2ryT/xu8VnVuExi40lD80tQeNQ5pqHFadw5I8pqHoDtW/rxtc7IlcSqfN/eNJc9c17eiN4f/65iP8xYQVraReAkmOyrWWTmWxviC0ku4VqXL6id5nxLJOmKYAYHWQ5eqxZ11Ccq0CeV5PPuSDDPgX6SEf3KN4bQdU9UXwsHJb1Nnhe8hwwO8lYc6uodQNjdL8XCvEj28E0dIGtlpwgSPfkq1kyFROZo+WEB6fbP//VJ6rk22LPeOWtM4jwRFOP/pqQIDAQABAoIBAA9IAG6mDJpw0uTjNoRRID1509yYxIH+MppbsHepSyW2Hz9elstMqVqatxs8tCDvoVxy01oObI7774JsKM6CMqGl7zjTXTM5KpA5hDvHo9/rFnvONolB2Zcap1joCitxKu7BYOoVoQfSWU72jGXD+KQqeE+ntiNUZgRmmrqyY/h/lHa5h0Iqgr5zp0Ka2RY+G5EZIC8/yqVLNtSf7F0ujkAltNG7D+bJ/JkozMOLFLCae4ha0pRcwA3/tKWuT/454P+Y9KnggIiyxmrmFokt10z29IfocXsVw6VgU/cHNlC+LZ79f8gj177xYguxQWR+Mu/PQtGJXpAvPq+/DaFOdwECgYEA27JuD0T8pnuRUDyEzGuCdHTu4KRU4N5e2OYNsopyhWXeJAifs5mdCb+iGaVfhe3D5hs3QqsQUZIN13JwM7kKqfYvptTcNYZAGv50PJMKQ3XlJuqYSWfaQjfMfvo9feh8lCMNscOuRcVoucqqq6JM7LNATWFmocyiu4eneL3HOqkCgYEAuXsNDC5yMa2gH4G1NsrzQUYlb9KRRq2cqn/uEItT1EcTh14d3nlz5BAUBbst1tv3jTZOANTcYzYvH9QD8W8FxcGYCCDCfDFRHlq16BgpbYqqdfUKVfURbsw9gExKF/ryuxfOn6Sl5NaGEev2n9a87XZRGGwaH5J5gpP9PZUHlwECgYBDbWXeBdxM9EvLBmfznWNyfpj6FTV/toABrcmybE9tpbAh+wuYwaKy5T/JAzpoDms7akrxiTL+9gaNgy/wj/A37bj+SQI04zk1j7b5CF/0CHEGGqYWkWspO5rltcO9qubhSEjhsB8Chu33Z74t4ygc1X78wNIRAo9HYwEBS62j0QKBgDGbb4nqgjA3N7Q1hLn63cR/dlPKBYDZviT7wjg6i1kjCV4TFfoCkbRVeIVv4nqsqjDibUpbo/YE7+WbVtKj1u9lL7w8xsdgiUmNCUnh7HKXu6+Ashr7SIZRqcE+pjJzs6fGXkTkTFo/5eu1KGjnjfAUzOuzPeljy4vY+MoXqcgBAoGBAMIlmXJS9BSpgQEM9wmj4ze6wcnwI6BcHiAaEB5bns5iNTIvz1P1eetjq2Fu0uE4RWf4Ooy2AgvHAJuA/qTzAvXn3yhfHuJJ8S7SyhervzPMxRXgi0iX7T1uP9ow55PpgQ3EDeLjxHKHkUTOLPM0Kbz2umx2pBByo85uQcvTuv1r', 'base64pad')
    const privateKey = await rsa.unmarshalRsaPrivateKey(pkcs1)

    expect(privateKey.marshal()).to.equalBytes(pkcs1)
  })

  it('imports a PEM file', async () => {
    const password = 'cJF2KWGjJO8oi55WVyXi2d+5p71aASjJzM5AJqwh7BpPD+rcdyNa6Q57ILVqgBt8wqOfeE0mc0k0ijRwVOo0Bg'
    const id = 'Qma1HWpc1DNqLk6sHaPYXjeLDb5TRYvouvWeB4xrZC7T7w'
    const pem = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIIFODBiBgkqhkiG9w0BBQ0wVTA0BgkqhkiG9w0BBQwwJwQQtti/JcUrrcdDoNyx
tOcm/QICJxACASAwDAYIKoZIhvcNAgsFADAdBglghkgBZQMEASoEEGBpAhZN4xmh
zfE6mQMHWIcEggTQw5rz9VBUfOBlRWVIOhO2p+GjKrBGatZ2A46pPWu7YCRKvzFd
M6R8jz1CZnb1lysHZrtYNljeRTi+oCoELs95i7/bKuyo8jMfyGYBdgZVr8/Mb592
iuTz1NGFybihefHBwHXGy3EOjzRsQKr9rgDUNmzDbVAsN2gLC4KADSbRGOVksDPw
tv1J8v0qlHQoVwjxsqb6bSslGGuq2m7M8WVoPQJwCO4ZQfRimY4re0RyNP1+Ipq7
tq9XRZ8H2JBdvg1s8Vscina2DO2i58OAptT4yJvVG/2FkhS5YSFaKVrhv9QEc/3p
km1x6haR+8vMC51aV9aoebvXDH96iXVpunEb6laDErNsrOrCOUOF+GuXFFwh7/+l
ADuMLe1qONlyvJyKQ7vDRp1Fp5hhv2RLkOtgx94Wv9vNEAYqrrdGgIz8xQ+JuRCL
IWlijN6FShgoLLXpi3z0vWLaYIyRPqTbhnFpCj2KeXt1Ar/AgSuchc6p8CNqtDVz
GyJSdMTb32ih1UNTcQYBXbgpo9qhrQPNtI+4giQHvygqiTqshZA2Pb/7MTgDEbGU
GQiBvWljUVFwycPBzBj5wFvW/bJgf+EJdq2iae7iTGSyMOa//n6ineENFsrqBUaK
YohW+1ArZSp9SY2qmxK2/E9Tfwm/3EgJUEgcbZQdYPHdn3aTrbHurnlI6jxvc27T
jZRUyd7Q8MG14r/hpiBK75Bo3YMxR52NEnAmK2MDjqt5B6UF0hwKpIR6e1n4xEiT
Wa1Py2tRhr3XHa3Ejzp7seGEHx/FUO/jdiLt/0EcMrRrXt/ysRDvn/vwna8CNEtr
k+IkknMKWR7g7EcI39dnIitkc9xu2atwPFidzYbv/tv6fnMQk6RQD6fj501J5/2K
NvvVRR3a5hUjjrsqCfAZg462GQkTOdxZQ42KhlvAswoFycBqYDxPOCm8h+dMlRc6
m+KIWUXn/YYyU5dUwxsJkttSbsGVRoWBkyzwj8YQ0BpErAjyVMGKH6Jw4niQEj7n
I+V3HRpUfNs/zWpRlEwhipg5Zbaa/eY5560wm2i2MFUcamPjEPmMcNlf6rP3t96J
NrbKTVjVF0A5bq91ipx2ZliY+R0X7rK+fS9V4lPgF7JbrS8aYDEclGftUvNxsdOG
LxuXodd4GPWGmCSKhcZ6szTDZJMooD+ZYJf1UfI4cQr8Tj71KolBtdOp08XmCcyo
hIQR3c0X4xa0JAujn9+ko7vJr/3OyW+3G8BfCYRUbfs/qMLk9HJCVOQQ+SJfD9tJ
zcCe5x/t/BRIYhohbo3+k8qAcEIKLzjG978hxuLsy4cBcMJl/+kXgygU3RuhMmLB
1iaIvWw/0d+L5WJL4Q3yoUrcSY7Iap7ReeCgMCzZTVkya3bBzYHSOG6csdWd+OCo
RFJnIILeGMgOXu8VT8tlzI4K54MYxB4WzHymlAcx/6qwtrSb40pHGyFkYdlI69QW
3l1DNXxrj6LetaMNrXcAFyWkzy8ZCom9gWo+rjlgwnC5iCTsV88nyyexpP4DAI3B
ZfgBgvEkJIhpluQc0KdARs1QZZ8dl+wyRaULroeRwoa7EOx8d92sMm8Cby4XOqgn
vQ2NBF1B1/I4w5/LCbEDxrliX5fTe9osfkFZolLMsD6B9c2J1DvAJKaiMhc=
-----END ENCRYPTED PRIVATE KEY-----
`
    const key = await importFromPem(pem, password)

    expect(await key.id()).to.equal(id)
  })

  describe('key equals', () => {
    it('equals itself', () => {
      expect(key.equals(key)).to.eql(true)

      expect(key.public.equals(key.public)).to.eql(true)
    })

    it('not equals other key', async () => {
      const key2 = await crypto.keys.generateKeyPair('RSA', 512)

      if (!(key2 instanceof RsaPrivateKey)) {
        throw new Error('Key was incorrect type')
      }

      expect(key.equals(key2)).to.eql(false)
      expect(key2.equals(key)).to.eql(false)
      expect(key.public.equals(key2.public)).to.eql(false)
      expect(key2.public.equals(key.public)).to.eql(false)
    })
  })

  it('sign and verify', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.public.verify(data, sig)
    expect(valid).to.be.eql(true)
  })

  it('fails to verify for different data', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.public.verify(uint8ArrayFromString('hello'), sig)
    expect(valid).to.be.eql(false)
  })

  describe('export and import', () => {
    it('should export a password encrypted libp2p-key', async () => {
      const encryptedKey = await key.export('my secret', 'libp2p-key')
      // Import the key
      const importedKey = await crypto.keys.importKey(encryptedKey, 'my secret')

      if (!(importedKey instanceof RsaPrivateKey)) {
        throw new Error('Wrong kind of key imported')
      }

      expect(key.equals(importedKey)).to.equal(true)
    })

    it('exports RSA key to an encrypted PEM file', () => {
      return expect(key.export('secret', 'pkcs-8')).to.eventually.include('BEGIN ENCRYPTED PRIVATE KEY')
    })

    it('handles invalid export type', () => {
      return expect(key.export('secret', 'invalid-type')).to.eventually.be.rejected
        .with.property('code', 'ERR_INVALID_EXPORT_FORMAT')
    })
  })

  describe('throws error instead of crashing', () => {
    const key = crypto.keys.unmarshalPublicKey(fixtures.verify.publicKey)
    testGarbage('key.verify', key.verify.bind(key), 2, true)
    testGarbage(
      'crypto.keys.unmarshalPrivateKey',
      crypto.keys.unmarshalPrivateKey.bind(crypto.keys)
    )
  })

  describe('go interop', () => {
    it('verifies with data from go', async () => {
      const key = crypto.keys.unmarshalPublicKey(fixtures.verify.publicKey)
      const ok = await key.verify(fixtures.verify.data, fixtures.verify.signature)
      expect(ok).to.equal(true)
    })
  })
})
