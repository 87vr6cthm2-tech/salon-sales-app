'use strict';
(function(){
 const C=window.SalonData,E=window.SalonCrypto,P=window.SalonProtocol;
 const PRIVATE='salon-note-sync-private-key-v1';let busy=false,pending=null;
 const $=id=>document.getElementById(id),notify=t=>{$('sync-status').textContent=t;const hint=$('sync-indicator');if(hint)hint.textContent=t.startsWith('同期済み')?'同期済み':t.includes('初回設定')?'同期の初回設定が必要です':t.includes('相違')?'更新内容の確認が必要です':t.includes('できません')?'同期を確認してください':'同期設定は「設定・データ管理」から';};
 function download(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
 async function getText(url,max){const r=await fetch(url,{cache:'no-store',credentials:'omit',redirect:'error'});if(r.status===404)return null;if(!r.ok)throw Error('通信エラー '+r.status);if(Number(r.headers.get('content-length'))>max)throw Error('同期ファイルが大きすぎます');const s=await r.text();if(s.length>max)throw Error('同期ファイルが大きすぎます');return s}
 function showConflict(result){
  const settings=$('app-settings');if(settings)settings.open=true;const area=$('sync-conflicts');area.replaceChildren();
  const title=document.createElement('p');title.textContent='データは届いています。保存済みの数値と違いがあるため、反映前の確認が必要です。下の「変更内容を見る」で確認し、Excelの数値に更新する場合は黒いボタンを押してください。';area.append(title);
  const b=document.createElement('button');b.id='sync-accept';b.textContent='確認してExcelの数値を反映';b.style.cssText='display:block;width:100%;min-height:52px;background:#222;color:#fff;margin:12px 0;font-weight:700';b.onclick=()=>{
   if(!pending||!confirm('表示した既存値を変更します。更新前の状態は端末内に保存されます。反映しますか？'))return;
   try{const result=P.apply(C.read(),pending.payload,pending.envelope,pending.hash,true);C.save(result.next);pending=null;area.replaceChildren();notify('確認した変更を反映しました');retrieve()}catch(e){notify('反映できません：'+e.message)}
  };area.append(b);
  const skip=document.createElement('button');skip.textContent='この更新を見送り、既存値を保持';skip.onclick=()=>{if(!pending||!confirm('この更新全体を見送ります。新しい月も取り込まず、次の更新へ進みますか？'))return;try{const result=P.apply(C.read(),pending.payload,pending.envelope,pending.hash,'skip');C.save(result.next);pending=null;area.replaceChildren();notify('更新を見送りました');retrieve()}catch(e){notify(e.message)}};area.append(skip);
  const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='変更内容を見る（'+result.conflicts.length+'件）';details.append(summary);area.append(details);
  const labels={total:'総売上',named:'技術売上',yearOverYear:'技術売上の前年比',retail:'店販売上',reservation:'次回予約率'};
  for(const x of result.conflicts){const p=document.createElement('p');p.textContent=`${x.store==='funabori'?'船堀店':x.store} ${x.year}年${x.month}月 ${x.staff||'店舗'} ${labels[x.field]||x.field}：${x.before} → ${x.after}`;details.append(p)}
 }
 async function retrieve(){
  if(busy||pending)return;busy=true;
  try{
   const raw=localStorage.getItem(PRIVATE);if(!raw){notify('初回設定で公開鍵をChatGPTに送ってください');return}
   const privateJwk=JSON.parse(raw),id=await E.keyId(privateJwk),base='./sync/'+id+'/';
   const text=await getText(base+'manifest.json?t='+Date.now(),2_000_000);if(text===null){notify('初回設定済み。ChatGPTからの更新待ちです');return}
   const manifest=JSON.parse(text);P.checkManifest(manifest,id,C.read().sync[id]);
   let changes=0;
   for(const item of manifest.updates){
    if(item.revision<=(C.read().sync[id]?.revision||0))continue;
    const body=await getText(base+item.hash+'.json',8_000_000);if(body===null)throw Error('更新ファイルの公開待ちです。後で再試行します');
    if(await E.hash(body)!==item.hash)throw Error('更新ファイルの整合性を確認できません');
    const envelope=JSON.parse(body);if(envelope.keyId!==id||envelope.revision!==item.revision)throw Error('宛先・更新番号が一致しません');
    const payload=await E.decrypt(envelope,privateJwk);
    const result=P.apply(C.read(),payload,envelope,item.hash);
    if(result.blocked){pending={payload,envelope,hash:item.hash};showConflict(result);notify('既存値との相違 '+result.conflicts.length+'件を確認してください');return}
    C.save(result.next);changes+=result.changes;
   }
   notify('同期済み'+(C.read().accessMode==='shared'?'（店舗・全スタッフ共有）':'')+'：'+manifest.updates.length+'回の更新を確認（今回 '+changes+'項目）');
  }catch(e){notify('同期できません：'+e.message)}finally{busy=false}
 }
 async function publicKey(){
  try{const raw=localStorage.getItem(PRIVATE);if(!raw)throw Error('先に初回設定をしてください');const pub=JSON.stringify(E.publicOnly(JSON.parse(raw)));$('sync-public').value=pub;$('sync-public').hidden=false;try{await navigator.clipboard.writeText(pub);notify('公開鍵をコピーしました。ChatGPTに送ってください')}catch{notify('下の公開鍵をコピーしてChatGPTに送ってください')}}catch(e){notify(e.message)}
 }
 async function setup(){
  if(localStorage.getItem(PRIVATE)){await publicKey();return}
  try{
   const pair=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:3072,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['encrypt','decrypt']);
   const jwk=await crypto.subtle.exportKey('jwk',pair.privateKey);localStorage.setItem(PRIVATE,JSON.stringify(jwk));await publicKey();
   notify('初回設定済み。公開鍵をChatGPTへ送信し、「秘密鍵バックアップ」も保存してください');
  }catch(e){notify('設定できません：'+e.message)}
 }
 async function restore(file){
  if(!file)return;
  try{
   if(file.size>10000)throw Error('鍵ファイルが大きすぎます');const jwk=JSON.parse(await file.text());
   if(!jwk.d)throw Error('秘密鍵バックアップを選択してください');await E.keyId(jwk);
   const pub=E.publicOnly(jwk),probe=await E.encrypt({test:true},pub,1,null);await E.decrypt(probe,jwk);
   if(localStorage.getItem(PRIVATE)&&!confirm('同期鍵をバックアップの鍵に切り替えますか？'))return;
   localStorage.setItem(PRIVATE,JSON.stringify(jwk));pending=null;$('sync-conflicts').replaceChildren();await publicKey();await retrieve();
  }catch(e){notify('復元できません：'+e.message)}
 }
 function init(){
  const host=document.querySelector('.settings-tools');if(!host)return;
  const wrap=document.createElement('section');wrap.className='sync-settings';
  wrap.innerHTML='<strong>非公開データの自動同期</strong><p>スタッフの方も、このスマホの公開鍵を木村さんへ送り、登録を依頼してください。登録後は店舗・全スタッフの実績が届きます。以前の本人用データは保持します。</p><p id="sync-status" role="status"></p><div id="sync-conflicts"></div><button id="sync-setup">このスマホを同期登録（公開鍵）</button> <button id="sync-backup">秘密鍵バックアップ</button> <label class="upload">秘密鍵を復元<input id="sync-restore" type="file" accept=".json"></label> <button id="sync-now">今すぐ同期</button><textarea id="sync-public" hidden readonly aria-label="ChatGPTに送る公開鍵" style="width:100%;height:90px;box-sizing:border-box"></textarea><p class="muted">公開鍵だけをChatGPTに送ってください。秘密鍵は端末変更時の復元に必要です。画面を開いた時・戻った時・表示中の約60秒ごとに更新を確認します。</p>';
  host.append(wrap);$('sync-setup').onclick=setup;$('sync-now').onclick=()=>{if(pending){$('app-settings').open=true;$('sync-conflicts').scrollIntoView({block:'center',behavior:'smooth'});notify('既存値との相違があります。黒い「確認してExcelの数値を反映」ボタンから確認してください');}else retrieve();};
  $('sync-backup').onclick=()=>{try{const raw=localStorage.getItem(PRIVATE);if(!raw)throw Error('先に初回設定してください');download('salon-note-private-key-BACKUP.json',raw);notify('秘密鍵を「ファイル」に保存してください。ChatGPTやGitHubへ送らないでください')}catch(e){notify(e.message)}};
  $('sync-restore').onchange=e=>{const file=e.target.files[0];e.target.value='';restore(file)};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)retrieve()});window.addEventListener('online',retrieve);window.addEventListener('pageshow',retrieve);
  setInterval(()=>{if(!document.hidden)retrieve()},60000);retrieve();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
