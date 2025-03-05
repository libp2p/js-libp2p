import { http } from '@libp2p/protocol-http'
import { createLibp2p } from 'libp2p'
import type { Libp2p } from 'libp2p'

async function makeRequest (): Promise<void> {
  const node = await createLibp2p({
    services: {
      http: http()
    }
  })

  // Make HTTP requests to other libp2p nodes
  const response = await node.services.http.fetch('libp2p://QmPeerID/path')
  const data = await response.text()
  console.log('Received:', data)
}

export { makeRequest }
