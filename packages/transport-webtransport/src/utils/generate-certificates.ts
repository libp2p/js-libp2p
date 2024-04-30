import type { WebTransportCertificate } from '../../src/index.js'

export interface GenerateWebTransportCertificateOptions {
  days: number
  start?: Date
  extensions?: any[]
}

export async function generateWebTransportCertificates (options: GenerateWebTransportCertificateOptions[] = []): Promise<WebTransportCertificate[]> {
  throw new Error('Not implemented')
}
