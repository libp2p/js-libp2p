import * as x509 from '@peculiar/x509'
import type { TransportCertificate } from '../../index.js'
import type { PrivateKey } from '@libp2p/interface'

interface ParsedCertificate {
  certificate: TransportCertificate
  expiryDate: Date
}

/**
 * Import a private key from the keychain and extract the embedded certificate
 */
export async function importPrivateKey(privateKey: PrivateKey): Promise<ParsedCertificate | null> {
  try {
    // Check if the private key has our expected certificate metadata
    // @ts-expect-error - We're checking for custom properties added during storage
    if (privateKey._certificate == null) {
      return null
    }
    
    // Extract the certificate data
    // @ts-expect-error - _certificate is our custom metadata
    const certificate = privateKey._certificate as TransportCertificate
    
    // Extract expiry date from the PEM certificate
    const cert = new x509.X509Certificate(certificate.pem)
    const expiryDate = new Date(cert.notAfter)
    
    return {
      certificate,
      expiryDate
    }
  } catch (err) {
    // Return null if we encounter any errors during parsing
    return null
  }
}