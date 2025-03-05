/**
 * Test script to measure TCP connection establishment time with a simulated libp2p handshake.
 * This script creates a TCP server and client, performs a simple handshake protocol,
 * and measures the time it takes to establish a connection and complete the handshake.
 */

import net from 'node:net'

// Simple class to simulate a handshake protocol
class HandshakeProtocol {
  static async performHandshake(socket, isServer = false) {
    return new Promise((resolve, reject) => {
      const start = Date.now()
      
      if (isServer) {
        // Server waits for PING and responds with PONG
        socket.once('data', (data) => {
          if (data.toString() === 'PING') {
            socket.write('PONG')
            resolve(Date.now() - start)
          } else {
            reject(new Error('Invalid handshake message'))
          }
        })
      } else {
        // Client sends PING and waits for PONG
        socket.write('PING')
        socket.once('data', (data) => {
          if (data.toString() === 'PONG') {
            resolve(Date.now() - start)
          } else {
            reject(new Error('Invalid handshake response'))
          }
        })
      }
      
      // Set timeout for handshake
      socket.setTimeout(1000)
      socket.once('timeout', () => {
        reject(new Error('Handshake timeout'))
      })
    })
  }
}

// Create a TCP server with handshake
const server = net.createServer(async (socket) => {
  console.log('Client connected')
  
  try {
    // Perform server-side handshake
    const handshakeTime = await HandshakeProtocol.performHandshake(socket, true)
    console.log(`Server completed handshake in ${handshakeTime}ms`)
    
    // Handle data after handshake
    socket.on('data', (data) => {
      console.log(`Server received: ${data.toString()}`)
      socket.write(`ECHO: ${data.toString()}`)
    })
  } catch (err) {
    console.error('Server handshake error:', err)
    socket.destroy()
  }
  
  // Handle client disconnection
  socket.on('end', () => {
    console.log('Client disconnected')
  })
})

// Start the server
const PORT = 8081
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`)
  
  // Test the connection multiple times
  testConnection()
    .then(() => testConnection())
    .then(() => testConnection())
    .then(() => {
      // Close the server after tests
      server.close(() => {
        console.log('Server closed')
      })
    })
})

// Function to test connection time with handshake
async function testConnection() {
  return new Promise((resolve) => {
    console.log('Testing connection time with handshake...')
    
    // Measure connection time
    const start = Date.now()
    
    // Create a client socket
    const client = net.connect(PORT, '127.0.0.1', async () => {
      const connectionTime = Date.now() - start
      console.log(`TCP connection established in ${connectionTime}ms`)
      
      try {
        // Perform client-side handshake
        const handshakeTime = await HandshakeProtocol.performHandshake(client)
        console.log(`Handshake completed in ${handshakeTime}ms`)
        console.log(`Total connection + handshake time: ${connectionTime + handshakeTime}ms`)
        
        // Send a test message after handshake
        client.write('Hello after handshake')
        
        // Handle server response
        client.once('data', (data) => {
          console.log(`Client received: ${data.toString()}`)
          
          // Close the connection after receiving response
          client.end()
          resolve()
        })
      } catch (err) {
        console.error('Client handshake error:', err)
        client.destroy()
        resolve()
      }
    })
    
    // Handle errors
    client.on('error', (err) => {
      console.error('Connection error:', err)
      resolve()
    })
  })
} 