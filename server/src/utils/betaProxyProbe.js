import {createHmac, randomBytes} from 'node:crypto';
import {clientIp} from './clientIp.js';
const salt=randomBytes(32), started=Date.now();
export function betaProxyProbe(req) {
  if(process.env.APP_ENV!=='beta'||process.env.RENDER!=='true'||req.query.proxy_probe!=='1'||Date.now()-started>1800000)return {};
  const fingerprint=value=>value?createHmac('sha256',salt).update(value.trim()).digest('hex').slice(0,16):null;
  return {proxyProbe:{socket:fingerprint(req.socket.remoteAddress),forwarded:String(req.headers['x-forwarded-for']||'').split(',').filter(Boolean).map(fingerprint),cloudflare:fingerprint(String(req.headers['cf-connecting-ip']||'')),resolved:fingerprint(clientIp(req))}};
}
