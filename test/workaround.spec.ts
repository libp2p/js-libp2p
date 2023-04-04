
/* eslint-env mocha */
import { isWebkitLinux, derivedEmptyPasswordKey } from '../src/ciphers/aes-gcm.browser.js'
import { expect } from 'aegir/chai'

describe('Constant derived key is generated correctly', () => {
  it('Generates correctly', async () => {
    if (isWebkitLinux() || typeof crypto === 'undefined') {
      // WebKit Linux can't generate this. Hence the workaround.
      return
    }

    const generatedKey = await crypto.subtle.exportKey('jwk',
      await crypto.subtle.deriveKey(
        { name: 'PBKDF2', salt: new Uint8Array(16), iterations: 32767, hash: { name: 'SHA-256' } },
        await crypto.subtle.importKey('raw', new Uint8Array(0), { name: 'PBKDF2' }, false, ['deriveKey']),
        { name: 'AES-GCM', length: 128 }, true, ['encrypt', 'decrypt'])
    )

    // Webkit macos flips these. Sort them so they match.
    derivedEmptyPasswordKey.key_ops.sort()
    generatedKey?.key_ops?.sort()

    expect(generatedKey).to.eql(derivedEmptyPasswordKey)
  })
})
