import http from 'node:http';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost'); const name=decodeURIComponent(url.pathname)==='/'?'index.html':decodeURIComponent(url.pathname).slice(1); const file=path.resolve(root,name); if(!file.startsWith(root+path.sep)||name.startsWith('.')){res.writeHead(403);return res.end();}const data=await readFile(file);res.setHeader('Content-Type',({'html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','css':'text/css; charset=utf-8','svg':'image/svg+xml','webmanifest':'application/manifest+json'})[path.extname(file).slice(1)]||'application/octet-stream');res.end(data);}catch{res.writeHead(404);res.end('Not found');}}).listen(Number(process.env.PORT)||3000,'0.0.0.0');
