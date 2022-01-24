'use strict'

/**
 * @template K
 * @template V
 */
class TrackedMap extends Map {
  /**
   * @param {object} options
   * @param {string} options.system
   * @param {string} options.component
   * @param {string} options.metric
   * @param {import('.')} options.metrics
   */
  constructor (options) {
    super()

    const { system, component, metric, metrics } = options
    this._system = system
    this._component = component
    this._metric = metric
    this._metrics = metrics

    this._metrics.updateComponentMetric({
      system: this._system,
      component: this._component,
      metric: this._metric,
      value: this.size
    })
  }

  /**
   * @param {K} key
   * @param {V} value
   */
  set (key, value) {
    super.set(key, value)
    this._metrics.updateComponentMetric({
      system: this._system,
      component: this._component,
      metric: this._metric,
      value: this.size
    })
    return this
  }

  /**
   * @param {K} key
   */
  delete (key) {
    const deleted = super.delete(key)
    this._metrics.updateComponentMetric({
      system: this._system,
      component: this._component,
      metric: this._metric,
      value: this.size
    })
    return deleted
  }

  clear () {
    super.clear()

    this._metrics.updateComponentMetric({
      system: this._system,
      component: this._component,
      metric: this._metric,
      value: this.size
    })
  }
}

/**
 * @template K
 * @template V
 * @param {object} options
 * @param {string} [options.system]
 * @param {string} options.component
 * @param {string} options.metric
 * @param {import('.')} [options.metrics]
 * @returns {Map<K, V>}
 */
module.exports = ({ system = 'libp2p', component, metric, metrics }) => {
  /** @type {Map<K, V>} */
  let map

  if (metrics) {
    map = new TrackedMap({ system, component, metric, metrics })
  } else {
    map = new Map()
  }

  return map
}
