import { http } from '@libp2p/protocol-http'
import { createLibp2p } from 'libp2p'
import type { Note, CreateNoteInput, UpdateNoteInput, NodeStatus } from './types.js'
import type { Libp2p } from 'libp2p'

export class NotesClient {
  private readonly node: Libp2p
  private readonly baseUrl: string

  constructor (node: Libp2p, peerId: string) {
    this.node = node
    this.baseUrl = `libp2p://${peerId}`
  }

  /**
   * Get node status
   */
  async getStatus (): Promise<NodeStatus> {
    const response = await this.node.services.http.fetch(`${this.baseUrl}/status`)
    return response.json()
  }

  /**
   * List all notes
   */
  async listNotes (): Promise<Note[]> {
    const response = await this.node.services.http.fetch(`${this.baseUrl}/notes`)
    return response.json()
  }

  /**
   * Get a note by ID
   */
  async getNote (id: string): Promise<Note> {
    const response = await this.node.services.http.fetch(`${this.baseUrl}/notes/${id}`)
    if (!response.ok) {
      throw new Error(`Failed to get note: ${response.status}`)
    }
    return response.json()
  }

  /**
   * Create a new note
   */
  async createNote (input: CreateNoteInput): Promise<Note> {
    const response = await this.node.services.http.fetch(`${this.baseUrl}/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    })
    if (!response.ok) {
      throw new Error(`Failed to create note: ${response.status}`)
    }
    return response.json()
  }

  /**
   * Update an existing note
   */
  async updateNote (id: string, input: UpdateNoteInput): Promise<Note> {
    const response = await this.node.services.http.fetch(`${this.baseUrl}/notes/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(input)
    })
    if (!response.ok) {
      throw new Error(`Failed to update note: ${response.status}`)
    }
    return response.json()
  }

  /**
   * Delete a note
   */
  async deleteNote (id: string): Promise<void> {
    const response = await this.node.services.http.fetch(`${this.baseUrl}/notes/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) {
      throw new Error(`Failed to delete note: ${response.status}`)
    }
  }
}

/**
 * Example usage of the notes client
 */
export async function exampleUsage (): Promise<void> {
  // Create libp2p nodes
  const server = await createLibp2p({
    services: {
      http: http()
    }
  })

  const client = await createLibp2p({
    services: {
      http: http()
    }
  })

  const notes = new NotesClient(client, server.peerId.toString())

  // Check server status
  const status = await notes.getStatus()
  console.log('Server status:', status)

  // Create a new note
  const newNote = await notes.createNote({
    title: 'Hello libp2p',
    content: 'This is a test note'
  })
  console.log('Created note:', newNote)

  // Update the note
  const updatedNote = await notes.updateNote(newNote.id, {
    content: 'Updated content'
  })
  console.log('Updated note:', updatedNote)

  // List all notes
  const allNotes = await notes.listNotes()
  console.log('All notes:', allNotes)

  // Delete the note
  await notes.deleteNote(newNote.id)
  console.log('Note deleted')
}
