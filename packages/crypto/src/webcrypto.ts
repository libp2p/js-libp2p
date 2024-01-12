/* eslint-env browser */

import { webcrypto } from 'crypto'

// Check native crypto exists and is enabled (In insecure context `self.crypto`
// exists but `self.crypto.subtle` does not).
export default {
  get (win = globalThis) {
    return webcrypto
  }
}
