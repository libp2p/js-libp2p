'use strict'

/**
 * @template K
 * @template V
 */
class TrackedMap extends Map {
  /**
   * @param {string} component
   * @param {string} name
   * @param {import('.')} metrics
   */
  constructor (component, name, metrics) {
    super()

    this._component = component
    this._name = name
    this._metrics = metrics

    this._metrics.updateComponentMetric(this._component, this._name, this.size)
  }

  /**
   * @param {K} key
   * @param {V} value
   */
  set (key, value) {
    super.set(key, value)
    this._metrics.updateComponentMetric(this._component, this._name, this.size)
    return this
  }

  /**
   * @param {K} key
   */
  delete (key) {
    const deleted = super.delete(key)
    this._metrics.updateComponentMetric(this._component, this._name, this.size)
    return deleted
  }

  clear () {
    super.clear()

    this._metrics.updateComponentMetric(this._component, this._name, this.size)
  }
}

/**
 * @template K
 * @template V
 * @param {string} component
 * @param {string} name
 * @param {import('.')} [metrics]
 * @returns {Map<K, V>}
 */
module.exports = (component, name, metrics) => {
  /** @type {Map<K, V>} */
  let map

  if (metrics) {
    map = new TrackedMap(component, name, metrics)
  } else {
    map = new Map()
  }

  return map
}
