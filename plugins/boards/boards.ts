/** The boards and their objects, and the operations the canvas runs. */
import { cleanContent, cleanTitle, clamp, type Asset, type Board, type BoardState, BoardError, type BoardObject, nextZ, objectsOf, type ObjectType } from './domain.ts'
import { seed } from './seed.ts'
import type { Store } from './store.ts'
export interface BoardsAdapters { readonly store: Store<BoardState>; readonly clock: () => Date; readonly newId: (kind: string) => string }
const DEFAULTS: Readonly<Record<ObjectType, { content: string; style: string; width: number; height: number }>> = {
  image: { content: 'New reference image', style: 'background:linear-gradient(135deg,#6f5b43,#c9b28f);color:#fff', width: 240, height: 170 },
  note: { content: 'A new direction note.', style: 'background:#f6efdd;color:#4f4737', width: 220, height: 130 },
  palette: { content: 'New palette', style: 'background:#f7f3e8;color:#4f4737', width: 220, height: 110 },
  text: { content: 'A statement.', style: 'background:#263f35;color:#f0ecdf', width: 220, height: 120 },
  link: { content: 'A reference link', style: 'background:#ffffff;color:#6a6353', width: 180, height: 80 },
}
export class Boards {
  private state: BoardState
  private readonly adapters: BoardsAdapters
  private constructor(state: BoardState, adapters: BoardsAdapters) { this.state = state; this.adapters = adapters }
  static async open(adapters: BoardsAdapters): Promise<Boards> { const saved = await adapters.store.load(); return new Boards(saved ?? seed(adapters.clock(), adapters.newId), adapters) }
  boards(): readonly Board[] { return this.state.boards }
  board(id: string): Board | undefined { return this.state.boards.find((board) => board.id === id) }
  objects(boardId: string): readonly BoardObject[] { return objectsOf(this.state, boardId) }
  object(id: string): BoardObject | undefined { return this.state.objects.find((object) => object.id === id) }
  assets(): readonly Asset[] { return this.state.assets }
  async add(boardId: string, type: ObjectType): Promise<BoardObject> {
    const board = this.board(boardId)
    if (board === undefined) throw new BoardError('not-found', 'That board no longer exists.')
    const defaults = DEFAULTS[type]
    const object: BoardObject = { id: this.adapters.newId('object'), boardId, type, x: 30 + (this.objects(boardId).length % 4) * 8, y: 30 + (this.objects(boardId).length % 3) * 8, width: defaults.width, height: defaults.height, zIndex: nextZ(this.state.objects), content: defaults.content, style: defaults.style, rotation: 0 }
    this.state.objects.push(object)
    await this.save()
    return object
  }
  async move(id: string, x: number, y: number): Promise<BoardObject> {
    const object = this.object(id)
    if (object === undefined) throw new BoardError('not-found', 'That object no longer exists.')
    if (!Number.isFinite(x) || !Number.isFinite(y)) throw new BoardError('invalid', 'A position needs two numbers.')
    const next = { ...object, x: clamp(x), y: clamp(y) }
    this.state.objects = this.state.objects.map((item) => (item.id === id ? next : item))
    await this.save()
    return next
  }
  async updateContent(id: string, content: string): Promise<BoardObject> {
    const object = this.object(id)
    if (object === undefined) throw new BoardError('not-found', 'That object no longer exists.')
    const next = { ...object, content: cleanContent(content) }
    this.state.objects = this.state.objects.map((item) => (item.id === id ? next : item))
    await this.save()
    return next
  }
  async remove(id: string): Promise<void> {
    if (this.object(id) === undefined) throw new BoardError('not-found', 'That object no longer exists.')
    this.state.objects = this.state.objects.filter((object) => object.id !== id)
    await this.save()
  }
  async rename(boardId: string, title: string): Promise<Board> {
    const board = this.board(boardId)
    if (board === undefined) throw new BoardError('not-found', 'That board no longer exists.')
    const next = { ...board, title: cleanTitle(title) }
    this.state.boards = this.state.boards.map((item) => (item.id === boardId ? next : item))
    await this.save()
    return next
  }
  private async save(): Promise<void> { this.state = { ...this.state, boards: [...this.state.boards], objects: [...this.state.objects], assets: [...this.state.assets] }; await this.adapters.store.save(this.state) }
}
