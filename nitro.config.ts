// do not remove, this is needed by nitro-test-utils
export default defineNitroConfig({
  extends: './.nuxt/tsconfig.server.json',
  srcDir: './server',
  compatibilityDate: '2026-03-04',
  esbuild: {
    options: {
      target: 'esnext',
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
          target: 'esnext'
        }
      }
    }
  }
})
