import { privateKeyToCryptoKeyPair } from '@libp2p/crypto/keys'
import * as x509 from '@peculiar/x509'
import type { PrivateKey } from '@libp2p/interface'

export async function createSelfSigned (privateKey: PrivateKey): Promise<x509.X509Certificate> {
  const keys = await privateKeyToCryptoKeyPair(privateKey)

  return x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: '01',
    name: 'CN=Test',
    notBefore: new Date('2020/01/01'),
    notAfter: new Date('2020/01/02'),
    signingAlgorithm: {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    },
    keys,
    extensions: [
      new x509.BasicConstraintsExtension(true, 2, true),
      new x509.ExtendedKeyUsageExtension(['1.2.3.4.5.6.7', '2.3.4.5.6.7.8'], true),
      new x509.KeyUsagesExtension(x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign, true),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey)
    ]
  })
}
