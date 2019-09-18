// Simple convertion of Node.js duplex to iterable duplex (no backpressure)
exports.toIterable = socket => {
  return {
    sink: async source => {
      try {
        for await (const chunk of source) {
          // Chunk is a BufferList, pass the underlying buffer to to the socket
          socket.write(chunk.slice())
        }
      } catch (err) {
        // If not an abort then destroy the socket with an error
        return socket.destroy(err.code === 'ABORT_ERR' ? null : err)
      }
      socket.end()
    },
    source: socket
  }
}
