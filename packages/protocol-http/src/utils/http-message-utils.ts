import { http } from '../http-proto-api.js'

/* eslint-disable @typescript-eslint/no-extraneous-class */
export class HttpMessageUtils {
  /**
   * Convert a numeric status code to the corresponding enum value
   */
  static numberToStatusCode (code: number): http.StatusCode {
    const codeMap: Record<number, http.StatusCode> = {
      0: http.StatusCode.STATUS_UNKNOWN,
      100: http.StatusCode.STATUS_CONTINUE,
      101: http.StatusCode.STATUS_SWITCHING_PROTOCOLS,
      200: http.StatusCode.STATUS_OK,
      201: http.StatusCode.STATUS_CREATED,
      202: http.StatusCode.STATUS_ACCEPTED,
      203: http.StatusCode.STATUS_NON_AUTHORITATIVE_INFORMATION,
      204: http.StatusCode.STATUS_NO_CONTENT,
      205: http.StatusCode.STATUS_RESET_CONTENT,
      206: http.StatusCode.STATUS_PARTIAL_CONTENT,
      300: http.StatusCode.STATUS_MULTIPLE_CHOICES,
      301: http.StatusCode.STATUS_MOVED_PERMANENTLY,
      302: http.StatusCode.STATUS_FOUND,
      303: http.StatusCode.STATUS_SEE_OTHER,
      304: http.StatusCode.STATUS_NOT_MODIFIED,
      305: http.StatusCode.STATUS_USE_PROXY,
      307: http.StatusCode.STATUS_TEMPORARY_REDIRECT,
      308: http.StatusCode.STATUS_PERMANENT_REDIRECT,
      400: http.StatusCode.STATUS_BAD_REQUEST,
      401: http.StatusCode.STATUS_UNAUTHORIZED,
      402: http.StatusCode.STATUS_PAYMENT_REQUIRED,
      403: http.StatusCode.STATUS_FORBIDDEN,
      404: http.StatusCode.STATUS_NOT_FOUND,
      405: http.StatusCode.STATUS_METHOD_NOT_ALLOWED,
      406: http.StatusCode.STATUS_NOT_ACCEPTABLE,
      407: http.StatusCode.STATUS_PROXY_AUTHENTICATION_REQUIRED,
      408: http.StatusCode.STATUS_REQUEST_TIMEOUT,
      409: http.StatusCode.STATUS_CONFLICT,
      410: http.StatusCode.STATUS_GONE,
      411: http.StatusCode.STATUS_LENGTH_REQUIRED,
      412: http.StatusCode.STATUS_PRECONDITION_FAILED,
      413: http.StatusCode.STATUS_CONTENT_TOO_LARGE,
      414: http.StatusCode.STATUS_URI_TOO_LONG,
      415: http.StatusCode.STATUS_UNSUPPORTED_MEDIA_TYPE,
      416: http.StatusCode.STATUS_RANGE_NOT_SATISFIABLE,
      417: http.StatusCode.STATUS_EXPECTATION_FAILED,
      421: http.StatusCode.STATUS_MISDIRECTED_REQUEST,
      422: http.StatusCode.STATUS_UNPROCESSABLE_CONTENT,
      426: http.StatusCode.STATUS_UPGRADE_REQUIRED,
      500: http.StatusCode.STATUS_INTERNAL_SERVER_ERROR,
      501: http.StatusCode.STATUS_NOT_IMPLEMENTED,
      502: http.StatusCode.STATUS_BAD_GATEWAY,
      503: http.StatusCode.STATUS_SERVICE_UNAVAILABLE,
      504: http.StatusCode.STATUS_GATEWAY_TIMEOUT,
      505: http.StatusCode.STATUS_HTTP_VERSION_NOT_SUPPORTED
    }
    return codeMap[code] ?? http.StatusCode.STATUS_UNKNOWN
  }

