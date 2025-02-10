import { expect } from 'aegir/chai'
import { isNode, isElectronMain, isBrowser, isWebWorker } from 'wherearewe'
import { userAgent } from '../../src/user-agent.js'

describe('user-agent', () => {
  it('should include runtime in user agent', () => {
    if (isNode) {
      expect(userAgent()).to.include('node/')
    } else if (isElectronMain) {
      expect(userAgent()).to.include('electron/')
    } else if (isBrowser || isWebWorker) {
      expect(userAgent()).to.include('browser/')
    }
  })
})
