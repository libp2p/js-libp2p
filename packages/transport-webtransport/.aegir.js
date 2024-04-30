/* eslint-disable no-console */
import { spawn, exec } from 'child_process'
import { existsSync } from 'node:fs'
import os from 'node:os'
import defer from 'p-defer'

/** @type {import('aegir/types').PartialOptions} */
export default {
  test: {
    async before () {
      const main = os.platform() === 'win32' ? 'main.exe' : 'main'

      if (!existsSync('./go-libp2p-webtransport-server/main')) {
        await new Promise((resolve, reject) => {
          exec(`go build -o ${main} main.go`,
            { cwd: './go-libp2p-webtransport-server' },
            (error, stdout, stderr) => {
              if (error) {
                reject(error)
                console.error(`exec error: ${error}`)
                return
              }
              resolve()
            })
        })
      }

      const server = spawn(`./${main}`, [], { cwd: './go-libp2p-webtransport-server', killSignal: 'SIGINT' })
      server.stderr.on('data', (data) => {
        console.log('stderr:', data.toString())
      })
      const serverAddr = defer()
      const serverAddr6 = defer()
      const disableIp6 = process.env.DISABLE_IPV6 != null

      server.stdout.on('data', (buf) => {
        const data = buf.toString()

        console.log('stdout:', data);
        if (data.includes('addr=/ip4')) {
          // Parse the addr out
          serverAddr.resolve(`/ip4${data.match(/addr=\/ip4(.*)/)[1]}`)
        }

        if (data.includes('addr=/ip6')) {
          // Parse the addr out
          serverAddr6.resolve(`/ip6${data.match(/addr=\/ip6(.*)/)[1]}`)
        }
      })

      return {
        server,
        env: {
          serverAddr: await serverAddr.promise,
          serverAddr6: disableIp6 === false ? await serverAddr6.promise : 'skipping',
          disableIp6
        }
      }
    },
    async after (_, { server }) {
      server.kill('SIGINT')
    }
  },
  build: {
    bundlesizeMax: '18kB'
  }
}
