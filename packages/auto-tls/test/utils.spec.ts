import { createPrivateKey } from 'node:crypto'
import { generateKeyPair } from '@libp2p/crypto/keys'
import { multiaddr } from '@multiformats/multiaddr'
import { expect } from 'aegir/chai'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { formatAsPem, getPublicIps, importFromPem } from '../src/utils.js'
import { PRIVATE_KEY_PEM } from './fixtures/cert.js'

describe('utils', () => {
  describe('formatAsPem', () => {
    it('should transform a key to pem', async () => {
      const bits = 1024
      const key = await generateKeyPair('RSA', bits)
      const pem = formatAsPem(key)

      const keyObject = createPrivateKey({
        format: 'pem',
        key: pem
      })

      expect(keyObject.type).to.equal('private')
      expect(keyObject.asymmetricKeyType).to.equal('rsa')
      expect(keyObject.asymmetricKeyDetails?.modulusLength).to.equal(bits)

      expect(key.raw).to.equalBytes(keyObject.export({
        format: 'der',
        type: 'pkcs1'
      }))
    })
  })

  describe('importFromPem', () => {
    it('should read a key from pem', async () => {
      const key = importFromPem(PRIVATE_KEY_PEM)
      const digest = await crypto.subtle.digest('SHA-1', key.publicKey.raw)
      const thumbprint = uint8ArrayToString(new Uint8Array(digest, 0, digest.byteLength), 'base16')

      expect(key.type).to.equal('RSA')
      expect(thumbprint).to.equal('5f3a7c26f15600df20648213777783661ccdcfcf')
    })
  })

  describe('getPublicIps', () => {
    it('should return supported public IPs', () => {
      const addresses = [
        // tcp
        '/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',

        // insecure ws
        '/tcp/1234/ws/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',

        // secure wss
        '/tcp/1234/wss/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',

        // secure tls/ws
        '/tcp/1234/tls/ws/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',

        // secure tls/ws with sni
        '/tcp/1234/tls/sni/example.com/ws/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',

        // quic-v1
        '/udp/1234/quic-v1/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',

        // webtransport
        '/udp/1234/quic-v1/webtransport/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
      ]

      const expected: string[] = []

      const output = getPublicIps([
        multiaddr('/ip4/127.0.0.1/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
        multiaddr('/ip4/192.168.1.234/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),
        multiaddr('/dns4/example.com/tcp/1234/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'),

        ...addresses.map((fragment, index) => {
          const ip = `81.12.12.${index}`
          expected.push(ip)

          return multiaddr(`/ip4/${ip}${fragment}`)
        }),
        ...addresses.map((fragment, index) => {
          const ip = `2001:4860:4860::888${index}`
          expected.push(ip)

          return multiaddr(`/ip6/${ip}${fragment}`)
        })
      ])

      expect([...output]).to.deep.equal(expected)
    })
  })
})
