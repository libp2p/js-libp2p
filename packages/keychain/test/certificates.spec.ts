import { generateKeyPair } from '@libp2p/crypto/keys'
import { defaultLogger } from '@libp2p/logger'
import { expect } from 'aegir/chai'
import { MemoryDatastore } from 'datastore-core/memory'
import { Keychain as KeychainClass } from '../src/keychain.js'
import { createSelfSigned } from './fixtures/create-certificate.js'
import type { Keychain } from '../src/index.js'
import type { Datastore } from 'interface-datastore'

describe('certificates', () => {
  const passPhrase = 'this is not a secure phrase'
  const logger = defaultLogger()
  let kc: Keychain
  let datastore: Datastore

  beforeEach(async () => {
    datastore = new MemoryDatastore()

    kc = new KeychainClass({
      datastore,
      logger
    }, { pass: passPhrase })
  })

  it('can store a ECDSA certificate', async () => {
    const keyName = `key-${Math.random()}`
    const certName = `cert-${Math.random()}`

    const key = await generateKeyPair('ECDSA')
    await kc.importKey(keyName, key)

    const cert = await createSelfSigned(key)

    const pem = cert.toString('pem')
    await kc.importX509(certName, pem)

    const stored = await kc.exportX509(certName)
    expect(stored).to.equal(pem)
  })

  it('can store a RSA certificate', async () => {
    const keyName = `key-${Math.random()}`
    const certName = `cert-${Math.random()}`

    const key = await generateKeyPair('RSA')
    await kc.importKey(keyName, key)

    const cert = await createSelfSigned(key)

    const pem = cert.toString('pem')
    await kc.importX509(certName, pem)

    const stored = await kc.exportX509(certName)
    expect(stored).to.equal(pem)
  })

  it('can remove a certificate', async () => {
    const keyName = `key-${Math.random()}`
    const certName = `cert-${Math.random()}`

    const key = await generateKeyPair('RSA')
    await kc.importKey(keyName, key)

    const cert = await createSelfSigned(key)

    const pem = cert.toString('pem')
    await kc.importX509(certName, pem)

    await kc.removeX509(certName)

    await expect(kc.exportX509(certName)).to.eventually.be.rejected
      .with.property('name', 'NotFoundError')
  })

  it('can list all certificates', async () => {
    const keyName = `key-${Math.random()}`
    const certName1 = `cert-${Math.random()}-1`
    const certName2 = `cert-${Math.random()}-2`
    const certName3 = `cert-${Math.random()}-3`

    const key = await generateKeyPair('RSA')
    await kc.importKey(keyName, key)

    const cert1 = await createSelfSigned(key)
    const cert2 = await createSelfSigned(key)
    const cert3 = await createSelfSigned(key)

    await kc.importX509(certName1, cert1.toString('pem'))
    await kc.importX509(certName2, cert2.toString('pem'))
    await kc.importX509(certName3, cert3.toString('pem'))

    const certs = await kc.listX509()

    expect(certs).to.deep.equal([{
      name: certName1
    }, {
      name: certName2
    }, {
      name: certName3
    }])
  })
})
