/* eslint-disable no-console */
import { setup, expect } from 'test-ipfs-example/browser'
import { createLibp2p } from 'libp2p'
import { circuitRelayServer } from 'libp2p/circuit-relay'
import { webSockets } from '@libp2p/websockets'
import * as filters from '@libp2p/websockets/filters'
import { mplex } from '@libp2p/mplex'
import { noise } from '@chainsafe/libp2p-noise'
import { identifyService } from 'libp2p/identify'

// Setup
const test = setup()

// DOM
const connectBtn = '#connect'
const connectAddr = '#peer'
const messageInput = '#message'
const sendBtn = '#send'
const output = '#output'
const listeningAddresses = '#multiaddrs'

const message = 'hello'
let url

// we spawn a js libp2p relay
async function spawnRelay() {
  const relayNode = await createLibp2p({
    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/0/ws']
    },
    transports: [
      webSockets({
        filter: filters.all
      }),
    ],
    connectionEncryption: [noise()],
    streamMuxers: [mplex()],
    services: {
      identify: identifyService(),
      relay: circuitRelayServer()
    }
  })

  const relayNodeAddr = relayNode.getMultiaddrs()[0].toString()

  return { relayNode, relayNodeAddr }
}

test.describe('browser to browser example:', () => {
  let relayNode
  let relayNodeAddr

  // eslint-disable-next-line no-empty-pattern
  test.beforeAll(async ({ servers }, testInfo) => {
    testInfo.setTimeout(5 * 60_000)
    const r = await spawnRelay()
    relayNode = r.relayNode
    relayNodeAddr = r.relayNodeAddr
    console.log('Server addr:', relayNodeAddr)
    url = servers[0].url
  }, {})

  test.afterAll(() => {
    relayNode.stop()
  })

  test.beforeEach(async ({ page }) => {
    await page.goto(url)
  })

  test('should connect to a relay node', async ({ page, context }) => {
    // first page dials the relay
    const relayedAddress = await dialRelay(page, relayNodeAddr)

    // load second page and use `peer` as the connectAddr
    const pageTwo = await context.newPage();
    await pageTwo.goto(url)
    await dialPeerOverRelay(pageTwo, relayedAddress)

    // stop the relay
    await relayNode.stop()

    // send the message to the peer over webRTC
    await pageTwo.fill(messageInput, message)
    await pageTwo.click(sendBtn)

    // check the message was echoed back
    const outputLocator = pageTwo.locator(output)
    await expect(outputLocator).toHaveText(/Sending message/)
    await expect(outputLocator).toHaveText(/Received message/, { timeout: 60000 })
  })
})

async function dialRelay (page, address) {
  // add the go libp2p multiaddress to the input field and submit
  await page.fill(connectAddr, address)
  await page.click(connectBtn)

  const outputLocator = page.locator(output)
  await expect(outputLocator).toHaveText(/Dialing/)
  await expect(outputLocator).toHaveText(/Connected/)

  const multiaddrsLocator = page.locator(listeningAddresses)
  await expect(multiaddrsLocator).toHaveText(/webrtc/)

  const multiaddrs = await page.textContent(listeningAddresses)
  const addr = multiaddrs.split(address).filter(str => str.includes('webrtc')).pop()

  return address + addr
}

async function dialPeerOverRelay (page, address) {
  // add the go libp2p multiaddr to the input field and submit
  await page.fill(connectAddr, address)
  await page.click(connectBtn)

  const outputLocator = page.locator(output)
  await expect(outputLocator).toHaveText(/Dialing/)
  await expect(outputLocator).toHaveText(/Connected/)
}
