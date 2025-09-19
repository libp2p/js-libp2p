import { expect } from 'aegir/chai'
import * as constants from '../src/constants.js'
import {
  createTopicScoreParams,
  validateTopicScoreParams,
  createPeerScoreParams,
  validatePeerScoreParams
} from '../src/score/index.js'

describe('TopicScoreParams validation', () => {
  it('should not throw on default TopicScoreParams', () => {
    expect(() => { validateTopicScoreParams(createTopicScoreParams({})) }).to.not.throw()
  })
  it('should throw on invalid TopicScoreParams', () => {
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            topicWeight: -1
          })
        )
      },
      'topicWeight must be >= 0'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshWeight: -1,
            timeInMeshQuantum: 1000
          })
        )
      },
      'timeInMeshWeight must be positive (or 0 to disable)'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshWeight: 1,
            timeInMeshQuantum: -1
          })
        )
      },
      'timeInMeshQuantum must be positive'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshWeight: 1,
            timeInMeshQuantum: 1000,
            timeInMeshCap: -1
          })
        )
      },
      'timeInMeshCap must be positive'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            firstMessageDeliveriesWeight: -1
          })
        )
      },
      'firstMessageDeliveriesWeight must be positive (or 0 to disable)'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            firstMessageDeliveriesWeight: 1,
            firstMessageDeliveriesDecay: -1
          })
        )
      },
      'firstMessageDeliveriesDecay must be between 0 and 1'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            firstMessageDeliveriesWeight: 1,
            firstMessageDeliveriesDecay: 2
          })
        )
      },
      'firstMessageDeliveriesDecay must be between 0 and 1'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            firstMessageDeliveriesWeight: 1,
            firstMessageDeliveriesDecay: 0.5,
            firstMessageDeliveriesCap: -1
          })
        )
      },
      'firstMessageDeliveriesCap must be positive'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            meshMessageDeliveriesWeight: 1
          })
        )
      },
      'meshMessageDeliveriesWeight must be negative (or 0 to disable)'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            meshMessageDeliveriesWeight: -1,
            meshMessageDeliveriesDecay: -1
          })
        )
      },
      'meshMessageDeliveriesDecay must be between 0 and 1'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            meshMessageDeliveriesWeight: -1,
            meshMessageDeliveriesDecay: 2
          })
        )
      },
      'meshMessageDeliveriesDecay must be between 0 and 1'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            meshMessageDeliveriesWeight: -1,
            meshMessageDeliveriesDecay: 0.5,
            meshMessageDeliveriesCap: -1
          })
        )
      },
      'meshMessageDeliveriesCap must be positive'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            meshMessageDeliveriesWeight: -1,
            meshMessageDeliveriesDecay: 5,
            meshMessageDeliveriesThreshold: -3
          })
        )
      },
      'meshMessageDeliveriesDecay must be between 0 and 1'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            meshMessageDeliveriesWeight: -1,
            meshMessageDeliveriesDecay: 0.5,
            meshMessageDeliveriesThreshold: -3,
            meshMessageDeliveriesWindow: -1
          })
        )
      },
      'meshMessageDeliveriesThreshold must be positive'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            meshMessageDeliveriesWeight: -1,
            meshMessageDeliveriesDecay: 0.5,
            meshMessageDeliveriesThreshold: 3,
            meshMessageDeliveriesWindow: -1,
            meshMessageDeliveriesActivation: 1
          })
        )
      },
      'meshMessageDeliveriesWindow must be non-negative'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            meshFailurePenaltyWeight: 1
          })
        )
      },
      'meshFailurePenaltyWeight must be negative'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            meshFailurePenaltyWeight: -1,
            meshFailurePenaltyDecay: -1
          })
        )
      },
      'meshFailurePenaltyDecay must be between 0 and 1'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            meshFailurePenaltyWeight: -1,
            meshFailurePenaltyDecay: 2
          })
        )
      },
      'meshFailurePenaltyDecay must be between 0 and 1'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            invalidMessageDeliveriesWeight: 1
          })
        )
      },
      'invalidMessageDeliveriesWeight must be negative'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            invalidMessageDeliveriesWeight: -1,
            invalidMessageDeliveriesDecay: -1
          })
        )
      },
      'invalidMessageDeliveriesDecay must be between 0 and 1'
    ).to.throw()
    expect(
      () => {
        validateTopicScoreParams(
          createTopicScoreParams({
            timeInMeshQuantum: 1000,
            invalidMessageDeliveriesWeight: -1,
            invalidMessageDeliveriesDecay: 2
          })
        )
      },
      'invalidMessageDeliveriesDecay must be between 0 and 1'
    ).to.throw()
  })
  it('should not throw on valid TopicScoreParams', () => {
    expect(() => {
      validateTopicScoreParams(
        createTopicScoreParams({
          topicWeight: 2,
          timeInMeshWeight: 0.01,
          timeInMeshQuantum: 1000,
          timeInMeshCap: 10,
          firstMessageDeliveriesWeight: 1,
          firstMessageDeliveriesDecay: 0.5,
          firstMessageDeliveriesCap: 10,
          meshMessageDeliveriesWeight: -1,
          meshMessageDeliveriesDecay: 0.5,
          meshMessageDeliveriesCap: 10,
          meshMessageDeliveriesThreshold: 5,
          meshMessageDeliveriesWindow: 1,
          meshMessageDeliveriesActivation: 1000,
          meshFailurePenaltyWeight: -1,
          meshFailurePenaltyDecay: 0.5,
          invalidMessageDeliveriesWeight: -1,
          invalidMessageDeliveriesDecay: 0.5
        })
      )
    }
    ).to.not.throw()
  })
})

