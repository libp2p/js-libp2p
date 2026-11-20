import { expect } from 'aegir/chai'
import { verifyConfig } from '../src/config.ts'
import { INITIAL_STREAM_WINDOW, MAX_STREAM_WINDOW } from '../src/constants.ts'

describe('config', () => {
  it('should accept an initial stream window larger than the default max', () => {
    expect(() => {
      verifyConfig({ streamOptions: { initialStreamWindowSize: MAX_STREAM_WINDOW * 2 } })
    }).to.not.throw()
  })

  it('should accept a max stream window smaller than the default initial window', () => {
    expect(() => {
      verifyConfig({ streamOptions: { maxStreamWindowSize: INITIAL_STREAM_WINDOW / 2 } })
    }).to.not.throw()
  })

  it('should reject a max stream window smaller than a configured initial window', () => {
    expect(() => {
      verifyConfig({ streamOptions: { initialStreamWindowSize: MAX_STREAM_WINDOW, maxStreamWindowSize: INITIAL_STREAM_WINDOW } })
    }).to.throw().with.property('name', 'InvalidParametersError')
  })
})
