/* eslint-disable no-console */
import { test, expect } from '@playwright/test'
import { playwright } from 'test-util-ipfs-example'
import { spawn, exec } from 'child_process'
import { existsSync } from 'fs'

// Setup
const play = test.extend({
  ...playwright.servers()
})

async function spinUpGoLibp2p() {
  if (!existsSync('../../go-libp2p-webtransport-server/main')) {
    await new Promise((resolve, reject) => {
      exec('go build -o main main.go',
        { cwd: '../../go-libp2p-webtransport-server' },
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

  const server = spawn('./main', [], { cwd: '../../go-libp2p-webtransport-server', killSignal: 'SIGINT' })
  server.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`, typeof data)
  })
  const serverAddr = await (new Promise(resolve => {
    server.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`, typeof data)
      if (data.includes('addr=')) {
        // Parse the addr out
        resolve((String(data)).match(/addr=([^\s]*)/)[1])
      }
    })
  }))
  return { server, serverAddr }
}

play.describe('bundle ipfs with parceljs:', () => {
  // DOM
  const connectBtn = '#connectBtn'
  const connectAddr = '#peerInput'
  const connList = '#connlistEl'

  let server
  let serverAddr

  // eslint-disable-next-line no-empty-pattern
  play.beforeAll(async ({ }, testInfo) => {
    testInfo.setTimeout(5 * 60_000)
    const s = await spinUpGoLibp2p()
    server = s.server
    serverAddr = s.serverAddr
    console.log('Server addr:', serverAddr)
  }, {})

  play.afterAll(() => {
    server.kill('SIGINT')
  })

  play.beforeEach(async ({ servers, page }) => {
    await page.goto(`http://localhost:${servers[0].port}/`)
  })

  play('should connect to a go-libp2p node over webtransport', async ({ page }) => {
    await page.fill(connectAddr, serverAddr)
    await page.click(connectBtn)

    await page.waitForSelector('#connlistEl:has(li)')

    const connections = await page.textContent(connList)
    expect(connections).toContain(serverAddr)
  })
})
