/**
 * The board canvas, the reference assets and the board settings. Objects are positioned by percentage and dragged; a drop posts the new position.
 * Routes: GET /, GET /boards/:id, GET /assets, GET /boards/:id/settings, POST /boards/:id/objects, POST /objects/:id/move,
 * POST /objects/:id/content, POST /objects/:id/delete, POST /boards/:id.
 */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import { BoardError, type BoardObject, colorsOf, type ObjectType, OBJECT_TYPES } from '../boards/index.ts'
const escape = (text: string): string => text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;')
const CLASS: Readonly<Record<string, string>> = { image: 'photo', note: 'note', palette: 'swatches', text: 'quote', link: 'caption' }
const DRAG = `<script>
(function(){
  var board=document.getElementById('board');
  if(!board)return;
  function toast(message){var el=document.getElementById('toast');if(!el)return;el.textContent=message;el.classList.add('show');setTimeout(function(){el.classList.remove('show')},2200)}
  board.querySelectorAll('.item[data-id]').forEach(function(item){
    item.setAttribute('draggable','true');
    item.addEventListener('dragstart',function(){item.classList.add('dragging')});
    item.addEventListener('dragend',function(event){
      item.classList.remove('dragging');
      var rect=board.getBoundingClientRect();
      var x=Math.min(100,Math.max(0,Math.round(((event.clientX-rect.left)/rect.width)*100)));
      var y=Math.min(100,Math.max(0,Math.round(((event.clientY-rect.top)/rect.height)*100)));
      item.style.left=x+'%';item.style.top=y+'%';
      var body=new URLSearchParams({x:String(x),y:String(y)});
      fetch(item.dataset.move,{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:body}).then(function(response){if(response.ok){toast('Position saved');}else{toast('Could not save the position');}},function(){toast('Could not save the position')});
    });
  });
}());
</script>`
export const name = 'board'
export const inject = ['boards', 'shell', 'router']
export function apply(ctx: Context): void {
  const { boards, shell } = ctx
  const e = shell.e
  const prefix = shell.prefix
  const item = (object: BoardObject): string => {
    const palette = object.type === 'palette' ? `<div>${colorsOf(boards.assets()).slice(0, 4).map((asset) => `<i style="background:${asset.colorValue}"></i>`).join('')}</div>` : ''
    const content = escape(object.content).replaceAll('\n', '<br>')
    return `<div class="item ${CLASS[object.type] ?? 'note'}" data-id="${e(object.id)}" data-move="${shell.href(`/objects/${encodeURIComponent(object.id)}/move`)}" title="Drag to move" style="left:${String(object.x)}%;top:${String(object.y)}%;z-index:${String(object.zIndex)};${object.style}">${object.type === 'image' ? `${content}` : object.type === 'note' ? `<small>DESIGN PRINCIPLE</small>${content}` : object.type === 'text' ? `<small>ART DIRECTION / 02</small>${content}` : object.type === 'palette' ? `<strong>${content}</strong>${palette}` : content}</div>`
  }
  const boardPage = (boardId: string, url: string): string | undefined => {
    const board = boards.board(boardId)
    if (board === undefined) return undefined
    const objects = boards.objects(board.id)
    const colors = colorsOf(boards.assets())
    const tools = (['image', 'note', 'palette', 'text', 'link'] as ObjectType[]).map((type) => `<form class="toolform" method="post" action="${shell.href(`/boards/${encodeURIComponent(board.id)}/objects`)}"><input type="hidden" name="type" value="${type}"><button class="tool" type="submit"><span class="ico">${type === 'image' ? '▧' : type === 'note' ? 'T' : type === 'palette' ? '◉' : type === 'link' ? '↗' : '▱'}</span> ${type === 'image' ? 'Image' : type === 'note' ? 'Text note' : type === 'palette' ? 'Colour palette' : type === 'link' ? 'Link' : 'Reference card'}</button></form>`).join('')
    const layers = objects.map((object) => `<form class="toolform" method="post" action="${shell.href(`/objects/${encodeURIComponent(object.id)}/delete`)}"><button class="tool" type="submit" title="Remove ${e(object.content)}">${CLASS[object.type] === 'photo' ? '▧' : 'T'} &nbsp; ${e(object.content).slice(0, 22)} ✕</button></form>`).join('')
    const main = `${shell.notice(url)}<div class="work"><aside class="tools"><h4>ADD TO CANVAS</h4>${tools}<div style="height:20px"></div><h4>PALETTE</h4><div class="colors">${colors.map((color) => `<i style="background:${color.colorValue}" title="${e(color.filename)} ${e(color.colorValue)}"></i>`).join('')}</div><div style="height:20px"></div><h4>LAYERS</h4>${layers}<p style="font-size:8px;color:#8b8578;margin-top:12px"><a href="${shell.href(`/boards/${encodeURIComponent(board.id)}/settings`)}" style="color:#6d6659">Board settings ↗</a></p></aside><main class="canvaswrap"><div class="boardhead"><div><small>BRAND SYSTEM / DIRECTION BOARD</small><h1>${escape(board.title)}</h1><p>Drag any element to explore a composition. This is a spatial canvas, not a document.</p></div><span style="font:8px monospace;color:#8b8578">75% ⌄</span></div><section class="board" id="board" style="background:${board.background}">${objects.map(item).join('')}<div class="detail">${String(objects.length)} OBJECTS &nbsp;·&nbsp; AUTOSAVE ON &nbsp;·&nbsp; OWNER: DESIGN STUDIO</div></section></main></div>`
    return shell.page({ active: 'board', title: board.title, main, scripts: DRAG })
  }
  const assetsPage = (): string => {
    const colors = colorsOf(boards.assets())
    const refs = boards.assets().filter((asset) => asset.kind === 'image')
    return shell.page({ active: 'assets', title: 'Assets', main: `<div class="canvaswrap"><div class="boardhead"><div><small>BOARD / ASSETS</small><h1>Reference library</h1><p>Colours and reference images available to every object.</p></div></div><div class="colors" style="margin:16px 0">${colors.map((color) => `<i style="background:${color.colorValue};width:42px;height:42px" title="${e(color.filename)} ${e(color.colorValue)}"></i>`).join('')}</div><div class="photos" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">${refs.map((asset) => `<div class="photo" style="background:${asset.url};min-height:160px"><span>${e(asset.filename)}</span></div>`).join('')}</div></div>` }) 
  }
  const settings = (boardId: string, url: string): string | undefined => {
    const board = boards.board(boardId)
    if (board === undefined) return undefined
    const rows = boards.objects(board.id).map((object) => `<form class="form" method="post" action="${shell.href(`/objects/${encodeURIComponent(object.id)}/content`)}"><label>${object.type.toUpperCase()} OBJECT<input name="content" value="${e(object.content)}" required></label><div class="actions"><button class="primary">Save text</button></div></form>`).join('')
    return shell.page({ active: 'settings', title: 'Board settings', main: `${shell.notice(url)}<div class="canvaswrap"><div class="boardhead"><div><small>BOARD / SETTINGS</small><h1>${escape(board.title)}</h1><p>Rename the board or edit the text of its objects.</p></div><a href="${shell.href(`/boards/${encodeURIComponent(board.id)}`)}" style="font-size:9px;color:#6d6659">Back to the board ↗</a></div><form class="form" method="post" action="${shell.href(`/boards/${encodeURIComponent(board.id)}`)}"><h2>Board title</h2><label>TITLE<input name="title" value="${e(board.title)}" required maxlength="120"></label><div class="actions"><button class="primary">Rename board</button></div></form>${rows}</div>` })
  }
  const app = new Acryl()
    .get('/', (c) => {
      const board = boards.boards()[0]
      if (board === undefined) return c.html(shell.page({ active: 'board', title: 'Moodboard', main: '<p class="empty">No board yet.</p>' }))
      return c.html(boardPage(board.id, c.req.url) as string)
    })
    .get('/boards/:id', (c) => {
      const main = boardPage(c.req.param('id'), c.req.url)
      if (main === undefined) return c.redirect(shell.url('/', { kind: 'error', text: 'That board no longer exists.' }), 303)
      return c.html(main)
    })
    .get('/assets', (c) => c.html(assetsPage()))
    .get('/boards/:id/settings', (c) => {
      const main = settings(c.req.param('id'), c.req.url)
      if (main === undefined) return c.redirect(shell.url('/', { kind: 'error', text: 'That board no longer exists.' }), 303)
      return c.html(main)
    })
    .post('/boards/:id/objects', async (c) => {
      const form = await c.req.parseBody()
      const type = String(form.type ?? '')
      if (!OBJECT_TYPES.includes(type as ObjectType)) return c.redirect(shell.url(`/boards/${encodeURIComponent(c.req.param('id'))}`, { kind: 'error', text: 'Unknown object type.' }), 303)
      try {
        await boards.add(c.req.param('id'), type as ObjectType)
        return c.redirect(shell.url(`/boards/${encodeURIComponent(c.req.param('id'))}`, { kind: 'ok', text: 'Object added.' }), 303)
      } catch (error) {
        return c.redirect(shell.url(`/boards/${encodeURIComponent(c.req.param('id'))}`, { kind: 'error', text: (error as Error).message }), 303)
      }
    })
    .post('/objects/:id/move', async (c) => {
      const form = await c.req.parseBody()
      try {
        const object = await boards.move(c.req.param('id'), Number(form.x), Number(form.y))
        return c.json({ ok: true, x: object.x, y: object.y })
      } catch (error) {
        if (!(error instanceof BoardError)) throw error
        return c.json({ error: error.message }, 400)
      }
    })
    .post('/objects/:id/content', async (c) => {
      const form = await c.req.parseBody()
      const object = boards.object(c.req.param('id'))
      const boardId = object?.boardId ?? ''
      try {
        await boards.updateContent(c.req.param('id'), String(form.content ?? ''))
        return c.redirect(shell.url(`/boards/${encodeURIComponent(boardId)}/settings`, { kind: 'ok', text: 'Text saved.' }), 303)
      } catch (error) {
        return c.redirect(shell.url(`/boards/${encodeURIComponent(boardId)}/settings`, { kind: 'error', text: (error as Error).message }), 303)
      }
    })
    .post('/objects/:id/delete', async (c) => {
      const object = boards.object(c.req.param('id'))
      if (object === undefined) return c.redirect(shell.url('/', { kind: 'error', text: 'That object no longer exists.' }), 303)
      await boards.remove(object.id)
      return c.redirect(shell.url(`/boards/${encodeURIComponent(object.boardId)}`, { kind: 'ok', text: 'Object removed.' }), 303)
    })
    .post('/boards/:id', async (c) => {
      const form = await c.req.parseBody()
      try {
        const board = await boards.rename(c.req.param('id'), String(form.title ?? ''))
        return c.redirect(shell.url(`/boards/${encodeURIComponent(board.id)}/settings`, { kind: 'ok', text: 'Board renamed.' }), 303)
      } catch (error) {
        return c.redirect(shell.url(`/boards/${encodeURIComponent(c.req.param('id'))}/settings`, { kind: 'error', text: (error as Error).message }), 303)
      }
    })
  ctx.router.route(prefix === '' ? '/' : prefix, app)
  ctx.effect(() => shell.nav({ id: 'board', label: 'Board', icon: '', path: '/', order: 10 }))
  ctx.effect(() => shell.nav({ id: 'assets', label: 'Assets', icon: '', path: '/assets', order: 20 }))
  const firstBoard = boards.boards()[0]
  ctx.effect(() => shell.nav({ id: 'settings', label: 'Settings', icon: '', path: firstBoard === undefined ? '/' : `/boards/${encodeURIComponent(firstBoard.id)}/settings`, order: 30 }))
}
