import { expect } from 'aegir/chai'
import { createPeerScoreThresholds, validatePeerScoreThresholds } from '../src/score/index.js'

describe('PeerScoreThresholds validation', () => {
  it('should throw on invalid PeerScoreThresholds', () => {
    expect(
      () => {
        validatePeerScoreThresholds(
          createPeerScoreThresholds({
            gossipThreshold: 1
          })
        )
      },
      'gossipThreshold must be <= 0'
    ).to.throw()
    expect(
      () => {
        validatePeerScoreThresholds(
          createPeerScoreThresholds({
            publishThreshold: 1
          })
        )
      },
      'publishThreshold must be <= 0 and <= gossip threshold'
    ).to.throw()
    expect(
      () => {
        validatePeerScoreThresholds(
          createPeerScoreThresholds({
            gossipThreshold: -1,
            publishThreshold: 0
          })
        )
      },
      'publishThreshold must be <= 0 and <= gossip threshold'
    ).to.throw()
    expect(
      () => {
        validatePeerScoreThresholds(
          createPeerScoreThresholds({
            graylistThreshold: 1
          })
        )
      },
      'graylistThreshold must be <= 0 and <= publish threshold'
    ).to.throw()
    expect(
      () => {
        validatePeerScoreThresholds(
          createPeerScoreThresholds({
            publishThreshold: -1,
            graylistThreshold: -2
          })
        )
      },
      'graylistThreshold must be <= 0 and <= publish threshold'
    ).to.throw()
    expect(
      () => {
        validatePeerScoreThresholds(
          createPeerScoreThresholds({
            acceptPXThreshold: -1
          })
        )
      },
      'acceptPXThreshold must be >= 0'
    ).to.throw()
    expect(
      () => {
        validatePeerScoreThresholds(
          createPeerScoreThresholds({
            opportunisticGraftThreshold: -1
          })
        )
      },
      'opportunisticGraftThreshold must be >= 0'
    ).to.throw()
  })
  it('should not throw on valid PeerScoreThresholds', () => {
    expect(() => {
      validatePeerScoreThresholds(
        createPeerScoreThresholds({
          gossipThreshold: -1,
          publishThreshold: -2,
          graylistThreshold: -3,
          acceptPXThreshold: 1,
          opportunisticGraftThreshold: 2
        })
      )
    }
    ).to.not.throw()
  })
})
