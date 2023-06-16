/* eslint-disable no-console */
import { setup, expect } from 'test-ipfs-example/browser'
import { spawn, exec } from 'child_process'
import { existsSync } from 'fs'

// Setup
const test = setup()

async function spawnGoLibp2p() {
  if (!existsSync('../../examples/go-libp2p-server/go-libp2p-server')) {
    await new Promise((resolve, reject) => {
      exec('go build',
        { cwd: '../../examples/go-libp2p-server' },
        (error, stdout, stderr) => {
          if (error) {
            throw (`exec error: ${error}`)
          }
          resolve()
        })
    })
  }

  const server = spawn('./go-libp2p-server', [], { cwd: '../../examples/go-libp2p-server', killSignal: 'SIGINT' })
  server.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`, typeof data)
  })
  const serverAddr = await (new Promise(resolve => {
    server.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`, typeof data)
      const addr = String(data).match(/p2p addr:  ([^\s]*)/)
      if (addr !== null && addr.length > 0) {
        resolve(addr[1])
      }
    })
  }))
  return { server, serverAddr }
}

test.describe('bundle ipfs with parceljs:', () => {
  // DOM
  const connectBtn = '#connect'
  const connectAddr = '#peer'
  const messageInput = '#message'
  const sendBtn = '#send'
  const output = '#output'

  let server
  let serverAddr

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({ }, testInfo) => {
    testInfo.setTimeout(5 * 60_000)
    const s = await spawnGoLibp2p()
    server = s.server
    serverAddr = s.serverAddr
    console.log('Server addr:', serverAddr)
  }, {})

  test.afterAll(() => {
    server.kill('SIGINT')
  })

  test.beforeEach(async ({ servers, page }) => {
    await page.goto(servers[0].url)
  })

  test('should connect to a go-libp2p node over webrtc', async ({ page }) => {
    const message = 'hello'

    // add the go libp2p multiaddress to the input field and submit
    await page.fill(connectAddr, serverAddr)
    await page.click(connectBtn)

    // send the relay message to the go libp2p server
    await page.fill(messageInput, message)
    await page.click(sendBtn)

    await page.waitForSelector('#output:has(div)')

    // Expected output:
    //
    // Dialing '${serverAddr}'
    // Peer connected '${serverAddr}'
    // Sending message '${message}'
    // Received message '${message}'
    const connections = await page.textContent(output)

    expect(connections).toContain(`Dialing '${serverAddr}'`)
    expect(connections).toContain(`Peer connected '${serverAddr}'`)

    expect(connections).toContain(`Sending message '${message}'`)
    expect(connections).toContain(`Received message '${message}'`)
  })
})
