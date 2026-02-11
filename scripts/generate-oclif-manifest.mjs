import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const pluginPath = join(here, '..', 'node_modules', '@oclif', 'core', 'lib', 'config', 'plugin.js')
const { Plugin } = await import(pathToFileURL(pluginPath).href)

const root = process.cwd()
const plugin = new Plugin({ root, isRoot: true, type: 'core', ignoreManifest: true })
await plugin.load()
await writeFile(join(root, 'oclif.manifest.json'), JSON.stringify(plugin.manifest, null, 2), 'utf8')
