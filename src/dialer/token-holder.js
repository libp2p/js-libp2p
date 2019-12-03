'use strict'

/**
 * @class TokenHolder
 * @example
 * const th = new TokenHolder(tokens, dialer.releaseToken)
 * for (const action of actions) {
 *   const token = await th.getToken()
 *   action(token).then(() => th.releaseToken(token))
 * }
 *
 * await th.drain()
 */
class TokenHolder {
  /**
   * @param {Array<*>} tokens Tokens to track
   * @param {function(*)} release Called when releasing control of the tokens
   */
  constructor (tokens, release) {
    this.originalTokens = tokens
    this.tokens = [...tokens]
    this._release = release
  }

  /**
   * Resolves a token once once is available. Once the token is no
   * longer needed it MUST be release with `releaseToken()`.
   * @returns {Promise<*>}
   */
  getToken () {
    if (this.tokens.length) return Promise.resolve(this.tokens.shift())
    return new Promise(resolve => {
      const _push = this.tokens.push
      this.tokens.push = (token) => {
        this.tokens.push = _push
        resolve(token)
      }
    })
  }

  /**
   * Makes the token available via `getToken()`
   * @param {*} token
   */
  releaseToken (token) {
    this.tokens.push(token)
  }

  /**
   * Once tokens are no longer needed for a series of actions,
   * drain will release them to the owner via `this._release()`
   */
  async drain () {
    let drained = 0
    while (drained < this.originalTokens.length) {
      this._release(await this.getToken())
      // Remove the token
      drained++
    }
  }
}

module.exports.TokenHolder = TokenHolder
