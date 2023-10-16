import { defineBuildConfig } from 'unbuild';

export default defineBuildConfig({
  entries: ['./src/index', { input: './src/static/', outDir: './dist/static/' }],
  clean: true,
  declaration: true,
  rollup: {
    emitCJS: true,
    inlineDependencies: true,
    esbuild: {
      minify: true
    }
  }
});
