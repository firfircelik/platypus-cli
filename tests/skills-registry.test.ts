import { describe, expect, it } from 'vitest'
import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'
import { SkillRegistry } from '../src/skills/registry.js'

describe('SkillRegistry', () => {
  it('loads json skills from directory', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'platypus-skills-'))
    fs.writeFileSync(
      path.join(tmpDir, 'a.json'),
      JSON.stringify({ id: 's1', name: 'x', version: '1', description: 'd', entry: 'main.js' }),
      'utf8'
    )
    fs.writeFileSync(path.join(tmpDir, 'b.txt'), 'x', 'utf8')
    fs.writeFileSync(path.join(tmpDir, 'c.json'), JSON.stringify({ nope: true }), 'utf8')

    const reg = new SkillRegistry()
    reg.loadFromDir(tmpDir)
    expect(reg.list().length).toBe(1)
    expect(reg.get('s1')?.name).toBe('x')

    fs.rmSync(tmpDir, { recursive: true, force: true })
  })

  it('no-ops for missing directory', () => {
    const reg = new SkillRegistry()
    reg.loadFromDir('/path/does/not/exist')
    expect(reg.list().length).toBe(0)
  })
})
