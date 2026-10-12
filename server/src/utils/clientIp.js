import {isIP} from 'node:net';
export function clientIp(req, config=process.env) {
  // Render's only public ingress passes through Cloudflare. Never use a
  // visitor-supplied X-Forwarded-For chain to identify rate-limit buckets.
  if(config.RENDER==='true'&&config.NODE_ENV==='production') {
    const edge=req.headers['cf-connecting-ip'];
    if(typeof edge==='string'&&isIP(edge.trim()))return edge.trim().replace(/^::ffff:/i,'');
  }
  return req.ip;
}
