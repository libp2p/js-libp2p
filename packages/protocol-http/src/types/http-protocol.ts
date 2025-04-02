/**
 * Core HTTP protocol types
 */

import type { http as httpType } from '../http-proto-api.js'
import type { HttpResponse } from '../interfaces/http-response-interface.js'

// Re-export the Protocol Buffer types
export { http } from '../protobuf/split/10-http-message.js'
export type { HttpResponse, httpType }
