import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { test } from 'node:test'
import { createApp, readManifest } from '../src/app.ts'
import { pinnedInstance } from '../plugins/instance/index.ts'
import { Boards, BoardError, clamp, cleanContent, cleanTitle, nextZ, objectsOf } from '../plugins/boards/index.ts'
import type { BoardState } from '../plugins/boards/domain.ts'
import { memoryStore } from '../plugins/boards/store.ts'
import { seed } from '../plugins/boards/seed.ts'
import { NOW, noticeOf, projectRoot, withApp } from './support.ts'
const scratch = join(projectRoot, '.acrylblends', 'test')
mkdirSync(scratch, { recursive: true })
const newId = (kind: string): string => `${kind}-${Math.random().toString(36).slice(2, 8)}`

test('positions are clamped, layers stack and the seed is the Quiet Modern board', () => {
  assert.equal(clamp(-2), 0)
  assert.equal(clamp(120), 100)
  const state = seed(NOW, newId)
  assert.equal(state.boards.length, 1)
  assert.equal(state.objects.length, 6)
  assert.equal(state.assets.filter((asset) => asset.kind === 'color').length, 5)
  assert.equal(nextZ(state.objects), 7)
  assert.equal(objectsOf(state, state.boards[0]!.id).length, 6)
  assert.equal(cleanTitle('  Quiet Modern '), 'Quiet Modern')
  assert.throws(() => cleanTitle(''), /title/)
  assert.throws(() => cleanContent(''), /text/)
})

async function open(): Promise<Boards> {
  let ids = 0
  return Boards.open({ store: memoryStore(), clock: () => NOW, newId: (kind) => `${kind}-${++ids}` })
}

test('adding, moving, editing, deleting and renaming persist', async () => {
  const store = memoryStore<BoardState>()
  let ids = 0
  const boards = await Boards.open({ store, clock: () => NOW, newId: (kind) => `${kind}-${++ids}` })
  const board = boards.boards()[0]
  assert.ok(board !== undefined)
  const object = await boards.add(board.id, 'note')
  assert.equal(object.type, 'note')
  assert.equal(boards.objects(board.id).length, 7)
  const moved = await boards.move(object.id, 12, 34)
  assert.equal(moved.x, 12)
  assert.equal(moved.y, 34)
  await assert.rejects(boards.move(object.id, Number.NaN, 1), (error: unknown) => error instanceof BoardError && /two numbers/.test(error.message))
  const edited = await boards.updateContent(object.id, 'A sharper direction.')
  assert.equal(edited.content, 'A sharper direction.')
  await boards.remove(object.id)
  assert.equal(boards.object(object.id), undefined)
  const renamed = await boards.rename(board.id, 'Quiet Modern v2')
  assert.equal(renamed.title, 'Quiet Modern v2')
  assert.equal(store.saved, 5)
})

test('the board page shows the canvas, the tools and the objects', () =>
  withApp(async (app) => {
    const page = await app.page('/')
    assert.equal(page.status, 200)
    assert.match(page.html, /Quiet Modern/)
    assert.match(page.html, /ADD TO CANVAS/)
    assert.match(page.html, /Warmth without noise/)
    assert.match(page.html, /data-id=/)
    assert.match(page.html, /design studio|DESIGN STUDIO/i)
  }))

test('the tools add an object, and a move records the position', () =>
  withApp(async (app) => {
    const board = app.root.boards.boards()[0]
    assert.ok(board !== undefined)
    const added = await app.post(`/boards/${board.id}/objects`, { type: 'note' })
    assert.equal(noticeOf(added).kind, 'ok')
    assert.equal(app.root.boards.objects(board.id).length, 7)
    const object = app.root.boards.objects(board.id).at(-1)
    assert.ok(object !== undefined)
    const moved = await app.post(`/objects/${object.id}/move`, { x: '25', y: '70' })
    assert.equal(moved.status, 200)
    const body = (await moved.json()) as { ok: boolean; x: number; y: number }
    assert.deepEqual(body, { ok: true, x: 25, y: 70 })
  }))

test('settings edit the text and rename the board; the object can be deleted', () =>
  withApp(async (app) => {
    const board = app.root.boards.boards()[0]
    assert.ok(board !== undefined)
    const object = app.root.boards.objects(board.id)[0]
    assert.ok(object !== undefined)
    const settings = await app.page(`/boards/${board.id}/settings`)
    assert.equal(settings.status, 200)
    assert.match(settings.html, /Board title/)
    const renamed = await app.post(`/boards/${board.id}`, { title: 'Quiet Modern v2' })
    assert.equal(noticeOf(renamed).kind, 'ok')
    assert.equal(app.root.boards.board(board.id)?.title, 'Quiet Modern v2')
    const edited = await app.post(`/objects/${object.id}/content`, { content: 'A new note.' })
    assert.equal(noticeOf(edited).kind, 'ok')
    assert.equal(app.root.boards.object(object.id)?.content, 'A new note.')
    const removed = await app.post(`/objects/${object.id}/delete`, {})
    assert.equal(noticeOf(removed).kind, 'ok')
    assert.equal(app.root.boards.object(object.id), undefined)
  }))

test('the assets page shows the colours and reference images', () =>
  withApp(async (app) => {
    const page = await app.page('/assets')
    assert.match(page.html, /Reference library/)
    assert.match(page.html, /Forest/)
  }))

test('health, 404, manifest, prefix and switch-off', async () => {
  await withApp(async (app) => {
    assert.equal((await app.page('/health')).status, 200)
    assert.equal((await app.page('/nope')).status, 404)
    assert.deepEqual(readManifest().plugins.map((row) => row.id), ['router', 'home', 'boards', 'board-shell', 'board', 'extensions', 'server', 'acryl-door'])
  })
  await withApp(async (app) => {
    const response = await app.root.router.request('/app', { headers: { accept: 'text/html' } })
    assert.equal(response.status, 200)
    assert.match(await response.text(), /href="\/app\/assets"/)
  }, { prefix: '/app' })
  const manifest = readManifest()
  const without = { ...manifest, plugins: manifest.plugins.map((row) => (row.id === 'board' ? { ...row, disabled: true } : row)) }
  const home = await mkdtemp(join(scratch, 'app-test-off-'))
  let ids = 0
  const app = await createApp(pinnedInstance(home, { root: projectRoot }), { listen: false, manifest: without, overrides: { boards: { clock: () => NOW, newId: (kind: string) => `${kind}-${++ids}` } } })
  try {
    assert.equal((await app.root.router.request('/health')).status, 200)
    assert.equal((await app.root.router.request('/')).status, 404)
  } finally { await app.stop(); await rm(home, { recursive: true, force: true }) }
})
