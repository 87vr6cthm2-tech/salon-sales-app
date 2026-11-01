#!/usr/bin/env node
'use strict';
// Build encrypted immutable updates outside the checkout. Does not upload anything.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const C=require('../data-core.js'),P=require('../excel-parser.js'),E=require('../sync-crypto.js');
async function main(){
 const args=process.argv.slice(2),opts={},files=[];
 for(let i=0;i<args.length;i++){if(args[i].startsWith('--'))opts[args[i].slice(2)]=args[++i];else files.push(args[i])}
 if(!opts.public||!opts.store||!opts.out||!files.length)throw Error('Usage: node scripts/prepare-sync.cjs --public public.json --store funabori --out /private/output [--manifest manifest.json] workbook.xlsx ...');
 const out=path.resolve(opts.out),repo=path.resolve(__dirname,'..');
 if(out===repo||out.startsWith(repo+path.sep))throw Error('Output must be outside the repository');
 const jwk=JSON.parse(fs.readFileSync(opts.public,'utf8')),keyId=await E.keyId(jwk);
 if(jwk.d)throw Error('Public key only. Never supply the private key');
 let manifest=opts.manifest?JSON.parse(fs.readFileSync(opts.manifest,'utf8')):{version:2,keyId,updates:[]};
 if(manifest.version!==2||manifest.keyId!==keyId||!Array.isArray(manifest.updates)||manifest.updates.some((u,i)=>u.revision!==i+1||!/^[a-f0-9]{64}$/.test(u.hash)))throw Error('Invalid manifest');
 let db=C.empty();const sourceHashes=[];
 for(const file of files){
  const r=cp.spawnSync(process.env.PYTHON||'python3',[path.join(__dirname,'read_excel.py'),file],{encoding:'utf8',maxBuffer:10_000_000});
  if(r.status!==0)throw Error(r.stderr||'Excel read failed');
  const parsed=P.parse(JSON.parse(r.stdout),opts.store),merged=C.merge(db,parsed.records);
  if(merged.conflicts.length)throw Error('Input workbooks contain conflicting values');db=merged.next;
  sourceHashes.push(require('node:crypto').createHash('sha256').update(fs.readFileSync(file)).digest('hex'));
 }
 const revision=manifest.updates.length+1,previous=manifest.updates.at(-1)?.hash||null;
 const payload={version:2,records:db.records,sourceHashes,createdAt:new Date().toISOString()};
 const envelope=await E.encrypt(payload,jwk,revision,previous),text=JSON.stringify(envelope),hash=await E.hash(text);
 manifest={...manifest,updates:[...manifest.updates,{revision,hash}]};
 fs.mkdirSync(out,{recursive:true,mode:0o700});
 fs.writeFileSync(path.join(out,hash+'.json'),text,{mode:0o600});fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest),{mode:0o600});
 console.log(JSON.stringify({keyId,revision,records:db.records.length,files:[hash+'.json','manifest.json'],destination:'sync/'+keyId+'/',note:'Upload encrypted files only. Manifest update must use expected GitHub blob SHA.'}));
}
main().catch(e=>{console.error(e.message);process.exitCode=1});
