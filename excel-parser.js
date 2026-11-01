'use strict';
(function(root){
 const C=typeof module!=='undefined'?require('./data-core.js'):root.SalonData;
 const norm=x=>String(x??'').normalize('NFKC').trim();
 const month=x=>{const m=norm(x).match(/^(\d{1,2})(?:月)?$/);return m&&+m[1]>0&&+m[1]<=12?+m[1]:null};
 const METRICS={'総売':'sales','技術':'technical','店販':'retail','技術客数':'customers','来店客数':'customers','新規人数':'newCustomers','次回予約率':'reservation','生産性(技術売)':'productivityTechnical','生産性(総売)':'productivityTotal','1日平均人数':'dailyFte','総単価':'ticket','技術単価':'technicalTicket','店販比率':'retailRatio','失客数':'lostCustomers','累計再来店率':'retentionCumulative'};
 function parse(sheets,store){
  if(!/^[-a-z0-9]{1,40}$/.test(store))throw Error('店舗IDを指定してください');
  const map=new Map(),warnings=[];
  const names=new Set(C.STAFF);
  for(const [title,rows] of Object.entries(sheets))if(/年売上$/.test(title))for(const r of rows){if(typeof r[0]==='string'&&!['合計','平均','目標','総計'].includes(norm(r[0]))&&((month(r[1])===1&&month(r[2])===2)||['新規','総客数'].includes(norm(r[1]))))names.add(norm(r[0]));}
  const set=(year,m,staff,k,v,rate=false)=>{
   if(v===null||v===undefined||v==='')return;
   if(typeof v!=='number'||!Number.isFinite(v))throw Error('数値・数式エラーを確認してください：'+year+'年 '+m+'月 '+k);
   const r={store,year,month:m,staff,values:{[k]:rate?Math.round(v*10000)/100:v}};try{C.record(r)}catch(e){throw Error(year+'年 '+m+'月 '+staff+' '+k+': '+v+' / '+e.message)};
   const key=C.id(r);if(!map.has(key))map.set(key,{...r,values:{}});const dst=map.get(key).values;
   if(C.own(dst,k)&&dst[k]!==r.values[k])throw Error('Excel内で値が競合しています：'+key+' '+k);dst[k]=r.values[k];
  };
  for(const [title,rows] of Object.entries(sheets)){
   const match=norm(title).match(/^(20\d{2})年(売上|再来率|再来店率|客数|失客数|次回予約率)?$/);if(!match)continue;
   const y=+match[1],kind=match[2];
   if(!Array.isArray(rows)||rows.length>2000)throw Error('Excelの行数が不正です');
   if(!kind){
    const header=rows.find(r=>month(r[1])===1&&month(r[2])===2);
    if(!header)throw Error(title+'の月見出しを確認してください');
    const seen=new Set();
    for(const row of rows){const k=METRICS[norm(row[0])];if(!k)continue;if(seen.has(k))throw Error(title+'の項目が重複しています：'+k);seen.add(k);
     for(let col=1;col<=12;col++)set(y,month(header[col]),null,k,row[col],['reservation','retailRatio','retentionCumulative'].includes(k));
    }
    if(!seen.has('sales'))throw Error(title+'に総売の行がありません');
   }else{
    for(let i=0;i<rows.length;i++){
     const name=norm(rows[i][0]);if(!names.has(name))continue;
     if(kind==='売上'){
      if(month(rows[i][1])!==1||month(rows[i][2])!==2)throw Error(title+' '+name+' スタッフ売上の月見出しを確認してください');
      let end=i+1;while(end<rows.length&&!names.has(norm(rows[end][0])))end++;
      const fields={'技術':'named','店販':'retail','総売':'total','次回予約率':'reservation'};
      for(let j=i+1;j<end;j++){const k=fields[norm(rows[j][0])];if(!k)continue;for(let c=1;c<=12;c++){
       const headerMonth=month(rows[i][c])??month(rows.find(r=>month(r[1])===1&&month(r[12])===12)?.[c]);if(headerMonth!==c)throw Error('月見出しが確認できません');
       set(y,c,name,k,rows[j][c],k==='reservation');
       if(k==='named'&&C.number(rows[j][c])&&norm(rows[j+1]?.[0])==='前年'&&rows[j+1][c]>0)set(y,c,name,'yearOverYear',rows[j][c]/rows[j+1][c]*100);
      }}
     }else if(kind==='失客数'||kind==='次回予約率'){
      for(let c=1;c<=12;c++){const m=month(rows[i][c]);if(!m)throw Error('月見出しが不正です');set(y,m,name,kind==='失客数'?'lostCustomers':'reservation',rows[i+1]?.[c],kind==='次回予約率')}
     }else{
      const fields=kind==='客数'?['totalCustomers','namedCustomers','freeCustomers','newCustomers','newNamedCustomers']:['retentionNew','retentionNewReturn','retentionRepeat','retentionRegular','retentionReturn','retentionCumulative'];
      for(let j=i+1;j<rows.length&&!names.has(norm(rows[j][0]));j++){
       if(!/^\d{1,2}月$/.test(norm(rows[j][0])))continue;const m=month(rows[j][0]);if(!m)continue;
       // Formula-only zero placeholders in future customer months are not actuals.
       if(kind==='客数'&&rows[j][1]==null&&rows[j][2]==null)continue;
       fields.forEach((k,c)=>set(y,m,name,k,rows[j][c+1],kind!=='客数'));
      }
     }
    }
   }
  }
  const records=[...map.values()];
  // Store formula cells may evaluate to zero while the sales input is blank.
  const clean=records.filter(r=>r.staff!==null||C.own(r.values,'sales'));
  if(!clean.length)throw Error('対応する実績がありません');
  C.records(clean);
  if(!clean.some(r=>r.staff&&C.own(r.values,'reservation')))warnings.push('スタッフ別の次回予約率は資料にない場合、未登録のまま保持します');
  return {records:clean,warnings};
 }
 const api={parse};if(typeof module!=='undefined')module.exports=api;root.SalonExcel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
