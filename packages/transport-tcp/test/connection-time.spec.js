/**
 * @packageDocumentation
 * 
 * Tests for TCP connection establishment time.
 * This test verifies that the connection time is below an acceptable threshold.
 */

import { expect } from 'aegir/chai'
import net from 'node:net'
import { tcp } from '../src/index.js'
import { createLibp2p } from 'libp2p'
import { multiaddr } from '@multiformats/multiaddr'

describe('TCP connection time', () => {
  it('should establish a connection in under 300ms', async () => {
    // Create a simple TCP server
    const server = net.createServer()
    const port = 8080 + Math.floor(Math.random() * 1000)
    
    await new Promise(resolve => {
      server.listen(port, '127.0.0.1', resolve)
    })
    
    try {
      // Measure connection time
      const start = Date.now()
      
      const socket = await new Promise((resolve, reject) => {
        const socket = net.connect(port, '127.0.0.1')
        socket.on('connect', () => resolve(socket))
        socket.on('error', reject)
      })
      
      const connectionTime = Date.now() - start
      console.log(`TCP connection established in ${connectionTime}ms`)
      
      // Close the socket
      socket.end()
      
      // Verify connection time is under threshold
      expect(connectionTime).to.be.below(300, 'Connection time should be under 300ms')
    } finally {
      // Close the server
      await new Promise(resolve => {
        server.close(resolve)
      })
    }
  })
  
  it('should establish a libp2p connection in under 300ms', async () => {
    // Create a libp2p node with TCP transport
    const node1 = await createLibp2p({
      transports: [tcp()]
    })
    
    const node2 = await createLibp2p({
      transports: [tcp()]
    })
    
    try {
      // Get node1's listening address
      await node1.start()
      await node2.start()
      
      const listenAddr = node1.getMultiaddrs()[0]
      
      // Measure connection time
      const start = Date.now()
      
      // Dial from node2 to node1
      const connection = await node2.dial(listenAddr)
      
      const connectionTime = Date.now() - start
      console.log(`libp2p connection established in ${connectionTime}ms`)
      
      // Close the connection
      await connection.close()
      
      // Verify connection time is under threshold
      expect(connectionTime).to.be.below(300, 'Connection time should be under 300ms')
    } finally {
      // Stop the nodes
      await node1.stop()
      await node2.stop()
    }
  })
}) 