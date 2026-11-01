'use strict';
(function(){
 const KEY='salon-note-funabori-dashboard-v2';
 const names=['木村','山岸','中村','藤野','関根'];
 const maps={retentionNew:1,retentionNewReturn:2,retentionRepeat:3,retentionRegular:4,retentionReturn:5,retentionCumulative:6};
 const validNumber=v=>typeof v==='number'&&Number.isFinite(v);
 const monthOf=x=>{const t=String(x??'').replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248));const m=t.match(/^\s*(\d{1,2})\s*月\s*$/);return m&&+m[1]>=1&&+m[1]<=12?+m[1]:null};
 const rows=(book,name)=>{const sh=book.Sheets[name];if(!sh)throw Error(name+' シートがありません');return XLSX.utils.sheet_to_json(sh,{header:1,defval:null,raw:true})};
 function build(book){
  const result={};for(const name of names)result[name]={};
  const set=(name,month,k,v)=>{if(validNumber(v)){const record=result[name][month]||(result[name][month]={month});record[k]=v}};
  const sale=rows(book,'2026年売上');
  for(let i=0;i<sale.length;i++){const name=sale[i]?.[0];if(!names.includes(name))continue;
   const cols=Array.from({length:12},(_,j)=>j+1);
   for(let j=1;j<=12;j++){const month=j;const offset=i;
    const get=n=>sale[offset+n]?.[j];
    set(name,month,'named',get(1));set(name,month,'retail',get(4));
    set(name,month,'total',get(7));set(name,month,'namedCustomers',get(10));
    const prev=get(2);const named=get(1);
    if(validNumber(prev)&&prev>0&&validNumber(named))set(name,month,'yearOverYear',named/prev*100);
   }
  }
  const ret=rows(book,'2026年再来率'),cust=rows(book,'2026年客数');
  for(const [arr,type] of [[ret,'ret'],[cust,'cust']]){
   for(let i=0;i<arr.length;i++){const name=arr[i]?.[0];if(!names.includes(name))continue;
    for(let j=i+1;j<Math.min(i+13,arr.length);j++){const row=arr[j]||[],m=monthOf(row[0]);if(!m)continue;
     if(type==='ret'){for(const [key,col]of Object.entries(maps)){const v=row[col];if(validNumber(v)&&v>=0&&v<=1)set(name,m,key,Math.round(v*10000)/100)}}
     else {for(const [key,col]of [['totalCustomers',1],['namedCustomers',2],['freeCustomers',3],['newCustomers',4],['newNamedCustomers',5]])set(name,m,key,row[col]);}
    }
   }
  }
  const lost=rows(book,'2026年失客数');
  for(let i=0;i<lost.length;i++){const name=lost[i]?.[0];if(!names.includes(name))continue;const value=lost[i+1]||[];
   for(let j=1;j<=12;j++)set(name,j,'lostCustomers',value[j]);
  }
  return result;
 }
 function merged(old,change,personal){
  const out=old?JSON.parse(JSON.stringify(old)):{year:2026,staff:[],storeMonthly:{months:[]}};
  if(personal&&out.staff.length!==1)throw Error('本人用のデータに不整合があります');
  let fields=0,months=0;const staffNames=personal?[out.staff[0].name]:names;
  for(const name of staffNames){let person=out.staff.find(x=>x.name===name);if(!person){person={name,months:[],summary:{}};out.staff.push(person);}
   for(const [m,changeRecord] of Object.entries(change[name]||{})){
    const existing=person.months.find(x=>Number(x.month)===+m);
    if(!existing){person.months.push({...changeRecord});months++;fields+=Object.keys(changeRecord).length-1;}
    else {for(const [k,v]of Object.entries(changeRecord)){if(k==='month')continue;if(existing[k]!==v){existing[k]=v;fields++;}}}
   }
   person.months.sort((a,b)=>a.month-b.month);
   const firstNine=person.months.filter(x=>x.month<=9);
   if(firstNine.length===9&&firstNine.every(x=>validNumber(x.lostCustomers)))person.summary.lostCustomersJanSep=firstNine.reduce((t,x)=>t+x.lostCustomers,0);
   const avg={};let complete=true;for(const [key,alias]of [['retentionNew','new'],['retentionNewReturn','newReturn'],['retentionRepeat','repeat'],['retentionRegular','regular'],['retentionReturn','return'],['retentionCumulative','cumulative']]){if(firstNine.length===9&&firstNine.every(x=>validNumber(x[key])))avg[alias]=firstNine.reduce((t,x)=>t+x[key],0)/9;else complete=false;}
   if(complete)person.summary.retentionAverageJanSep=avg;
  }
  return {out,fields,months};
 }

 function storeBook(book){
  const sheets=['2023年','2024年','2025年','2026年'];
  if(!sheets.some(n=>book.Sheets[n]))return null;
  const metricRows={'sales':'総売','technical':'技術','retail':'店販','customers':'技術客数','newCustomers':'新規人数','reservation':'次回予約率','productivityTechnical':'生産性（技術売）','productivityTotal':'生産性（総売）','dailyFte':'１日平均人数','ticket':'総単価','technicalTicket':'技術単価','retailRatio':'店販比率'};
  const history={};
  for(const sheetName of sheets){
   if(!book.Sheets[sheetName])continue;
   const year=parseInt(sheetName,10),sheet=XLSX.utils.sheet_to_json(book.Sheets[sheetName],{header:1,defval:null,raw:true});
   const lookup={};
   for(const row of sheet){const label=String(row?.[0]??'').trim();if(!lookup[label]&&label)lookup[label]=row;}
   const months=[];
   for(let month=1;month<=12;month++){
    const rec={month},col=month;
    for(const [field,label] of Object.entries(metricRows)){
     const row=lookup[label]||(field==='customers'?lookup['来店客数']:null);
     const value=row?.[col];
     if(validNumber(value)){
      rec[field]=(field==='reservation'||field==='retailRatio')?Math.round(value*10000)/100:value;
     }
    }
    // Only genuinely populated months; zero is a valid figure.
    if(!validNumber(rec.sales))continue;
    if(year===2026){
     const prior=year===2026?XLSX.utils.sheet_to_json(book.Sheets['2025年']||{}, {header:1,defval:null,raw:true}):[];
     const row=prior.find(x=>String(x?.[0]??'').trim()==='総売');
     const tech=prior.find(x=>String(x?.[0]??'').trim()==='技術');
     if(validNumber(row?.[col]))rec.prevSales=row[col];
     if(validNumber(tech?.[col]))rec.prevTechnical=tech[col];
    }
    months.push(rec);
   }
   history[year]=months;
  }
  if(!history[2026]?.length)throw Error('2026年の店舗売上実績が見つかりません');
  return history;
 }
 function mergeStore(old,history){
  const out=old?JSON.parse(JSON.stringify(old)):{year:2026,staff:[],storeMonthly:{months:[]}};
  if(out.accessMode==='personal')throw Error('個人用ファイルでは店舗全体の実績を読み込めません');
  out.storeMonthly=out.storeMonthly||{months:[]};
  const existing=out.storeMonthly.months||[];
  let count=0;
  for(const rec of history[2026]){
   let dest=existing.find(r=>Number(r.month)===rec.month);
   if(!dest){dest={month:rec.month};existing.push(dest);}
   for(const [k,v] of Object.entries(rec)){if(k==='month')continue;if(dest[k]!==v){dest[k]=v;count++;}}
  }
  out.storeMonthly.months=existing.sort((a,b)=>a.month-b.month);
  out.storeHistory={...(out.storeHistory||{}),...history};
  return {out,count};
 }

 function init(){
  const upload=document.querySelector('label.upload');if(!upload)return;
  const line=document.createElement('label');line.className='upload';line.textContent='Excelから実績を更新（店舗・スタッフ）';
  const input=document.createElement('input');input.type='file';input.accept='.xlsx';line.append(input);upload.parentNode.append(line);
  const status=document.createElement('p');status.className='muted';status.style.cssText='width:100%;line-height:1.6';upload.parentNode.append(status);
  input.addEventListener('change',async()=>{
   const file=input.files?.[0];input.value='';if(!file)return;
   try{
    if(!window.XLSX)throw Error('Excel読込ライブラリの読み込みに失敗しました。通信状況をご確認ください');
    if(file.size>5e6)throw Error('Excelファイルが5MBを超えています');
    status.textContent='Excelを読み取り中…';
    const wb=XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:false});
    const oldRaw=localStorage.getItem(KEY),old=oldRaw?JSON.parse(oldRaw):null,personal=old?.accessMode==='personal';
    const history=storeBook(wb);
    if(history){
     const result=mergeStore(old,history);
     if(!confirm('店舗売上分析を取り込みます。\\n2026年：'+history[2026].length+'か月・更新項目：'+result.count+'件\\n2023〜2025年の実績も履歴として保持します。\\nスタッフ別実績は変更しません。続けますか？')){status.textContent='更新をキャンセルしました';return;}
     localStorage.setItem(KEY,JSON.stringify(result.out));
     status.textContent='店舗実績を更新しました。';location.reload();return;
    }
    const changes=build(wb);
    const result=merged(old,changes,personal);
    const count=Object.values(changes).reduce((n,r)=>n+Object.keys(r).length,0);
    if(!count)throw Error('取り込める月別実績がありません');
    if(!confirm('対象：'+(personal?old.staff[0].name:'スタッフ5名')+'\nExcelの入力済み項目だけを更新します。\n変更項目 '+result.fields+'件・新規月 '+result.months+'件。\n既存のデータを保持して更新します。続けますか？')){status.textContent='更新をキャンセルしました';return;}
    localStorage.setItem(KEY,JSON.stringify(result.out));status.textContent='更新しました。画面を再読み込みします。';
    location.reload();
   }catch(e){status.textContent='取り込み失敗：'+e.message;}
  });
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();