  /**
   * Convert a status code enum value to its numeric value
   */
  static statusCodeToNumber (code: http.StatusCode): number {
    // Known mappings between enum values and numbers
    const statusMap: Record<http.StatusCode, number> = {
      [http.StatusCode.STATUS_UNKNOWN]: 0,
      [http.StatusCode.STATUS_CONTINUE]: 100,
      [http.StatusCode.STATUS_SWITCHING_PROTOCOLS]: 101,
      [http.StatusCode.STATUS_OK]: 200,
      [http.StatusCode.STATUS_CREATED]: 201,
      [http.StatusCode.STATUS_ACCEPTED]: 202,
      [http.StatusCode.STATUS_NON_AUTHORITATIVE_INFORMATION]: 203,
      [http.StatusCode.STATUS_NO_CONTENT]: 204,
      [http.StatusCode.STATUS_RESET_CONTENT]: 205,
      [http.StatusCode.STATUS_PARTIAL_CONTENT]: 206,
      [http.StatusCode.STATUS_MULTIPLE_CHOICES]: 300,
      [http.StatusCode.STATUS_MOVED_PERMANENTLY]: 301,
      [http.StatusCode.STATUS_FOUND]: 302,
      [http.StatusCode.STATUS_SEE_OTHER]: 303,
      [http.StatusCode.STATUS_NOT_MODIFIED]: 304,
      [http.StatusCode.STATUS_USE_PROXY]: 305,
      [http.StatusCode.STATUS_TEMPORARY_REDIRECT]: 307,
      [http.StatusCode.STATUS_PERMANENT_REDIRECT]: 308,
      [http.StatusCode.STATUS_BAD_REQUEST]: 400,
      [http.StatusCode.STATUS_UNAUTHORIZED]: 401,
      [http.StatusCode.STATUS_PAYMENT_REQUIRED]: 402,
      [http.StatusCode.STATUS_FORBIDDEN]: 403,
      [http.StatusCode.STATUS_NOT_FOUND]: 404,
      [http.StatusCode.STATUS_METHOD_NOT_ALLOWED]: 405,
      [http.StatusCode.STATUS_NOT_ACCEPTABLE]: 406,
      [http.StatusCode.STATUS_PROXY_AUTHENTICATION_REQUIRED]: 407,
      [http.StatusCode.STATUS_REQUEST_TIMEOUT]: 408,
      [http.StatusCode.STATUS_CONFLICT]: 409,
      [http.StatusCode.STATUS_GONE]: 410,
      [http.StatusCode.STATUS_LENGTH_REQUIRED]: 411,
      [http.StatusCode.STATUS_PRECONDITION_FAILED]: 412,
      [http.StatusCode.STATUS_CONTENT_TOO_LARGE]: 413,
      [http.StatusCode.STATUS_URI_TOO_LONG]: 414,
      [http.StatusCode.STATUS_UNSUPPORTED_MEDIA_TYPE]: 415,
      [http.StatusCode.STATUS_RANGE_NOT_SATISFIABLE]: 416,
      [http.StatusCode.STATUS_EXPECTATION_FAILED]: 417,
      [http.StatusCode.STATUS_MISDIRECTED_REQUEST]: 421,
      [http.StatusCode.STATUS_UNPROCESSABLE_CONTENT]: 422,
      [http.StatusCode.STATUS_UPGRADE_REQUIRED]: 426,
      [http.StatusCode.STATUS_INTERNAL_SERVER_ERROR]: 500,
      [http.StatusCode.STATUS_NOT_IMPLEMENTED]: 501,
      [http.StatusCode.STATUS_BAD_GATEWAY]: 502,
      [http.StatusCode.STATUS_SERVICE_UNAVAILABLE]: 503,
      [http.StatusCode.STATUS_GATEWAY_TIMEOUT]: 504,
      [http.StatusCode.STATUS_HTTP_VERSION_NOT_SUPPORTED]: 505
    }
    return statusMap[code] ?? 0
  }

  /**
   * Create an HTTP request message
   */
  static createRequest (method: string, requestTarget: string, options: Partial<http.HttpRequest> = {}): http.HttpRequest {
    const baseMessage: http.HttpMessage = {
      headers: options.baseMessage?.headers ?? [],
      content: options.baseMessage?.content ?? new Uint8Array(0),
      trailers: options.baseMessage?.trailers ?? []
    }
    return {
      baseMessage,
      method,
      targetUri: requestTarget,
      protocolVersion: options.protocolVersion ?? 'HTTP/1.1'
    }
  }

  /**
   * Create an HTTP response message
   */
  static createResponse (status: http.StatusCode | number, options: Partial<http.HttpResponse> = {}): http.HttpResponse {
    const statusCode = typeof status === 'number' ? HttpMessageUtils.numberToStatusCode(status) : status
    const numericStatus = HttpMessageUtils.statusCodeToNumber(statusCode)
    const reasonPhrase = HttpMessageUtils.getStatusText(numericStatus)
    const headers = options.headers ?? []
    const content = options.content instanceof Uint8Array ? options.content : new Uint8Array(0)
    const baseMessage: http.HttpMessage = {
      headers,
      content,
      trailers: []
    }
    return {
      baseMessage,
      headers,
      content,
      status: numericStatus,
      statusCode: numericStatus,
      reasonPhrase,
      protocolVersion: options.protocolVersion ?? 'HTTP/1.1'
    }
  }

