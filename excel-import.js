'use strict';
(function(){
 function parseFile(file){return new Promise(async(resolve,reject)=>{
  const frame=document.createElement('iframe');frame.hidden=true;frame.sandbox='allow-scripts';frame.src='./excel-reader.html';
  let timer;const done=(err,value)=>{clearTimeout(timer);window.removeEventListener('message',receive);frame.remove();err?reject(err):resolve(value)};
  const receive=e=>{if(e.source!==frame.contentWindow)return;if(e.data?.ready){file.arrayBuffer().then(buffer=>frame.contentWindow.postMessage({buffer},'*',[buffer])).catch(err=>done(err))}else if(e.data?.error)done(Error(e.data.error));else if(e.data?.sheets)done(null,e.data.sheets)};
  window.addEventListener('message',receive);document.body.append(frame);timer=setTimeout(()=>done(Error('Excel読込がタイムアウトしました。ChatGPTからの取込を利用してください')),30000);
 })}
 function init(){const host=document.querySelector('.import-actions');if(!host)return;
  const label=document.createElement('label');label.className='upload';label.textContent='Excelから取込（予備）';const input=document.createElement('input');input.type='file';input.accept='.xlsx';label.append(input);host.append(label);
  const status=document.createElement('p');status.className='muted';host.append(status);
  input.onchange=async()=>{const f=input.files[0];input.value='';if(!f)return;
   try{if(f.size>5000000)throw Error('5MB以下のExcelを選択してください');status.textContent='読み取り中…';
    const store=document.getElementById('store-select')?.value||'funabori';
    const parsed=SalonExcel.parse(await parseFile(f),store),result=SalonData.merge(SalonData.read(),parsed.records);
    if(result.conflicts.length){const message=result.conflicts.map(x=>`${x.year}年${x.month}月 ${x.staff||'店舗'} ${x.field}: ${x.before} → ${x.after}`).join('\n');if(!confirm('既存値と異なる項目があります。修正版として反映しますか？\n'+message)){status.textContent='既存データを変更せず中止しました';return}}
    else if(!confirm(store+' の実績 '+parsed.records.length+'件を取り込みますか？'))return;
    // Read again after parsing; never overwrite an intervening synchronization.
    const next=SalonData.merge(SalonData.read(),parsed.records,result.conflicts.length>0);if(!result.conflicts.length&&next.conflicts.length)throw Error('同期で既存値が変わりました。もう一度取り込んでください');
    SalonData.save(next.next);status.textContent='取込完了。'+parsed.warnings.join('。');
   }catch(e){status.textContent='取込できません：'+e.message}
  };
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();
