/** The board a new install starts with: Quiet Modern, six objects and a small reference library. */
import type { Asset, Board, BoardObject, BoardState } from './domain.ts'
export function seed(now: Date, newId: (kind: string) => string): BoardState {
  const board: Board = { id: newId('board'), title: 'Quiet Modern', project: 'Brand refresh', width: 1600, height: 900, background: '#efe9dc' }
  const objects: BoardObject[] = [
    { id: newId('object'), boardId: board.id, type: 'image', x: 7, y: 13, width: 300, height: 220, zIndex: 1, content: 'Natural materials / tactile detail', style: 'background:linear-gradient(135deg,#6f5b43,#c9b28f);color:#fff', rotation: 0 },
    { id: newId('object'), boardId: board.id, type: 'note', x: 38, y: 11, width: 235, height: 150, zIndex: 2, content: 'Warmth without noise. Materials should feel honest, quiet and lived-in.', style: 'background:#f6efdd;color:#4f4737', rotation: -1 },
    { id: newId('object'), boardId: board.id, type: 'palette', x: 69, y: 15, width: 235, height: 120, zIndex: 3, content: 'Earth / muted palette', style: 'background:#f7f3e8;color:#4f4737', rotation: 0 },
    { id: newId('object'), boardId: board.id, type: 'image', x: 15, y: 52, width: 238, height: 180, zIndex: 4, content: 'Architecture / calm geometry', style: 'background:linear-gradient(135deg,#6d6f6a,#c9c8bf);color:#fff', rotation: 0 },
    { id: newId('object'), boardId: board.id, type: 'text', x: 49, y: 49, width: 240, height: 130, zIndex: 5, content: 'Less decoration. More intention.', style: 'background:#263f35;color:#f0ecdf', rotation: 1 },
    { id: newId('object'), boardId: board.id, type: 'link', x: 77, y: 63, width: 180, height: 90, zIndex: 6, content: 'Soft contrast\nNatural light\nOpen space', style: 'background:#ffffff;color:#6a6353', rotation: 0 },
  ]
  const assets: Asset[] = [
    { id: newId('asset'), kind: 'color', url: '', filename: 'Forest', colorValue: '#263f35', tags: ['earth'] },
    { id: newId('asset'), kind: 'color', url: '', filename: 'Sand', colorValue: '#b9aa8b', tags: ['earth'] },
    { id: newId('asset'), kind: 'color', url: '', filename: 'Chalk', colorValue: '#d5d5c8', tags: ['neutral'] },
    { id: newId('asset'), kind: 'color', url: '', filename: 'Clay', colorValue: '#b96e4c', tags: ['warm'] },
    { id: newId('asset'), kind: 'color', url: '', filename: 'Moss', colorValue: '#e7edcd', tags: ['light'] },
    { id: newId('asset'), kind: 'image', url: 'linear-gradient(135deg,#6f5b43,#c9b28f)', filename: 'materials.jpg', colorValue: '', tags: ['reference'] },
    { id: newId('asset'), kind: 'image', url: 'linear-gradient(135deg,#6d6f6a,#c9c8bf)', filename: 'geometry.jpg', colorValue: '', tags: ['reference'] },
  ]
  return { version: 1, boards: [board], objects, assets }
}
