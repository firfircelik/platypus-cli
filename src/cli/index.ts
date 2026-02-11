import { execute } from '@oclif/core'

const argv = process.argv.slice(2)
const effectiveArgv = argv.length === 0 ? ['chat'] : argv

await execute({ dir: import.meta.url, args: effectiveArgv })
