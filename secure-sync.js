'use strict';
/* Encrypted, read-only remote updates. The public site never receives a plaintext sales dataset. */
(async function(){
 const STORAGE='salon-note-funabori-dashboard-v2', PRIVATE='salon-note-sync-private-key-v1';
 const allowedStore=['sales','technical','retail','customers','newCustomers','reservation','productivityTechnical','productivityTotal','dailyFte','ticket','technicalTicket','prevSales','prevTechnical'];
 const allowedStaff=['named','retail','total','namedCustomers','yearOverYear','totalCustomers','freeCustomers','newCustomers','newNamedCustomers','reservation','lostCustomers','retentionNew','retentionNewReturn','retentionRepeat','retentionRegular','retentionReturn','retentionCumulative'];
 const $=id=>document.getElementById(id);
 const asB64=u=>btoa(String.fromCharCode(...u)),fromB64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
 const notify=t=>{const e=$('sync-status');if(e)e.textContent=t};
 const valid=n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<1e12;
 const safeMonth=r=>Number.isInteger(r?.month)&&r.month>=1&&r.month<=12;
 function mergePatch(patch){
  if(!patch||patch.version!==1||patch.year!==2026)throw Error('同期データの形式が不正です');
  const current=JSON.parse(localStorage.getItem(STORAGE)||'null')||{year:2026,staff:[],storeMonthly:{months:[]}};
  if(current.accessMode==='personal'&&patch.storeMonthly?.months?.length)throw Error('個人用画面で店舗全体の更新はできません');
  const next=structuredClone(current);let changes=0;
  if(Array.isArray(patch.storeMonthly?.months)){
   if(patch.storeMonthly.months.length>12)throw Error('月数が不正です');
   next.storeMonthly=next.storeMonthly||{months:[]};
   for(const r of patch.storeMonthly.months){
    if(!safeMonth(r))throw Error('月が不正です');
    let target=next.storeMonthly.months.find(x=>x.month===r.month);
    if(!target){target={month:r.month};next.storeMonthly.months.push(target);}
    for(const k of allowedStore)if(Object.hasOwn(r,k)){
     if(!valid(r[k]))throw Error(k+'の値が不正です');
     if(target[k]!==r[k]){target[k]=r[k];changes++;}
    }
   }
   next.storeMonthly.months.sort((a,b)=>a.month-b.month);
  }
  if(Array.isArray(patch.staff)){
   if(patch.staff.length>5)throw Error('人数が不正です');
   for(const person of patch.staff){
    if(!['木村','山岸','中村','藤野','関根'].includes(person.name)||!Array.isArray(person.months)||person.months.length>12)throw Error('スタッフ形式が不正です');
    if(current.accessMode==='personal'&&current.staff[0]?.name!==person.name)continue;
    let dest=next.staff.find(x=>x.name===person.name);
    if(!dest){dest={name:person.name,months:[],summary:{}};next.staff.push(dest);}
    for(const r of person.months){
     if(!safeMonth(r))throw Error('月が不正です');
     let record=dest.months.find(x=>x.month===r.month);
     if(!record){record={month:r.month};dest.months.push(record);}
     for(const k of allowedStaff)if(Object.hasOwn(r,k)){
      if(!valid(r[k]))throw Error(k+'の値が不正です');
      if(record[k]!==r[k]){record[k]=r[k];changes++;}
     }
    }
    dest.months.sort((a,b)=>a.month-b.month);
   }
  }
  return {next,changes};
 }
 async function retrieve(){
  const privateJwk=localStorage.getItem(PRIVATE);if(!privateJwk){notify('初回設定が必要です');return}
  try{
   const response=await fetch('./private-sync.json?t='+Date.now(),{cache:'no-store'});
   if(response.status===404){notify('同期用データはまだ登録されていません');return}
   if(!response.ok)throw Error('同期サーバーに接続できません');
   const envelope=await response.json();
   if(envelope.version!==1||envelope.algorithm!=='RSA-OAEP-256+A256GCM')throw Error('暗号化形式が不正です');
   const key=await crypto.subtle.importKey('jwk',JSON.parse(privateJwk),{name:'RSA-OAEP',hash:'SHA-256'},false,['decrypt']);
   const rawKey=await crypto.subtle.decrypt({name:'RSA-OAEP'},key,fromB64(envelope.wrappedKey));
   const aes=await crypto.subtle.importKey('raw',rawKey,'AES-GCM',false,['decrypt']);
   const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv:fromB64(envelope.iv)},aes,fromB64(envelope.ciphertext));
   const patch=JSON.parse(new TextDecoder().decode(decrypted));
   const {next,changes}=mergePatch(patch);
   if(changes){localStorage.setItem(STORAGE,JSON.stringify(next));notify('自動同期が完了しました（'+changes+'項目）');setTimeout(()=>location.reload(),300);}
   else notify('最新の実績に更新済みです');
  }catch(e){notify('同期できません：'+e.message)}
 }
 function downloadText(name,content){
  const a=document.createElement('a');const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);
 }
 async function setup(){
  if(localStorage.getItem(PRIVATE)){notify('暗号鍵の設定済みです');return}
  try{
   const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:3072,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
   const publicJwk=await crypto.subtle.exportKey('jwk',pair.publicKey),privateJwk=await crypto.subtle.exportKey('jwk',pair.privateKey);
   const backup=JSON.stringify(privateJwk,null,2);
   downloadText('salon-note-private-key-BACKUP.json',backup);
   localStorage.setItem(PRIVATE,JSON.stringify(privateJwk));
   const pubText=JSON.stringify(publicJwk);
   try{await navigator.clipboard.writeText(pubText);notify('秘密鍵を保存しました。ダウンロードした秘密鍵を安全に保管し、コピーされた公開鍵をChatGPTに送信してください。');}
   catch{const area=$('sync-public');area.value=pubText;area.hidden=false;notify('秘密鍵のバックアップを安全に保管し、下の公開鍵だけをChatGPTに送ってください。');}
  }catch(e){notify('鍵を作成できません：'+e.message)}
 }
 function init(){
  const host=document.querySelector('.tools');if(!host)return;
  const wrap=document.createElement('div');wrap.style.cssText='width:100%;font-size:12px;line-height:1.8;padding:12px;border:1px solid #dce5de;border-radius:10px;';
  wrap.innerHTML='<strong>非公開データの自動同期</strong><div id="sync-status">確認中…</div><button type="button" id="sync-setup" style="margin:6px 6px 0 0;padding:8px">初回設定（秘密鍵バックアップ）</button><button type="button" id="sync-now" style="padding:8px">今すぐ同期</button><textarea id="sync-public" hidden readonly style="width:100%;height:85px;margin-top:8px"></textarea><div>秘密鍵はChatGPTやGitHubに送らないでください。端末を変更する場合はバックアップが必要です。</div>';
  host.append(wrap);
  $('sync-setup').onclick=setup;$('sync-now').onclick=retrieve;
  retrieve();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
