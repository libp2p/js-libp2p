/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import fixtures from '../fixtures/go-key-rsa.js'
import * as crypto from '../../src/index.js'
import { testGarbage } from '../helpers/test-garbage-error-handling.js'
import { RsaPrivateKey } from '../../src/keys/rsa-class.js'

const rsa = crypto.keys.supportedKeys.rsa

/** @typedef {import('libp2p-crypto').keys.supportedKeys.rsa.RsaPrivateKey} RsaPrivateKey */

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

  it('signs', async () => {
    const text = key.genSecret()
    const sig = await key.sign(text)
    const res = await key.public.verify(text, sig)
    expect(res).to.be.eql(true)
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

  it('encrypt and decrypt', () => {
    const data = uint8ArrayFromString('hello world')
    const enc = key.public.encrypt(data)
    const dec = key.decrypt(enc)
    expect(dec).to.be.eql(data)
  })

  it('encrypt decrypt browser/node interop', async () => {
    // @ts-check
    /**
     * @type {any}
     */
    const id = await crypto.keys.unmarshalPrivateKey(uint8ArrayFromString('CAASqAkwggSkAgEAAoIBAQCk0O+6oNRxhcdZe2GxEDrFBkDV4TZFZnp2ly/dL1cGMBql/8oXPZgei6h7+P5zzfDq2YCfwbjbf0IVY1AshRl6B5VGE1WS+9p1y1OZxJf5os6V1ENnTi6FTcyuBl4BN8dmIKOif0hqgqflaT5OhfYZDXfbJyVQj4vb2+Stu2Xpph3nwqAnTw/7GC/7jrt2Cq6Tu1PoZi36wSwEPYW3eQ1HAYxZjTYYDXl2iyHygnTcbkGRwAQ7vjk+mW7u60zyoolCm9f6Y7c/orJ33DDUocbaGJLlHcfd8bioBwaZy/2m7q43X8pQs0Q1/iwUt0HHZj1YARmHKbh0zR31ciFiV37dAgMBAAECggEADtJBNKnA4QKURj47r0YT2uLwkqtBi6UnDyISalQXAdXyl4n0nPlrhBewC5H9I+HZr+zmTbeIjaiYgz7el1pSy7AB4v7bG7AtWZlyx6mvtwHGjR+8/f3AXjl8Vgv5iSeAdXUq8fJ7SyS7v3wi38HZOzCEXj9bci6ud5ODMYJgLE4gZD0+i1+/V9cpuYfGpS/gLTLEMQLiw/9o8NSZ7sAnxg0UlYhotqaQY23hvXPBOe+0oa95zl2n6XTxCafa3dQl/B6CD1tUq9dhbQew4bxqMq/mhRO9pREEqZ083Uh+u4PTc1BeHgIQaS864pHPb+AY1F7KDvPtHhdojnghp8d70QKBgQDeRYFxo6sd04ohY86Z/i9icVYIyCvfXAKnaMKeGUjK7ou6sDJwFX8W97+CzXpZ/vffsk/l5GGhC50KqrITxHAy/h5IjyDODfps7NMIp0Dm9sO4PWibbw3OOVBRc8w3b3i7I8MrUUA1nLHE1T1HA1rKOTz5jYhE0fi9XKiT1ciKOQKBgQC903w+n9y7M7eaMW7Z5/13kZ7PS3HlM681eaPrk8J4J+c6miFF40/8HOsmarS38v0fgTeKkriPz5A7aLzRHhSiOnp350JNM6c3sLwPEs2qx/CRuWWx1rMERatfDdUH6mvlK6QHu0QgSfQR27EO6a6XvVSJXbvFmimjmtIaz/IpxQKBgQDWJ9HYVAGC81abZTaiWK3/A4QJYhQjWNuVwPICsgnYvI4Uib+PDqcs0ffLZ38DRw48kek5bxpBuJbOuDhro1EXUJCNCJpq7jzixituovd9kTRyR3iKii2bDM2+LPwOTXDdnk9lZRugjCEbrPkleq33Ob7uEtfAty4aBTTHe6uEwQKBgQCB+2q8RyMSXNuADhFlzOFXGrOwJm0bEUUMTPrduRQUyt4e1qOqA3klnXe3mqGcxBpnlEe/76/JacvNom6Ikxx16a0qpYRU8OWz0KU1fR6vrrEgV98241k5t6sdL4+MGA1Bo5xyXtzLb1hdUh3vpDwVU2OrnC+To3iXus/b5EBiMQKBgEI1OaBcFiyjgLGEyFKoZbtzH1mdatTExfrAQqCjOVjQByoMpGhHTXwEaosvyYu63Pa8AJPT7juSGaiKYEJFcXO9BiNyVfmQiqSHJcYeuh+fmO9IlHRHgy5xaIIC00AHS2vC/gXwmXAdPis6BZqDJeiCuOLWJ94QXn8JBT8IgGAI', 'base64pad'))

    if (!(id instanceof RsaPrivateKey)) {
      throw new Error('Key was incorrect type')
    }

    const msg = uint8ArrayFromString('hello')

    // browser
    const dec1 = id.decrypt(uint8ArrayFromString('YRFUDx8UjbWSfDS84cDA4WowaaOmd1qFNAv5QutodCKYb9uPtU/tDiAvJzOGu5DCJRo2J0l/35P2weiB4/C2Cb1aZgXKMx/QQC+2jSJiymhqcZaYerjTvkCFwkjCaqthoVo/YXxsaFZ1q7bdTZUDH1TaJR7hWfSyzyPcA8c0w43MIsw16pY8ZaPSclvnCwhoTg1JGjMk6te3we7+wR8QU7VrPhs54mZWxrpu3NQ8xZ6xQqIedsEiNhBUccrCSzYghgsP0Ae/8iKyGyl3U6IegsJNn8jcocvzOJrmU03rgIFPjvuBdaqB38xDSTjbA123KadB28jNoSZh18q/yH3ZIg==', 'base64pad'))
    expect(dec1).to.be.eql(msg)
    // node
    const dec2 = id.decrypt(uint8ArrayFromString('e6yxssqXsWc27ozDy0PGKtMkCS28KwFyES2Ijz89yiz+w6bSFkNOhHPKplpPzgQEuNoUGdbseKlJFyRYHjIT8FQFBHZM8UgSkgoimbY5on4xSxXs7E5/+twjqKdB7oNveTaTf7JCwaeUYnKSjbiYFEawtMiQE91F8sTT7TmSzOZ48tUhnddAAZ3Ac/O3Z9MSAKOCDipi+JdZtXRT8KimGt36/7hjjosYmPuHR1Xy/yMTL6SMbXtBM3yAuEgbQgP+q/7kHMHji3/JvTpYdIUU+LVtkMusXNasRA+UWG2zAht18vqjFMsm9JTiihZw9jRHD4vxAhf75M992tnC+0ZuQg==', 'base64pad'))
    expect(dec2).to.be.eql(msg)
  })

  it('fails to verify for different data', async () => {
    const data = uint8ArrayFromString('hello world')
    const sig = await key.sign(data)
    const valid = await key.public.verify(uint8ArrayFromString('hello'), sig)
    expect(valid).to.be.eql(false)
  })

  describe('export and import', () => {
    it('password protected PKCS #8', async () => {
      const pem = await key.export('my secret', 'pkcs-8')
      expect(pem).to.startsWith('-----BEGIN ENCRYPTED PRIVATE KEY-----')
      const clone = await crypto.keys.importKey(pem, 'my secret')

      if (!(clone instanceof RsaPrivateKey)) {
        throw new Error('Wrong kind of key imported')
      }

      expect(clone).to.exist()
      expect(key.equals(clone)).to.eql(true)
    })

    it('defaults to PKCS #8', async () => {
      const pem = await key.export('another secret')
      expect(pem).to.startsWith('-----BEGIN ENCRYPTED PRIVATE KEY-----')
      const clone = await crypto.keys.importKey(pem, 'another secret')

      if (!(clone instanceof RsaPrivateKey)) {
        throw new Error('Wrong kind of key imported')
      }

      expect(clone).to.exist()
      expect(key.equals(clone)).to.eql(true)
    })

    it('should export a password encrypted libp2p-key', async () => {
      const encryptedKey = await key.export('my secret', 'libp2p-key')
      // Import the key
      const importedKey = await crypto.keys.importKey(encryptedKey, 'my secret')

      if (!(importedKey instanceof RsaPrivateKey)) {
        throw new Error('Wrong kind of key imported')
      }

      expect(key.equals(importedKey)).to.equal(true)
    })

    it('should fail to import libp2p-key with wrong password', async () => {
      const encryptedKey = await key.export('my secret', 'libp2p-key')
      try {
        await crypto.keys.importKey(encryptedKey, 'not my secret')
      } catch (err) {
        expect(err).to.exist()
        return
      }
      expect.fail('should have thrown')
    })

    it('needs correct password', async () => {
      const pem = await key.export('another secret')
      try {
        await crypto.keys.importKey(pem, 'not the secret')
      } catch (err) {
        return // expected
      }
      throw new Error('Expected error to be thrown')
    })

    it('handles invalid export type', () => {
      return expect(key.export('secret', 'invalid-type')).to.eventually.be.rejected.with.property('code', 'ERR_INVALID_EXPORT_FORMAT')
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

  describe('openssl interop', () => {
    it('can read a private key', async () => {
      /*
       * Generated with
       * openssl genpkey -algorithm RSA
       *   -pkeyopt rsa_keygen_bits:3072
       *   -pkeyopt rsa_keygen_pubexp:65537
       */
      const pem = `-----BEGIN PRIVATE KEY-----
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
4pMwXeXP+LO8NIfRXV8mgrm86g==
-----END PRIVATE KEY-----
`
      const key = await crypto.keys.importKey(pem, '')
      expect(key).to.exist()
      const id = await key.id()
      expect(id).to.equal('QmfWu2Xp8DZzCkZZzoPB9rcrq4R4RZid6AWE6kmrUAzuHy')
    })

    // AssertionError: expected 'this only supports pkcs5PBES2' to not exist
    it.skip('can read a private encrypted key (v1)', async () => {
      /*
       * Generated with
       * openssl genpkey -algorithm RSA
       *   -pkeyopt rsa_keygen_bits:1024
       *   -pkeyopt rsa_keygen_pubexp:65537
       *   -out foo.pem
       * openssl pkcs8 -in foo.pem -topk8 -passout pass:mypassword
       */
      const pem = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIICoTAbBgkqhkiG9w0BBQMwDgQI2563Jugj/KkCAggABIICgPxHkKtUUE8EWevq
eX9nTjqpbsv0QoXQMhegfxDELJLU8tj6V0bWNt7QDdfQ1n6FRgnNvNGick6gyqHH
yH9qC2oXwkDFP7OrHp2NEZd7DHQLLc+L4KJ/0dzsiZ1U9no7XzQMUay9Bc918ADE
pN2/EqigWkaG4gNjkAeKWr6+BNRevDXlSvls7YDboNcTiACi5zJkthivB9g3vT1m
gPdN6Gf/mmqtBTDHeqj5QsmXYqeCyo5b26JgYsziABVZDHph4ekPUsTvudRpE9Ex
baXwdYEAZxVpSbTvQ3A5qysjSZeM9ttfRTSSwL391q7dViz4+aujpk0Vj7piH+1B
CkfO8/XudRdRlnOe+KjMidktKCsMGCIOW92IlfMvIQ/Zn1GTYj9bRXONFNJ2WPND
UmCKnL7cmworwg/weRorrGKBWIGspU+tDASOPSvIGKo6Hoxm4CN1TpDRY7DAGlgm
Y3TEbMYfpXyzkPjvAhJDt03D3J9PrTO6uM5d7YUaaTmJ2TQFQVF2Lc3Uz8lDJLs0
ZYtfQ/4H+YY2RrX7ua7t6ArUcYXZtv0J4lRYWjwV8fGPUVc0d8xLJU0Yjf4BD7K8
rsavHo9b5YvBUX7SgUyxAEembEOe3SjQ+gPu2U5wovcjUuC9eItEEsXGrx30BQ0E
8BtK2+hp0eMkW5/BYckJkH+Yl8ypbzRGRRIZzLgeI4JveSx/mNhewfgTr+ORPThZ
mBdkD5r+ixWF174naw53L8U9wF8kiK7pIE1N9TR4USEeovLwX6Ni/2MMDZedOfof
2f77eUdLsK19/5/lcgAAYaXauXWhy2d2r3SayFrC9woy0lh2VLKRMBjcx1oWb7dp
0uxzo5Y=
-----END ENCRYPTED PRIVATE KEY-----
`
      const key = await crypto.keys.importKey(pem, 'mypassword')
      expect(key).to.exist()
    })

    it('can read a private encrypted key (v2 aes-128-cbc)', async () => {
      /*
       * Generated with
       * openssl genpkey -algorithm RSA
       *   -pkeyopt rsa_keygen_bits:1024
       *   -pkeyopt rsa_keygen_pubexp:65537
       *   -out foo.pem
       * openssl pkcs8 -in foo.pem -topk8 -v2 aes-128-cbc -passout pass:mypassword
       */
      const pem = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIICzzBJBgkqhkiG9w0BBQ0wPDAbBgkqhkiG9w0BBQwwDgQIP5QK2RfqUl4CAggA
MB0GCWCGSAFlAwQBAgQQj3OyM9gnW2dd/eRHkxjGrgSCAoCpM5GZB0v27cxzZsGc
O4/xqgwB0c/bSJ6QogtYU2KVoc7ZNQ5q9jtzn3I4ONvneOkpm9arzYz0FWnJi2C3
BPiF0D1NkfvjvMLv56bwiG2A1oBECacyAb2pXYeJY7SdtYKvcbgs3jx65uCm6TF2
BylteH+n1ewTQN9DLfASp1n81Ajq9lQGaK03SN2MUtcAPp7N9gnxJrlmDGeqlPRs
KpQYRcot+kE6Ew8a5jAr7mAxwpqvr3SM4dMvADZmRQsM4Uc/9+YMUdI52DG87EWc
0OUB+fnQ8jw4DZgOE9KKM5/QTWc3aEw/dzXr/YJsrv01oLazhqVHnEMG0Nfr0+DP
q+qac1AsCsOb71VxaRlRZcVEkEfAq3gidSPD93qmlDrCnmLYTilcLanXUepda7ez
qhjkHtpwBLN5xRZxOn3oUuLGjk8VRwfmFX+RIMYCyihjdmbEDYpNUVkQVYFGi/F/
1hxOyl9yhGdL0hb9pKHH10GGIgoqo4jSTLlb4ennihGMHCjehAjLdx/GKJkOWShy
V9hj8rAuYnRNb+tUW7ChXm1nLq14x9x1tX0ciVVn3ap/NoMkbFTr8M3pJ4bQlpAn
wCT2erYqwQtgSpOJcrFeph9TjIrNRVE7Zlmr7vayJrB/8/oPssVdhf82TXkna4fB
PcmO0YWLa117rfdeNM/Duy0ThSdTl39Qd+4FxqRZiHjbt+l0iSa/nOjTv1TZ/QqF
wqrO6EtcM45fbFJ1Y79o2ptC2D6MB4HKJq9WCt064/8zQCVx3XPbb3X8Z5o/6koy
ePGbz+UtSb9xczvqpRCOiFLh2MG1dUgWuHazjOtUcVWvilKnkjCMzZ9s1qG0sUDj
nPyn
-----END ENCRYPTED PRIVATE KEY-----
`
      const key = await crypto.keys.importKey(pem, 'mypassword')
      expect(key).to.exist()
    })

    it('can read a private encrypted key (v2 aes-256-cbc)', async () => {
      /*
       * Generated with
       * openssl genpkey -algorithm RSA
       *   -pkeyopt rsa_keygen_bits:1024
       *   -pkeyopt rsa_keygen_pubexp:65537
       *   -out foo.pem
       * openssl pkcs8 -in foo.pem -topk8 -v2 aes-256-cbc -passout pass:mypassword
       */
      const pem = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIICzzBJBgkqhkiG9w0BBQ0wPDAbBgkqhkiG9w0BBQwwDgQIhuL894loRucCAggA
MB0GCWCGSAFlAwQBKgQQEoEtsjW3iC9/u0uGvkxX7wSCAoAsX3l6JoR2OGbT8CkY
YT3RQFqquOgItYOHw6E3tir2YrmxEAo99nxoL8pdto37KSC32eAGnfv5R1zmHHSx
0M3/y2AWiCBTX95EEzdtGC1hK3PBa/qpp/xEmcrsjYN6NXxMAkhC0hMP/HdvqMAg
ee7upvaYJsJcl8QLFNayAWr8b8cZA/RBhGEIRl59Eyj6nNtxDt3bCrfe06o1CPCV
50/fRZEwFOi/C6GYvPN6MrPZO3ALBWgopLT2yQqycTKtfxYWIdOsMBkAjKf2D6Pk
u2mqBsaP4b71jIIeT4euSJLsoJV+O39s8YHXtW8GtOqp7V5kIlnm90lZ9wzeLTZ7
HJsD/jEdYto5J3YWm2wwEDccraffJSm7UDtJBvQdIx832kxeFCcGQjW38Zl1qqkg
iTH1PLTypxj2ZuviS2EkXVFb/kVU6leWwOt6fqWFC58UvJKeCk/6veazz3PDnTWM
92ClUqFd+CZn9VT4CIaJaAc6v5NLpPp+T9sRX9AtequPm7FyTeevY9bElfyk9gW9
JDKgKxs6DGWDa16RL5vzwtU+G3o6w6IU+mEwa6/c+hN+pRFs/KBNLLSP9OHBx7BJ
X/32Ft+VFhJaK+lQ+f+hve7od/bgKnz4c/Vtp7Dh51DgWgCpBgb8p0vqu02vTnxD
BXtDv3h75l5PhvdWfVIzpMWRYFvPR+vJi066FjAz2sjYc0NMLSYtZWyWoIInjhoX
Dp5CQujCtw/ZSSlwde1DKEWAW4SeDZAOQNvuz0rU3eosNUJxEmh3aSrcrRtDpw+Y
mBUuWAZMpz7njBi7h+JDfmSW/GAaMwrVFC2gef5375R0TejAh+COAjItyoeYEvv8
DQd8
-----END ENCRYPTED PRIVATE KEY-----
`
      const key = await crypto.keys.importKey(pem, 'mypassword')
      expect(key).to.exist()
    })

    it('can read a private encrypted key (v2 des)', async () => {
      /*
       * Generated with
       * openssl genpkey -algorithm RSA
       *   -pkeyopt rsa_keygen_bits:1024
       *   -pkeyopt rsa_keygen_pubexp:65537
       *   -out foo.pem
       * openssl pkcs8 -in foo.pem -topk8 -v2 des -passout pass:mypassword
       */
      const pem = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIICwzA9BgkqhkiG9w0BBQ0wMDAbBgkqhkiG9w0BBQwwDgQI0lXp62ozXvwCAggA
MBEGBSsOAwIHBAiR3Id5vH0u4wSCAoDQQYOrrkPFPIa0S5fQGXnJw1F/66g92Gs1
TkGydn4ouabWb++Vbi2chee1oyZsN2l8YNzDi0Gb2PfjsGpg2aJk0a3/efgA0u6T
leEH1dA/7Hr9NVspgHkaXpHt3X6wdbznLYJeAelfj7sDXpOkULGWCkCst0Txb6bi
Oxv4c0yYykiuUrp+2xvHbF9c2PrcDb58u/OBZcCg3QB1gTugQKM+ZIBRhcTEFLrm
8gWbzBfwYiUm6aJce4zoafP0NSlEOBbpbr73A08Q1IK6pISwltOUhhTvspSZnK41
y2CHt5Drnpl1pfOw9Q0svO3VrUP+omxP1SFP17ZfaRGw2uHd08HJZs438x5dIQoH
QgjlZ8A5rcT3FjnytSh3fln2ZxAGuObghuzmOEL/+8fkGER9QVjmQlsL6OMfB4j4
ZAkLf74uaTdegF3SqDQaGUwWgk7LyualmUXWTBoeP9kRIsRQLGzAEmd6duBPypED
HhKXP/ZFA1kVp3x1fzJ2llMFB3m1JBwy4PiohqrIJoR+YvKUvzVQtbOjxtCEAj87
JFnlQj0wjTd6lfNn+okewMNjKINZx+08ui7XANNU/l18lHIIz3ssXJSmqMW+hRZ9
9oB2tntLrnRMhkVZDVHadq7eMFOPu0rkekuaZm9CO2vu4V7Qa2h+gOoeczYza0H7
A+qCKbprxyL8SKI5vug2hE+mfC1leXVRtUYm1DnE+oet99bFd0fN20NwTw0rOeRg
0Z+/ZpQNizrXxfd3sU7zaJypWCxZ6TD/U/AKBtcb2gqmUjObZhbfbWq6jU2Ye//w
EBqQkwAUXR1tNekF8CWLOrfC/wbLRxVRkayb8bQUfdgukLpz0bgw
-----END ENCRYPTED PRIVATE KEY-----
`
      const key = await crypto.keys.importKey(pem, 'mypassword')
      expect(key).to.exist()
    })

    it('can read a private encrypted key (v2 des3)', async () => {
      /*
       * Generated with
       * openssl genpkey -algorithm RSA
       *   -pkeyopt rsa_keygen_bits:1024
       *   -pkeyopt rsa_keygen_pubexp:65537
       *   -out foo.pem
       * openssl pkcs8 -in foo.pem -topk8 -v2 des3 -passout pass:mypassword
       */
      const pem = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIICxjBABgkqhkiG9w0BBQ0wMzAbBgkqhkiG9w0BBQwwDgQISznrfHd+D58CAggA
MBQGCCqGSIb3DQMHBAhx0DnnUvDiHASCAoCceplm+Cmwlgvn4hNsv6e4c/S1iA7w
2hU7Jt8JgRCIMWjP2FthXOAFLa2fD4g3qncYXcDAFBXNyoh25OgOwstO14YkxhDi
wG4TeppGUt9IlyyCol6Z4WhQs1TGm5OcD5xDta+zBXsBnlgmKLD5ZXPEYB+3v/Dg
SvM4sQz6NgkVHN52hchERsnknwSOghiK9mIBH0RZU5LgzlDy2VoBCiEPVdZ7m4F2
dft5e82zFS58vwDeNN/0r7fC54TyJf/8k3q94+4Hp0mseZ67LR39cvnEKuDuFROm
kLPLekWt5R2NGdunSQlA79BkrNB1ADruO8hQOOHMO9Y3/gNPWLKk+qrfHcUni+w3
Ofq+rdfakHRb8D6PUmsp3wQj6fSOwOyq3S50VwP4P02gKcZ1om1RvEzTbVMyL3sh
hZcVB3vViu3DO2/56wo29lPVTpj9bSYjw/CO5jNpPBab0B/Gv7JAR0z4Q8gn6OPy
qf+ddyW4Kcb6QUtMrYepghDthOiS3YJV/zCNdL3gTtVs5Ku9QwQ8FeM0/5oJZPlC
TxGuOFEJnYRWqIdByCP8mp/qXS5alSR4uoYQSd7vZG4vkhkPNSAwux/qK1IWfqiW
3XlZzrbD//9IzFVqGRs4nRIFq85ULK0zAR57HEKIwGyn2brEJzrxpV6xsHBp+m4w
6r0+PtwuWA0NauTCUzJ1biUdH8t0TgBL6YLaMjlrfU7JstH3TpcZzhJzsjfy0+zV
NT2TO3kSzXpQ5M2VjOoHPm2fqxD/js+ThDB3QLi4+C7HqakfiTY1lYzXl9/vayt6
DUD29r9pYL9ErB9tYko2rat54EY7k7Ts6S5jf+8G7Zz234We1APhvqaG
-----END ENCRYPTED PRIVATE KEY-----
`
      const key = await crypto.keys.importKey(pem, 'mypassword')
      expect(key).to.exist()
    })
  })
})
