/**
 * HTTP content handling utilities
 */
import { HeaderUtils } from './header-utils.js'
import type { http } from '../http-proto-api.js'

export class ContentUtils {
  /**
   * Parse content type header into its components
   */
  static parseContentType (contentType?: string): {
    type: string
    subtype: string
    parameters: Record<string, string>
  } {
    if (contentType == null || contentType === '') {
      return {
        type: 'application',
        subtype: 'octet-stream',
        parameters: {}
      }
    }

    const [typeAndSubtype, ...params] = contentType.split(';').map(s => s.trim())
    const [type, subtype] = typeAndSubtype.toLowerCase().split('/')
    const parameters: Record<string, string> = {}

    for (const param of params) {
      const [key, value] = param.split('=').map(s => s.trim())
      if (key !== '' && value !== '') {
        parameters[key.toLowerCase()] = value.replace(/^"(.*)"$/, '$1')
      }
    }

    return {
      type: type !== '' ? type : 'application',
      subtype: subtype !== '' ? subtype : 'octet-stream',
      parameters
    }
  }

  /**
   * Get the character set from content type parameters
   */
  static getCharset (contentType?: string): string {
    const { parameters } = this.parseContentType(contentType)
    return parameters.charset?.toLowerCase() ?? 'utf-8'
  }

  /**
   * Check if the content type is JSON
   */
  static isJson (contentType?: string): boolean {
    const { type, subtype } = this.parseContentType(contentType)
    return (
      (type === 'application' &&
       (subtype === 'json' || subtype.endsWith('+json'))) ||
      (contentType != null && contentType !== '' && contentType.includes('json'))
    )
  }

  /**
   * Check if the content type is text-based
   */
  static isText (contentType?: string): boolean {
    const { type, subtype } = this.parseContentType(contentType)
    return (
      type === 'text' ||
      this.isJson(contentType) ||
      subtype === 'xml' ||
      subtype.endsWith('+xml') ||
      subtype === 'html' ||
      subtype === 'javascript'
    )
  }

  /**
   * Convert content to text based on content type
   */
  static contentToText (content: Uint8Array, contentType?: string): string {
    const charset = this.getCharset(contentType)
    const decoder = new TextDecoder(charset)
    return decoder.decode(content)
  }

  /**
   * Convert content to JSON based on content type
   */
  static contentToJson (content: Uint8Array, contentType?: string): any {
    const text = this.contentToText(content, contentType)
    return JSON.parse(text)
  }

  /**
   * Convert text to content with appropriate content type
   */
  static textToContent (text: string, charset = 'utf-8'): {
    content: Uint8Array
    contentType: string
  } {
    const encoder = new TextEncoder()
    return {
      content: encoder.encode(text),
      contentType: `text/plain;charset=${charset}`
    }
  }

  /**
   * Convert JSON to content with appropriate content type
   */
  static jsonToContent (value: any, charset = 'utf-8'): {
    content: Uint8Array
    contentType: string
  } {
    const text = JSON.stringify(value)
    const encoder = new TextEncoder()
    return {
      content: encoder.encode(text),
      contentType: `application/json;charset=${charset}`
    }
  }

  /**
   * Extract content from an HTTP message
   */
  static getMessageContent (message: http.HttpMessage): Uint8Array {
    return message.content
  }

  /**
   * Get content type from message headers
   */
  static getMessageContentType (message: http.HttpMessage): string | undefined {
    return HeaderUtils.getHeaderValue(message.headers, 'Content-Type')
  }

  /**
   * Convert message content to text, respecting content-type
   */
  static messageContentToText (message: http.HttpMessage): string {
    const contentType = this.getMessageContentType(message)
    return this.contentToText(message.content, contentType)
  }

  /**
   * Convert message content to JSON, respecting content-type
   */
  static messageContentToJson (message: http.HttpMessage): any {
    const contentType = this.getMessageContentType(message)
    return this.contentToJson(message.content, contentType)
  }
}
