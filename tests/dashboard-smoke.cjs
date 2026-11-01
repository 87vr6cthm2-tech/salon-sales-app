// DOM logic smoke test only; this is not a browser or visual test.
const vm=require('node:vm'),fs=require('node:fs'),assert=require('node:assert/strict'),C=require('../data-core.js');
class Element {
 constructor(tag){this.tag=tag;this.children=[];this.style={};this.value='';this.textContent='';this.classList={toggle(){}}}
 append(...xs){this.children.push(...xs)} prepend(x){this.children.unshift(x)} replaceChildren(...xs){this.children=xs} setAttribute(){} get options(){return this.children} click(){} }
const elements={},document={getElementById:id=>elements[id]||null,createElement:t=>new Element(t),createElementNS:(_,t)=>new Element(t),querySelector:()=>elements.tools};
for(const id of ['body','storeTab','staffTab','period','viewTitle','viewSub','import','tools','store-select','year-select'])elements[id]=new Element('div');
const all=[];for(let month=1;month<=10;month++){all.push({store:'funabori',year:2026,month,staff:null,values:{sales:1000,technical:900,retail:100,customers:10,reservation:65}});for(const staff of C.STAFF)all.push({store:'funabori',year:2026,month,staff,values:{named:900,total:1000,retail:100,namedCustomers:10,reservation:65,retentionCumulative:90,lostCustomers:2}})}
const database=C.merge(null,all).next,storage=new Map([[C.KEY,JSON.stringify(database)]]),localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
const api={...C,read:()=>C.migrate(JSON.parse(localStorage.getItem(C.KEY)))};
const context={document,window:{SalonData:api,addEventListener(){}},localStorage,console,URL,Blob,setTimeout,alert:m=>{throw Error(m)},confirm:()=>true};
vm.runInNewContext(fs.readFileSync(require('path').join(__dirname,'../dashboard.js'),'utf8'),context);
function text(e){return [e.textContent,...e.children.map(text)].join(' ')}
assert(!text(elements.body).includes('読み込めません'));assert(text(elements.body).includes('次回予約率'));elements.staffTab.onclick();const output=text(elements.body);assert(output.includes('10月'));assert(output.includes('月別の再来店率'));assert(output.includes('月別の失客数'));assert(output.includes('65.0%'));assert(!output.includes('9月まで'));
console.log('Dashboard store/staff render, October retention/loss and reservation KPI: passed (simulated DOM)');
