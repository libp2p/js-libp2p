import { createClient } from 'redis'
import http from "http"

const redis_addr = process.env.redis_addr || 'redis:6379'

/** @type {import('aegir/types').PartialOptions} */
export default {
  test: {
    browser: {
      config: {
        // Ignore self signed certificates
        browserContextOptions: { ignoreHTTPSErrors: true }
      }
    },
    async before() {
      const redisClient = createClient({
        url: `redis://${redis_addr}`
      })
      redisClient.on('error', (err) => console.error(`Redis Client Error: ${err}`))
      await redisClient.connect()

      const requestListener = async function (req, res) {
        const requestJSON = await new Promise(resolve => {
          let body = ""
          req.on('data', function (data) {
            body += data;
          });

          req.on('end', function () {
            resolve(JSON.parse(body))
          });
        })

        try {
          const redisRes = await redisClient.sendCommand(requestJSON)
          if (redisRes === null) {
            throw new Error("redis sent back null")
          }

          res.writeHead(200, {
            'Access-Control-Allow-Origin': '*'
          })
          res.end(JSON.stringify(redisRes))
        } catch (err) {
          console.error("Error in redis command:", err)
          res.writeHead(500, {
            'Access-Control-Allow-Origin': '*'
          })
          res.end(err.toString())
          return
        }


      };

      const proxyServer = http.createServer(requestListener);
      await new Promise(resolve => { proxyServer.listen(0, "localhost", () => { resolve() }); })

      return {
        redisClient,
        proxyServer: proxyServer,
        env: {
          ...process.env,
          proxyPort: proxyServer.address().port
        }
      }
    },
    async after(_, { proxyServer, redisClient }) {
      await new Promise(resolve => {
        proxyServer.close(() => resolve());
      })

      try {
        // We don't care if this fails
        await redisClient.disconnect()
      } catch { }
    }
  },
  build: {
    bundlesizeMax: '18kB'
  }
}
