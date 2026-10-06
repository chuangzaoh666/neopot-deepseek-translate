// SPDX-License-Identifier: GPL-3.0-only
import { existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const repoRoot = path.resolve(import.meta.dirname, '..')
const pluginsRoot = path.join(repoRoot, 'plugins')
const outputRoot = path.join(repoRoot, 'dist', 'plugins')

function isPackablePlugin(directory) {
  return (
    statSync(directory).isDirectory() &&
    existsSync(path.join(directory, 'info.json')) &&
    existsSync(path.join(directory, 'main.js'))
  )
}

function toZipPath(filePath) {
  return filePath.split(path.sep).join('/')
}

function collectFiles(directory, root = directory) {
  const files = []

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)

    if (entry.isDirectory()) {
      files.push(...collectFiles(fullPath, root))
      continue
    }

    if (!entry.isFile() || entry.name.toLowerCase().endsWith('.zip')) {
      continue
    }

    files.push(toZipPath(path.relative(root, fullPath)))
  }

  return files
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    ...options,
  })

  if (result.error) {
    throw result.error
  }

  if (result.status !== 0) {
    throw new Error(`${command} exited with code ${result.status}`)
  }
}

function zipPlugin(pluginDir, zipPath) {
  const files = collectFiles(pluginDir)

  if (process.platform === 'win32') {
    const literalPaths = files
      .map((file) => `'${file.replaceAll("'", "''")}'`)
      .join(', ')
    const destination = zipPath.replaceAll("'", "''")
    run(
      'powershell.exe',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -LiteralPath ${literalPaths} -DestinationPath '${destination}' -Force`,
      ],
      {
        cwd: pluginDir,
      },
    )
    return
  }

  run('zip', ['-q', zipPath, ...files], {
    cwd: pluginDir,
  })
}

if (!existsSync(pluginsRoot)) {
  throw new Error(`Plugins directory does not exist: ${pluginsRoot}`)
}

rmSync(outputRoot, { recursive: true, force: true })
mkdirSync(outputRoot, { recursive: true })

const pluginDirs = readdirSync(pluginsRoot)
  .map((name) => path.join(pluginsRoot, name))
  .filter(isPackablePlugin)

if (pluginDirs.length === 0) {
  console.log('No packable plugins found.')
  process.exit(0)
}

for (const pluginDir of pluginDirs) {
  const pluginName = path.basename(pluginDir)
  const zipPath = path.join(outputRoot, `${pluginName}.zip`)
  zipPlugin(pluginDir, zipPath)
  console.log(`Packed ${path.relative(repoRoot, zipPath)}`)
}
