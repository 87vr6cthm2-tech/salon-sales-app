'use strict';
(()=>{
const key='salon-note-funabori-2026-v1',e=id=>document.getElementById(id);
const yen=n=>'¥'+n.toLocaleString('ja-JP');
let data;
try{const s=localStorage.getItem(key);if(s)data=JSON.parse(s)}catch{}
function render(){
 e('fbContent').replaceChildren();
 e('fbStatus').textContent=data?'この端末に保存済み':'未読み込み';
 if(!data)return;
 const sel=document.createElement('select');
 const all=document.createElement('option');all.value='all';all.textContent='1〜10月累計';sel.append(all);
 for(let i=1;i<=10;i++){const opt=document.createElement('option');opt.value=i;opt.textContent=i+'月';sel.append(opt)}
 const out=document.createElement('div');
 e('fbContent').append(sel,out);
 function show(){
 out.replaceChildren();
 const table=document.createElement('table');table.style.cssText='width:100%;font-size:13px';
 const head=document.createElement('tr');
 for(const h of ['スタッフ','指名売上','総売上','前年比','次回予約率']){let th=document.createElement('th');th.textContent=h;head.append(th)}
 table.append(head);
 for(const s of data.staff){
 const m=s.months.filter(v=>sel.value==='all'||v.month===Number(sel.value));
 const sum=k=>m.reduce((a,v)=>a+v[k],0);
 const vals=[s.name,yen(sum('named')),yen(sum('total')),(sel.value==='all'?s.yearOverYear:m[0]?.yearOverYear??0)+'%',m.length?(sum('reservation')/m.length).toFixed(1)+'%':'—'];
 const tr=document.createElement('tr');
 for(const val of vals){const td=document.createElement('td');td.textContent=val;td.style.cssText='padding:10px 5px;border-bottom:1px solid #ddd';tr.append(td)}
 table.append(tr);
 }
 const wrap=document.createElement('div');wrap.style.overflowX='auto';wrap.append(table);out.append(wrap);
 const p=document.createElement('p');p.textContent='※5名分の個人実績。店舗全体の総売上とは異なります。元資料の総売上（フリー込み）は店販を再加算していません。';p.style.fontSize='12px';out.append(p);
 }
 sel.onchange=show;show();
}
e('fbFile').onchange=async ev=>{
 const f=ev.target.files[0];if(!f)return;
 try{
 const d=JSON.parse(await f.text());
 if(d.year!==2026||d.store!=='i feel AVEDA 船堀店'||!Array.isArray(d.staff)||d.staff.length>30||d.staff.some(s=>!Array.isArray(s.months)||s.months.length>12||s.months.some(m=>!Number.isFinite(m.named)||!Number.isFinite(m.total))))throw Error('形式が違います');
 localStorage.setItem(key,JSON.stringify(d));data=d;render();
 }catch(error){alert('読み込みエラー: '+error.message)}
 ev.target.value='';
};
e('fbRemove').onclick=()=>{if(confirm('端末内の船堀店実績を削除しますか？')){localStorage.removeItem(key);data=null;render()}};
render();
})();