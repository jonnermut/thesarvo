import { expect, it } from 'vitest'
import type { IndexNode } from '#/guide/content/types'
import type { Climb, Guide, ImageTopo } from '#/guide/model/types'
import { findPages, guidePlaces } from './linkTargets'

const node = (title: string, path: string, children: IndexNode[] = []): IndexNode => ({ id: path || '0', title, path, isGuide: true, children })
const root = node('Guides', '', [node('South East', 'south-east', [node('South Arm', 'south-east/south-arm'), node('Arm Crag', 'south-east/arm-crag')]), node('Freycinet', 'freycinet')])

it('finds pages by the words typed, titles starting with them first, with where they sit', () => {
  expect(findPages(root, 'arm').map((h) => h.node.title)).toEqual(['Arm Crag', 'South Arm'])
  expect(findPages(root, 'south arm')[0]).toMatchObject({ where: 'South East' })
  expect(findPages(root, '  ')).toEqual([])
  expect(findPages(root, 'zzz')).toEqual([])
})

it('lists a guide’s climbs and topos with the anchors the page gives them', () => {
  const climb = { type: 'climb', id: '173', name: 'Zig', number: '3', grade: '18', extra: '', length: '', stars: '', fa: '', text: '' } satisfies Climb
  const topo = { type: 'image', id: '9', src: 'a.jpg', width: 1, height: 1, noPrint: false, printLayout: '', legendTitle: '', legendFooter: '', legendX: 0, legendY: 0, legend: ['173'], paths: [], rects: [], otherShapes: [] } satisfies ImageTopo
  const guide = { nodes: [topo, climb] } as unknown as Guide
  expect(guidePlaces(node('South Arm', 'south-arm'), guide)).toEqual([
    { kind: 'topo', label: 'Topo of Zig…', href: '/g/south-arm#i-9' },
    { kind: 'climb', label: '3 Zig 18', href: '/g/south-arm#c-173' },
  ])
})
