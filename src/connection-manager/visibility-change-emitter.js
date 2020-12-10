// @ts-nocheck
/* global document */

/**
 * This code is based on `latency-monitor` (https://github.com/mlucool/latency-monitor) by `mlucool` (https://github.com/mlucool), available under Apache License 2.0 (https://github.com/mlucool/latency-monitor/blob/master/LICENSE)
 */
'use strict'

const { EventEmitter } = require('events')

const debug = require('debug')('latency-monitor:VisibilityChangeEmitter')

/**
 * Listen to page visibility change events (i.e. when the page is focused / blurred) by an event emitter.
 *
 * Warning: This does not work on all browsers, but should work on all modern browsers
 *
 * @example
 *
 *     const myVisibilityEmitter = new VisibilityChangeEmitter();
 *
 *     myVisibilityEmitter.on('visibilityChange', (pageInFocus) => {
 *        if ( pageInFocus ){
 *            // Page is in focus
 *            console.log('In focus');
 *        }
 *        else {
 *            // Page is blurred
 *            console.log('Out of focus');
 *        }
 *     });
 *     // To access the visibility state directly, call:
 *     console.log('Am I focused now? ' + myVisibilityEmitter.isVisible());
 */
class VisibilityChangeEmitter extends EventEmitter {
  /**
   * Creates a VisibilityChangeEmitter
   *
   * @class
   */
  constructor () {
    super()
    if (typeof document === 'undefined') {
      debug('This is not a browser, no "document" found. Stopping.')
      return
    }
    this._initializeVisibilityVarNames()
    this._addVisibilityChangeListener()
  }

  /**
   * document.hidden and document.visibilityChange are the two variables we need to check for;
   * Since these variables are named differently in different browsers, this function sets
   * the appropriate name based on the browser being used. Once executed, tha actual names of
   * document.hidden and document.visibilityChange are found in this._hidden and this._visibilityChange
   * respectively
   *
   * @private
   */
  _initializeVisibilityVarNames () {
    let hidden
    let visibilityChange
    if (typeof document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support
      hidden = 'hidden'
      visibilityChange = 'visibilitychange'
    } else if (typeof document.mozHidden !== 'undefined') {
      hidden = 'mozHidden'
      visibilityChange = 'mozvisibilitychange'
    } else if (typeof document.msHidden !== 'undefined') {
      hidden = 'msHidden'
      visibilityChange = 'msvisibilitychange'
    } else if (typeof document.webkitHidden !== 'undefined') {
      hidden = 'webkitHidden'
      visibilityChange = 'webkitvisibilitychange'
    }
    this._hidden = hidden
    this._visibilityChange = visibilityChange
  }

  /**
   * Adds an event listener on the document that listens to changes in document.visibilityChange
   * (or whatever name by which the visibilityChange variable is known in the browser)
   *
   * @private
   */
  _addVisibilityChangeListener () {
    if (typeof document.addEventListener === 'undefined' ||
            typeof document[this._hidden] === 'undefined') {
      debug('Checking page visibility requires a browser that supports the Page Visibility API.')
    } else {
      // Handle page visibility change
      document.addEventListener(this._visibilityChange, this._handleVisibilityChange.bind(this), false)
    }
  }

  /**
   * The function returns ```true``` if the page is visible or ```false``` if the page is not visible and
   * ```undefined``` if the page visibility API is not supported by the browser.
   *
   * @returns {boolean | void} whether the page is now visible or not (undefined is unknown)
   */
  isVisible () {
    if (this._hidden === undefined || document[this._hidden] === undefined) {
      return undefined
    }

    return !document[this._hidden]
  }

  /**
   * The function that is called when document.visibilityChange has changed
   * It emits an event called visibilityChange and sends the value of document.hidden as a
   * parameter
   *
   * @private
   */
  _handleVisibilityChange () {
    const visible = !document[this._hidden]
    debug(visible ? 'Page Visible' : 'Page Hidden')
    // Emit the event
    this.emit('visibilityChange', visible)
  }
}

module.exports = VisibilityChangeEmitter
