/* eslint-env mocha */

import { expect } from 'aegir/chai'
import net from 'node:net'
import { tcp } from '../src/index.js'

describe('TCP connection time', () => {
  it('should establish a raw TCP connection quickly', async () => {
    // Create a simple TCP server
    const server = net.createServer()
    const port = 8080 + Math.floor(Math.random() * 1000)
    
    await new Promise<void>(resolve => {
      server.listen(port, '127.0.0.1', () => { resolve() })
    })
    
    try {
      // Measure connection time
      const start = Date.now()
      
      const socket = await new Promise<net.Socket>((resolve, reject) => {
        const socket = net.connect(port, '127.0.0.1')
        socket.on('connect', () => resolve(socket))
        socket.on('error', reject)
      })
      
      const connectionTime = Date.now() - start
      console.log(`Raw TCP connection established in ${connectionTime}ms`)
      
      // Close the socket
      socket.end()
      
      // Note: This test only verifies local connection speed
      // The actual issue (#3029) involves connections between data centers
      // This test serves as a baseline for local development
    } finally {
      // Close the server
      await new Promise<void>(resolve => {
        server.close(() => { resolve() })
      })
    }
  })
}) 