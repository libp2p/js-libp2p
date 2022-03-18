'use strict'

import execa from 'execa'
const { chromium } from 'playwright');

async function run() {
  let url = ''
  const proc = execa('parcel', ['./index.html'], {
    preferLocal: true,
    localDir: __dirname,
    cwd: __dirname,
    all: true
  })

  proc.all.on('data', async (chunk) => {
    /**@type {string} */
    const out = chunk.toString()

    if (out.includes('Server running at')) {
      url = out.split('Server running at ')[1]
    }

    if (out.includes('Built in')) {
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
        await browser.close();

      } catch (err: any) {
        console.error(err)
        process.exit(1)
      } finally {
        proc.cancel()
      }
    }
  })

}

module.exports = run
