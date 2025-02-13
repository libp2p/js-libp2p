/* eslint-disable no-console */
import http from 'http'
import { pEvent } from 'p-event'
import { createClient } from 'redis'

const redisAddr = process.env.redis_addr || 'redis:6379'
const transport = process.env.transport
const isDialer = process.env.is_dialer === 'true'

/** @type {import('aegir/types').PartialOptions} */
export default {
  test: {
    browser: {
      config: {
        // Ignore self signed certificates
        browserContextOptions: { ignoreHTTPSErrors: true }
      }
    },
    async before () {
      const { createRelay } = await import('./dist/test/fixtures/relay.js')

      let relayNode = { stop: () => {} }
      let relayAddr = ''
      if (transport === 'webrtc' && !isDialer) {
        relayNode = await createRelay()
        const sortByNonLocalIp = (a, b) => {
          if (a.toString().includes('127.0.0.1')) {
            return 1
          }
          return -1
        }
        relayAddr = relayNode.getMultiaddrs().sort(sortByNonLocalIp)[0].toString()
      }
      const redisClient = createClient({
        url: `redis://${redisAddr}`
      })
      redisClient.on('error', (err) => {
        console.error('Redis client error:', err)
      })

      let start = Date.now()
      console.error('connect redis client')
      await redisClient.connect()
      console.error('connected redis client after', Date.now() - start, 'ms')

      const requestListener = async function (req, res) {
        const requestJSON = await new Promise(resolve => {
          let body = ''
          req.on('data', function (data) {
            body += data
          })

          req.on('end', function () {
            resolve(JSON.parse(body))
          })
        })

        try {
          const redisRes = await redisClient.sendCommand(requestJSON)

          if (redisRes == null) {
            console.error('Redis failure - sent', requestJSON, 'received', redisRes)

            res.writeHead(500, {
              'Access-Control-Allow-Origin': '*'
            })
            res.end(JSON.stringify({
              message: 'Redis sent back null'
            }))

            return
          }

          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*'
          })
          res.end(JSON.stringify(redisRes))
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error('Error in redis command:', err)
          res.writeHead(500, {
            'Access-Control-Allow-Origin': '*'
          })
          res.end(err.toString())
        }
      }

      start = Date.now()
      console.error('start proxy server')
      const proxyServer = http.createServer(requestListener)
      proxyServer.listen(0)

      await pEvent(proxyServer, 'listening', {
        signal: AbortSignal.timeout(30_000)
      })

      console.error('redis proxy is listening on port', proxyServer.address().port, 'after', Date.now() - start, 'ms')

      return {
        redisClient,
        relayNode,
        proxyServer,
        env: {
          ...process.env,
          RELAY_ADDR: relayAddr,
          REDIS_PROXY_PORT: proxyServer.address().port
        }
      }
    },
    async after (_, { proxyServer, redisClient, relayNode }) {
      await new Promise(resolve => {
        proxyServer.close(() => resolve())
      })

      try {
        // We don't care if this fails
        await redisClient.disconnect()
        await relayNode.stop()
      } catch { }
    }
  }
}
