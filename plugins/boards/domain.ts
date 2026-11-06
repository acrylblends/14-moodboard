/** Moodboard's types and pure rules: boards, free-positioned objects, reference assets and the layer order. */
export type ObjectType = 'image' | 'note' | 'palette' | 'text' | 'link'
export const OBJECT_TYPES: readonly ObjectType[] = ['image', 'note', 'palette', 'text', 'link']
export interface Board { readonly id: string; readonly title: string; readonly project: string; readonly width: number; readonly height: number; readonly background: string }
export interface BoardObject { readonly id: string; readonly boardId: string; readonly type: ObjectType; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly zIndex: number; readonly content: string; readonly style: string; readonly rotation: number }
export interface Asset { readonly id: string; readonly kind: 'image' | 'color'; readonly url: string; readonly filename: string; readonly colorValue: string; readonly tags: readonly string[] }
export interface BoardState { readonly version: 1; boards: Board[]; objects: BoardObject[]; assets: Asset[] }
export type BoardErrorCode = 'invalid' | 'not-found'
export class BoardError extends Error { readonly code: BoardErrorCode; constructor(code: BoardErrorCode, message: string) { super(message); this.code = code; this.name = 'BoardError' } }
export const clamp = (value: number, min = 0, max = 100): number => Math.min(max, Math.max(min, value))
export function nextZ(objects: readonly BoardObject[]): number {
  return objects.reduce((max, object) => Math.max(max, object.zIndex), 0) + 1
}
export function objectsOf(state: BoardState, boardId: string): BoardObject[] {
  return state.objects.filter((object) => object.boardId === boardId).sort((a, b) => a.zIndex - b.zIndex)
}
export function colorsOf(assets: readonly Asset[]): Asset[] {
  return assets.filter((asset) => asset.kind === 'color')
}
export function cleanContent(value: unknown, max = 500): string {
  if (typeof value !== 'string' || value.trim() === '') throw new BoardError('invalid', 'The object text is required.')
  return value.trim().slice(0, max)
}
export function cleanTitle(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') throw new BoardError('invalid', 'The board title is required.')
  return value.trim().slice(0, 120)
}