describe('PeerScoreParams validation', () => {
  const appScore = (): number => 0

  it('should throw on invalid PeerScoreParams', () => {
    expect(
      () => {
        validatePeerScoreParams(
          createPeerScoreParams({
            topicScoreCap: -1,
            appSpecificScore: appScore,
            decayInterval: 1000,
            decayToZero: 0.01
          })
        )
      },
      'topicScoreCap must be positive'
    ).to.throw()
    expect(
      () => {
        validatePeerScoreParams(
          createPeerScoreParams({
            topicScoreCap: 1,
            decayInterval: 999,
            decayToZero: 0.01
          })
        )
      },
      'decayInterval must be at least 1s'
    ).to.throw()
    expect(
      () => {
        validatePeerScoreParams(
          createPeerScoreParams({
            topicScoreCap: 1,
            appSpecificScore: appScore,
            decayInterval: 1000,
            decayToZero: 0.01,
            IPColocationFactorWeight: 1
          })
        )
      },
      'IPColocationFactorWeight should be negative'
    ).to.throw()
    expect(
      () => {
        validatePeerScoreParams(
          createPeerScoreParams({
            topicScoreCap: 1,
            appSpecificScore: appScore,
            decayInterval: 1000,
            decayToZero: 0.01,
            IPColocationFactorWeight: -1,
            IPColocationFactorThreshold: -1
          })
        )
      },
      'IPColocationFactorThreshold should be at least 1'
    ).to.throw()
    /*
    TODO: appears to be valid config?
    expect(() =>
      validatePeerScoreParams(
        createPeerScoreParams({
          topicScoreCap: 1,
          appSpecificScore: appScore,
          decayInterval: 1000,
          decayToZero: 0.01,
          IPColocationFactorWeight: -1,
          IPColocationFactorThreshold: 0.99
        })
      ), "IPColocationFactorThreshold should be at least 1"
    ).to.throw()
    */
    expect(
      () => {
        validatePeerScoreParams(
          createPeerScoreParams({
            topicScoreCap: 1,
            appSpecificScore: appScore,
            decayInterval: 1000,
            decayToZero: -1,
            IPColocationFactorWeight: -1,
            IPColocationFactorThreshold: 1
          })
        )
      },
      'decayToZero must be between 0 and 1'
    ).to.throw()
    expect(
      () => {
        validatePeerScoreParams(
          createPeerScoreParams({
            topicScoreCap: 1,
            appSpecificScore: appScore,
            decayInterval: 1000,
            decayToZero: 2,
            IPColocationFactorWeight: -1,
            IPColocationFactorThreshold: 1
          })
        )
      },
      'decayToZero must be between 0 and 1'
    ).to.throw()
    expect(() => {
      validatePeerScoreParams(
        createPeerScoreParams({
          appSpecificScore: appScore,
          decayInterval: 1000,
          decayToZero: 0.01,
          behaviourPenaltyWeight: 1
        })
      )
    }
    ).to.throw()
    /*
    TODO: appears to be valid config?
    expect(() =>
      validatePeerScoreParams(
        createPeerScoreParams({
          appSpecificScore: appScore,
          decayInterval: 1000,
          decayToZero: 0.01,
          behaviourPenaltyWeight: -1
        })
      ), "behaviourPenaltyWeight MUST be negative (or zero to disable)"
    ).to.throw()
    */
    expect(
      () => {
        validatePeerScoreParams(
          createPeerScoreParams({
            appSpecificScore: appScore,
            decayInterval: 1000,
            decayToZero: 0.01,
            behaviourPenaltyWeight: -1,
            behaviourPenaltyDecay: 2
          })
        )
      },
      'behaviourPenaltyDecay must be between 0 and 1'
    ).to.throw()
    expect(() => {
      validatePeerScoreParams(
        createPeerScoreParams({
          topicScoreCap: 1,
          appSpecificScore: appScore,
          decayInterval: 1000,
          decayToZero: 0.01,
          IPColocationFactorWeight: -1,
          IPColocationFactorThreshold: 1,
          topics: {
            test: {
              topicWeight: -1,
              timeInMeshWeight: 0.01,
              timeInMeshQuantum: Number(constants.second),
              timeInMeshCap: 10,
              firstMessageDeliveriesWeight: 1,
              firstMessageDeliveriesDecay: 0.5,
              firstMessageDeliveriesCap: 10,
              meshMessageDeliveriesWeight: -1,
              meshMessageDeliveriesDecay: 0.5,
              meshMessageDeliveriesCap: 10,
              meshMessageDeliveriesThreshold: 5,
              meshMessageDeliveriesWindow: 1,
              meshMessageDeliveriesActivation: 1000,
              meshFailurePenaltyWeight: -1,
              meshFailurePenaltyDecay: 0.5,
              invalidMessageDeliveriesWeight: -1,
              invalidMessageDeliveriesDecay: 0.5
            }
          }
        })
      )
    }
    ).to.throw()
  })
  it('should not throw on valid PeerScoreParams', () => {
    expect(() => {
      validatePeerScoreParams(
        createPeerScoreParams({
          appSpecificScore: appScore,
          decayInterval: 1000,
          decayToZero: 0.01,
          IPColocationFactorWeight: -1,
          IPColocationFactorThreshold: 1,
          behaviourPenaltyWeight: -1,
          behaviourPenaltyDecay: 0.999
        })
      )
    }
    ).to.not.throw()
    expect(() => {
      validatePeerScoreParams(
        createPeerScoreParams({
          topicScoreCap: 1,
          appSpecificScore: appScore,
          decayInterval: 1000,
          decayToZero: 0.01,
          IPColocationFactorWeight: -1,
          IPColocationFactorThreshold: 1,
          behaviourPenaltyWeight: -1,
          behaviourPenaltyDecay: 0.999
        })
      )
    }
    ).to.not.throw()
    expect(() => {
      validatePeerScoreParams(
        createPeerScoreParams({
          topicScoreCap: 1,
          appSpecificScore: appScore,
          decayInterval: Number(constants.second),
          decayToZero: 0.01,
          IPColocationFactorWeight: -1,
          IPColocationFactorThreshold: 1,
          topics: {
            test: {
              topicWeight: 1,
              timeInMeshWeight: 0.01,
              timeInMeshQuantum: 1000,
              timeInMeshCap: 10,
              firstMessageDeliveriesWeight: 1,
              firstMessageDeliveriesDecay: 0.5,
              firstMessageDeliveriesCap: 10,
              meshMessageDeliveriesWeight: -1,
              meshMessageDeliveriesDecay: 0.5,
              meshMessageDeliveriesCap: 10,
              meshMessageDeliveriesThreshold: 5,
              meshMessageDeliveriesWindow: 1,
              meshMessageDeliveriesActivation: 1000,
              meshFailurePenaltyWeight: -1,
              meshFailurePenaltyDecay: 0.5,
              invalidMessageDeliveriesWeight: -1,
              invalidMessageDeliveriesDecay: 0.5
            }
          }
        })
      )
    }
    ).to.not.throw()
  })
})
