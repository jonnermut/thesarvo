import type { StoredIndexNode } from '#/guide/content/syncFeed'
import type { Moved } from '#/guide/save/treeOps'
import { call } from '#/auth/apiCall'
import type { Answer } from '#/auth/apiCall'

/** The stored page tree (every page, private ones too) and the old addresses that redirect. Admins only. */
export const readTree = (): Promise<Answer<{ index: StoredIndexNode; moved: Moved }>> => call('change-tree')

const post = (body: unknown): Promise<Answer<{ before: StoredIndexNode }>> => call('change-tree', { method: 'POST', body: JSON.stringify(body) })

export const renamePage = (page: string, title: string) => post({ action: 'rename', page, title })
export const movePage = (page: string, parent: string, position: number) => post({ action: 'move', page, parent, position })
/** Undo: puts back a tree the server handed back as `before`. */
export const restoreTree = (index: StoredIndexNode) => post({ action: 'restore', index })
