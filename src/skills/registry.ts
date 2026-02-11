import fs from 'node:fs'
import path from 'node:path'

export interface SkillDefinition {
  id: string
  name: string
  version: string
  description: string
  entry: string
  inputs?: Record<string, unknown>
  outputs?: Record<string, unknown>
}

export class SkillRegistry {
  private skills: Map<string, SkillDefinition>

  constructor() {
    this.skills = new Map()
  }

  register(skill: SkillDefinition): void {
    this.skills.set(skill.id, skill)
  }

  list(): SkillDefinition[] {
    return Array.from(this.skills.values())
  }

  get(id: string): SkillDefinition | undefined {
    return this.skills.get(id)
  }

  loadFromDir(dir: string): void {
    if (!fs.existsSync(dir)) return
    const entries = fs.readdirSync(dir)
    for (const entry of entries) {
      if (!entry.endsWith('.json')) continue
      const full = path.join(dir, entry)
      const parsed = JSON.parse(fs.readFileSync(full, 'utf8')) as SkillDefinition
      if (parsed?.id) this.register(parsed)
    }
  }
}

