import path from 'path'
import { execa } from 'execa'
import pDefer from 'p-defer'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { chromium } from 'playwright'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function startNode (name, args = []) {
    return execa('node', [path.join(__dirname, name), ...args], {
        cwd: path.resolve(__dirname),
        all: true
    })
}

function startBrowser () {
    return execa('vite', [], {
        preferLocal: true,
        localDir: __dirname,
        cwd: __dirname,
        all: true
    })
}

export async function test () {
    // Step 1, listener process
    const listenerProcReady = pDefer()
    let listenerOutput = ''
    process.stdout.write('listener.js\n')
    const listenerProc = startNode('listener.js')

    listenerProc.all.on('data', async (data) => {
        process.stdout.write(data)
        listenerOutput += uint8ArrayToString(data)
        if (listenerOutput.includes('Listening on:') && listenerOutput.includes('12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m')) {
            listenerProcReady.resolve()
        }
    })

    await listenerProcReady.promise
    process.stdout.write('==================================================================\n')

    // Step 2, dialer process
    process.stdout.write('dialer.js\n')
    let dialerUrl = 'http://localhost:3000'
    const dialerProc = startBrowser()

    dialerProc.all.on('data', async (chunk) => {
        /**@type {string} */
        const out = chunk.toString()

        if (out.includes('ready in')) {
            try {
                const browser = await chromium.launch();
                const page = await browser.newPage();
                await page.goto(dialerUrl);
                await page.waitForFunction(selector => document.querySelector(selector).innerText === 'libp2p started!', '#status')
                await page.waitForFunction(
                  selector => {
                      const text = document.querySelector(selector).innerText
                      return text.includes('libp2p id is') &&
                        text.includes('Found peer 12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m') &&
                        text.includes('Connected to 12D3KooWCuo3MdXfMgaqpLC5Houi1TRoFqgK9aoxok4NK5udMu8m')
                  },
                  '#output',
                  { timeout: 10000 }
                )
                await browser.close()
            } catch (err) {
                console.error(err)
                process.exit(1)
            } finally {
                dialerProc.cancel()
                listenerProc.cancel()
            }
        }
    })
}
