/* eslint-env browser */

import { webcrypto } from 'crypto'

// globalThis `SubtleCrypto` shipped in node.js 19.x, Electron currently uses
// v18.x so this override file is necessary until Electron updates
export default {
  get (win = globalThis) {
    return webcrypto
  }
}
