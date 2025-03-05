import { http } from '@libp2p/protocol-http'
import { createLibp2p } from 'libp2p'
import { readRequestBody } from './request-reader.js'
import { NoteStore } from './store.js'
import { isNonEmptyString, handleAsyncEvent } from './utils.js'
import type { HttpRequest, HttpResponse, ErrorResponse } from './transport-types.js'
import type { Logger } from '@libp2p/interface'
import type { HttpServiceComponents } from '@libp2p/protocol-http'
import type { Libp2p } from 'libp2p'

const startTime = Date.now()

/**
 * Create an HTTP API server with a notes CRUD API
 */
export async function createApiServer (
  logger: Logger,
  options?: { protocols?: string[] }
): Promise<Libp2p> {
  const store = new NoteStore()

  // Cast to ensure type compatibility with HttpServiceComponents
  const node = await createLibp2p({
    services: {
      http: (http() as unknown as (components: HttpServiceComponents) => any)
    },
    addresses: {
      listen: options?.protocols ?? []
    }
  })

  const server = node.services.http.createServer()

  // Convert async handler to sync with error handling
  server.on('request', handleAsyncEvent(async (request: HttpRequest, response: HttpResponse) => {
    try {
      await handleRequest(node, store, request, response)
    } catch (error: unknown) {
      const errorResponse: ErrorResponse = {
        error: error instanceof Error && isNonEmptyString(error.message)
          ? error.message
          : 'Internal Server Error',
        code: 'INTERNAL_ERROR',
        statusCode: 500
      }
      response.writeHead(500, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify(errorResponse))
    }
  }, logger))

  return node
}

/**
 * Handle HTTP requests
 */
async function handleRequest (
  node: Libp2p,
  store: NoteStore,
  request: HttpRequest,
  response: HttpResponse
): Promise<void> {
  const { method, url } = request

  // GET /status - Node status
  if (method === 'GET' && url === '/status') {
    const status = {
      time: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
      connectedPeers: node.getConnections().length,
      protocolVersion: '1.0.0'
    }
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(status))
    return
  }

  // Notes CRUD endpoints
  if (typeof url === 'string' && url.startsWith('/notes')) {
    const parts = url.split('/')
    const id = parts[2] // /notes/:id

    // GET /notes - List all notes
    if (method === 'GET' && url === '/notes') {
      const notes = store.listNotes()
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify(notes))
      return
    }

    // GET /notes/:id - Get a single note
    if (method === 'GET' && isNonEmptyString(id)) {
      const note = store.getNote(id)
      if (note == null) {
        response.writeHead(404, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: 'Note not found', code: 'NOT_FOUND', statusCode: 404 }))
        return
      }
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify(note))
      return
    }

    // POST /notes - Create a new note
    if (method === 'POST' && url === '/notes') {
      const body = await readRequestBody(request)
      const input = JSON.parse(body)
      const note = store.createNote(input)
      response.writeHead(201, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify(note))
      return
    }

    // PUT /notes/:id - Update a note
    if (method === 'PUT' && isNonEmptyString(id)) {
      const body = await readRequestBody(request)
      const input = JSON.parse(body)
      const note = store.updateNote(id, input)
      if (note == null) {
        response.writeHead(404, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: 'Note not found', code: 'NOT_FOUND', statusCode: 404 }))
        return
      }
      response.writeHead(200, { 'Content-Type': 'application/json' })
      response.end(JSON.stringify(note))
      return
    }

    // DELETE /notes/:id - Delete a note
    if (method === 'DELETE' && isNonEmptyString(id)) {
      const success = store.deleteNote(id)
      if (!success) {
        response.writeHead(404, { 'Content-Type': 'application/json' })
        response.end(JSON.stringify({ error: 'Note not found', code: 'NOT_FOUND', statusCode: 404 }))
        return
      }
      response.writeHead(204)
      response.end()
      return
    }
  }

  // Not found for any other routes
  response.writeHead(404, { 'Content-Type': 'application/json' })
  response.end(JSON.stringify({ error: 'Not found', code: 'NOT_FOUND', statusCode: 404 }))
}
