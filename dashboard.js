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
 for(const p of [...personData].sort((a,b)=>{const order=['木村','中村','山岸','藤野','関根'];const ia=order.indexOf(a.name),ib=order.indexOf(b.name);return (ia<0?999:ia)-(ib<0?999:ib);}))makeButton(staffRow,p.name,()=>{staff=p.name;show();},p.name===staff);
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
   const lostCount=year?(person.summary?.lostCustomersJanSep??null):(selected?.lostCustomers??(m===9?person.summary?.lostCustomersSeptember:null));
   const priorLost=person.months.find(x=>Number(x.month)===m-1)?.lostCustomers??null;
   const difference=!year&&lostCount!=null&&priorLost!=null?lostCount-priorLost:null;
   const lostNote=year?'1〜9月の合計（10月は未登録）':lostCount==null?'選択月のデータ未登録':difference==null?'前月比：比較データなし':difference===0?'前月比：±0名（変化なし）':difference>0?'前月比：+'+num(difference)+'名（増加）':'前月比：'+num(difference)+'名（減少）';
   addCard('失客数',lostCount==null?'未登録':num(lostCount)+'名',lostNote);

   // Actionable KPI scorecard and goal simulation, visible on the sales landing screen.
   const score=add(content,'section','modern-panel sales-scorecard');
   add(score,'h3','','売上改善スコアカード');
   const kpiItems=[
    ['指名技術客単価',customers&&amount!=null?amount/customers:null,12000,'yen'],
    ['店販比率',v('total')>0&&v('retail')!=null?100*v('retail')/v('total'):null,10,'pct'],
    ['次回予約率',year?null:selected?.reservation??null,60,'pct']
   ];
   for(const [name,value,target,unit] of kpiItems){
    const line=add(score,'div','score-row');
    add(line,'span','',name);
    add(line,'strong','',value==null?'未登録':unit==='yen'?yen(value):pct(value));
    add(line,'small','',unit==='yen'?'目標 '+yen(target):'目標 '+pct(target));
    add(line,'b','score-state '+(value!=null&&value>=target?'met':'needs'),value==null?'—':value>=target?'達成':'改善');
   }
   if(!year){
    const box=add(content,'section','modern-panel goal-simulator');
    add(box,'h3','','目標達成シミュレーション');
    const label=add(box,'label','','指名技術売上の月間目標（円）');
    const input=add(label,'input');input.type='number';input.inputMode='numeric';input.min='1';input.step='1000';input.placeholder='目標を入力';
    const goalKey=person.name+'-2026-'+m;
    let saved={};try{saved=JSON.parse(localStorage.getItem('salon-note-coaching-v1')||'{}')||{}}catch(e){}
    input.value=saved[goalKey]?.namedGoal??'';
    const output=add(box,'div','goal-result');
    const fill=add(box,'div','goal-track');const fillbar=add(fill,'i','goal-fill');
    const meta=add(box,'p','muted','');const save=add(box,'button','coach-save','この目標を保存');
    const draw=()=>{
     const target=Number(input.value);
     if(!input.value.trim()||!Number.isFinite(target)||target<=0||amount==null){output.textContent='個人目標を入力すると、達成率と必要人数を表示します。';meta.textContent='';fillbar.style.width='0%';return;}
     const gap=Math.max(0,target-amount),ticket=customers>0?amount/customers:null;
     const pieces=['達成率 '+pct(amount/target*100),'あと '+yen(gap)];
     if(ticket>0)pieces.push('指名客数の目安 '+Math.ceil(gap/ticket)+'名');
     output.textContent=pieces.join(' ／ ');fillbar.style.width=Math.min(100,100*amount/target).toFixed(1)+'%';
     meta.textContent='現在の指名技術客単価を使った参考値です。実際の売上は施術内容により異なります。';
    };
    input.oninput=draw;draw();
    save.onclick=()=>{
     const target=Number(input.value);
     if(!input.value.trim()||!Number.isFinite(target)||target<=0){meta.textContent='正の金額を入力してください。';return;}
     try{const all=JSON.parse(localStorage.getItem('salon-note-coaching-v1')||'{}')||{};all[goalKey]={...(all[goalKey]||{}),namedGoal:target};localStorage.setItem('salon-note-coaching-v1',JSON.stringify(all));meta.textContent='目標をこの端末に保存しました。';}
     catch(e){meta.textContent='保存に失敗しました。';}
    };
   }

   chart('指名売上の推移',person.months,x=>x.named,previous);
  }else if(section==='customers'){
   const grid=miniGrid();const addCard=(label,value)=>{const z=add(grid,'div','mini-card');add(z,'div','mini-label',label);add(z,'strong','mini-number',format(value,'people'));};
   for(const [label,key]of [['総客数','totalCustomers'],['指名客数','namedCustomers'],['フリー客数','freeCustomers'],['新規客数','newCustomers'],['新規指名','newNamedCustomers']])addCard(label,v(key));
   chart('指名客数の推移',person.months,x=>x.namedCustomers,null,'people');
  }else if(section==='retention'){
   add(content,'p','muted','月別の再来店率を下に一覧表示します。');
  }else if(section==='lost'){
   add(content,'p','muted','月別の失客人数と前月比較を下に一覧表示します。');
  }
  // Retention and lost-customer data stay visible without opening any tabs or accordions.
  const retFields=[['新規再来率','retentionNew'],['新再率','retentionNewReturn'],['再来率','retentionRepeat'],['常連再来率','retentionRegular'],['リターン率','retentionReturn'],['累計再来店率','retentionCumulative']];
  const retPanel=add(content,'section','modern-panel');
  add(retPanel,'h3','','月別の再来店率');
  const retTiles=add(retPanel,'div','mini-grid');
  retFields.forEach(([label,key])=>{const tile=add(retTiles,'div','mini-card');add(tile,'div','mini-label',label);add(tile,'strong','mini-number',selected?.[key]==null?'未登録':pct(selected[key]));});
  const averageTitle=add(retPanel,'h3','average-heading','2026年 1〜9月の平均');
  const averages=add(retPanel,'div','average-grid');
  const summary=person.summary?.retentionAverageJanSep||{};
  const sourceKeys={retentionNew:'new',retentionNewReturn:'newReturn',retentionRepeat:'repeat',retentionRegular:'regular',retentionReturn:'return',retentionCumulative:'cumulative'};
  for(const [label,key] of retFields){const entries=person.months.filter(x=>x.month<=9&&x[key]!=null);const fromSource=summary[sourceKeys[key]];const value=fromSource!=null?fromSource:entries.length===9?entries.reduce((sum,x)=>sum+Number(x[key]),0)/9:null;const e=add(averages,'div','average-item');add(e,'small','',label);add(e,'strong','',value==null?'未登録':pct(value));}
  add(retPanel,'p','muted','元資料の1〜9月平均を優先表示。ない場合は9か月すべての数値がある項目だけ単純平均を計算しています。');
  const retRows=person.months.filter(x=>x.month<=9);
  const retList=add(retPanel,'div','mobile-month-list');
  for(const row of retRows){
   const line=add(retList,'div','mobile-month-entry');
   add(line,'strong','mobile-month-name',row.month+'月');
   const values=add(line,'div','mobile-retention-grid');
   for(const [label,key] of retFields){const cell=add(values,'div','mobile-retention-item');add(cell,'span','mobile-retention-label',label);add(cell,'b','',row[key]==null?'—':pct(row[key]));}
  }
  chart('再来店率の推移（累計再来店率）',person.months.filter(x=>x.month<=9),x=>x.retentionCumulative,null,'pct');
  const lostPanel=add(content,'section','modern-panel');
  add(lostPanel,'h3','','月別の失客数');
  const lastLost=selected?.lostCustomers??(m===9?person.summary?.lostCustomersSeptember:null);
  const prior=person.months.find(x=>x.month===m-1)?.lostCustomers??null;
  const lostTile=add(lostPanel,'div','mini-card');
  add(lostTile,'div','mini-label',m+'月の失客数');
  add(lostTile,'strong','mini-number',lastLost==null?'未登録':num(lastLost)+'名');
  add(lostTile,'div','mini-sub',lastLost==null?'集計未登録':prior==null?'前月比：比較データなし':'前月比：'+(lastLost-prior>0?'+':'')+num(lastLost-prior)+'名'+(lastLost===prior?'（変化なし）':lastLost>prior?'（増加）':'（減少）'));
  const lostRows=person.months.filter(x=>x.month<=9);
  const lostValues=lostRows.filter(x=>x.lostCustomers!=null);
  const totalLost=lostValues.length===9?lostValues.reduce((sum,x)=>sum+Number(x.lostCustomers),0):person.summary?.lostCustomersJanSep??null;
  const avgLost=totalLost==null?null:totalLost/9;
  const overall=add(lostPanel,'div','loss-average');
  add(overall,'span','','1〜9月の月平均');add(overall,'strong','',avgLost==null?'未登録':avgLost.toFixed(1)+'名');
  add(overall,'small','',totalLost==null?'':'9か月合計 '+num(totalLost)+'名');
  const lostList=add(lostPanel,'div','mobile-lost-list');
  for(const row of lostRows){
   const line=add(lostList,'div','mobile-lost-entry');
   add(line,'span','',row.month+'月');
   add(line,'strong','',row.lostCustomers==null?'未登録':num(row.lostCustomers)+'名');
   const prev=person.months.find(x=>x.month===row.month-1)?.lostCustomers;
   const sub=row.lostCustomers==null||prev==null?'—':row.lostCustomers===prev?'±0名':(row.lostCustomers>prev?'+':'−')+num(Math.abs(row.lostCustomers-prev))+'名';
   add(line,'small','',row.month===1?'—':sub);
  }
  chart('失客数の推移',lostRows,x=>x.lostCustomers,null,'people');

  if(section==='sales'||section==='customers')monthlyTable(content,person.months,section==='sales'?[['指名技術売上','named','yen'],['総売上','total','yen'],['店販','retail','yen'],['指名客数','namedCustomers','people'],['前年比','yearOverYear','pct']]:[['総客数','totalCustomers','people'],['指名客数','namedCustomers','people'],['フリー客数','freeCustomers','people'],['新規','newCustomers','people'],['新規指名','newNamedCustomers','people']]);

  // Individual coaching cards: saved locally and never included in public source data.
  const noteKey='salon-note-coaching-v1';
  let saved={};try{saved=JSON.parse(localStorage.getItem(noteKey)||'{}')||{}}catch(e){}
  const recordKey=person.name+'-2026-'+m;
  const state=saved[recordKey]||{};
  const coaching=add(content,'section','modern-panel coach-panel');
  add(coaching,'h3','','次の成長につなげる');
  add(coaching,'p','muted','数字から改善候補を確認し、今月取り組む行動を1つ決めます。');
  const named=selected?.named??null,people=selected?.namedCustomers??null,totalSales=selected?.total??null,retail=selected?.retail??null;
  const ratio=totalSales&&retail!=null?100*retail/totalSales:null;
  const ticket=people&&named!=null?named/people:null;
  const reserve=selected?.reservation??null;
  const suggestions=[];
  if(ratio!=null&&ratio<10)suggestions.push({id:'retail',label:'店販比率',value:pct(ratio),target:'10%',action:'使用商品の説明とホームケア提案を行う'});
  if(ticket!=null&&ticket<12000)suggestions.push({id:'ticket',label:'指名技術客単価',value:yen(ticket),target:'¥12,000',action:'お客様の悩みに合わせて追加メニューを提案する'});
  if(reserve!=null&&reserve<60)suggestions.push({id:'reserve',label:'次回予約率',value:pct(reserve),target:'60%',action:'次回来店の時期を具体的に案内する'});
  if(!suggestions.length)add(coaching,'p','coach-good','設定済みの共通KPIは達成、または未登録です。次月の維持・改善テーマを設定しましょう。');
  else{const best=suggestions[0];add(coaching,'div','coach-focus','改善候補：'+best.label+' '+best.value+' ／ 目標 '+best.target);add(coaching,'p','',best.action);}
  const goalBox=add(coaching,'div','coach-goal');
  const goalLabel=add(goalBox,'label','','指名売上の個人目標（月額・円）');
  const goalInput=add(goalLabel,'input');goalInput.type='number';goalInput.min='0';goalInput.step='1000';goalInput.inputMode='numeric';goalInput.placeholder='例：1800000';goalInput.value=state.namedGoal??'';
  const progress=add(goalBox,'p','coach-progress','');
  const actionLabel=add(coaching,'label','coach-action-label','今月の行動目標');
  const action=add(actionLabel,'textarea');action.rows=2;action.maxLength=240;action.placeholder='例：使用商品の説明を毎日実施する';action.value=state.action??(suggestions[0]?.action||'');
  const checkLabel=add(coaching,'label','coach-check-label');
  const check=add(checkLabel,'input');check.type='checkbox';check.checked=!!state.completed;
  add(checkLabel,'span','','今月の取り組みを実行した');
  const noteLabel=add(coaching,'label','coach-action-label','振り返りメモ');
  const memo=add(noteLabel,'textarea');memo.rows=2;memo.maxLength=400;memo.placeholder='成果と翌月に変えること';memo.value=state.memo??'';
  const feedback=add(coaching,'p','muted','');
  const updateProgress=()=>{const target=Number(goalInput.value);progress.textContent=target>0&&Number.isFinite(target)&&named!=null?'目標達成率 '+pct(100*named/target)+' ／ 目標との差 '+yen(named-target):'個人目標を入力すると達成率を表示します。'};
  updateProgress();
  goalInput.oninput=updateProgress;
  const saveButton=add(coaching,'button','coach-save','行動目標とメモを保存');
  saveButton.onclick=()=>{const value=goalInput.value.trim();if(value&&(Number(value)<=0||!Number.isFinite(Number(value)))){feedback.textContent='目標は正の数字を入力してください。';return;}try{const all=JSON.parse(localStorage.getItem(noteKey)||'{}')||{};all[recordKey]={namedGoal:value===''?null:Number(value),action:action.value.slice(0,240),completed:check.checked,memo:memo.value.slice(0,400)};localStorage.setItem(noteKey,JSON.stringify(all));feedback.textContent='この端末に保存しました。';}catch(e){feedback.textContent='保存に失敗しました。空き容量などをご確認ください。';}};

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