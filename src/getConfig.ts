import fs from 'fs'
import type { NextConfig } from 'next/dist/server/config'
import path from 'path'

export type Config = {
  type: 'nextjs' | 'nuxtjs' | 'sapper' | 'svelte-kit'
  input: string
  staticDir: string | undefined
  output: string
  ignorePath: string | undefined
  trailingSlash?: boolean
  basepath?: string
  pageExtensions?: string[]
}

const getFrameworkType = (dir: string) => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'))
  const deps = Object.assign(packageJson.devDependencies ?? {}, packageJson.dependencies ?? {})
  return deps.sapper
    ? 'sapper'
    : deps.nuxt
    ? 'nuxtjs'
    : deps['@sveltejs/kit']
    ? 'svelte-kit'
    : 'nextjs'
}

export default async (
  enableStatic: boolean,
  output: string | undefined,
  igPath: string | undefined,
  dir = process.cwd()
): Promise<Config> => {
  const type = getFrameworkType(dir)
  const ignorePath = igPath && path.join(dir, igPath)

  if (type === 'nextjs') {
    let config: NextConfig

    try {
      // >= v11.1.0
      config = await require('next/dist/server/config').default(
        require('next/constants').PHASE_PRODUCTION_BUILD,
        dir
      )
    } catch (e) {
      // < v11.1.0
      config = await require('next/dist/next-server/server/config').default(
        require('next/constants').PHASE_PRODUCTION_BUILD,
        dir
      )
    }

    const srcDir = fs.existsSync(path.posix.join(dir, 'pages')) ? dir : path.posix.join(dir, 'src')

    if (!output) {
      const utilsPath = path.join(srcDir, 'utils')
      output = fs.existsSync(utilsPath) ? utilsPath : path.join(srcDir, 'lib')
    }

    if (!fs.existsSync(output)) fs.mkdirSync(output)

    return {
      type,
      input: path.posix.join(srcDir, 'pages'),
      staticDir: enableStatic ? path.posix.join(dir, 'public') : undefined,
      output,
      ignorePath,
      pageExtensions: config.pageExtensions,
      basepath: config.basePath
    }
  } else if (type === 'nuxtjs') {
    const nuxttsPath = path.join(dir, 'nuxt.config.ts')
    const config = await require('@nuxt/config').loadNuxtConfig({
      rootDir: dir,
      configFile: fs.existsSync(nuxttsPath) ? nuxttsPath : undefined
    })
    const srcDir = path.posix.join(dir, config.srcDir ?? '')

    output = output ?? path.posix.join(srcDir, 'plugins')

    if (!fs.existsSync(output)) fs.mkdirSync(output)

    return {
      type,
      input: path.posix.join(srcDir, 'pages'),
      staticDir: enableStatic ? path.posix.join(srcDir, 'static') : undefined,
      output,
      ignorePath,
      trailingSlash: config.router?.trailingSlash,
      basepath: config.router?.base
    }
  } else if (type === 'svelte-kit') {
    // svelte-kit
    const srcDir = path.posix.join(dir, 'src')

    output = output ?? path.join(srcDir, 'node_modules')

    if (!fs.existsSync(output)) fs.mkdirSync(output)

    return {
      type,
      input: path.posix.join(srcDir, 'routes'),
      staticDir: enableStatic ? path.posix.join(dir, 'static') : undefined,
      output,
      ignorePath
    }
  } else {
    const srcDir = path.posix.join(dir, 'src')

    output = output ?? path.join(srcDir, 'node_modules')

    if (!fs.existsSync(output)) fs.mkdirSync(output)

    return {
      type,
      input: path.posix.join(srcDir, 'routes'),
      staticDir: enableStatic ? path.posix.join(dir, 'static') : undefined,
      output,
      ignorePath
    }
  }
}
