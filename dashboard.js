'use strict';(()=>{
const $=id=>document.getElementById(id),key='salon-note-funabori-dashboard-v2';let data=null,tab='store',staff='all';
const yen=n=>n==null?'—':'¥'+Math.round(n).toLocaleString('ja-JP'),num=n=>n==null?'—':Number(n).toLocaleString('ja-JP'),pct=n=>n==null?'—':Number(n).toFixed(1)+'%';
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!=null)x.textContent=String(text);return x}
function add(parent,tag,cls,text){const x=el(tag,cls,text);parent.append(x);return x}
function total(arr,k){return arr.reduce((n,r)=>n+(Number(r[k])||0),0)}
function avg(arr,k){return arr.length?total(arr,k)/arr.length:null}
function metric(target,label,value,hint,dark=false){const a=add(target,'article','metric'+(dark?' dark':''));add(a,'span','label',label);add(a,'strong','',value);if(hint)add(a,'div','hint',hint)}
function panel(title){const p=add($('body'),'section','panel');add(p,'h3','',title);return p}
function table(p,headers,rows){const w=add(p,'div','tablewrap'),t=add(w,'table','table'),head=add(t,'thead'),tr=add(head,'tr');headers.forEach(x=>add(tr,'th','',x));const tb=add(t,'tbody');rows.forEach(row=>{const r=add(tb,'tr');row.forEach(x=>add(r,'td','',x))});}
function bars(p,rows,key){const max=Math.max(1,...rows.map(x=>x[key]||0));rows.forEach(r=>{const line=add(p,'div','barline');add(line,'span','mon',r.month+'月');const track=add(line,'div','bars'),bar=add(track,'i');bar.style.width=(100*(r[key]||0)/max).toFixed(2)+'%';add(line,'span','val',yen(r[key]));})}
function validate(d){if(!d||d.year!==2026||!Array.isArray(d.staff)||!d.storeMonthly||!Array.isArray(d.storeMonthly.months))throw Error('このアプリ用の実績JSONではありません。');return d}
function render(){const period=$('period'),old=period.value;period.replaceChildren();const dates=tab==='store'?(data?.storeMonthly?.months||[]):(data?.staff?.flatMap(x=>x.months)||[]);const months=[...new Set(dates.map(r=>Number(r.month)))].sort((a,b)=>a-b);for(const m of months){const x=add(period,'option','',m+'月');x.value=String(m)}period.value=[...period.options].some(x=>x.value===old)?old:String(months[months.length-1]||'');$('storeTab').classList.toggle('active',tab==='store');$('staffTab').classList.toggle('active',tab==='staff');show()}
function show(){const body=$('body');body.replaceChildren();$('viewTitle').textContent=tab==='store'?'船堀店 店舗実績':'スタイリスト別実績';$('viewSub').textContent=tab==='store'?'月末締め（登録された月のみ表示）':'15日締め。店舗集計とは締め日が異なります。';if(!data){const p=add(body,'div','empty');add(p,'strong','','2026年の実績ファイルを読み込んでください');add(p,'p','muted','数字は一般公開されず、この端末だけに保存されます。');return}if(tab==='store')renderStore();else renderStaff()}
function monthlyTrend(title,rows,series){const p=panel(title);const wrap=add(p,'div','tablewrap');const t=add(wrap,'table','table');const h=add(t,'thead'),hr=add(h,'tr');['月',...series.map(x=>x[0])].forEach(x=>add(hr,'th','',x));const body=add(t,'tbody');for(const row of rows){const tr=add(body,'tr');add(tr,'td','',row.month+'月');for(const [label,key,format] of series){const value=typeof key==='function'?key(row):row[key];add(tr,'td','',value==null?'未登録':format==='yen'?yen(value):format==='pct'?pct(value):num(value)+'名');}}}
function renderStore(){const m=$('period').value,rows=data.storeMonthly.months.filter(r=>m==='all'||r.month===Number(m));if(!rows.length)return;const aggregate=m==='all',sum=k=>total(rows,k),v=k=>aggregate?sum(k):rows[0][k],c=add($('body'),'div','metrics');const yoy=v('prevSales')?100*v('sales')/v('prevSales'):null;
metric(c,'総売上',yen(v('sales')),'前年同期間比 '+pct(yoy),true);metric(c,'技術売上',yen(v('technical')),'前年 '+yen(v('prevTechnical')));metric(c,'店販売上',yen(v('retail')),'店販比率 '+pct(v('sales')?v('retail')/v('sales')*100:0));metric(c,'技術客数',num(v('customers'))+'名','新規 '+num(v('newCustomers'))+'名');
const ds=add($('body'),'div','detailgrid');for(const [l,val] of [['総客単価',yen(aggregate?v('sales')/v('customers'):rows[0].ticket)],['技術客単価',yen(aggregate?v('technical')/v('customers'):rows[0].technicalTicket)],['次回予約率',pct(avg(rows,'reservation'))],['技術生産性',yen(avg(rows,'productivityTechnical'))],['総売生産性',yen(avg(rows,'productivityTotal'))],['1日平均人数',num(avg(rows,'dailyFte'))+'名']]){const x=add(ds,'div','detail');add(x,'small','',l);add(x,'b','',val)}
const goals=add($('body'),'div','detailgrid');const values=[['店販比率',v('sales')?100*v('retail')/v('sales'):null,10,'%'],['技術客単価',v('customers')?v('technical')/v('customers'):null,12000,'円'],['次回予約率',avg(rows,'reservation'),60,'%']];for(const [l,value,target,unit] of values){const e=add(goals,'div','detail');e.style.borderLeft=value!=null&&value>=target?'4px solid #598c6b':'4px solid #ba835c';add(e,'small','',l+'｜目標 '+(unit==='円'?yen(target):pct(target)));add(e,'b','',value==null?'—':unit==='円'?yen(value):pct(value));add(e,'small','',value==null?'データなし':(value>=target?'達成':'未達')+'・差 '+(unit==='円'?yen(value-target):(value-target).toFixed(1)+'pt'));}const p=panel('店舗の月別売上推移');bars(p,data.storeMonthly.months,'sales');monthlyTrend('店舗KPIの月別推移',data.storeMonthly.months,[['総売上','sales','yen'],['技術売上','technical','yen'],['店販','retail','yen'],['客数','customers','num'],['新規','newCustomers','num'],['次回予約','reservation','pct'],['前年同月比',r=>r.prevSales?100*r.sales/r.prevSales:null,'pct']]);
const x=panel('月別詳細・前年比');table(x,['月','総売上','前年','前年比','技術','店販','客数','新規','次回予約'],rows.map(r=>[r.month+'月',yen(r.sales),yen(r.prevSales),pct(r.prevSales?100*r.sales/r.prevSales:null),yen(r.technical),yen(r.retail),num(r.customers),num(r.newCustomers),pct(r.reservation)]));
const n=add($('body'),'p','notice','店舗データは月末締めです。未登録月は表示しません。生産性・次回予約率の累計欄は月別値の単純平均です。')}
function renderStaff(){
 const m=Number($('period').value);
 const tool=add($('body'),'div','tools');
 add(tool,'label','','スタイリスト');
 const select=add(tool,'select');
 for(const person of data.staff){const option=add(select,'option','',person.name);option.value=person.name;}
 if(!data.staff.some(x=>x.name===staff))staff=data.staff[0]?.name||'';
 select.value=staff;
 select.onchange=()=>{staff=select.value;show();};
 const person=data.staff.find(x=>x.name===staff);
 if(!person){add($('body'),'p','empty','スタッフ実績は未登録です');return;}
 const record=person.months.find(x=>Number(x.month)===m);
 if(!record){add($('body'),'p','empty',m+'月は未登録です');return;}
 const cards=add($('body'),'div','metrics');
 metric(cards,'指名技術売上',yen(record.named),'前年同月比 '+pct(record.yearOverYear),true);
 metric(cards,'総売上（フリー込み）',yen(record.total),'元資料の独立項目');
 metric(cards,'店販売上',yen(record.retail),'店販比率 '+(record.retail!=null&&record.total?pct(record.retail/record.total*100):'未登録'));
 metric(cards,'指名客数',num(record.namedCustomers)+'名','指名技術単価 '+yen(record.namedCustomers?record.named/record.namedCustomers:null));
 const p=panel(m+'月の客数・再来店・失客');if(m===10){add(p,'p','notice','10月の再来店率・失客数は元資料に未掲載です。次回予約率66.0%などとは別指標です。');}else if(m===9){add(p,'p','muted','9月の失客数は別集計の実績を参照しています。');}
 const detail=add(p,'div','detailgrid');
 const fields=[['総客数',record.totalCustomers,'people'],['フリー客数',record.freeCustomers,'people'],['新規客数',record.newCustomers,'people'],['新規指名',record.newNamedCustomers,'people'],['次回予約率',record.reservation,'percent'],['指名前年比',record.yearOverYear,'percent'],['失客数',record.lostCustomers??(m===9?person.summary?.lostCustomersSeptember:null),'people'],['新規再来率',record.retentionNew,'percent'],['新再率',record.retentionNewReturn,'percent'],['再来率',record.retentionRepeat,'percent'],['常連再来率',record.retentionRegular,'percent'],['リターン率',record.retentionReturn,'percent'],['累計再来店率',record.retentionCumulative,'percent']];
 for(const [label,value,unit] of fields){
  const d=add(detail,'div','detail');add(d,'small','',label);
  add(d,'b','',value==null?'未登録':unit==='percent'?pct(value):num(value)+'名');
 }
 const targets=panel('目標との差');
 const grid=add(targets,'div','detailgrid');
 const goals=[['店販比率',record.retail!=null&&record.total?record.retail/record.total*100:null,10,'%'],['指名技術客単価',record.namedCustomers?record.named/record.namedCustomers:null,12000,'円'],['次回予約率',record.reservation,60,'%']];
 for(const [name,value,target,unit] of goals){const d=add(grid,'div','detail');d.style.borderLeft=value!=null&&value>=target?'4px solid #598c6b':'4px solid #ba835c';add(d,'small','',name+'／目標 '+(unit==='円'?yen(target):pct(target)));add(d,'b','',value==null?'未登録':unit==='円'?yen(value):pct(value));add(d,'small','',value==null?'':(value>=target?'達成':'未達')+'・差 '+(unit==='円'?yen(value-target):(value-target).toFixed(1)+'pt'));}
 const bar=panel('指名売上の月別推移');bars(bar,person.months,'named');
 monthlyTrend('毎月の実績一覧',person.months,[['指名売上','named','yen'],['総売上','total','yen'],['店販','retail','yen'],['指名客数','namedCustomers','num'],['指名単価',x=>x.namedCustomers?x.named/x.namedCustomers:null,'yen'],['次回予約率','reservation','pct'],['指名前年比','yearOverYear','pct'],['失客数','lostCustomers','num'],['新規客数','newCustomers','num'],['総客数','totalCustomers','num'],['フリー客数','freeCustomers','num'],['新規指名','newNamedCustomers','num'],['新規再来率','retentionNew','pct'],['新再率','retentionNewReturn','pct'],['再来率','retentionRepeat','pct'],['常連再来率','retentionRegular','pct'],['リターン率','retentionReturn','pct'],['累計再来店率','retentionCumulative','pct']]);
 add($('body'),'p','notice','15日締め。累計ではなく選択月の実績を表示します。月別の元資料がない客数・再来店・失客の項目は「未登録」です。山岸の2026年6月の売上は元資料に不整合があります。');
}
$('storeTab').onclick=()=>{tab='store';render()};$('staffTab').onclick=()=>{tab='staff';render()};$('period').onchange=show;
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>3000000)throw Error('ファイルが大きすぎます');const obj=validate(JSON.parse(await file.text()));localStorage.setItem(key,JSON.stringify(obj));data=obj;render()}catch(err){alert('読み込みできません: '+err.message)}e.target.value=''};
try{const raw=localStorage.getItem(key);if(raw)data=validate(JSON.parse(raw))}catch(e){console.warn(e)}render();
})();