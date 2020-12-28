'use strict'

const pkg = require('./package.json')

module.exports = {
  [pkg.name]: function (browser) {
    browser
      .url(process.env.LIBP2P_EXAMPLE_TEST_URL)
      .waitForElementVisible('#status')
      .waitForElementVisible('#output')
      .pause(5000)

    browser.expect.element('#status').text.to.contain('libp2p started!')
    browser.expect.element('#output').text.to.contain('libp2p id is')

    browser.expect.element('#output').text.to.contain('Found peer')
    browser.expect.element('#output').text.to.contain('Connected to')

    browser.end()
  }
}
