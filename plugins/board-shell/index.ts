/** The Moodboard shell: the field-notes top bar with the project crumb and the save actions, then the page. */
import type { Context } from '@deepseek-ai/cordis'
import { Acryl } from '../acryl-router/src/index.ts'
import type { Boards } from '../boards/index.ts'
import { createShell, escapeHtml, type NavItem, type Shell } from './core.ts'
import { STYLES } from './styles.ts'
export * from './core.ts'
export const APP_TITLE = 'Moodboard'
export interface ShellConfig { readonly prefix?: string }
export const name = 'board-shell'
export const inject = ['boards', 'router']
declare module '@deepseek-ai/cordis' { interface Context { shell: Shell } }
function topbar(nav: readonly NavItem[], crumbs: readonly string[], href: (path: string) => string, _meta: string, active: string | undefined): string {
  const trail = crumbs.map((crumb) => escapeHtml(crumb)).join(' / ')
  const links = nav.map((item) => `<a href="${href(item.path)}" style="font-size:9px;color:${item.id === active ? '#303730' : '#899087'};text-decoration:none;font-weight:${item.id === active ? '750' : '400'}">${escapeHtml(item.label)}</a>`).join('')
  return `<header class="top"><a class="brand" href="${href('/')}" style="text-decoration:none;color:inherit">FIELD<span>NOTES</span></a><div class="crumb">${trail === '' ? 'Boards' : trail}</div><nav style="display:flex;gap:12px;margin-left:12px">${links}</nav><div class="grow"></div><span class="tool" data-toast="Version history opened" style="font-size:9px;color:#6d6659">↶ History</span><span class="tool" data-toast="Share link copied" style="font-size:9px;color:#6d6659;margin:0 10px">↗ Share</span><a class="share" href="${href('/')}?ok=Board saved locally" style="text-decoration:none">Save board</a></header>`
}
export function apply(ctx: Context, config: ShellConfig = {}): void {
  const boards: Boards = ctx.boards
  const prefix = config.prefix ?? ''
  const shell = createShell(prefix, { appTitle: APP_TITLE, css: STYLES, bodyClass: 'moodboard', topbar: (nav, crumbs, href, meta, active) => topbar(nav, crumbs, href, meta, active) })
  ctx.provide('shell', shell)
  ctx.router.route(prefix === '' ? '/' : prefix, new Acryl().get('/health', (c) => c.json({ ok: true })))
  void boards
}
