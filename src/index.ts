import type { Plugin } from 'vite'
import { build } from './build'
import { bootstrap } from './serve'
import type { Configuration } from './config'

// public
export { type Configuration, defineConfig, resolveViteConfig, withExternalBuiltins } from './config'
export { build }

export default function electron(config: Configuration | Configuration[]): Plugin[] {
  return [
    {
      name: 'vite-plugin-electron',
      apply: 'serve',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          bootstrap(config, server)
        })
        server.httpServer?.once('close', () => {
          if (process.electronApp) {
            process.electronApp.removeAllListeners()
            process.electronApp.kill()
          }
        })
      },
    },
    {
      name: 'vite-plugin-electron',
      apply: 'build',
      config(config) {
        // Make sure that Electron can be loaded into the local file using `loadFile` after packaging.
        config.base ??= './'
      },
      async closeBundle() {
        await build(config)
      }
    },
  ]
}

/**
 * Electron App startup function.  
 * It will mount the Electron App child-process to `process.electronApp`.  
 * @param argv default value `['.', '--no-sandbox']`
 */
export async function startup(argv = ['.', '--no-sandbox']) {
  const { spawn } = await import('child_process')
  // @ts-ignore
  const electron = await import('electron')
  const electronPath = <any>(electron.default ?? electron)

  if (process.electronApp) {
    process.electronApp.removeAllListeners()
    process.electronApp.kill()
  }

  // Start Electron.app
  process.electronApp = spawn(electronPath, argv, { stdio: 'inherit' })
  // Exit command after Electron.app exits
  process.electronApp.once('exit', process.exit)
}
