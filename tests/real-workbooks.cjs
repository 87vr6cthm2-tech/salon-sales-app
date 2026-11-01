// Run against local workbooks. Do not copy confidential fixtures into this repo.
const assert=require('node:assert/strict'),cp=require('node:child_process'),path=require('node:path'),fs=require('node:fs'),os=require('node:os');
const P=require('../excel-parser.js'),C=require('../data-core.js'),E=require('../sync-crypto.js');
async function main(){
 const files=process.argv.slice(2);assert.equal(files.length,2);
 const parsed=files.map(f=>{const r=cp.spawnSync('python3',[path.join(__dirname,'../scripts/read_excel.py'),f],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);return P.parse(JSON.parse(r.stdout),'funabori')});
 const [store,staff]=parsed;assert.equal(store.records.filter(r=>r.year===2026).length,10);assert.equal(staff.records.filter(r=>r.year===2026).length,50);
 assert.deepEqual([...new Set(staff.records.filter(r=>r.year===2026).map(r=>r.staff))],C.STAFF);
 assert(!staff.records.some(r=>['合計','船堀店'].includes(r.staff)));
 assert(!staff.records.some(r=>r.year===2026&&r.month>10));
 let db=C.merge(null,store.records).next;db=C.merge(db,staff.records).next;assert.equal(C.merge(db,store.records).changes,0);assert.equal(C.merge(db,staff.records).changes,0);
 const view=C.project(db,'funabori',2026),person=view.staff[0];assert(person.months.find(r=>r.month===10).retentionCumulative>0);assert(person.months.find(r=>r.month===10).lostCustomers>=0);assert(person.months.every(r=>r.reservation>=0&&r.reservation<=100));
 const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:3072,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);const pub=await crypto.subtle.exportKey('jwk',pair.publicKey),priv=await crypto.subtle.exportKey('jwk',pair.privateKey);
 const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'salon-sync-test-'));try{
  fs.writeFileSync(path.join(tmp,'public.json'),JSON.stringify(pub));
  const r=cp.spawnSync(process.execPath,[path.join(__dirname,'../scripts/prepare-sync.cjs'),'--public',path.join(tmp,'public.json'),'--store','funabori','--out',path.join(tmp,'out'),...files],{encoding:'utf8'});assert.equal(r.status,0,r.stderr);
  const info=JSON.parse(r.stdout),envelope=JSON.parse(fs.readFileSync(path.join(tmp,'out',info.files[0])));const p=await E.decrypt(envelope,priv);assert.deepEqual(p.records,db.records);
  console.log(JSON.stringify({storeRecords:store.records.length,staffRecords:staff.records.length,currentYearStoreMonths:10,currentYearStaffMonths:50,roundTrip:'passed',duplicateImport:'passed'}));
 }finally{fs.rmSync(tmp,{recursive:true,force:true})}
}
main().catch(e=>{console.error(e);process.exitCode=1});
