/**
 * Simple test script to measure TCP connection establishment time.
 * This script creates a TCP server and client, and measures the time
 * it takes to establish a connection.
 */

import net from 'node:net'

// Create a TCP server
const server = net.createServer((socket) => {
  console.log('Client connected')
  
  // Echo back any data received
  socket.on('data', (data) => {
    console.log(`Server received: ${data.toString()}`)
    socket.write(`ECHO: ${data.toString()}`)
  })
  
  // Handle client disconnection
  socket.on('end', () => {
    console.log('Client disconnected')
  })
})

// Start the server
const PORT = 8080
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

// Function to test connection time
async function testConnection() {
  return new Promise((resolve) => {
    console.log('Testing connection time...')
    
    // Measure connection time
    const start = Date.now()
    
    // Create a client socket
    const client = net.connect(PORT, '127.0.0.1', () => {
      const connectionTime = Date.now() - start
      console.log(`Connection established in ${connectionTime}ms`)
      
      // Send a test message
      client.write('Hello from client')
      
      // Handle server response
      client.on('data', (data) => {
        console.log(`Client received: ${data.toString()}`)
        
        // Close the connection after receiving response
        client.end()
        resolve()
      })
    })
    
    // Handle errors
    client.on('error', (err) => {
      console.error('Connection error:', err)
      resolve()
    })
  })
} 