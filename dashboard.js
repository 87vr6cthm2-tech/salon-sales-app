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
 const root=$('body'),personData=data.staff;
 if(!personData.length){add(root,'p','empty','スタッフデータがありません');return;}
 if(!personData.some(x=>x.name===staff))staff=personData[0].name;
 const person=personData.find(x=>x.name===staff);
 let m=Number($('period').value);
 if(!Number.isInteger(m)||m<1)m=10;
 let mode='month',section='sales';
 const format=(x,type='yen')=>x==null?'未入力':type==='yen'?yen(x):type==='pct'?pct(x):num(x)+'名';
 const previous=r=>r&&r.yearOverYear>0?r.named*100/r.yearOverYear:null;
 const aggregate=(arr,k)=>arr.length&&arr.every(x=>x[k]!=null)?arr.reduce((n,x)=>n+x[k],0):null;
 const makeButton=(parent,label,onClick,selected)=>{const b=add(parent,'button','picker-button'+(selected?' selected':''),label);b.type='button';b.onclick=onClick;return b;};
 const staffRow=add(root,'div','staff-choices');
 for(const p of personData)makeButton(staffRow,p.name,()=>{staff=p.name;show();},p.name===staff);
 const controls=add(root,'div','staff-controls');
 const modeLabel=add(controls,'label','','集計　'),modeSelect=add(modeLabel,'select');
 for(const [key,name] of [['month','単月'],['year','1〜10月累計']]){const option=add(modeSelect,'option','',name);option.value=key;}
 modeSelect.value=mode;
 const sectionTabs=add(root,'div','section-choices');
 const content=add(root,'div','staff-content');
 function refresh(){
  content.replaceChildren();
  const rows=person.months.filter(r=>mode==='year'||r.month===m);
  const r=person.months.find(x=>x.month===m);
  const year=mode==='year',periodName=year?'2026年 1〜10月':'2026年 '+m+'月';
  const head=add(content,'h2','staff-heading',person.name);
  add(head,'span','period-pill',periodName);
  const v=k=>year?aggregate(rows,k):r?.[k]??null;
  const annualPrev=()=>{if(!year)return previous(r);if(person.yearOverYear>0)return v('named')*100/person.yearOverYear;return null;};
  function highlight(label,value,prev,yearPct){
   const big=add(content,'section','hero-card');
   add(big,'div','hero-label',label);
   add(big,'strong','hero-number',value==null?'未入力':yen(value));
   if(yearPct!=null){const meta=add(big,'div','hero-meta');add(meta,'b','', '前年比 '+pct(yearPct));if(value!=null&&prev!=null)add(meta,'span','', '　'+(value>=prev?'+':'−')+yen(Math.abs(value-prev)));}
   add(big,'div','hero-previous','前年 '+(prev==null?'未入力':yen(prev)));
  }
  const mini=(label,val,sub)=>{const card=add(content,'div','mini-card');add(card,'div','mini-label',label);add(card,'strong','mini-number',val);if(sub)add(card,'div','mini-sub',sub);return card;};
  const miniGrid=()=>add(content,'div','mini-grid');
  function chart(title,arr,current,prior,type='yen'){
   const p=add(content,'section','modern-panel');add(p,'h3','',title);
   const legend=add(p,'div','chart-legend','● 2026年　');
   add(legend,'span','','┄ 2025年');
   const valid=arr.filter(x=>current(x)!=null);
   if(!valid.length){add(p,'p','muted','表示できる月別データはありません');return;}
   const width=670,height=210,left=52,right=12,top=18,bottom=30;
   const all=arr.flatMap(x=>[current(x),prior?prior(x):null]).filter(x=>Number.isFinite(x));
   const max=Math.max(1,...all)*1.13;
   const ns='http://www.w3.org/2000/svg', svg=document.createElementNS(ns,'svg');
   svg.setAttribute('viewBox', '0 0 '+width+' '+height);svg.setAttribute('role','img');svg.setAttribute('aria-label',title);
   svg.style.cssText='width:100%;height:auto;display:block;margin-top:20px';
   const xs=i=>left+(width-left-right)*i/Math.max(1,arr.length-1);
   const ys=value=>height-bottom-(height-top-bottom)*value/max;
   const node=(tag,attrs,text)=>{const n=document.createElementNS(ns,tag);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));if(text!=null)n.textContent=String(text);svg.append(n);return n;};
   for(let j=0;j<3;j++){const y=height-bottom-j*(height-top-bottom)/2;node('line',{x1:left,x2:width-right,y1:y,y2:y,stroke:'#dfe5df','stroke-width':1});const number=Math.round(max*j/2);node('text',{x:2,y:y+4,fill:'#82918b','font-size':11},type==='yen'?(number/10000).toFixed(0)+'万':type==='pct'?number+'%':number);}
   for(let i=0;i<arr.length;i++)node('text',{x:xs(i),y:height-7,'text-anchor':'middle',fill:'#7b8c85','font-size':11},arr[i].month+'月');
   const lineFor=(fn,color,dash)=>{let path='';arr.forEach((x,i)=>{const val=fn(x);if(val==null||!Number.isFinite(val))return;path+=(path?' L ':'M ')+xs(i).toFixed(1)+' '+ys(val).toFixed(1);});if(path)node('path',{d:path,fill:'none',stroke:color,'stroke-width':3,'stroke-dasharray':dash||'','stroke-linecap':'round','stroke-linejoin':'round'});};
   if(prior)lineFor(prior,'#b0bcb4','6 6');
   lineFor(current,'#2f7259','');
   arr.forEach((x,i)=>{const value=current(x);if(value!=null)node('circle',{cx:xs(i),cy:ys(value),r:x.month===m?5:3.5,fill:'#2f7259'});});
   p.append(svg);
  }
  const selected=r;
  if(section==='sales'){
   const amount=v('named'),before=annualPrev(),yoy=year?person.yearOverYear:selected?.yearOverYear;
   highlight('指名技術売上〈暫定〉',amount,before,yoy);
   const grid=miniGrid();
   const customers=v('namedCustomers');
   const addCard=(label,value,sub)=>{const z=add(grid,'div','mini-card');add(z,'div','mini-label',label);add(z,'strong','mini-number',value);if(sub)add(z,'div','mini-sub',sub);};
   addCard('指名客数',format(customers,'people'),year?'1〜10月合計':'前年の指名客数は資料確認中');
   addCard('指名技術客単価〈暫定〉',customers?yen(amount/customers):'未入力','目標 ¥12,000');
   addCard('総売上（フリー込み）',format(v('total')),'元資料の独立項目');
   addCard('店販売上',format(v('retail')),'目標 店販比率10%');
   chart('指名売上の推移',person.months,x=>x.named,previous);
  }else if(section==='customers'){
   const grid=miniGrid();const addCard=(label,value)=>{const z=add(grid,'div','mini-card');add(z,'div','mini-label',label);add(z,'strong','mini-number',format(value,'people'));};
   for(const [label,key]of [['総客数','totalCustomers'],['指名客数','namedCustomers'],['フリー客数','freeCustomers'],['新規客数','newCustomers'],['新規指名','newNamedCustomers']])addCard(label,v(key));
   chart('指名客数の推移',person.months,x=>x.namedCustomers,null,'people');
  }else if(section==='retention'){
   const keys=[['新規','retentionNew'],['新再','retentionNewReturn'],['再来','retentionRepeat'],['常連','retentionRegular'],['リターン','retentionReturn'],['累計','retentionCumulative']];
   const p=add(content,'section','modern-panel');add(p,'h3','', '再来店率 '+(year?'（1〜9月平均）':'（'+m+'月）'));
   if(year)add(p,'p','muted','元資料の集計済み平均値。10月は未登録です。');
   const summary=person.summary?.retentionAverageJanSep||{};
   const summaryKeys={retentionNew:'new',retentionNewReturn:'newReturn',retentionRepeat:'repeat',retentionRegular:'regular',retentionReturn:'return',retentionCumulative:'cumulative'};
   const rows=keys.map(([label,key])=>[label,pct(year?(summary[summaryKeys[key]]??null):r?.[key]??null)]);
   table(p,['区分','選択期間'],rows);
   const details=add(content,'details','modern-panel');const title=add(details,'summary','', '月別の再来店率を見る');title.style.cursor='pointer';
   monthlyTable(details,person.months,[['新規','retentionNew','pct'],['新再','retentionNewReturn','pct'],['再来','retentionRepeat','pct'],['常連','retentionRegular','pct'],['リターン','retentionReturn','pct'],['累計','retentionCumulative','pct']]);
  }else if(section==='lost'){
   const val=year?person.summary?.lostCustomersJanSep:v('lostCustomers');
   const grid=miniGrid(),card=add(grid,'div','mini-card');add(card,'div','mini-label','失客数 '+(year?'（1〜9月）':'（'+m+'月）'));add(card,'strong','mini-number',val==null?'未入力':num(val)+'名');
   chart('失客数の月別推移',person.months.filter(x=>x.month<=9),x=>x.lostCustomers,null,'people');
  }
  if(section==='sales'||section==='customers')monthlyTable(content,person.months,section==='sales'?[['指名技術売上','named','yen'],['総売上','total','yen'],['店販','retail','yen'],['指名客数','namedCustomers','people'],['前年比','yearOverYear','pct']]:[['総客数','totalCustomers','people'],['指名客数','namedCustomers','people'],['フリー客数','freeCustomers','people'],['新規','newCustomers','people'],['新規指名','newNamedCustomers','people']]);
  const note=add(content,'p','notice','15日締めの個人実績。店販を総売上（フリー込み）へ重複加算しません。再来店率・失客数は9月まで。金額の税込・税抜区分は未確認です。');
 }
 function monthlyTable(parent,rows,series){
  const p=add(parent,'div','modern-table-container'),t=add(p,'table','table'),head=add(t,'thead'),h=add(head,'tr');
  ['月',...series.map(x=>x[0])].forEach(x=>add(h,'th','',x));const body=add(t,'tbody');
  for(const row of rows){const tr=add(body,'tr');add(tr,'td','',row.month+'月');for(const [name,key,type]of series){const value=row[key];add(tr,'td','',format(value,type));}}
 }
 const sectionNames=[['sales','売上'],['customers','客数内訳'],['retention','再来店率'],['lost','失客数']];
 for(const [id,label]of sectionNames)makeButton(sectionTabs,label,()=>{section=id;Array.from(sectionTabs.children).forEach((b,i)=>b.classList.toggle('selected',sectionNames[i][0]===section));refresh();},section===id);
 modeSelect.onchange=()=>{mode=modeSelect.value;refresh();};
 refresh();
}
$('storeTab').onclick=()=>{tab='store';render()};$('staffTab').onclick=()=>{tab='staff';render()};$('period').onchange=show;
$('import').onchange=async e=>{const file=e.target.files[0];if(!file)return;try{if(file.size>3000000)throw Error('ファイルが大きすぎます');const obj=validate(JSON.parse(await file.text()));localStorage.setItem(key,JSON.stringify(obj));data=obj;render()}catch(err){alert('読み込みできません: '+err.message)}e.target.value=''};
try{const raw=localStorage.getItem(key);if(raw)data=validate(JSON.parse(raw))}catch(e){console.warn(e)}render();
})();