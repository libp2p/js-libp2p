import { Crypto } from '@peculiar/webcrypto'
import * as x509 from '@peculiar/x509'
import type { Keychain } from '@libp2p/keychain'
import type { TransportCertificate } from '../../index.js'
import { importPrivateKey } from './certificate-parser.js'
import { generateTransportCertificate } from './generate-certificates.js'
import type { Logger } from '@libp2p/logger'

const crypto = new Crypto()
x509.cryptoProvider.set(crypto)

// Certificate storage constants
export const CERTIFICATE_KEY_PREFIX = 'webrtc-certificate'
export const DEFAULT_CERTIFICATE_VALIDITY_DAYS = 365 // 1 year by default
export const DEFAULT_MIN_REMAINING_VALIDITY_DAYS = 30 // Regenerate if less than 30 days validity remaining

export interface CertificateStoreOptions {
  validityDays?: number
  minRemainingValidityDays?: number
}

/**
 * Check if a stored certificate exists and is valid
 */
export async function getStoredCertificate (keychain: Keychain, 
                                           options: CertificateStoreOptions = {}, 
                                           log?: Logger): Promise<TransportCertificate | null> {
  const minRemainingDays = options.minRemainingValidityDays ?? DEFAULT_MIN_REMAINING_VALIDITY_DAYS
  
  try {
    // Try to find an existing certificate
    const keyName = CERTIFICATE_KEY_PREFIX
    
    // Export the certificate key material
    const privateKey = await keychain.exportKey(keyName)
    
    // Parse the stored certificate format to extract metadata
    const parsedCert = await importPrivateKey(privateKey)
    
    if (parsedCert == null) {
      log?.trace('stored certificate could not be parsed')
      return null
    }
    
    // Check if the certificate is still valid with sufficient remaining time
    const now = new Date()
    const minValidUntil = new Date(now)
    minValidUntil.setDate(minValidUntil.getDate() + minRemainingDays)
    
    if (parsedCert.expiryDate > minValidUntil) {
      log?.trace(`found valid certificate (expires ${parsedCert.expiryDate.toISOString()})`)
      return parsedCert.certificate
    }
    
    log?.trace(`certificate expires too soon (${parsedCert.expiryDate.toISOString()})`)
    return null
  } catch (err) {
    // If certificate doesn't exist or has an issue, return null
    log?.trace('failed to retrieve stored certificate', err)
    return null
  }
}

/**
 * Store a certificate in the keychain
 */
export async function storeCertificate (keychain: Keychain, certificate: TransportCertificate, log?: Logger): Promise<void> {
  try {
    // Create a suitable key for the keychain from our certificate
    const certKey = await createPrivateKeyFromCertificate(certificate)
    
    try {
      // Try to remove any existing certificate before storing the new one
      await keychain.removeKey(CERTIFICATE_KEY_PREFIX)
    } catch (err) {
      // Ignore errors if the key doesn't exist
    }
    
    // Store the new certificate
    await keychain.importKey(CERTIFICATE_KEY_PREFIX, certKey)
    log?.trace('successfully stored certificate in keychain')
  } catch (err) {
    log?.error('failed to store certificate in keychain', err)
    throw err
  }
}

/**
 * Generate a new transport certificate and optionally store it in the keychain
 */
export async function generateAndStoreCertificate (
  keychain?: Keychain,
  options: CertificateStoreOptions = {},
  log?: Logger
): Promise<TransportCertificate> {
  const validityDays = options.validityDays ?? DEFAULT_CERTIFICATE_VALIDITY_DAYS
  
  log?.trace('generating new ECDSA P-256 key pair')
  const keyPair = await crypto.subtle.generateKey({
    name: 'ECDSA',
    namedCurve: 'P-256'
  }, true, ['sign', 'verify'])
  
  log?.trace(`generating new certificate valid for ${validityDays} days`)
  const certificate = await generateTransportCertificate(keyPair, {
    days: validityDays
  })
  
  // Store the certificate if keychain is available
  if (keychain != null) {
    try {
      await storeCertificate(keychain, certificate, log)
    } catch (err) {
      log?.error('failed to store certificate in keychain', err)
      // Continue even if storage fails
    }
  }
  
  return certificate
}

/**
 * Helper function to create a private key from a certificate for keychain storage
 * This implementation might need adjustment based on how your PrivateKey interface works
 */
async function createPrivateKeyFromCertificate (certificate: TransportCertificate): Promise<any> {
  // NOTE: This is a placeholder. You'll need to implement the actual conversion
  // based on your specific PrivateKey interface requirements
  return {
    type: 'WEBRTC-CERT',
    privateKey: certificate.privateKey,
    publicKey: certificate.pem,
    // Store additional metadata
    _certificate: certificate,
    // Add required methods
    export: async () => certificate.privateKey,
    sign: async () => { throw new Error('Not implemented') },
    // Add required properties
    id: certificate.certhash,
    expiryDate: getExpiryDateFromPem(certificate.pem)
  }
}

/**
 * Extract the expiry date from PEM certificate
 */
function getExpiryDateFromPem(pemCertificate: string): Date {
  // Parse the certificate
  const cert = new x509.X509Certificate(pemCertificate)
  return new Date(cert.notAfter)
}