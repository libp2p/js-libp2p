/**
 * Common HTTP header manipulation utilities
 */

import type { http } from '../http-proto-api.js'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class HeaderUtils {
  /**
   * Find a header with the specified name (case-insensitive) in the list of headers
   */
  static findHeader (headers: http.Field[], name: string): http.Field | undefined {
    const lowerName = name.toLowerCase()
    return headers.find(h => h.name.toLowerCase() === lowerName)
  }

  /**
   * Get the value of a header with the specified name (case-insensitive)
   */
  static getHeaderValue (headers: http.Field[], name: string): string | undefined {
    const header = this.findHeader(headers, name)
    return header?.value
  }

  /**
   * Set a header in the list of headers. If a header with the same name already exists,
   * it will be replaced.
   */
  static setHeader (headers: http.Field[], name: string, value: string): http.Field[] {
    const lowerName = name.toLowerCase()
    const index = headers.findIndex(h => h.name.toLowerCase() === lowerName)

    if (index !== -1) {
      headers[index] = { name, value }
      return headers
    }

    headers.push({ name, value })
    return headers
  }

  /**
   * Add a header to the list of headers. If a header with the same name already exists,
   * another header with the same name will be added (allows for multiple headers with same name).
   */
  static addHeader (headers: http.Field[], name: string, value: string): http.Field[] {
    headers.push({ name, value })
    return headers
  }

  /**
   * Parse a comma-separated header value into an array of values
   */
  static parseCommaSeparatedHeader (headerValue: string): string[] {
    if (headerValue === '') return []

    return headerValue.split(',')
      .map(value => value.trim())
      .filter(Boolean)
  }

  /**
   * Combine all headers with the same name by joining their values with commas
   */
  static combineHeaders (headers: http.Field[]): http.Field[] {
    const headerMap = new Map<string, string[]>()

    // Group values by lowercase field name
    for (const header of headers) {
      const lowerName = header.name.toLowerCase()
      if (!headerMap.has(lowerName)) {
        headerMap.set(lowerName, [])
      }
      const values = headerMap.get(lowerName)
      if (values != null) {
        values.push(header.value)
      }
    }

    // Combine values with commas
    return Array.from(headerMap.entries()).map(([name, values]) => ({
      name,
      value: values.join(', ')
    }))
  }

  /**
   * Remove all headers with the specified name (case-insensitive)
   */
  static removeHeader (headers: http.Field[], name: string): http.Field[] {
    const lowerName = name.toLowerCase()
    return headers.filter(h => h.name.toLowerCase() !== lowerName)
  }

  /**
   * Check if the specified header exists in the list of headers
   */
  static hasHeader (headers: http.Field[], name: string): boolean {
    return this.findHeader(headers, name) !== undefined
  }

  /**
   * Parse a header with the format "token=value" or "token"
   * Returns a map of token to value, with value being true for tokens without a value
   */
  static parseTokenHeader (headerValue: string): Map<string, string | boolean> {
    const result = new Map<string, string | boolean>()

    if (headerValue === '') return result

    const parts = headerValue.split(',')

    for (const part of parts) {
      const trimmedPart = part.trim()
      const [token, value] = trimmedPart.split('=', 2).map(s => s.trim())

      if (token !== '') {
        if (value !== undefined) {
          // Remove quotes if present
          const unquotedValue = value.replace(/^"(.*)"$/, '$1')
          result.set(token.toLowerCase(), unquotedValue)
        } else {
          result.set(token.toLowerCase(), true)
        }
      }
    }

    return result
  }

  /**
   * Convert a Headers-like object to Field[] format
   */
  static headersToFields (headers: Record<string, string> | Map<string, string>): http.Field[] {
    const fields: http.Field[] = []

    if (headers instanceof Map) {
      for (const [name, value] of headers.entries()) {
        fields.push({ name, value })
      }
    } else {
      for (const [name, value] of Object.entries(headers)) {
        fields.push({ name, value })
      }
    }

    return fields
  }

  /**
   * Convert Field[] format to a Headers-like object
   */
  static fieldsToHeaders (fields: http.Field[]): Record<string, string> {
    const headers: Record<string, string> = {}

    for (const field of fields) {
      const headerName = field.name.toLowerCase()

      // If the header exists, combine with comma as per HTTP spec
      if (headers[headerName] !== undefined) {
        headers[headerName] += `, ${field.value}`
      } else {
        headers[headerName] = field.value
      }
    }

    return headers
  }
}
