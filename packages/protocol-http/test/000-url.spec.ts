/* eslint-env mocha */

import { expect } from 'aegir/chai'
import { URL } from '../src/common/url.js'

describe('000-URL Component', () => {
  describe('libp2p URL handling', () => {
    it('should preserve PeerId case in hostname', () => {
      const peerId = '12D3KooWKRyzVWW6ChFjQjK4miTSgsociQLhLirqzgKqt9j6W9j7'
      const url = new URL(`libp2p://${peerId}/`)

      expect(url.hostname).to.equal(peerId)
      expect(url.toString()).to.equal(`libp2p://${peerId}/`)
    })

    it('should handle standard URLs normally', () => {
      const url = new URL('https://example.com/path')
      expect(url.hostname).to.equal('example.com')
      expect(url.pathname).to.equal('/path')
    })

    it('should preserve PeerId case in full URL', () => {
      const peerId = '12D3KooWKRyzVWW6ChFjQjK4miTSgsociQLhLirqzgKqt9j6W9j7'
      const url = new URL(`libp2p://${peerId}:8080/path?query#hash`)

      expect(url.hostname).to.equal(peerId)
      expect(url.port).to.equal('8080')
      expect(url.pathname).to.equal('/path')
      expect(url.search).to.equal('?query')
      expect(url.hash).to.equal('#hash')
      expect(url.toString()).to.include(peerId)
    })
  })
})
