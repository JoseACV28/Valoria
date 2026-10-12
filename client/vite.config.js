import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import {fileURLToPath} from 'node:url';
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({mode})=>{
 const qa=['qa-local','staging'].includes(mode);
 if(qa&&process.env.QA_API_TARGET!=='http://127.0.0.1:4001')throw new Error('Inicia las pruebas con npm run qa:local o npm run qa:staging. No se permite el proxy al servidor principal.');
 const target=qa?process.env.QA_API_TARGET:'http://127.0.0.1:4000';
 const qaProxy={target,configure(proxy){proxy.on('proxyReq',(proxyRequest,request)=>{
   // Replace, rather than append, untrusted forwarding headers from the browser.
   proxyRequest.setHeader('X-Forwarded-For',request.socket.remoteAddress);
 });}};
 return {
  envDir:qa?false:undefined,
  define:{'import.meta.env.VITE_QA_ENV':JSON.stringify(qa?mode:'')},
  plugins: [react(),{
    name:'offline-shell-manifest',
    generateBundle(options,bundle){const version=createHash('sha256').update(Object.keys(bundle).sort().join('|')).digest('hex').slice(0,16);this.emitFile({type:'asset',fileName:'sw.js',source:readFileSync(new URL('./public/sw.js',import.meta.url),'utf8').replace('__BUILD__',version)});this.emitFile({type:'asset',fileName:'offline-assets.json',source:JSON.stringify(Object.keys(bundle).filter(name=>name.startsWith('assets/')&&!name.endsWith('.map')).map(name=>`/${name}`))});}
  }],
  server: {
    port: 5173,
    ...(qa?{fs:{strict:true,allow:[fileURLToPath(new URL('./',import.meta.url)),fileURLToPath(new URL('../node_modules/',import.meta.url))],deny:['.env','.env.*','*.{crt,pem}','**/.git/**','**/server/**','**/.codex-qa/**','**/docs/**','**/.codex-logs/**']}}:{}),
    proxy:{'^/(story|illustration)/':{target},'^/(sitemap\\.xml|robots\\.txt)$':{target},...(qa?{'/api':qaProxy,'/uploads':{target}}:{})}
  }
};});
