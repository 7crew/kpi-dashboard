// ── FIREBASE CONFIG — paste your project's config object here ──
// Firebase Console → Project Settings → General → "Your apps" → Web app → SDK setup
const firebaseConfig = {
  apiKey: "AIzaSyB1NQifbf8ThtLfOv1iUf56fMm5OMnfkdo",
  authDomain: "crew-kpi.firebaseapp.com",
  projectId: "crew-kpi",
  storageBucket: "crew-kpi.firebasestorage.app",
  messagingSenderId: "381628327171",
  appId: "1:381628327171:web:adc9218a371a9df5863536"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// kpiType: 'percentage' (slider, 0-100) or 'compliance' (starts at 100, deducts per logged miss)
//
// LEADERS now lives in Firestore (collection "leaders") so leaders/KPIs can be added or
// edited from the admin dashboard with no code changes, ever again. SEED_LEADERS below is
// ONLY used once, automatically, to populate Firestore the first time the app runs against
// an empty "leaders" collection — after that, Firestore is the source of truth and this
// constant is never read again.
const SEED_LEADERS=[
  {id:'kendra',name:'Kendra Burris',title:'Chief Executive Officer',active:true,order:0,kpis:[
    {label:'Development Team Build',desc:'Establish a fully functional, stand-alone development capability within 7Crew. Documented org structure with defined roles. All approved positions filled. Defined development processes implemented.',kpiType:'percentage'},
    {label:'Direct Report KPI Achievement',desc:'CEO bonus reflective of the same average percentage of team bonus. 100% completion of mid-year and year-end performance reviews. Documented corrective actions where goals are missed.',kpiType:'percentage'},
    {label:'Corporate & Franchise Relationships',desc:'Quarterly standing meetings with corporate and key franchise leadership. ≥90% attendance across scheduled meetings. Documented action items with progress tracking.',kpiType:'percentage'}
  ]},
  {id:'megan',name:'Megan Cockman',title:'Chief Financial Officer',active:true,order:1,kpis:[
    {label:'Operational Reporting',desc:'Provide actionable labor and inventory reporting that enables COO to operate efficiently. Hourly labor modeling with embedded manager training. Inventory reporting tools aligned with actual usage patterns.',kpiType:'percentage'},
    {label:'Operational Leverage & Overhead Management',desc:'Drive operating leverage by scaling overhead responsibly. G&A and overhead within board-approved thresholds as % of revenue. Clear reporting of fixed vs. variable cost structure.',kpiType:'percentage'},
    {label:'Scorecard Reporting & Site Selection Support',desc:'Improve correlation between scorecard ratings and post-open performance. High-scoring sites outperform low-scoring within 6–12 months. Scorecard approved and used consistently by Real Estate, Operations & Finance.',kpiType:'percentage'}
  ]},
  {id:'chris',name:'Chris Farr',title:'Chief Operating Officer',active:true,order:2,kpis:[
    {label:'World-Class Operations: Speed, Efficiency & Margin',desc:'Average customer wait times at or below benchmarks: 5:00 (periods 1–2), 4:30 (period 3), 4:00 (period 4), 3:45 (period 5), 3:30 (period 6+). Improved peak-hour throughput QoQ. Labor margins within target ranges.',kpiType:'percentage'},
    {label:'Manager Pipeline Succession Readiness',desc:'100% of new stands have a manager in training 8–12 weeks prior to opening. ≥75% of critical roles have at least one ready internal successor. Promotion readiness score averages ≥7.5. Quarterly measurement.',kpiType:'percentage'},
    {label:'Equipment Reliability & Rebuild Program',desc:'Consistent machine rebuild run rate: 78 machines/year (6 per period). ≥95% equipment uptime. Reduction in downtime incidents & emergency repair costs.',kpiType:'percentage'}
  ]},
  {id:'zac',name:'Zac Cockman',title:'Chief Growth Officer',active:true,order:3,kpis:[
    {label:'Systematic Stand Delivery & Operation Handoff',desc:'Deliver new stands through a repeatable, system-driven process. Stand Turnover Scorecard for 100% of new openings. End-of-year average score of 2 or better. NSO Tracker & Gantt Chart as primary cross-functional planning tool.',kpiType:'percentage'},
    {label:'New Stand Hiring, Retention & Training Effectiveness',desc:'1-Month Post-Opening Turnover ≤25% (baseline: 25.86%). Retention tracked consistently from opening through handoff. Year-over-year improvement vs. 2025 baseline. Increased and consistent 1Huddle usage.',kpiType:'percentage'}
  ]},
  {id:'aubrey',name:'Aubrey Stutler',title:'General Counsel',active:true,order:4,kpis:[
    {label:'Development Legal Turnaround Time',desc:'≥90% of LOIs within 5 business days. ≥90% of initial lease reviews within 10 business days. ≥90% of lease turns within 5 business days. ≥90% of title reviews completed in advance of REC meetings.',kpiType:'percentage'},
    {label:'Legal Throughput & Business Enablement',desc:'Core legal documents completed or in progress for 60 sites by 12/31/26. ≥95% of sites reaching lease execution have all core documents complete. ≥90% of routine contracts turned within 3 business days.',kpiType:'percentage'}
  ]},
  {id:'kyle',name:'Kyle Lair',title:'Chief People Officer',active:true,order:5,kpis:[
    {label:'Leadership Trainings & Manager Readiness',desc:'6 regional in-person leadership training sessions by year-end. 60+ people leaders trained total. 80% of attendees rate training as worth their time. Topics: coaching, progressive discipline, compliance, wage & hour laws, harassment prevention.',kpiType:'percentage'},
    {label:'Compliance & Risk Program',desc:'100% timely responsiveness to EEOC, DOL or similar agencies. 0 fines or penalties from HR process failure. 0 missed deadlines for HR-driven compliance obligations. 100% completion of required compliance training for FT employees.',kpiType:'compliance'}
  ]},
  {id:'brian',name:'Brian Thatcher',title:'Chief Development Officer',active:true,order:6,kpis:[
    {label:'KPI #1 — TBD',desc:'Placeholder — replace with Brian\'s actual first KPI and description.',kpiType:'percentage'},
    {label:'KPI #2 — TBD',desc:'Placeholder — replace with Brian\'s actual second KPI and description.',kpiType:'percentage'}
  ]}
];

// Mutable — populated at runtime by loadLeaders(). Every page must call
// `await loadLeaders()` before reading this array.
let LEADERS = [];

// Loads leaders from Firestore. On a brand-new project (empty "leaders" collection),
// seeds it once from SEED_LEADERS so nothing has to be re-typed.
// includeInactive: pass true to get departed leaders too (used by Manage Leaders screen).
// LEADERS' org info (name/title/active/order) is permanent, but their KPI definitions
// (label/desc/type) are now stored PER YEAR — so redefining KPIs for a new fiscal year
// never rewrites what an old year's report shows. If a year has no KPIs defined yet,
// it automatically borrows the most recent earlier year's list as an editable starting
// point (tagged via kpisSourceYear so the UI can say so), rather than showing blank.
async function loadLeaders(year, includeInactive){
  let snap = await db.collection('leaders').get();
  if(snap.empty){
    const batch = db.batch();
    SEED_LEADERS.forEach(l=>{
      const {kpis, ...profile} = l;
      batch.set(db.collection('leaders').doc(l.id), profile);
    });
    await batch.commit();
    const kpiBatch = db.batch();
    SEED_LEADERS.forEach(l=>{
      kpiBatch.set(db.collection('leaderKpis').doc('2026_'+l.id), { year:'2026', leaderId:l.id, kpis:l.kpis });
    });
    await kpiBatch.commit();
    snap = await db.collection('leaders').get();
  }
  let all = snap.docs.map(d=>d.data());
  all.sort((a,b)=>(a.order||0)-(b.order||0));
  const filtered = includeInactive ? all : all.filter(l=>l.active!==false);

  for(const l of filtered){
    const result = await loadLeaderKpisWithFallback(year, l.id);
    l.kpis = result.kpis;
    l.kpisSourceYear = result.sourceYear;
  }
  LEADERS = filtered;
  return LEADERS;
}

async function loadLeaderKpisWithFallback(year, leaderId){
  const doc = await db.collection('leaderKpis').doc(String(year)+'_'+leaderId).get();
  if(doc.exists) return { kpis: doc.data().kpis, sourceYear: null };
  for(let y=Number(year)-1; y>=Number(year)-10; y--){
    const priorDoc = await db.collection('leaderKpis').doc(String(y)+'_'+leaderId).get();
    if(priorDoc.exists) return { kpis: priorDoc.data().kpis, sourceYear: y };
  }
  return { kpis: [], sourceYear: null };
}

// Explicitly saves this year's KPI list for a leader — always writes its own
// independent record, so it can never retroactively change any other year's data.
async function saveLeaderKpisForYear(year, leaderId, kpis){
  await db.collection('leaderKpis').doc(String(year)+'_'+leaderId).set({ year:String(year), leaderId, kpis });
}

// Saves the leader's org info only (name/title/active/order) — KPI list is saved
// separately via saveLeaderKpisForYear.
async function saveLeaderProfile(leader){
  const {kpis, kpisSourceYear, ...profile} = leader;
  await db.collection('leaders').doc(leader.id).set(profile);
}

async function setLeaderActive(leaderId, active){
  await db.collection('leaders').doc(leaderId).update({ active });
}

function slugify(name){
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
}

// ── shared status helpers ──
const sClass=s=>'s-'+s;
const fClass=s=>({complete:'f-complete','on-track':'f-on-track','at-risk':'f-at-risk',behind:'f-behind','not-started':'f-not-started'}[s]||'f-not-started');
const sLabel=s=>({complete:'✓ Complete','on-track':'On Track','at-risk':'At Risk',behind:'Behind','not-started':'Not Started'}[s]||'Not Started');
const statusFromProgress=p=>p>=100?'complete':p>=75?'on-track':p>=40?'at-risk':p>0?'behind':'not-started';
// Pass/fail KPIs start at a perfect 100% (no misses logged yet); percentage KPIs start at 0%.
const defaultProgress=kpiType=>kpiType==='compliance'?100:0;
const avg=kpis=>kpis.length?Math.round(kpis.reduce((a,k)=>a+k.progress,0)/kpis.length):0;
const blended=(indivAvg,ebitdaPct)=>Math.round(indivAvg*0.3+ebitdaPct*0.7);
const pColor=p=>p>=70?'#12a06e':p>=40?'var(--amber)':'var(--accent)';
const eStatus=p=>p>=100?'Complete':p>=75?'On Track':p>=40?'In Progress':p>0?'Early Stage':'Not Started';
const currentYear=()=>new Date().getFullYear();
const fmtMoney=n=>n==null?null:'$'+Math.round(n).toLocaleString('en-US');
function escHtml(s){return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}

// ── AUTH ──
// Resolves once Firebase has checked the current login state.
// Returns {uid, role, leaderId, displayName} or null (and redirects if requiredRole set).
function requireSession(requiredRole){
  return new Promise((resolve)=>{
    auth.onAuthStateChanged(async (user)=>{
      if(!user){ location.href='index.html'; return resolve(null); }
      try{
        const doc = await db.collection('users').doc(user.uid).get();
        if(!doc.exists){ alert('No profile found for this login — contact an admin.'); await auth.signOut(); location.href='index.html'; return resolve(null); }
        const profile = doc.data();
        if(requiredRole && profile.role !== requiredRole){ location.href='index.html'; return resolve(null); }
        resolve({ uid: user.uid, role: profile.role, leaderId: profile.leaderId, displayName: profile.displayName });
      }catch(e){
        console.error(e);
        alert('Could not load your profile — check your connection and try again.');
        resolve(null);
      }
    });
  });
}

function logout(){ auth.signOut().then(()=>location.href='index.html'); }

// ── DATA ──
const PERIODS = ['Q1','Q2','Q3','Q4'];
function currentQuarter(){
  const m = new Date().getMonth(); // 0-11
  return PERIODS[Math.floor(m/3)];
}

async function loadKpiData(year, period, scopeLeaderId){
  let q = db.collection('kpiData').where('year','==',String(year)).where('period','==',period);
  if(scopeLeaderId) q = q.where('leaderId','==',scopeLeaderId);
  const snap = await q.get();
  return snap.docs.map(d=>d.data());
}

// Same as loadKpiData, but any KPI with no explicit entry yet THIS quarter is filled in
// with its most recent prior-quarter value from the same year — so a new quarter starts
// wherever the last one left off instead of resetting to blank. Nothing is written to
// Firestore by this — it's a display-time fallback; Q1's actual saved data is untouched,
// and the moment someone updates a KPI in the new quarter, that becomes its own real record.
async function loadKpiDataCarried(year, period, scopeLeaderId){
  const current = await loadKpiData(year, period, scopeLeaderId);
  const haveKey = new Set(current.map(r=>r.leaderId+'|'+r.kpiIndex));
  const periodIdx = PERIODS.indexOf(period);
  if(periodIdx <= 0) return current; // Q1 has nothing earlier in the year to carry from

  for(let i=periodIdx-1; i>=0; i--){
    const priorRows = await loadKpiData(year, PERIODS[i], scopeLeaderId);
    priorRows.forEach(r=>{
      const key = r.leaderId+'|'+r.kpiIndex;
      if(!haveKey.has(key)){
        current.push({...r, period, carriedFrom: PERIODS[i]});
        haveKey.add(key);
      }
    });
  }
  return current;
}

async function saveKpiRows(year, period, rows, updatedBy){
  const batch = db.batch();
  const now = new Date().toISOString();
  rows.forEach(r=>{
    const id = year+'_'+period+'_'+r.leaderId+'_'+r.kpiIndex;
    const ref = db.collection('kpiData').doc(id);
    batch.set(ref, {
      year:String(year), period, leaderId:r.leaderId, leaderName:r.leaderName, kpiIndex:r.kpiIndex,
      kpiLabel:r.kpiLabel, kpiType:r.kpiType||'percentage', progress:r.progress, status:r.status,
      lastUpdated: now, updatedBy: updatedBy
    });
  });
  await batch.commit();
}

// Deletes one specific quarter's explicit KPI record — used to undo an accidental
// save (e.g. a stray "0%" saved before carry-forward existed) so that quarter goes
// back to showing the carried-forward value from the prior quarter instead.
async function deleteKpiRow(year, period, leaderId, kpiIndex){
  const id = year+'_'+period+'_'+leaderId+'_'+kpiIndex;
  await db.collection('kpiData').doc(id).delete();
}

// Returns progress/status for all 4 quarters of a year for one leader — used to show
// year-long progression (Q1 → Q2 → Q3 → Q4) without needing 4 separate loads.
async function loadKpiDataAllQuarters(year, leaderId){
  const snap = await db.collection('kpiData').where('year','==',String(year)).where('leaderId','==',leaderId).get();
  return snap.docs.map(d=>d.data());
}

async function loadNotes(year, period, leaderId){
  const snap = await db.collection('notes').where('year','==',String(year)).where('period','==',period).where('leaderId','==',leaderId).get();
  const notes = snap.docs.map(d=>({...d.data(), id:d.id}));
  notes.sort((a,b)=>new Date(a.date)-new Date(b.date));
  return notes;
}

async function saveNote(year, period, leaderId, kpiIndex, role, author, text){
  await db.collection('notes').add({ year:String(year), period, leaderId, kpiIndex, role, author, date:new Date().toISOString(), text });
}

async function updateNote(noteId, newText){
  await db.collection('notes').doc(noteId).update({ text:newText, edited:true, editedDate:new Date().toISOString() });
}

async function deleteNote(noteId){
  await db.collection('notes').doc(noteId).delete();
}

async function loadMisses(year, period, leaderId){
  const snap = await db.collection('misses').where('year','==',String(year)).where('period','==',period).where('leaderId','==',leaderId).get();
  const misses = snap.docs.map(d=>({...d.data(), id:d.id}));
  misses.sort((a,b)=>new Date(a.date)-new Date(b.date));
  return misses;
}

async function deleteMiss(missId){
  await db.collection('misses').doc(missId).delete();
}

async function saveMiss(year, period, leaderId, kpiIndex, description, deduction, loggedBy){
  await db.collection('misses').add({ year:String(year), period, leaderId, kpiIndex, date:new Date().toISOString(), description, deduction, loggedBy });
}

// Full-year (all quarters combined) versions — used by the year-progression report.
async function loadNotesYear(year, leaderId){
  const snap = await db.collection('notes').where('year','==',String(year)).where('leaderId','==',leaderId).get();
  const notes = snap.docs.map(d=>d.data());
  notes.sort((a,b)=>new Date(a.date)-new Date(b.date));
  return notes;
}

async function loadMissesYear(year, leaderId){
  const snap = await db.collection('misses').where('year','==',String(year)).where('leaderId','==',leaderId).get();
  const misses = snap.docs.map(d=>({...d.data(), id:d.id}));
  misses.sort((a,b)=>new Date(a.date)-new Date(b.date));
  return misses;
}

async function getEbitda(year, period){
  const doc = await db.collection('settings').doc(String(year)+'_'+period).get();
  return doc.exists ? Number(doc.data().ebitda) : 10;
}

// Same idea as loadKpiDataCarried: if this quarter has no explicit EBITDA value saved
// yet, fall back to the most recent prior quarter's value instead of resetting to 10%.
const EBITDA_TARGET = 24544113;

async function getEbitdaCarried(year, period){
  const doc = await db.collection('settings').doc(String(year)+'_'+period).get();
  if(doc.exists){
    const d=doc.data();
    return { value: Number(d.ebitda), amount: d.ytdAmount!=null?Number(d.ytdAmount):null, carriedFrom: null };
  }
  const periodIdx = PERIODS.indexOf(period);
  for(let i=periodIdx-1; i>=0; i--){
    const priorDoc = await db.collection('settings').doc(String(year)+'_'+PERIODS[i]).get();
    if(priorDoc.exists){
      const d=priorDoc.data();
      return { value: Number(d.ebitda), amount: d.ytdAmount!=null?Number(d.ytdAmount):null, carriedFrom: PERIODS[i] };
    }
  }
  return { value: 10, amount: null, carriedFrom: null };
}

// ytdAmount is optional — pass it whenever you have the real dollar figure (from the
// $ input), omit it when only the slider was used, so it doesn't get overwritten with
// nothing when a percentage-only edit happens.
async function setEbitda(year, period, ebitda, ytdAmount){
  const data = { ebitda };
  if(ytdAmount != null) data.ytdAmount = ytdAmount;
  await db.collection('settings').doc(String(year)+'_'+period).set(data, {merge:true});
}

// Clears a specific quarter's saved EBITDA record so it goes back to carrying forward
// from the prior quarter — same idea as deleteKpiRow, for the EBITDA card.
async function deleteEbitda(year, period){
  await db.collection('settings').doc(String(year)+'_'+period).delete();
}

// ── ONE-TIME MIGRATION ──
// Moves any data saved before quarters existed (kpiData/notes/misses with no "period"
// field, and the old settings/{year} doc) into the given target quarter. Safe to run
// more than once — already-migrated docs are skipped.
async function migrateLegacyData(year, targetPeriod){
  let migrated = { kpiData:0, notes:0, misses:0, settings:0 };

  // kpiData: legacy docs used a different ID scheme (no period segment), so we copy
  // into the new ID format and delete the old doc.
  const kpiSnap = await db.collection('kpiData').where('year','==',String(year)).get();
  const kpiBatch = db.batch();
  kpiSnap.docs.forEach(d=>{
    const data = d.data();
    if(!data.period){
      const newId = year+'_'+targetPeriod+'_'+data.leaderId+'_'+data.kpiIndex;
      kpiBatch.set(db.collection('kpiData').doc(newId), {...data, period: targetPeriod}, {merge:true});
      kpiBatch.delete(d.ref);
      migrated.kpiData++;
    }
  });
  await kpiBatch.commit();

  // notes & misses: auto-generated IDs, so just add the missing period field in place.
  for(const colName of ['notes','misses']){
    const snap = await db.collection(colName).where('year','==',String(year)).get();
    const batch = db.batch();
    snap.docs.forEach(d=>{
      if(!d.data().period){
        batch.update(d.ref, { period: targetPeriod });
        migrated[colName]++;
      }
    });
    await batch.commit();
  }

  // settings (EBITDA): old doc ID was just the year; copy its value into the new
  // "{year}_{period}" doc if that doesn't already have a value set.
  const oldSettings = await db.collection('settings').doc(String(year)).get();
  if(oldSettings.exists){
    const newRef = db.collection('settings').doc(String(year)+'_'+targetPeriod);
    const newDoc = await newRef.get();
    if(!newDoc.exists){
      await newRef.set({ ebitda: oldSettings.data().ebitda });
      migrated.settings++;
    }
  }

  return migrated;
}
