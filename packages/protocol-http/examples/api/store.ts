import type { Note, CreateNoteInput, UpdateNoteInput } from './types.js'
import { isPresent } from './utils.js'

/**
 * In-memory storage for notes that works in both Node.js and browser environments
 */
export class NoteStore {
  private notes: Map<string, Note>
  private nextId: number

  constructor () {
    this.notes = new Map()
    this.nextId = 1
  }

  /**
   * List all notes
   */
  listNotes (): Note[] {
    return Array.from(this.notes.values())
  }

  /**
   * Get a note by ID
   */
  getNote (id: string): Note | undefined {
    return this.notes.get(id)
  }

  /**
   * Create a new note
   */
  createNote (input: CreateNoteInput): Note {
    const id = this.nextId.toString()
    this.nextId++

    const now = new Date().toISOString()
    const note: Note = {
      id,
      title: input.title,
      content: input.content,
      createdAt: now,
      updatedAt: now
    }

    this.notes.set(id, note)
    return note
  }

  /**
   * Update an existing note
   */
  updateNote (id: string, input: UpdateNoteInput): Note | undefined {
    const existing = this.notes.get(id)
    if (!isPresent(existing)) {
      return undefined
    }

    const updated: Note = {
      ...existing,
      title: input.title ?? existing.title,
      content: input.content ?? existing.content,
      updatedAt: new Date().toISOString()
    }

    this.notes.set(id, updated)
    return updated
  }

  /**
   * Delete a note by ID
   */
  deleteNote (id: string): boolean {
    return this.notes.delete(id)
  }
}