  /**
   * Create a base HTTP message (either request or response)
   */
  static create (options: Partial<http.HttpMessage> = {}): http.HttpMessage {
    return {
      headers: options.headers ?? [],
      content: options.content ?? new Uint8Array(0),
      trailers: options.trailers ?? []
    }
  }

  /**
   * Get the standard reason phrase for a status code
   */
  static getStatusText (status: number): string {
    // First try to get the status from the enum
    const statusCode = HttpMessageUtils.numberToStatusCode(status)
    if (statusCode !== http.StatusCode.STATUS_UNKNOWN) {
      // Convert the enum value like 'STATUS_OK' to 'OK'
      const statusText = statusCode.replace('STATUS_', '')

      // Handle special cases for proper capitalization
      if (statusText === 'OK') {
        return 'OK'
      }

      // For other cases, capitalize each word properly
      return statusText.split('_').map(
        word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
      ).join(' ')
    }
    // For unknown status codes, use the class (first digit) to determine the general category
    if (status >= 100 && status < 200) return 'Informational'
    if (status >= 200 && status < 300) return 'Success'
    if (status >= 300 && status < 400) return 'Redirection'
    if (status >= 400 && status < 500) return 'Client Error'
    if (status >= 500 && status < 600) return 'Server Error'
    return 'Unknown'
  }

  /**
   * Determine the class of a status code (informational, successful, etc.)
   */
  static getStatusClass (status: number): 1 | 2 | 3 | 4 | 5 {
    const firstDigit = Math.floor(status / 100)
    return (firstDigit >= 1 && firstDigit <= 5) ? firstDigit as 1 | 2 | 3 | 4 | 5 : 5
  }

  /**
   * Check if a status code represents an error
   */
  static isErrorStatus (status: number): boolean {
    const statusClass = HttpMessageUtils.getStatusClass(status)
    return statusClass === 4 || statusClass === 5
  }

  /**
   * Get a specific header value from an array of headers
   */
  static getHeaderValue (headers: http.Field[], name: string): string | undefined {
    const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase())
    return header?.value
  }

  /**
   * Extract content type from headers
   */
  static getContentType (headers: http.Field[]): string | undefined {
    return HttpMessageUtils.getHeaderValue(headers, 'Content-Type')
  }

  /**
   * Extract content length from headers
   */
  static getContentLength (headers: http.Field[]): number | undefined {
    const value = HttpMessageUtils.getHeaderValue(headers, 'Content-Length')
    if (value === undefined) return undefined
    const length = parseInt(value, 10)
    return isNaN(length) ? undefined : length
  }

  /**
   * Determine if the response allows for a body
   */
  static responseAllowsBody (statusCode: number): boolean {
    // 1xx, 204, and 304 responses must not include a body
    return !(
      (statusCode >= 100 && statusCode < 200) ||
      statusCode === 204 ||
      statusCode === 304
    )
  }

  /**
   * Get transfer encodings from headers
   */
  static getTransferEncodings (headers: http.Field[]): string[] {
    const encoding = HttpMessageUtils.getHeaderValue(headers, 'Transfer-Encoding')
    if (encoding === undefined) return []
    return encoding.split(',').map(e => e.trim().toLowerCase())
  }

  /**
   * Check if chunked encoding is being used
   */
  static isChunkedEncoding (headers: http.Field[]): boolean {
    const encodings = HttpMessageUtils.getTransferEncodings(headers)
    return encodings.includes('chunked')
  }

  /**
   * Determine message framing method (content-length, chunked, or connection close)
   */
  static determineMessageFraming (headers: http.Field[]): {
    method: 'content-length' | 'chunked' | 'connection-close'
    length?: number
  } {
    if (HttpMessageUtils.isChunkedEncoding(headers)) {
      return { method: 'chunked' }
    }
    const contentLength = HttpMessageUtils.getContentLength(headers)
    if (contentLength !== undefined) {
      return { method: 'content-length', length: contentLength }
    }
    return { method: 'connection-close' }
  }
}
