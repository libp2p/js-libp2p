const multiaddr = require('multiaddr')
const pull = require('pull-stream')

const WS = require('./src')

let listener

module.exports = {
  hooks: {
    browser: {
      pre (callback) {
        const ws = new WS()
        const ma = multiaddr('/ip4/127.0.0.1/tcp/9090/ws')
        listener = ws.createListener((conn) => pull(conn, conn))
        listener.listen(ma, callback)
      },
      post (callback) {
        listener.close(callback)
      }
    }
  }
}
