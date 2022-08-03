import { execa } from 'execa'
import { chromium } from 'playwright'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export async function test () {
  let url = 'http://localhost:3000'

  const proc = execa('vite', [], {
    preferLocal: true,
    localDir: __dirname,
    cwd: __dirname,
    all: true
  })

  proc.all.on('data', async (chunk) => {
    /**@type {string} */
    const out = chunk.toString()

    if (out.includes('ready in')) {
      try {
        const browser = await chromium.launch();
        const page = await browser.newPage();
        await page.goto(url);
        await page.waitForFunction(selector => document.querySelector(selector).innerText === 'libp2p started!', '#status')
        await page.waitForFunction(
          selector => {
            const text = document.querySelector(selector).innerText
            return text.includes('libp2p id is') &&
              text.includes('Found peer') &&
              text.includes('Connected to')
          },
          '#output',
          { timeout: 5000 }
        )
        await browser.close()
      } catch (err) {
        console.error(err)
        process.exit(1)
      } finally {
        proc.cancel()
      }
    }
  })
}
