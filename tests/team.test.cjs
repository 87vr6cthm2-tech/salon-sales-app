'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),cp=require('node:child_process');
const E=require('../sync-crypto.js'),{validate}=require('../scripts/prepare-team.cjs');
test('two devices receive identical records with distinct encryption; histories and disabled devices respected',async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'salon-team-test-'));
 try{
  const entries=[],privateKeys=[];
  for(let i=0;i<2;i++){
   const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:3072,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
   const publicKey=await crypto.subtle.exportKey('jwk',pair.publicKey);privateKeys.push(await crypto.subtle.exportKey('jwk',pair.privateKey));
   entries.push({keyId:await E.keyId(publicKey),publicKey,store:'funabori',scope:'store-all',enabled:true});
  }
  const registry={version:1,recipients:entries};await validate(registry);
  await assert.rejects(validate({...registry,recipients:[entries[0],entries[0]]}));
  await assert.rejects(validate({...registry,recipients:[{...entries[0],publicKey:privateKeys[0]}]}));
  const workbook=path.join(dir,'synthetic.xlsx');
  const python=cp.spawnSync(process.env.PYTHON||'python3',['-c',"from openpyxl import Workbook; import sys; w=Workbook(); s=w.active; s.title='2026年客数'; s.append(['木村','総客数','指名客数','フリー客数']); s.append(['１月',10,9,1]); w.save(sys.argv[1])",workbook],{encoding:'utf8'});assert.equal(python.status,0,python.stderr);
  const reg=path.join(dir,'registry.json'),mf=path.join(dir,'manifests.json');
  fs.writeFileSync(reg,JSON.stringify(registry));fs.writeFileSync(mf,JSON.stringify(Object.fromEntries(entries.map(r=>[r.keyId,null]))));
  const run=out=>cp.spawnSync(process.execPath,[path.join(__dirname,'../scripts/prepare-team.cjs'),'--registry',reg,'--manifests',mf,'--store','funabori','--out',path.join(dir,out),workbook],{encoding:'utf8'});
  let result=run('first');assert.equal(result.status,0,result.stderr);
  const manifests={},decoded=[];
  for(let i=0;i<2;i++){
   const base=path.join(dir,'first','sync',entries[i].keyId),m=JSON.parse(fs.readFileSync(path.join(base,'manifest.json')));manifests[entries[i].keyId]=m;
   const env=JSON.parse(fs.readFileSync(path.join(base,m.updates[0].hash+'.json')));decoded.push(await E.decrypt(env,privateKeys[i]));await assert.rejects(E.decrypt(env,privateKeys[1-i]));
  }
  assert.deepEqual(decoded[0].records,decoded[1].records);assert.equal(decoded[0].sharing.mode,'store-all');
  assert.notEqual(manifests[entries[0].keyId].updates[0].hash,manifests[entries[1].keyId].updates[0].hash);
  fs.writeFileSync(mf,JSON.stringify(manifests));entries[1].enabled=false;fs.writeFileSync(reg,JSON.stringify(registry));
  result=run('second');assert.equal(result.status,0,result.stderr);
  const second=JSON.parse(fs.readFileSync(path.join(dir,'second','sync',entries[0].keyId,'manifest.json')));assert.equal(second.updates.length,2);assert.deepEqual(second.updates[0],manifests[entries[0].keyId].updates[0]);assert(!fs.existsSync(path.join(dir,'second','sync',entries[1].keyId)));
  fs.writeFileSync(mf,'{}');assert.notEqual(run('missing').status,0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
