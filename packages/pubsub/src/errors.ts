
export const codes = {
  /**
   * Signature policy is invalid
   */
  ERR_INVALID_SIGNATURE_POLICY: 'ERR_INVALID_SIGNATURE_POLICY',
  /**
   * Signature policy is unhandled
   */
  ERR_UNHANDLED_SIGNATURE_POLICY: 'ERR_UNHANDLED_SIGNATURE_POLICY',

  // Strict signing codes

  /**
   * Message expected to have a `signature`, but doesn't
   */
  ERR_MISSING_SIGNATURE: 'ERR_MISSING_SIGNATURE',
  /**
   * Message expected to have a `seqno`, but doesn't
   */
  ERR_MISSING_SEQNO: 'ERR_MISSING_SEQNO',
  /**
   * Message expected to have a `key`, but doesn't
   */
  ERR_MISSING_KEY: 'ERR_MISSING_KEY',
  /**
   * Message `signature` is invalid
   */
  ERR_INVALID_SIGNATURE: 'ERR_INVALID_SIGNATURE',
  /**
   * Message expected to have a `from`, but doesn't
   */
  ERR_MISSING_FROM: 'ERR_MISSING_FROM',

  // Strict no-signing codes

  /**
   * Message expected to not have a `from`, but does
   */
  ERR_UNEXPECTED_FROM: 'ERR_UNEXPECTED_FROM',
  /**
   * Message expected to not have a `signature`, but does
   */
  ERR_UNEXPECTED_SIGNATURE: 'ERR_UNEXPECTED_SIGNATURE',
  /**
   * Message expected to not have a `key`, but does
   */
  ERR_UNEXPECTED_KEY: 'ERR_UNEXPECTED_KEY',
  /**
   * Message expected to not have a `seqno`, but does
   */
  ERR_UNEXPECTED_SEQNO: 'ERR_UNEXPECTED_SEQNO',

  /**
   * Message failed topic validator
   */
  ERR_TOPIC_VALIDATOR_REJECT: 'ERR_TOPIC_VALIDATOR_REJECT'
}
