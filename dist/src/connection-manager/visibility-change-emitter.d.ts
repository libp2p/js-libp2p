export = VisibilityChangeEmitter;
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
declare class VisibilityChangeEmitter extends EventEmitter {
    /**
     * Creates a VisibilityChangeEmitter
     *
     * @class
     */
    constructor();
    /**
     * document.hidden and document.visibilityChange are the two variables we need to check for;
     * Since these variables are named differently in different browsers, this function sets
     * the appropriate name based on the browser being used. Once executed, tha actual names of
     * document.hidden and document.visibilityChange are found in this._hidden and this._visibilityChange
     * respectively
     *
     * @private
     */
    private _initializeVisibilityVarNames;
    _hidden: string | undefined;
    _visibilityChange: string | undefined;
    /**
     * Adds an event listener on the document that listens to changes in document.visibilityChange
     * (or whatever name by which the visibilityChange variable is known in the browser)
     *
     * @private
     */
    private _addVisibilityChangeListener;
    /**
     * The function returns ```true``` if the page is visible or ```false``` if the page is not visible and
     * ```undefined``` if the page visibility API is not supported by the browser.
     *
     * @returns {boolean | void} whether the page is now visible or not (undefined is unknown)
     */
    isVisible(): boolean | void;
    /**
     * The function that is called when document.visibilityChange has changed
     * It emits an event called visibilityChange and sends the value of document.hidden as a
     * parameter
     *
     * @private
     */
    private _handleVisibilityChange;
}
import { EventEmitter } from "events";
//# sourceMappingURL=visibility-change-emitter.d.ts.map