'use strict';
(function(root){
 const KEY='salon-note-funabori-dashboard-v2';
 const STAFF=['木村','山岸','中村','藤野','関根'];
 const STORE=['sales','technical','retail','customers','newCustomers','reservation','productivityTechnical','productivityTotal','dailyFte','ticket','technicalTicket','prevSales','prevTechnical','retailRatio','lostCustomers','retentionCumulative'];
 const PERSON=['named','retail','total','namedCustomers','yearOverYear','totalCustomers','freeCustomers','newCustomers','newNamedCustomers','reservation','lostCustomers','retentionNew','retentionNewReturn','retentionRepeat','retentionRegular','retentionReturn','retentionCumulative'];
 const clone=x=>JSON.parse(JSON.stringify(x));
 const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const plain=x=>x&&typeof x==='object'&&!Array.isArray(x);
 const number=x=>typeof x==='number'&&Number.isFinite(x)&&x>=0&&x<1e12;
 function fail(s){throw Error(s)}
 function record(r){
  if(!plain(r)||!/^[-a-z0-9]{1,40}$/.test(r.store)||!Number.isInteger(r.year)||r.year<2000||r.year>2100||!Number.isInteger(r.month)||r.month<1||r.month>12||!(r.staff===null||(typeof r.staff==='string'&&r.staff.length>0&&r.staff.length<=40&&!/[<>|\x00-\x1f]/.test(r.staff)))||!plain(r.values))fail('実績の店舗・年・月・担当者が不正です');
  const allowed=r.staff===null?STORE:PERSON;
  for(const [k,v] of Object.entries(r.values)){
   if(!allowed.includes(k)||!number(v))fail('実績値が不正です：'+k);
   if((k.startsWith('retention')||['reservation','retailRatio'].includes(k))&&v>100)fail('率が100%を超えています');
   if((/Customers$/.test(k)||k==='customers')&&!Number.isInteger(v))fail('人数は整数で指定してください');
  }
  if(!Object.keys(r.values).length)fail('空の実績です');
  return r;
 }
 const id=r=>[r.store,r.year,r.month,r.staff||'_store'].join('|');
 function records(rs){if(!Array.isArray(rs)||rs.length>12000)fail('実績件数が不正です');const seen=new Set();for(const r of rs){record(r);if(seen.has(id(r)))fail('同じ月の実績が重複しています');seen.add(id(r))}return rs;}
 const empty=()=>({schema:3,records:[],sync:{},imports:[]});
 function migrate(d){
  if(!d)return empty();
  if(d.schema===3){records(d.records);if(d.accessMode==='personal'&&(!d.personalName||d.records.some(r=>r.staff!==d.personalName)))fail('個人用データに他の実績が含まれています');if(!plain(d.sync)||!Array.isArray(d.imports))fail('保存データが不正です');return clone(d)}
  if(!Number.isInteger(d.year)||!Array.isArray(d.staff)||!Array.isArray(d.storeMonthly?.months))fail('保存形式が不正です。復元前にバックアップしてください');
  const out=empty();out.accessMode=d.accessMode;out.personalName=d.accessMode==='personal'?d.staff[0]?.name:undefined;
  // Preserve the original, including summaries that cannot be converted to monthly values.
  out.legacy=clone(d);
  const put=(year,staff,rs)=>{for(const m of rs){const values={};for(const k of staff===null?STORE:PERSON)if(number(m[k]))values[k]=m[k];if(Object.keys(values).length)out.records.push({store:'funabori',year:Number(year),month:Number(m.month),staff,values})}};
  for(const [y,rs] of Object.entries(d.storeHistory||{}))if(Number(y)!==d.year)put(y,null,rs);
  put(d.year,null,d.storeMonthly.months);
  for(const s of d.staff){put(d.year,s.name,s.months||[])}
  records(out.records);return out;
 }
 function merge(db,rs,replace=false){
  records(rs);const next=migrate(db),conflicts=[];let changes=0;
  if(next.accessMode==='personal'&&rs.some(r=>r.staff!==next.personalName))fail('本人用データに他の担当者・店舗データは取り込めません');
  const map=new Map(next.records.map(r=>[id(r),r]));
  for(const src of rs){let dst=map.get(id(src));if(!dst){dst=clone(src);next.records.push(dst);map.set(id(src),dst);changes+=Object.keys(src.values).length;continue}
   for(const [k,v] of Object.entries(src.values)){if(dst.values[k]===v)continue;
    if(own(dst.values,k)){conflicts.push({store:src.store,year:src.year,month:src.month,staff:src.staff,field:k,before:dst.values[k],after:v});if(!replace)continue}
    dst.values[k]=v;changes++;
   }
  }
  return {next,changes,conflicts};
 }
 function project(db,store,year){
  const d=migrate(db),rs=d.records.filter(r=>r.store===store&&r.year===Number(year));
  const months=staff=>rs.filter(r=>r.staff===staff).map(r=>({month:r.month,...r.values})).sort((a,b)=>a.month-b.month);
  return {year:Number(year),accessMode:d.accessMode,staff:[...new Set([...STAFF,...rs.map(r=>r.staff).filter(Boolean)])].map(name=>({name,months:months(name),summary:{}})).filter(p=>p.months.length),storeMonthly:{months:months(null)}};
 }
 function save(db){
  const next=migrate(db),raw=localStorage.getItem(KEY);
  // No live write until a complete rollback snapshot has been persisted.
  if(raw)localStorage.setItem(KEY+'-rollback',raw);
  localStorage.setItem(KEY,JSON.stringify(next));
  if(typeof window!=='undefined')window.dispatchEvent(new Event('salon-data-changed'));
 }
 const read=()=>migrate(JSON.parse(localStorage.getItem(KEY)||'null'));
 const api={KEY,STAFF,STORE,PERSON,number,own,record,records,id,empty,migrate,merge,project,save,read};
 if(typeof module!=='undefined')module.exports=api;root.SalonData=api;
})(typeof globalThis!=='undefined'?globalThis:this);
