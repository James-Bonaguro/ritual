import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/*
 * A project site lives at https://<user>.github.io/<repo>/, and every asset URL
 * and the service worker scope hang off that prefix.
 *
 * Derived from GITHUB_REPOSITORY rather than hardcoded, so renaming the
 * repository doesn't silently ship a build whose assets all 404. Actions always
 * sets that variable and updates it on rename. Locally there is no prefix.
 */
const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base = process.env.BASE_PATH ?? (repoName ? `/${repoName}/` : '/')

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: 'es2022',
    sourcemap: true,
  },
})
