// server/index.ts → server-dist/index.mjs (Railway: `npm start` dan oldin `npm run build`)
import { build } from 'esbuild'

await build({
  entryPoints: ['server/index.ts'],
  outfile: 'server-dist/index.mjs',
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  packages: 'external',
  sourcemap: true,
  logLevel: 'info',
})
