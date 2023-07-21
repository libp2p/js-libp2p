import { ERR_INVALID_PEER_SCORE_THRESHOLDS } from './constants.js'
import { CodeError } from '@libp2p/interface/errors'

// This file defines PeerScoreThresholds interface
// as well as a constructor, default constructor, and validation function
// for this interface

export interface PeerScoreThresholds {
  /**
   * gossipThreshold is the score threshold below which gossip propagation is supressed;
   * should be negative.
   */
  gossipThreshold: number

  /**
   * publishThreshold is the score threshold below which we shouldn't publish when using flood
   * publishing (also applies to fanout and floodsub peers); should be negative and <= GossipThreshold.
   */
  publishThreshold: number

  /**
   * graylistThreshold is the score threshold below which message processing is supressed altogether,
   * implementing an effective graylist according to peer score; should be negative and <= PublisThreshold.
   */
  graylistThreshold: number

  /**
   * acceptPXThreshold is the score threshold below which PX will be ignored; this should be positive
   * and limited to scores attainable by bootstrappers and other trusted nodes.
   */
  acceptPXThreshold: number

  /**
   * opportunisticGraftThreshold is the median mesh score threshold before triggering opportunistic
   * grafting; this should have a small positive value.
   */
  opportunisticGraftThreshold: number
}

export const defaultPeerScoreThresholds: PeerScoreThresholds = {
  gossipThreshold: -10,
  publishThreshold: -50,
  graylistThreshold: -80,
  acceptPXThreshold: 10,
  opportunisticGraftThreshold: 20
}

export function createPeerScoreThresholds(p: Partial<PeerScoreThresholds> = {}): PeerScoreThresholds {
  return {
    ...defaultPeerScoreThresholds,
    ...p
  }
}

export function validatePeerScoreThresholds(p: PeerScoreThresholds): void {
  if (p.gossipThreshold > 0) {
    throw new CodeError('invalid gossip threshold; it must be <= 0', ERR_INVALID_PEER_SCORE_THRESHOLDS)
  }
  if (p.publishThreshold > 0 || p.publishThreshold > p.gossipThreshold) {
    throw new CodeError(
      'invalid publish threshold; it must be <= 0 and <= gossip threshold',
      ERR_INVALID_PEER_SCORE_THRESHOLDS
    )
  }
  if (p.graylistThreshold > 0 || p.graylistThreshold > p.publishThreshold) {
    throw new CodeError(
      'invalid graylist threshold; it must be <= 0 and <= publish threshold',
      ERR_INVALID_PEER_SCORE_THRESHOLDS
    )
  }
  if (p.acceptPXThreshold < 0) {
    throw new CodeError('invalid accept PX threshold; it must be >= 0', ERR_INVALID_PEER_SCORE_THRESHOLDS)
  }
  if (p.opportunisticGraftThreshold < 0) {
    throw new CodeError('invalid opportunistic grafting threshold; it must be >= 0', ERR_INVALID_PEER_SCORE_THRESHOLDS)
  }
}
