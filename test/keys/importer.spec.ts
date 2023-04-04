/* eslint max-nested-callbacks: ["error", 8] */
/* eslint-env mocha */
import { expect } from 'aegir/chai'

import { importer } from '../../src/keys/importer.js'
import { exporter } from '../../src/keys/exporter.js'

describe('libp2p-crypto importer/exporter', function () {
  it('roundtrips', async () => {
    for (const password of ['', 'password']) {
      const secret = new Uint8Array(32)
      for (let i = 0; i < secret.length; i++) {
        secret[i] = i
      }

      const exported = await exporter(secret, password)
      const imported = await importer(exported, password)
      expect(imported).to.deep.equal(secret)
    }
  })
})
