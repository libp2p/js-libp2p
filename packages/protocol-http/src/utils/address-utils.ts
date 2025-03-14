import { peerIdFromString } from '@libp2p/peer-id'
import { multiaddr, type Multiaddr } from '@multiformats/multiaddr'
import { URL } from '../common/url.js'
import type { PeerId } from '@libp2p/interface'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class AddressUtils {
  /**
   * Convert a multiaddr to a standard URL object
   */
  static multiaddrToUrl (ma: Multiaddr): URL {
    const peerIdStr = ma.getPeerId()
    if (peerIdStr == null) {
      throw new Error('Multiaddr must contain a peer ID')
    }

    // Determine protocol based on transport security
    const isSecure = ma.toString().includes('/wss/') || ma.toString().includes('/tls/')
    const protocol = isSecure ? 'https:' : 'http:'

    return new URL(`${protocol}//${peerIdStr}/`)
  }

  /**
   * Try to extract a PeerId from either a multiaddr or URL string or URL
   */
  static extractPeerId (addrOrUrl: string | Multiaddr | URL): PeerId | undefined {
    try {
      // If it's already a multiaddr instance
      if (typeof addrOrUrl !== 'string' && !(addrOrUrl instanceof URL)) {
        const peerIdStr = addrOrUrl.getPeerId()
        return peerIdStr != null ? peerIdFromString(peerIdStr) : undefined
      }

      if (typeof addrOrUrl === 'string') {
        // Try parsing as a multiaddr
        if (addrOrUrl.startsWith('/')) {
          try {
            const ma = multiaddr(addrOrUrl)
            const peerIdStr = ma.getPeerId()
            return peerIdStr != null ? peerIdFromString(peerIdStr) : undefined
          } catch {
            // Not a valid multiaddr
          }
        }
      }

      let hostname = typeof addrOrUrl === 'string' ? addrOrUrl : addrOrUrl.hostname

      // Try parsing as a URL
      try {
        if (typeof addrOrUrl === 'string') {
          const url = new URL(addrOrUrl)
          hostname = url.hostname
        }

        // Check if hostname is a valid peer ID
        try {
          return peerIdFromString(hostname)
        } catch {
          // If hostname isn't directly a valid peer ID, it might be a DNS-based name
          // Just continue to the next check
        }

        return undefined
      } catch {
        // Not a valid URL or Multiaddr
        return undefined
      }
    } catch {
      return undefined
    }
  }

  /**
   * Check if a string could be parsed as a multiaddr
   */
  static isMultiaddr (str: string): boolean {
    if (!str.startsWith('/')) {
      return false
    }

    try {
      multiaddr(str)
      return true
    } catch {
      return false
    }
  }
}
