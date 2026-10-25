import { describe, expect, it } from 'vitest'
import { cleanPageBody } from './pageBody'

describe('cleanPageBody', () => {
  it('keeps prose and drops styles and spans', () => {
    expect(cleanPageBody('<p style="color: red"><span style="x">Hello <strong>there</strong></span></p>', 'T')).toBe(
      '<p>Hello <strong>there</strong></p>',
    )
  })

  it('turns page links and attachments into data attributes', () => {
    const html = cleanPageBody(
      '<ul><li><ac:link><ri:page ri:content-title="Bare Rock" /></ac:link>, ' +
        '<ac:link><ri:page ri:content-title="Craglets" /><ac:plain-text-link-body><![CDATA[the <book>]]></ac:plain-text-link-body></ac:link></li></ul>' +
        '<p><ac:image ac:width="400"><ri:attachment ri:filename="cover.jpg" /></ac:image>' +
        '<ac:link><ri:attachment ri:filename="updates.pdf" /><ac:link-body>Updates</ac:link-body></ac:link></p>',
      'T',
    )
    expect(html).toBe(
      '<ul><li><a data-page="Bare Rock">Bare Rock</a>, <a data-page="Craglets">the &lt;book&gt;</a></li></ul>' +
        '<p><img data-file="cover.jpg" width="400" alt=""><a data-file="updates.pdf">Updates</a></p>',
    )
  })

  it('drops the contents macro and returns null when only a heading is left', () => {
    expect(
      cleanPageBody(
        '<h1>South East Climbing Guides</h1><ac:structured-macro ac:name="unmigrated-inline-wiki-markup"><ac:plain-text-body><![CDATA[{guidecontents}]]></ac:plain-text-body></ac:structured-macro>',
        'South East',
      ),
    ).toBeNull()
  })

  it('keeps notes and columns as divs, without macro parameters', () => {
    expect(
      cleanPageBody(
        '<ac:structured-macro ac:name="info"><ac:parameter ac:name="title">Printed</ac:parameter><ac:rich-text-body><p>Buy it</p></ac:rich-text-body></ac:structured-macro>' +
          '<ac:structured-macro ac:name="section"><ac:rich-text-body><ac:structured-macro ac:name="column"><ac:parameter ac:name="width">30%</ac:parameter><ac:rich-text-body><h2>A</h2></ac:rich-text-body></ac:structured-macro></ac:rich-text-body></ac:structured-macro>',
        'T',
      ),
    ).toBe('<div class="note"><p><strong>Printed</strong></p><p>Buy it</p></div><div class="columns"><div><h2>A</h2></div></div>')
  })

  it('drops headings whose section was only a macro', () => {
    expect(cleanPageBody('<h2>Rock</h2><p>Dolerite</p><h2>Guide</h2><h2>Classics</h2><h3>Old</h3><p>Carnap</p><h2>Gallery</h2>', 'T')).toBe(
      '<h2>Rock</h2><p>Dolerite</p><h2>Classics</h2><h3>Old</h3><p>Carnap</p>',
    )
  })

  it('removes empty paragraphs, unsafe links and a heading that repeats the title', () => {
    expect(cleanPageBody('<h2>Hardcopy Guides</h2><p><br /></p><p><a href="javascript:x()">Go</a> <a href="/confluence/display/GUIDE/South+Arm">SA</a></p>', 'Hardcopy Guides')).toBe(
      '<p>Go <a data-page="South Arm">SA</a></p>',
    )
  })
})
