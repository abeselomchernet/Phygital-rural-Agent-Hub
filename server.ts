import { createServer as createViteServer } from 'vite';
import express from 'express';
import path from 'node:path';
import { createApp } from './src/server/app';
import { validateDataConfig } from './src/domain/residency';

validateDataConfig(process.env);
const app = createApp();
if (process.env.NODE_ENV !== 'production') {
  const vite = await createViteServer({server:{middlewareMode:true,hmr:false},appType:'spa'});
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve('dist')));
  app.get('*', (_req,res) => res.sendFile(path.resolve('dist/index.html')));
}
const host=process.env.HOST || '127.0.0.1';
const port=Number(process.env.PORT || 3000);
app.listen(port,host,()=>console.log(`Synthetic demo listening on ${host}:${port}`));
