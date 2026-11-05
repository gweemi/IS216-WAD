import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const iconBridgePath = resolve(process.cwd(), 'src/assets/phosphor-icons.css')

describe('Phosphor icon bridge', () => {
  it('uses the direct Map glyph instead of Safari-sensitive text ligatures', async () => {
    const iconBridge = await readFile(iconBridgePath, 'utf8')

    expect(iconBridge).toMatch(/\.bi-map::before\s*\{\s*content:\s*"\\e31a";\s*\}/)
    expect(iconBridge).not.toMatch(/\.bi-map::before\s*\{\s*content:\s*"map-trifold";/)
  })
})
