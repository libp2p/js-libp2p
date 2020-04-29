/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
chai.use(require('chai-string'))
const Keychain = require('..')

module.exports = (datastore) => {
  describe('cms interop', () => {
    const passPhrase = 'this is not a secure phrase'
    const aliceKeyName = 'cms-interop-alice'
    let ks

    before(() => {
      ks = new Keychain(datastore, { passPhrase: passPhrase })
    })

    const plainData = Buffer.from('This is a message from Alice to Bob')

    it('imports openssl key', async function () {
      this.timeout(10 * 1000)
      const aliceKid = 'QmNzBqPwp42HZJccsLtc4ok6LjZAspckgs2du5tTmjPfFA'
      const alice = `-----BEGIN ENCRYPTED PRIVATE KEY-----
MIICxjBABgkqhkiG9w0BBQ0wMzAbBgkqhkiG9w0BBQwwDgQIMhYqiVoLJMICAggA
MBQGCCqGSIb3DQMHBAhU7J9bcJPLDQSCAoDzi0dP6z97wJBs3jK2hDvZYdoScknG
QMPOnpG1LO3IZ7nFha1dta5liWX+xRFV04nmVYkkNTJAPS0xjJOG9B5Hm7wm8uTd
1rOaYKOW5S9+1sD03N+fAx9DDFtB7OyvSdw9ty6BtHAqlFk3+/APASJS12ak2pg7
/Ei6hChSYYRS9WWGw4lmSitOBxTmrPY1HmODXkR3txR17LjikrMTd6wyky9l/u7A
CgkMnj1kn49McOBJ4gO14c9524lw9OkPatyZK39evFhx8AET73LrzCnsf74HW9Ri
dKq0FiKLVm2wAXBZqdd5ll/TPj3wmFqhhLSj/txCAGg+079gq2XPYxxYC61JNekA
ATKev5zh8x1Mf1maarKN72sD28kS/J+aVFoARIOTxbG3g+1UbYs/00iFcuIaM4IY
zB1kQUFe13iWBsJ9nfvN7TJNSVnh8NqHNbSg0SdzKlpZHHSWwOUrsKmxmw/XRVy/
ufvN0hZQ3BuK5MZLixMWAyKc9zbZSOB7E7VNaK5Fmm85FRz0L1qRjHvoGcEIhrOt
0sjbsRvjs33J8fia0FF9nVfOXvt/67IGBKxIMF9eE91pY5wJNwmXcBk8jghTZs83
GNmMB+cGH1XFX4cT4kUGzvqTF2zt7IP+P2cQTS1+imKm7r8GJ7ClEZ9COWWdZIcH
igg5jozKCW82JsuWSiW9tu0F/6DuvYiZwHS3OLiJP0CuLfbOaRw8Jia1RTvXEH7m
3N0/kZ8hJIK4M/t/UAlALjeNtFxYrFgsPgLxxcq7al1ruG7zBq8L/G3RnkSjtHqE
cn4oisOvxCprs4aM9UVjtZTCjfyNpX8UWwT1W3rySV+KQNhxuMy3RzmL
-----END ENCRYPTED PRIVATE KEY-----
`
      const key = await ks.importKey(aliceKeyName, alice, 'mypassword')
      expect(key.name).to.equal(aliceKeyName)
      expect(key.id).to.equal(aliceKid)
    })

    it('decrypts node-forge example', async () => {
      const example = `
MIIBcwYJKoZIhvcNAQcDoIIBZDCCAWACAQAxgfowgfcCAQAwYDBbMQ0wCwYDVQQK
EwRpcGZzMREwDwYDVQQLEwhrZXlzdG9yZTE3MDUGA1UEAxMuUW1OekJxUHdwNDJI
WkpjY3NMdGM0b2s2TGpaQXNwY2tnczJkdTV0VG1qUGZGQQIBATANBgkqhkiG9w0B
AQEFAASBgLKXCZQYmMLuQ8m0Ex/rr3KNK+Q2+QG1zIbIQ9MFPUNQ7AOgGOHyL40k
d1gr188EHuiwd90PafZoQF9VRSX9YtwGNqAE8+LD8VaITxCFbLGRTjAqeOUHR8cO
knU1yykWGkdlbclCuu0NaAfmb8o0OX50CbEKZB7xmsv8tnqn0H0jMF4GCSqGSIb3
DQEHATAdBglghkgBZQMEASoEEP/PW1JWehQx6/dsLkp/Mf+gMgQwFM9liLTqC56B
nHILFmhac/+a/StQOKuf9dx5qXeGvt9LnwKuGGSfNX4g+dTkoa6N
`
      const plain = await ks.cms.decrypt(Buffer.from(example, 'base64'))
      expect(plain).to.exist()
      expect(plain.toString()).to.equal(plainData.toString())
    })
  })
}
