/* The old skinmate-v2 value is never overwritten. Portfolio fixtures remain examples. */
const SkinmateDesign = (() => {
  const D = SkinmateData, L = SkinmateLogic;
  const key = 'skinmate-design-v3';
  const names = {h1:'리움 의원',h2:'온유 의원',h3:'루미엘 의원',h4:'벨루나 의원',h5:'라온 의원',h6:'이쁨 피부과 의원'};
  const priorities = {'의료진 신뢰':'trust','회복속도':'recovery','가격':'price','효과':'effect','통증 부담':'pain','방문 거리':'distance'};
  const categories = {'윤곽지방':'contour','탄력리프팅':'aging','트러블흉터':'trouble','모공피부결':'texture','색소톤':'tone','제모':'hair','기타':'other'};
  const normalize = s => String(s || '').replace(/[\s·.*]/g,'');
  const uniq = a => [...new Set(Array.isArray(a) ? a.filter(x => typeof x === 'string') : [])];
  function hospital(id) { const h=D.hospitals.find(h=>h.id===id); return h ? {...h,name:names[id],originalName:h.name} : null; }
  function hospitalId(text) { return Object.keys(names).find(id=>normalize(text).includes(normalize(names[id]))||normalize(text).includes(normalize(names[id].replace(/피부과|의원/g,'')))||normalize(text).includes(normalize(D.hospitals.find(h=>h.id===id).name))) || null; }
  function treatment(text) {
    const t=normalize(text).toLowerCase();
    const aliases=[['피코프락','pico-fractional'],['포텐자','potenza'],['프락셀','fraxel'],['프락셔널','fractional'],['슈링크','shurink'],['울쎄라','ultrasound'],['인모드FX','inmode'],['인모드','inmode'],['주름보톡스','wrinkle-botox'],['보톡스','botox'],['아쿠아필','aqua'],['지방분해','onda'],['레이저토닝','toning'],['피코토닝','picotoning']];
    const id=aliases.find(([a])=>t.includes(normalize(a).toLowerCase()))?.[1];
    return D.treatments.find(x=>x.id===id)||D.treatments.find(x=>t.includes(normalize(x.name).toLowerCase()))||null;
  }
  function concernIds(s) {
    const cats=s.concerns.map(v=>categories[normalize(v)]).filter(Boolean);
    const aliases={'볼 처짐':'sagging','탄력 저하':'elasticity','모공':'pores','피부 진정':'redMarks','바디 지방':'cheekFat','피부 관리':'otherConcern','시술 상담':'otherConcern'};
    return uniq(s.details.map(v=>D.subConcerns.find(c=>c.name===v&&cats.includes(c.categoryId))?.id||aliases[v]).filter(Boolean));
  }
  function selection(s,id=s.activeConcern) {
    const c=D.subConcerns.find(c=>c.id===id);
    return c ? {category:c.categoryId,concern:c.name,concernId:c.id,priorities:s.priorities.map(v=>priorities[v]).filter(Boolean).slice(0,3),region:s.regions[0]?.split('·').pop().trim()||'강남',budget:'unknown'} : null;
  }
  function reviews(s) { return [...D.reviews,...s.userReviews]; }
  function rank(s,id=s.activeConcern) {
    const prefs=selection(s,id); if(!prefs)return [];
    return L.filterTreatmentsByConcern(D.treatments,prefs).map(t=>{
      let hs=L.rankHospitals(D.hospitals,t.id,prefs,reviews(s));
      const budget=s.budget/10000;
      if(budget>0){const affordable=hs.filter(h=>h.offer.price<=budget);if(affordable.length)hs=affordable;}
      const regions=s.regions.map(r=>r.split('·').pop().trim());
      const local=hs.filter(h=>regions.includes(h.location));if(local.length)hs=local;
      return {...t,bestHospital:hs[0],hospitals:hs};
    }).filter(t=>t.bestHospital).sort((a,b)=>L.sortCandidates(a.bestHospital,b.bestHospital,prefs)||a.id.localeCompare(b.id));
  }
  function commit(s) { s.activeConcern=concernIds(s)[0]||null; s.recommendation=selection(s); s.completed=true; persist(s); }
  function activate(s,id) { if(!D.subConcerns.some(c=>c.id===id))return false;s.activeConcern=id;s.recommendation=selection(s);persist(s);return true; }
  function fresh(){return {schemaVersion:3,concerns:[],details:[],priorities:[],regions:[],budget:0,completed:false,activeConcern:null,recommendation:null,savedHospitalIds:[],savedOfferIds:[],userReviews:[],likes:[],legacyUnmatched:{hospitals:[],treatments:[]}};}
  function sanitize(raw) {
    const s=fresh();if(!raw||typeof raw!=='object')return s;
    for(const field of ['concerns','details','priorities','regions','likes'])s[field]=uniq(raw[field]);
    s.budget=Number.isFinite(raw.budget)&&raw.budget>=0?raw.budget:0;s.completed=raw.completed===true;
    s.activeConcern=D.subConcerns.some(c=>c.id===raw.activeConcern)?raw.activeConcern:null;
    s.savedHospitalIds=uniq(raw.savedHospitalIds).filter(id=>D.hospitals.some(h=>h.id===id));
    s.savedOfferIds=uniq(raw.savedOfferIds).filter(id=>{const [h,t]=id.split(':');return !!L.getOffer(h,t);});
    s.userReviews=SkinmateStorage.clean({userReviews:raw.userReviews},D).userReviews;
    s.legacyUnmatched={hospitals:uniq(raw.legacyUnmatched?.hospitals),treatments:uniq(raw.legacyUnmatched?.treatments)};
    if(s.completed&&!s.activeConcern)s.activeConcern=concernIds(s)[0]||null;s.recommendation=selection(s);return s;
  }
  function migrate(raw) {
    if(!raw)return fresh();
    const s=sanitize(raw);
    if(raw.profile){
      s.concerns=uniq(raw.profile.concerns?.map(v=>D.subConcerns.find(c=>c.name===v)?.categoryId).map(id=>D.concerns.find(c=>c.id===id)?.name).filter(Boolean));
      s.details=uniq(raw.profile.concerns);s.regions=uniq((raw.profile.regions||[raw.profile.region]).filter(Boolean));
      s.priorities=uniq((raw.recommendation?.priorities||raw.draft?.priorities||[]).map(id=>Object.keys(priorities).find(k=>priorities[k]===id)).filter(Boolean));
      s.completed=raw.onboarded===true;
    }
    s.savedHospitalIds=uniq([...(s.savedHospitalIds||[]),...(raw.saved||[]),...(raw.savedHospitals||[]).map(hospitalId).filter(Boolean)]).filter(id=>hospital(id));
    s.legacyUnmatched.hospitals=uniq((raw.savedHospitals||[]).filter(n=>!hospitalId(n)));
    for(const name of Array.isArray(raw.savedTreatments)?raw.savedTreatments:[]){const t=treatment(name),h=hospitalId(name);const hid=h&&L.getOffer(h,t?.id)?h:t&&D.hospitalTreatments.find(o=>o.treatmentId===t.id&&o.isAvailable)?.hospitalId;if(t&&hid)s.savedOfferIds.push(hid+':'+t.id);else s.legacyUnmatched.treatments.push(name);}
    if(raw.savedTreatments&&!Array.isArray(raw.savedTreatments))for(const [h,t] of Object.entries(raw.savedTreatments))if(L.getOffer(h,t))s.savedOfferIds.push(h+':'+t);
    for(const id of raw.savedEvents||[]){const p=D.promotions.find(p=>p.id===id);if(p?.hospitalId&&p?.treatmentId&&L.getOffer(p.hospitalId,p.treatmentId))s.savedOfferIds.push(p.hospitalId+':'+p.treatmentId);}
    if(s.completed&&!s.activeConcern)s.activeConcern=concernIds(s)[0]||null;return sanitize(s);
  }
  function load(storage=localStorage) {try{const v=storage.getItem(key);if(v)return sanitize(JSON.parse(v));const old=storage.getItem('skinmate-v2');if(old&&!storage.getItem('skinmate-recovery-v2-backup'))storage.setItem('skinmate-recovery-v2-backup',old);const s=migrate(old?JSON.parse(old):null);storage.setItem(key,JSON.stringify(s));return s;}catch{return fresh();}}
  function persist(s){try{localStorage.setItem(key,JSON.stringify(s));return true;}catch{return false;}}
  function toggleSaved(s,kind,id){const key=kind==='hospital'?'savedHospitalIds':'savedOfferIds';const a=s[key],i=a.indexOf(id);if(i<0)a.push(id);else a.splice(i,1);persist(s);return i<0;}
  function snapshot(s){return {activeConcern:s.activeConcern,recommendation:selection(s),treatments:rank(s).map(t=>({id:t.id,hospitalIds:t.hospitals.map(h=>h.id),reviewIds:t.hospitals.flatMap(h=>h.aggregate.rows.map(r=>r.id))})),homeContent:rank(s).slice(0,4).map(t=>({concernId:s.activeConcern,treatmentId:t.id,hospitalId:t.bestHospital.id,reviewCount:t.bestHospital.aggregate.count}))};}
  return {key,D,L,names,priorities,categories,normalize,hospital,hospitalId,treatment,concernIds,selection,reviews,rank,commit,activate,fresh,sanitize,migrate,load,persist,toggleSaved,snapshot};
})();
