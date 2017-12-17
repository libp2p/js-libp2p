/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)
const Keychain = require('..')

module.exports = (datastore1) => {
  describe('interop with openssl', () => {
    const passPhrase = 'this is not a secure phrase'
    const keyName = 'openssl-key'
    let ks

    before((done) => {
      ks = new Keychain(datastore1, { passPhrase: passPhrase })
      done()
    })

    it('can read a private key', (done) => {
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
      ks.importKey(keyName, pem, '', (err, key) => {
        expect(err).to.not.exist()
        expect(key).to.exist()
        expect(key).to.have.property('name', keyName)
        expect(key).to.have.property('id')
        ks.removeKey(keyName, done)
      })
    })

    // TODO: net.forge can not cope with this
    //  Uncaught AssertionError: expected [Error: Cannot read encrypted PBE data block. Unsupported OID.] to not exist
    it.skip('can read a private encrypted key (v1)', (done) => {
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
      ks.importKey(keyName, pem, 'mypassword', (err, key) => {
        expect(err).to.not.exist()
        expect(key).to.exist()
        expect(key).to.have.property('name', keyName)
        expect(key).to.have.property('id')
        ks.removeKey(keyName, done)
      })
    })

    it('can read a private encrypted key (v2)', (done) => {
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
      ks.importKey(keyName, pem, 'mypassword', (err, key) => {
        expect(err).to.not.exist()
        expect(key).to.exist()
        expect(key).to.have.property('name', keyName)
        expect(key).to.have.property('id', 'QmeMWBbuyw8KycYhZVxMzVHK3zLH1mp2DT84X2NApqiXgn')
        ks.removeKey(keyName, done)
      })
    })
  })
}
