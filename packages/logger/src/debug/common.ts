/**
 * This is the common logic for both the Node.js and web browser
 * implementations of `debug()`.
 */
import humanize from 'ms'

export default function setup (env: any): any {
  createDebug.debug = createDebug
  createDebug.default = createDebug
  createDebug.coerce = coerce
  createDebug.disable = disable
  createDebug.enable = enable
  createDebug.enabled = enabled
  createDebug.humanize = humanize
  createDebug.destroy = destroy

  Object.keys(env).forEach(key => {
    // @ts-expect-error cannot use string to index type
    createDebug[key] = env[key]
  })

  /**
   * The currently active debug mode names, and names to skip.
   */

  createDebug.names = [] as any[]
  createDebug.skips = [] as any[]

  /**
   * Map of special "%n" handling functions, for the debug "format" argument.
   *
   * Valid key names are a single, lower or upper-case letter, i.e. "n" and "N".
   */
  createDebug.formatters = {} as Record<string, any>

  /**
   * Selects a color for a debug namespace
   *
   * @param {string} namespace - The namespace string for the debug instance to be colored
   * @returns {number | string} An ANSI color code for the given namespace
   * @api private
   */
  function selectColor (namespace: string): number | string {
    let hash = 0

    for (let i = 0; i < namespace.length; i++) {
      hash = ((hash << 5) - hash) + namespace.charCodeAt(i)
      hash |= 0 // Convert to 32bit integer
    }

    // @ts-expect-error colors is not in the types
    return createDebug.colors[Math.abs(hash) % createDebug.colors.length]
  }
  createDebug.selectColor = selectColor

  /**
   * Create a debugger with the given `namespace`.
   *
   * @param {string} namespace
   * @returns {Function}
   */
  function createDebug (namespace: string): any {
    let prevTime: any
    let enableOverride: any = null
    let namespacesCache: any
    let enabledCache: any

    function debug (...args: any[]): void {
      // Disabled?
      // @ts-expect-error enabled is not in the types
      if (!debug.enabled) {
        return
      }

      const self: any = debug

      // Set `diff` timestamp
      const curr = Number(new Date())
      const ms = curr - (prevTime || curr)
      self.diff = ms
      self.prev = prevTime
      self.curr = curr
      prevTime = curr

      args[0] = createDebug.coerce(args[0])

      if (typeof args[0] !== 'string') {
        // Anything else let's inspect with %O
        args.unshift('%O')
      }

      // Apply any `formatters` transformations
      let index = 0
      args[0] = args[0].replace(/%([a-zA-Z%])/g, (match: any, format: any): any => {
        // If we encounter an escaped % then don't increase the array index
        if (match === '%%') {
          return '%'
        }
        index++
        const formatter = createDebug.formatters[format]
        if (typeof formatter === 'function') {
          const val = args[index]
          match = formatter.call(self, val)

          // Now we need to remove `args[index]` since it's inlined in the `format`
          args.splice(index, 1)
          index--
        }
        return match
      })

      // Apply env-specific formatting (colors, etc.)
      // @ts-expect-error formatArgs is not in the types
      createDebug.formatArgs.call(self, args)

      // @ts-expect-error log is not in the types
      const logFn = self.log || createDebug.log
      logFn.apply(self, args)
    }

    debug.namespace = namespace
    // @ts-expect-error useColors is not in the types
    debug.useColors = createDebug.useColors()
    debug.color = createDebug.selectColor(namespace)
    debug.extend = extend
    debug.destroy = createDebug.destroy // XXX Temporary. Will be removed in the next major release.

    Object.defineProperty(debug, 'enabled', {
      enumerable: true,
      configurable: false,
      get: () => {
        if (enableOverride !== null) {
          return enableOverride
        }
        // @ts-expect-error namespaces is not in the types
        if (namespacesCache !== createDebug.namespaces) {
          // @ts-expect-error namespaces is not in the types
          namespacesCache = createDebug.namespaces
          enabledCache = createDebug.enabled(namespace)
        }

        return enabledCache
      },
      set: v => {
        enableOverride = v
      }
    })

    // Env-specific initialization logic for debug instances
    // @ts-expect-error init is not in the types
    if (typeof createDebug.init === 'function') {
      // @ts-expect-error init is not in the types
      createDebug.init(debug)
    }

    return debug
  }

  function extend (this: any, namespace: string, delimiter: string): any {
    const newDebug = createDebug(this.namespace + (typeof delimiter === 'undefined' ? ':' : delimiter) + namespace)
    newDebug.log = this.log
    return newDebug
  }

  /**
   * Enables a debug mode by namespaces. This can include modes
   * separated by a colon and wildcards.
   *
   * @param {string} namespaces
   */
  function enable (namespaces: string): void {
    // @ts-expect-error save is not in the types
    createDebug.save(namespaces)
    // @ts-expect-error namespaces is not in the types
    createDebug.namespaces = namespaces

    createDebug.names = []
    createDebug.skips = []

    let i
    const split = (typeof namespaces === 'string' ? namespaces : '').split(/[\s,]+/)
    const len = split.length

    for (i = 0; i < len; i++) {
      if (!split[i]) {
        // ignore empty strings
        continue
      }

      namespaces = split[i].replace(/\*/g, '.*?')

      if (namespaces[0] === '-') {
        createDebug.skips.push(new RegExp('^' + namespaces.substr(1) + '$'))
      } else {
        createDebug.names.push(new RegExp('^' + namespaces + '$'))
      }
    }
  }

  /**
   * Disable debug output.
   *
   * @returns {string} namespaces
   * @api public
   */
  function disable () {
    const namespaces = [
      ...createDebug.names.map(toNamespace),
      ...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
    ].join(',')
    createDebug.enable('')
    return namespaces
  }

  /**
   * Returns true if the given mode name is enabled, false otherwise.
   *
   * @param {string} name
   * @returns {boolean}
   * @api public
   */
  function enabled (name: string): boolean {
    if (name[name.length - 1] === '*') {
      return true
    }

    let i
    let len

    for (i = 0, len = createDebug.skips.length; i < len; i++) {
      if (createDebug.skips[i].test(name)) {
        return false
      }
    }

    for (i = 0, len = createDebug.names.length; i < len; i++) {
      if (createDebug.names[i].test(name)) {
        return true
      }
    }

    return false
  }

  /**
   * Convert regexp to namespace
   *
   * @param {RegExp} regxep
   * @returns {string} namespace
   */
  function toNamespace (regexp: RegExp): string {
    return regexp.toString()
      .substring(2, regexp.toString().length - 2)
      .replace(/\.\*\?$/, '*')
  }

  /**
   * Coerce `val`.
   *
   * @param {Mixed} val
   * @returns {Mixed}
   * @api private
   */
  function coerce (val: any): any {
    if (val instanceof Error) {
      return val.stack || val.message
    }
    return val
  }

  /**
   * XXX DO NOT USE. This is a temporary stub function.
   * XXX It WILL be removed in the next major release.
   */
  function destroy () {
    console.warn('Instance method `debug.destroy()` is deprecated and no longer does anything. It will be removed in the next major version of `debug`.')
  }

  // @ts-expect-error setupFormatters is not in the types
  createDebug.setupFormatters(createDebug.formatters)

  // @ts-expect-error load is not in the types
  createDebug.enable(createDebug.load())

  return createDebug
}
