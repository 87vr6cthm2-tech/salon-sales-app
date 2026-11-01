'use strict';
(function(root){
 const C=typeof module!=='undefined'?require('./data-core.js'):root.SalonData;
 function checkManifest(m,id,state){
  if(m?.version!==2||m.keyId!==id||!Array.isArray(m.updates)||m.updates.length>10000||m.updates.some((u,i)=>u.revision!==i+1||!/^[a-f0-9]{64}$/.test(u.hash)))throw Error('同期履歴が不正です');
  if(state&&(m.updates.length<state.revision||m.updates[state.revision-1]?.hash!==state.hash))throw Error('古い同期履歴または履歴の改変を検出しました');
 }
 function apply(db,payload,envelope,hash,replace=false){
  const d=C.migrate(db),state=d.sync[envelope.keyId];
  if(envelope.revision!==(state?.revision||0)+1||envelope.previous!==(state?.hash||null))throw Error('更新順序が一致しません');
  if(payload?.version!==2||!Array.isArray(payload.sourceHashes)||!payload.sourceHashes.length||payload.sourceHashes.some(x=>!/^[a-f0-9]{64}$/.test(x)))throw Error('同期内容が不正です');
  C.records(payload.records);
  const sharing=payload.sharing;
  if(sharing && (sharing.mode!=='store-all'||!/^[-a-z0-9]{1,40}$/.test(sharing.store)||payload.records.some(r=>r.store!==sharing.store)))throw Error('共有範囲が不正です');
  // Only an explicitly addressed, decrypted store-wide delivery may migrate a personal view.
  const upgrade=sharing&&d.accessMode==='personal'&&replace!=='skip';
  if(upgrade){d.accessMode='shared';delete d.personalName;}
  const duplicate=!upgrade&&payload.sourceHashes.every(x=>d.imports.includes(x));
  const result=duplicate||replace==='skip'?{next:d,changes:0,conflicts:[]}:C.merge(d,payload.records,replace);
  if(result.conflicts.length&&!replace)return {...result,blocked:true};
  result.next.sync[envelope.keyId]={revision:envelope.revision,hash};
  result.next.imports=[...new Set([...d.imports,...payload.sourceHashes])];return result;
 }
 const api={checkManifest,apply};if(typeof module!=='undefined')module.exports=api;root.SalonProtocol=api;
})(typeof globalThis!=='undefined'?globalThis:this);
