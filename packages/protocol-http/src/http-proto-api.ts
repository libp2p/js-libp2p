/* eslint-disable @typescript-eslint/no-namespace */
/* eslint-disable @typescript-eslint/no-empty-interface */

// Import all the generated TypeScript files from the split directory
import * as BasicTypes from './protobuf/split/01-basic-types.js'
import * as MethodsStatus from './protobuf/split/02-methods-status.js'
import * as TransferCodingModule from './protobuf/split/03-transfer-coding.js'
import * as Authentication from './protobuf/split/04-authentication.js'
import * as RangeModule from './protobuf/split/05-range.js'
import * as Conditional from './protobuf/split/06-conditional.js'
import * as ContentNegotiationModule from './protobuf/split/07-content-negotiation.js'
import * as UriModule from './protobuf/split/08-uri.js'
import * as ContentModule from './protobuf/split/09-content.js'
import * as HttpMessageModule from './protobuf/split/10-http-message.js'
import * as ProtocolUpgradeModule from './protobuf/split/11-protocol-upgrade.js'
import * as Cookies from './protobuf/split/12-cookies.js'
import * as Cache from './protobuf/split/13-cache.js'
import * as ExtendedContentModule from './protobuf/split/14-extended-content.js'
import * as Configuration from './protobuf/split/15-configuration.js'

/**
 * HTTP Protocol API definitions
 */

/**
 * HTTP initialization options
 */
export interface HttpInit {
  /**
   * Maximum number of inbound streams to allow
   */
  maxInboundStreams?: number

  /**
   * Maximum number of outbound streams to allow
   */
  maxOutboundStreams?: number

  /**
   * Default timeout for HTTP operations (in milliseconds)
   */
  timeout?: number
}

// Create a unified http namespace that re-exports all the types from the separate files
export namespace http {
  // Types from 10-http-message.ts
  // export import HttpRequest = HttpMessageModule.http.HttpRequest
  // export import HttpResponse = HttpMessageModule.http.HttpResponse
  // Common types that appear in multiple files (using the first occurrence)
  export import Field = BasicTypes.http.Field
  export import NameValuePair = BasicTypes.http.NameValuePair

  // Types from 01-basic-types.ts
  // (Field and NameValuePair already imported)

  // Types from 02-methods-status.ts
  export import Method = MethodsStatus.http.Method
  export import StatusCode = MethodsStatus.http.StatusCode
  export import MethodProperties = MethodsStatus.http.MethodProperties
  export import IntermediaryType = MethodsStatus.http.IntermediaryType

  // Types from 03-transfer-coding.ts
  export import TransferCoding = TransferCodingModule.http.TransferCoding
  export import TransferCodingParameter = TransferCodingModule.http.TransferCodingParameter
  export import TransferEncodings = TransferCodingModule.http.TransferEncodings
  export import Chunk = TransferCodingModule.http.Chunk
  export import ChunkedData = TransferCodingModule.http.ChunkedData

  // Types from 04-authentication.ts
  export import Challenge = Authentication.http.Challenge
  export import Credentials = Authentication.http.Credentials
  export import AuthParams = Authentication.http.AuthParams
  export import AuthParamValue = Authentication.http.AuthParamValue
  export import AuthenticationInfo = Authentication.http.AuthenticationInfo
  export import AuthInfoParams = Authentication.http.AuthInfoParams
  export import CredentialParams = Authentication.http.CredentialParams
  export import ProxyAuthInfoParams = Authentication.http.ProxyAuthInfoParams

  // Types from 05-range.ts
  export import ByteRangeSpec = RangeModule.http.ByteRangeSpec
  export import SuffixRangeSpec = RangeModule.http.SuffixRangeSpec
  export import RangeSpec = RangeModule.http.RangeSpec
  export import ContentRange = RangeModule.http.ContentRange
  export import AcceptRanges = RangeModule.http.AcceptRanges
  export import RangeRequest = RangeModule.http.RangeRequest

  // Types from 06-conditional.ts
  export import ConditionalRequest = Conditional.http.ConditionalRequest
  export import EntityValidator = Conditional.http.EntityValidator
  export import ETagList = Conditional.http.ETagList

  // Types from 07-content-negotiation.ts
  export import ContentNegotiation = ContentNegotiationModule.http.ContentNegotiation
  export import MediaTypeParameter = ContentNegotiationModule.http.MediaTypeParameter
  export import MediaRangeWithQValue = ContentNegotiationModule.http.MediaRangeWithQValue
  export import CharsetWithQValue = ContentNegotiationModule.http.CharsetWithQValue
  export import CodingWithQValue = ContentNegotiationModule.http.CodingWithQValue
  export import LanguageRangeWithQValue = ContentNegotiationModule.http.LanguageRangeWithQValue

  // Types from 08-uri.ts
  export import Uri = UriModule.http.Uri
  export import Origin = UriModule.http.Origin

  // Types from 09-content.ts
  export import ContentType = ContentModule.http.Content
  export import BinaryContent = ContentModule.http.BinaryContent
  export import MessageFraming = ContentModule.http.MessageFraming
  export import RepresentationMetadata = ContentModule.http.RepresentationMetadata
  export import ContentTransferCoding = ContentModule.http.TransferCoding
  export import ContentTransferEncodings = ContentModule.http.TransferEncodings
  export import ContentTransferCodingParameter = ContentModule.http.TransferCodingParameter

  // Types from 10-http-message.ts
  export import HttpMessage = HttpMessageModule.http.HttpMessage
  export import HttpRequest = HttpMessageModule.http.HttpRequest
  export import HttpResponse = HttpMessageModule.http.HttpResponse
  export import ControlData = HttpMessageModule.http.ControlData

  // Types from 11-protocol-upgrade.ts
  export import ProtocolUpgrade = ProtocolUpgradeModule.http.ProtocolUpgrade
  export import ProtocolParameter = ProtocolUpgradeModule.http.ProtocolParameter
  export import OtherProtocolParameters = ProtocolUpgradeModule.http.OtherProtocolParameters
  export import WebSocketUpgrade = ProtocolUpgradeModule.http.WebSocketUpgrade
  export import WebTransportUpgrade = ProtocolUpgradeModule.http.WebTransportUpgrade
  export import WebSocketResponse = ProtocolUpgradeModule.http.WebSocketResponse
  export import WebSocketMessage = ProtocolUpgradeModule.http.WebSocketMessage
  export import WebTransportSession = ProtocolUpgradeModule.http.WebTransportSession
  export import UpgradeResponse = ProtocolUpgradeModule.http.UpgradeResponse

  // Types from 12-cookies.ts
  export import Cookie = Cookies.http.Cookie
  export import SetCookie = Cookies.http.SetCookie
  export import CookieHeader = Cookies.http.CookieHeader
  export import CookieJar = Cookies.http.CookieJar

  // Re-export codec functionality
  export const codec = BasicTypes.http.codec
  export const encode = BasicTypes.http.encode
  export const decode = BasicTypes.http.decode
}
export import HttpRequest = HttpMessageModule.http.HttpRequest
export import HttpResponse = HttpMessageModule.http.HttpResponse
// Export individual Protocol Buffer modules for direct access
export {
  Cache,
  ExtendedContentModule as ExtendedContent,
  Configuration,
  Authentication
}
