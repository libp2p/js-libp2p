import { http } from '@libp2p/protocol-http'
import { createLibp2p } from 'libp2p'
import type { Libp2p } from 'libp2p'

/**
 * Make HTTP requests to the server
 */
export async function fetchPage (serverPeerId: string): Promise<void> {
  const node = await createLibp2p({
    services: {
      http: http()
    }
  })

  try {
    // Fetch the HTML page from the server
    const response = await node.services.http.fetch(`libp2p://${serverPeerId}/`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    // Get the response text
    const html = await response.text()
    console.log('Received HTML:', html)

    // Parse and log server info
    const peerIdMatch = html.match(/Server PeerID: ([^<]+)/)
    const peersMatch = html.match(/Connected Peers: (\d+)/)

    if (peerIdMatch?.[1] != null) {
      console.log('Server PeerID:', peerIdMatch[1])
    }

    if (peersMatch?.[1] != null) {
      console.log('Connected Peers:', peersMatch[1])
    }
  } finally {
    // Clean up
    await node.stop()
  }
}

// Example usage:
// await fetchPage('QmServerPeerId')
