#!/usr/bin/env node
'use strict';
// Encrypt separately for explicitly enrolled devices. No upload and no private keys.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const E=require('../sync-crypto.js'),S=require('../sync-protocol.js');
async function validate(registry){
 if(registry?.version!==1||!Array.isArray(registry.recipients)||!registry.recipients.length)throw Error('Invalid recipient registry');
 const seen=new Set();
 for(const r of registry.recipients){
  if(typeof r.enabled!=='boolean'||r.scope!=='store-all'||!/^[-a-z0-9]{1,40}$/.test(r.store)||!r.publicKey||['d','p','q','dp','dq','qi'].some(k=>k in r.publicKey))throw Error('Invalid recipient or private key');
  const id=await E.keyId(r.publicKey);if(r.keyId!==id||seen.has(id))throw Error('Duplicate or mismatched recipient');seen.add(id);
  await crypto.subtle.importKey('jwk',E.publicOnly(r.publicKey),{name:'RSA-OAEP',hash:'SHA-256'},false,['encrypt']);
 }
 return registry.recipients;
}
async function main(){
 const opts={},files=[],args=process.argv.slice(2);
 for(let i=0;i<args.length;i++){if(args[i].startsWith('--'))opts[args[i].slice(2)]=args[++i];else files.push(args[i]);}
 if(!opts.registry||!opts.manifests||!opts.out||!opts.store||!files.length)throw Error('Usage: --registry registry.json --manifests manifests.json --store funabori --out /private/output files.xlsx ...');
 const out=path.resolve(opts.out),repo=path.resolve(__dirname,'..');
 if(out===repo||out.startsWith(repo+path.sep)||fs.existsSync(out))throw Error('Use a new output directory outside the repository');
 const recipients=(await validate(JSON.parse(fs.readFileSync(opts.registry,'utf8')))).filter(r=>r.enabled&&r.store===opts.store);
 if(!recipients.length)throw Error('No enrolled devices for this store');
 // Explicit null means a verified 404. Missing entries/network failures must never reset history.
 const manifests=JSON.parse(fs.readFileSync(opts.manifests,'utf8'));
 for(const r of recipients){if(!Object.hasOwn(manifests,r.keyId))throw Error('Missing manifest verification');if(manifests[r.keyId]!==null)S.checkManifest(manifests[r.keyId],r.keyId);}
 fs.mkdirSync(out,{recursive:true,mode:0o700});const temp=fs.mkdtempSync(path.join(out,'.public-inputs-'));
 try{
  for(const r of recipients){
   const pub=path.join(temp,'public.json'),manifest=path.join(temp,'manifest.json');fs.writeFileSync(pub,JSON.stringify(r.publicKey));
   const params=[path.join(__dirname,'prepare-sync.cjs'),'--public',pub,'--store',r.store,'--scope',r.scope,'--out',path.join(out,'sync',r.keyId)];
   if(manifests[r.keyId]!==null){fs.writeFileSync(manifest,JSON.stringify(manifests[r.keyId]));params.push('--manifest',manifest);}
   const result=cp.spawnSync(process.execPath,[...params,...files],{encoding:'utf8'});
   if(result.status!==0)throw Error('Team preparation failed; publish nothing. '+result.stderr);process.stdout.write(result.stdout);
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
}
module.exports={validate};if(require.main===module)main().catch(e=>{console.error(e.message);process.exitCode=1});
