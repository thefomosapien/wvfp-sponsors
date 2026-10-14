// Simulated Google Apps Script services for tests/apps-script.test.js
// Minimal simulation of the Apps Script services used by google-apps-script.gs
const fs=require('fs'), vm=require('vm');
function makeSheet(name){
  const g=[]; // 2D grid
  const sh={name,grid:g,frozen:0,formats:{},
    getLastRow:()=>{for(let r=g.length;r>0;r--){if((g[r-1]||[]).some(v=>v!==''&&v!=null))return r;}return 0;},
    getLastColumn:()=>g.reduce((m,row)=>{let c=0;(row||[]).forEach((v,i)=>{if(v!==''&&v!=null)c=i+1});return Math.max(m,c)},0),
    setFrozenRows(n){sh.frozen=n},
    getDataRange(){const R=sh.getLastRow(),C=sh.getLastColumn();return sh.getRange(1,1,Math.max(R,1),Math.max(C,1));},
    getRange(r,c,nr=1,nc=1){
      if(r<1||c<1||nr<1||nc<1) throw new Error(`Bad range ${r},${c},${nr},${nc}`);
      return {
        getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>{const v=(g[r-1+i]||[])[c-1+j];return v==null?'':v;})),
        setValues(vals){ if(vals.length!==nr||vals.some(x=>x.length!==nc)) throw new Error('setValues dims mismatch');
          vals.forEach((row,i)=>{g[r-1+i]=g[r-1+i]||[];row.forEach((v,j)=>{
            // Sheets: a leading apostrophe forces text and is hidden
            if(typeof v==='string'&&v.startsWith("'")) v=v.slice(1);
            else if(typeof v==='string'&&v.startsWith('=')) v={FORMULA:v};
            g[r-1+i][c-1+j]=v;});}); return this;},
        setNumberFormats(f){ if(f.length!==nr||f.some(x=>x.length!==nc)) throw new Error('formats dims mismatch'); f.forEach((row,i)=>row.forEach((x,j)=>sh.formats[(r+i)+':'+(c+j)]=x)); return this;},
        setFontWeight(){return this;}
      };
    },
    appendRow(row){g[sh.getLastRow()]=row.slice();}
  };
  return sh;
}
function makeGas(ROOT, opts={}){
  const sheets={}; const mails=[]; const logs=[];
  const cache=new Map(); const props=new Map();
  let mailFail=opts.mailFail||false, quota=opts.quota==null?100:opts.quota;
  const ss={getSheetByName:n=>sheets[n]||null,insertSheet:n=>(sheets[n]=makeSheet(n))};
  const ctx={
    SpreadsheetApp:{getActiveSpreadsheet:()=>ss},
    MailApp:{getRemainingDailyQuota:()=>quota,sendEmail:m=>{if(mailFail)throw new Error('Service invoked too many times: email');quota--;mails.push(m);}},
    LockService:{getScriptLock:()=>({tryLock:()=>true,waitLock(){},releaseLock(){}})},
    CacheService:{getScriptCache:()=>({get:k=>cache.has(k)?cache.get(k):null,put:(k,v)=>cache.set(k,String(v)),remove:k=>cache.delete(k)})},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props.has(k)?props.get(k):null,setProperty:(k,v)=>props.set(k,String(v)),deleteProperty:k=>props.delete(k),getProperties:()=>Object.fromEntries(props)})},
    Utilities:{formatDate:(d,tz,f)=>d.toISOString().slice(0,f.length>10?16:10).replace('T',' ')},
    Session:{getScriptTimeZone:()=>'America/Denver'},
    ContentService:{MimeType:{JSON:'json'},createTextOutput:t=>({setMimeType:()=>t,getContent:()=>t})},
    ScriptApp:{getProjectTriggers:()=>[],newTrigger:()=>({timeBased:()=>({everyHours:()=>({create(){}})})})},
    console:{log:m=>logs.push(m)}, Date, JSON, Math, String, Number, Object, isNaN, parseInt
  };
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(ROOT+'integrations/google-apps-script.gs','utf8'),ctx);
  const post=params=>JSON.parse(ctx.doPost({parameter:params}));
  const tab=n=>sheets[n];
  const records=()=>{const s=sheets['Website Inquiries'];if(!s)return[];const h=s.grid[0];return s.grid.slice(1,s.getLastRow()).map(r=>Object.fromEntries(h.map((k,i)=>[k,r[i]])));};
  return {ctx,sheets,mails,logs,cache,props,post,tab,records,setMailFail:v=>mailFail=v,setQuota:v=>quota=v};
}
module.exports={makeGas,makeSheet};
