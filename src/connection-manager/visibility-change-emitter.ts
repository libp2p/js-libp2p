/**
 * This code is based on `latency-monitor` (https://github.com/mlucool/latency-monitor) by `mlucool` (https://github.com/mlucool), available under Apache License 2.0 (https://github.com/mlucool/latency-monitor/blob/master/LICENSE)
 */

import { CustomEvent, EventEmitter } from '@libp2p/interfaces/events'
import { logger } from '@libp2p/logger'

const log = logger('libp2p:connection-manager:latency-monitor:visibility-change-emitter')

interface VisibilityChangeEmitterEvents {
  'visibilityChange': CustomEvent<boolean>
}

type Hidden = 'hidden' | 'mozHidden' | 'msHidden' | 'webkitHidden'

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
export class VisibilityChangeEmitter extends EventEmitter<VisibilityChangeEmitterEvents> {
  private hidden: Hidden
  private visibilityChange: string

  constructor () {
    super()

    this.hidden = 'hidden'
    this.visibilityChange = 'visibilityChange'

    if (globalThis.document != null) {
      this._initializeVisibilityVarNames()
      this._addVisibilityChangeListener()
    }
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
    let hidden: Hidden = 'hidden'
    let visibilityChange = 'visibilitychange'

    if (typeof globalThis.document.hidden !== 'undefined') { // Opera 12.10 and Firefox 18 and later support
      hidden = 'hidden'
      visibilityChange = 'visibilitychange'
      // @ts-expect-error mozHidden is a non-standard field name
    } else if (typeof globalThis.document.mozHidden !== 'undefined') {
      hidden = 'mozHidden'
      visibilityChange = 'mozvisibilitychange'
      // @ts-expect-error msHidden is a non-standard field name
    } else if (typeof globalThis.document.msHidden !== 'undefined') {
      hidden = 'msHidden'
      visibilityChange = 'msvisibilitychange'
      // @ts-expect-error webkitHidden is a non-standard field name
    } else if (typeof globalThis.document.webkitHidden !== 'undefined') {
      hidden = 'webkitHidden'
      visibilityChange = 'webkitvisibilitychange'
    }

    this.hidden = hidden
    this.visibilityChange = visibilityChange
  }

  /**
   * Adds an event listener on the document that listens to changes in document.visibilityChange
   * (or whatever name by which the visibilityChange variable is known in the browser)
   *
   * @private
   */
  _addVisibilityChangeListener () {
    // @ts-expect-error cannot index document object with string key
    if (typeof globalThis.document.addEventListener === 'undefined' || typeof document[this.hidden] === 'undefined') {
      log('Checking page visibility requires a browser that supports the Page Visibility API.')
    } else {
      // Handle page visibility change
      globalThis.document.addEventListener(this.visibilityChange, this._handleVisibilityChange.bind(this), false)
    }
  }

  /**
   * The function returns ```true``` if the page is visible or ```false``` if the page is not visible and
   * ```undefined``` if the page visibility API is not supported by the browser.
   */
  isVisible () {
    // @ts-expect-error cannot index document object with string key
    if (this.hidden === undefined || document[this.hidden] === undefined) {
      return undefined
    }

    // @ts-expect-error cannot index document object with string key
    return document[this.hidden] == null
  }

  /**
   * The function that is called when document.visibilityChange has changed
   * It emits an event called visibilityChange and sends the value of document.hidden as a
   * parameter
   *
   * @private
   */
  _handleVisibilityChange () {
    // @ts-expect-error cannot index document object with string key
    const visible = globalThis.document[this.hidden] === false
    log(visible ? 'Page Visible' : 'Page Hidden')

    // Emit the event
    this.dispatchEvent(new CustomEvent<boolean>('visibilityChange', {
      detail: visible
    }))
  }
}
