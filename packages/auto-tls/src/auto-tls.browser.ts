import type { AutoTLS as AutoTLSInterface } from './index.js'
import type { TLSCertificate } from '@libp2p/interface'

export class AutoTLS implements AutoTLSInterface {
  public certificate?: TLSCertificate

  constructor () {
    throw new Error('Auto-TLS does not work in browsers')
  }
}
