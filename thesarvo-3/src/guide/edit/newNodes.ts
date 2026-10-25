import type { Climb, Gps, GuideNode, Header, ImageTopo, TextBlock } from '#/guide/model/types'

export type NewNodeKind = 'climb' | 'problem' | 'text' | 'header' | 'gps'

export const NEW_NODE_LABELS: [NewNodeKind, string][] = [
  ['climb', 'Climb'],
  ['problem', 'Boulder problem'],
  ['text', 'Text'],
  ['header', 'Header'],
  ['gps', 'GPS'],
]

export function newNode(kind: NewNodeKind, id: string): GuideNode {
  switch (kind) {
    case 'climb':
    case 'problem':
      return { type: kind, id, name: '', number: '', grade: '', extra: '', length: '', stars: '', fa: '', text: '', other: {} } satisfies Climb
    case 'text':
      return { type: 'text', id, cls: 'text', text: '', other: {} } satisfies TextBlock
    case 'header':
      return { type: 'header', id, name: '', rock: '', sun: '', walk: '', access: '', camping: '', acknowledgement: '', intro: '', history: '', autonumber: '', other: {} } satisfies Header
    case 'gps':
      return { type: 'gps', id, points: [], other: {} } satisfies Gps
  }
}

export const newTopo = (id: string, src: string, width: number, height: number): ImageTopo => ({
  type: 'image', id, src, width, height, noPrint: false, printLayout: '', legendTitle: '', legendFooter: '',
  legendX: 0, legendY: 0, legend: [], paths: [], rects: [], otherShapes: [], other: {},
})
