/* eslint-env mocha */
'use strict'

const chai = require('chai')
const dirtyChai = require('dirty-chai')
const expect = chai.expect
chai.use(dirtyChai)

const Switch = require('../src')

describe('Switch', () => {
  describe('.availableTransports', () => {
    it('should always sort circuit last', () => {
      const switchA = new Switch({}, {})
      const transport = {
        filter: (addrs) => addrs
      }
      const mockPeerInfo = {
        multiaddrs: {
          toArray: () => ['a', 'b', 'c']
        }
      }

      switchA.transports = {
        Circuit: transport,
        TCP: transport,
        WebSocketStar: transport
      }

      expect(switchA.availableTransports(mockPeerInfo)).to.eql([
        'TCP',
        'WebSocketStar',
        'Circuit'
      ])
    })
  })
})
