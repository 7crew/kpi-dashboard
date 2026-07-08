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
async function loadLeaders(includeInactive){
  let snap = await db.collection('leaders').get();
  if(snap.empty){
    const batch = db.batch();
    SEED_LEADERS.forEach(l=>batch.set(db.collection('leaders').doc(l.id), l));
    await batch.commit();
    snap = await db.collection('leaders').get();
  }
  let all = snap.docs.map(d=>d.data());
  all.sort((a,b)=>(a.order||0)-(b.order||0));
  LEADERS = includeInactive ? all : all.filter(l=>l.active!==false);
  return LEADERS;
}

// Saves a full leader profile (create or update). id is slug-safe (lowercase, no spaces).
async function saveLeaderProfile(leader){
  await db.collection('leaders').doc(leader.id).set(leader);
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
const avg=kpis=>kpis.length?Math.round(kpis.reduce((a,k)=>a+k.progress,0)/kpis.length):0;
const blended=(indivAvg,ebitdaPct)=>Math.round(indivAvg*0.3+ebitdaPct*0.7);
const pColor=p=>p>=70?'#12a06e':p>=40?'var(--amber)':'var(--accent)';
const eStatus=p=>p>=100?'Complete':p>=75?'On Track':p>=40?'In Progress':p>0?'Early Stage':'Not Started';
const currentYear=()=>new Date().getFullYear();
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

// Returns progress/status for all 4 quarters of a year for one leader — used to show
// year-long progression (Q1 → Q2 → Q3 → Q4) without needing 4 separate loads.
async function loadKpiDataAllQuarters(year, leaderId){
  const snap = await db.collection('kpiData').where('year','==',String(year)).where('leaderId','==',leaderId).get();
  return snap.docs.map(d=>d.data());
}

async function loadNotes(year, period, leaderId){
  const snap = await db.collection('notes').where('year','==',String(year)).where('period','==',period).where('leaderId','==',leaderId).get();
  const notes = snap.docs.map(d=>d.data());
  notes.sort((a,b)=>new Date(a.date)-new Date(b.date));
  return notes;
}

async function saveNote(year, period, leaderId, kpiIndex, role, author, text){
  await db.collection('notes').add({ year:String(year), period, leaderId, kpiIndex, role, author, date:new Date().toISOString(), text });
}

async function loadMisses(year, period, leaderId){
  const snap = await db.collection('misses').where('year','==',String(year)).where('period','==',period).where('leaderId','==',leaderId).get();
  const misses = snap.docs.map(d=>d.data());
  misses.sort((a,b)=>new Date(a.date)-new Date(b.date));
  return misses;
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
  const misses = snap.docs.map(d=>d.data());
  misses.sort((a,b)=>new Date(a.date)-new Date(b.date));
  return misses;
}

async function getEbitda(year, period){
  const doc = await db.collection('settings').doc(String(year)+'_'+period).get();
  return doc.exists ? Number(doc.data().ebitda) : 10;
}

async function setEbitda(year, period, ebitda){
  await db.collection('settings').doc(String(year)+'_'+period).set({ ebitda });
}
