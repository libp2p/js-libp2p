/* eslint-env mocha */
import { generateKeyPair } from '@libp2p/crypto/keys'
import { expect } from 'aegir/chai'
import { base58btc } from 'multiformats/bases/base58'
import { exportPrivateKey } from '../../src/utils/export.js'
import { importFromPem, importPrivateKey } from '../../src/utils/import.js'

describe('import/export', () => {
  describe('Ed25519', () => {
    it('should export a password encrypted libp2p-key', async () => {
      const key = await generateKeyPair('Ed25519')
      const encryptedKey = await exportPrivateKey(key, 'my secret')

      // Import the key
      const importedKey = await importPrivateKey(encryptedKey, 'my secret')

      expect(key.equals(importedKey)).to.equal(true)
    })

    it('should export a libp2p-key with no password to encrypt', async () => {
      const key = await generateKeyPair('Ed25519')
      const encryptedKey = await exportPrivateKey(key, '')

      // Import the key
      const importedKey = await importPrivateKey(encryptedKey, '')

      expect(key.equals(importedKey)).to.equal(true)
    })

    it('should fail to import libp2p-key with wrong password', async () => {
      const key = await generateKeyPair('Ed25519')
      const encryptedKey = await exportPrivateKey(key, 'my secret', 'libp2p-key')

      try {
        await importPrivateKey(encryptedKey, 'not my secret')
      } catch (err) {
        expect(err).to.exist()
        return
      }

      expect.fail('should have thrown')
    })
  })

  describe('secp256k1', () => {
    it('should export a password encrypted libp2p-key', async () => {
      const key = await generateKeyPair('secp256k1')
      const encryptedKey = await exportPrivateKey(key, 'my secret')
      // Import the key
      const importedKey = await importPrivateKey(encryptedKey, 'my secret')

      expect(key.equals(importedKey)).to.equal(true)
    })

    it('should fail to import libp2p-key with wrong password', async () => {
      const key = await generateKeyPair('secp256k1')
      const encryptedKey = await exportPrivateKey(key, 'my secret', 'libp2p-key')

      await expect(importPrivateKey(encryptedKey, 'not my secret')).to.eventually.be.rejected()
    })
  })

  describe('RSA', () => {
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

      const digest = key.publicKey.toCID().multihash
      expect(base58btc.encode(digest.bytes).substring(1)).to.equal(id)
    })

    it('should export a password encrypted libp2p-key', async () => {
      const key = await generateKeyPair('RSA', 512)
      const encryptedKey = await exportPrivateKey(key, 'my secret', 'libp2p-key')
      // Import the key
      const importedKey = await importPrivateKey(encryptedKey, 'my secret')

      expect(key).to.have.property('type', 'RSA')
      expect(key.equals(importedKey)).to.equal(true)
    })

    it('exports RSA key to an encrypted PEM file', async () => {
      const key = await generateKeyPair('RSA', 512)
      return expect(exportPrivateKey(key, 'secret', 'pkcs-8')).to.eventually.include('BEGIN ENCRYPTED PRIVATE KEY')
    })

    it('handles invalid export type', async () => {
      const key = await generateKeyPair('RSA', 512)

      // @ts-expect-error invalid type
      return expect(exportPrivateKey(key, 'secret', 'invalid-type')).to.eventually.be.rejected
        .with.property('name', 'InvalidParametersError')
    })
  })
})
