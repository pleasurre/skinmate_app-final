/* Bind the recovered Figma DOM to the existing relational fixtures; keep its layout. */
const M=SkinmateDesign;
const node=id=>$('[data-node-id="'+id+'"]');
const money=v=>(v*10000).toLocaleString('ko-KR')+'원';
const label=id=>M.D.criteria.find(c=>c.id===id)?.name||id;
const offerKey=(h,t)=>h+':'+t;
let connectedSelection=new Set(),selectedTreatmentId=null,communityMode='all';
const cardCache={hospital:null,offer:null};
function hospitalLogo(id){return {h1:'design-assets/1543-2176.png',h2:'design-assets/1543-2196.png',h3:'design-assets/1543-2116.png',h4:'design-assets/1543-2136.png',h5:'design-assets/1543-2156.png',h6:'design-assets/1543-2216.png'}[id];}
function matchHospitalLogo(card,id){const src=hospitalLogo(id),img=card.querySelector('img[src$=".png"]');if(src&&img){img.src=src;img.alt=M.hospital(id).name+' 로고';}}
function textAt(el,index,value){const p=el?.querySelectorAll('p')[index];if(p)p.textContent=value;}
function currentTreatment(){return M.D.treatments.find(t=>t.id===selectedTreatmentId)||M.rank(state)[0]||M.D.treatments.find(t=>t.id==='fraxel');}
function bestOffer(t,hid){const prefs=M.selection(state)||{region:state.regions[0]?.split('·').pop().trim()||'강남',priorities:[],budget:'unknown'};const hs=M.L.rankHospitals(M.D.hospitals,t.id,prefs,M.reviews(state));return hs.find(h=>h.id===hid)||hs[0];}
function bindOffer(el,t,h){if(!el||!t||!h)return;el.dataset.treatmentId=t.id;el.dataset.hospitalId=h.id;el.dataset.offerId=offerKey(h.id,t.id);action(el,()=>navigateDetail('offer',offerKey(h.id,t.id)),t.name+' · '+M.hospital(h.id).name);}
function fillOffer(el,t,h){
  const ps=[...el.querySelectorAll('p')].filter(p=>!p.closest('[data-name="discount"]'));
  const hp=ps.find(p=>/서울|의원|클리닉/.test(p.textContent));if(hp)hp.textContent=h.location+' | '+M.hospital(h.id).name;
  const title=ps.find(p=>M.treatment(p.textContent));if(title)title.textContent=t.name;
  const price=ps.find(p=>/\d[\d.,]*\s*만원/.test(p.textContent));if(price)price.textContent=h.offer.price+'만원';
  const rating=ps.find(p=>/^\s*[1-5]\.\d\s*$/.test(p.textContent));if(rating)rating.textContent=h.aggregate.rating?.toFixed(1)||'—';
  const count=ps.find(p=>/^\s*\(\d+\)\s*$/.test(p.textContent));if(count)count.textContent='('+h.aggregate.count+')';
  el.querySelectorAll('[data-name="discount"]').forEach(n=>n.hidden=true);
  el.dataset.reviewCount=h.aggregate.count;bindOffer(el,t,h);
}
function navigateDetail(kind,id){history.pushState({},'', '#'+routes[page]+'?'+kind+'='+encodeURIComponent(id));openConnectedRoute();}
function closeDetail(){history.replaceState({},'', '#'+routes[page]);}
document.querySelector('#modal').addEventListener('close',closeDetail);
function openConnectedRoute(){const q=new URLSearchParams(location.hash.split('?')[1]||'');if(q.has('offer'))showOffer(q.get('offer'));else if(q.has('hospital'))showHospital(q.get('hospital'));else document.querySelector('#modal').close();}
function reviewHTML(rows){return rows.slice(0,8).map(r=>'<article class="connected-review" data-review-id="'+escapeHTML(r.id)+'"><b>★ '+r.overallRating+' · '+escapeHTML(r.date||'예시 후기')+'</b><p>'+escapeHTML(r.content||r.text||'')+'</p></article>').join('')||'<p>이 시술의 후기가 아직 없어요.</p>';}
function showOffer(id){
  const [hid,tid]=String(id).split(':'),t=M.D.treatments.find(t=>t.id===tid),h=M.hospital(hid),o=M.L.getOffer(hid,tid,state.activeConcern);if(!t||!h||!o){toast('시술 정보를 찾지 못했어요.');closeDetail();return;}
  const g=M.L.aggregateReviews(hid,tid,M.reviews(state)),prefs=M.selection(state)||{priorities:[],region:h.location};
  dialog(t.name,'<p class="fixture-label">포트폴리오 예시 데이터 · 실제 병원 가격과 환자 후기가 아닙니다.</p><p data-hospital-id="'+hid+'">'+escapeHTML(h.name)+' · '+escapeHTML(h.location)+'</p><p><b>'+money(o.price)+'</b> · '+escapeHTML(o.unit)+'</p><p>★ '+(g.rating?.toFixed(1)||'—')+' · 후기 '+g.count+'개</p><h3>최근 후기</h3>'+reviewHTML(g.rows)+'<h3>시술 설명</h3><p>'+escapeHTML(t.description)+'</p><h3>부작용 및 주의사항</h3><p>'+escapeHTML(t.sideEffects||t.risks||'피부 상태와 시술 방법에 따라 차이가 있어요. 시술 전 의료진에게 확인해주세요.')+'</p><h3>추천 근거</h3>'+M.L.reasonLines(hid,tid,prefs,M.reviews(state)).map(x=>'<p>'+escapeHTML(x)+'</p>').join(''),[[state.savedOfferIds.includes(id)?'시술 찜 해제':'시술 찜하기',()=>{M.toggleSaved(state,'offer',id);render();navigateDetail('offer',id);}],['병원 보기',()=>navigateDetail('hospital',hid)],['후기 작성',()=>writeReview(hid,tid)]]);
  document.querySelector('#modal').dataset.offerId=id;
}
function showHospital(id){
  const h=M.hospital(id);if(!h){toast('병원 정보를 찾지 못했어요.');closeDetail();return;}
  const offers=M.D.hospitalTreatments.filter(o=>o.hospitalId===id&&o.isAvailable),g=M.L.aggregateReviews(id,null,M.reviews(state));
  dialog(h.name,'<p class="fixture-label">포트폴리오 예시 데이터 · 실제 병원 정보와 후기가 아닙니다.</p><p>'+escapeHTML(h.location)+' · ★ '+(g.rating?.toFixed(1)||'—')+' · 후기 '+g.count+'개</p><h3>시술·혜택</h3><div class="connected-offers">'+offers.map(o=>'<button data-open-offer="'+offerKey(id,o.treatmentId)+'">'+escapeHTML(M.D.treatments.find(t=>t.id===o.treatmentId).name)+' · '+money(M.L.getOffer(id,o.treatmentId,state.activeConcern).price)+'</button>').join('')+'</div><h3>최근 후기</h3>'+reviewHTML(g.rows),[[state.savedHospitalIds.includes(id)?'병원 찜 해제':'병원 찜하기',()=>{M.toggleSaved(state,'hospital',id);render();navigateDetail('hospital',id);}]]);
  for(const b of document.querySelectorAll('[data-open-offer]'))b.onclick=()=>navigateDetail('offer',b.dataset.openOffer);
  document.querySelector('#modal').dataset.hospitalId=id;
}
function writeReview(hid,tid){
  dialog('후기 작성','<p class="fixture-label">이 기기에 저장되는 포트폴리오 체험 후기입니다.</p><form id="review-form">'+[['overallRating','전체 만족'],['effectRating','효과'],['recoveryRating','회복'],['priceRating','가격'],['painRating','통증'],['doctorTrustRating','의료진 신뢰'],['distanceRating','거리']].map(([k,v])=>'<label>'+v+' <select name="'+k+'">'+[5,4,3,2,1].map(n=>'<option>'+n+'</option>').join('')+'</select></label>').join('')+'<label>내용<textarea name="content" required maxlength="1500" aria-label="후기 내용"></textarea></label><button type="submit">후기 저장</button></form>');
  document.querySelector('#review-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),content=String(f.get('content')).trim();if(!content)return;const r={id:'local-'+(crypto.randomUUID?.()||Date.now()),hospitalId:hid,treatmentId:tid,content,text:content,date:new Date().toISOString().slice(0,10),mock:true};for(const k of ['overallRating','effectRating','recoveryRating','priceRating','painRating','doctorTrustRating','distanceRating'])r[k]=Number(f.get(k));state.userReviews.push(r);save();document.querySelector('#modal').close();render();navigateDetail('offer',offerKey(hid,tid));};
}
function wireHospitalCards(){
  const original=$$('[data-name="card"]');if(!original.length)return;
  const parent=original[0].parentElement.parentElement;
  const templates=original.map(c=>c.parentElement.cloneNode(true));
  if(!cardCache.hospital)cardCache.hospital=templates[0].cloneNode(true);
  const t=currentTreatment(),prefs=M.selection(state)||{region:'강남',priorities:[],budget:'unknown'};
  const ranked=M.L.rankHospitals(M.D.hospitals,t.id,prefs,M.reviews(state));
  parent.innerHTML='';parent.dataset.connectedList='hospitals';
  ranked.forEach((h,i)=>{const wrap=(templates[i%templates.length]).cloneNode(true),card=wrap.querySelector('[data-name="card"]')||wrap;const ps=[...card.querySelectorAll('p')];if(ps[0])ps[0].textContent=M.hospital(h.id).name;matchHospitalLogo(card,h.id);const rating=ps.find(p=>/\([\d]+\)/.test(p.textContent));if(rating)rating.textContent=(h.aggregate.rating?.toFixed(1)||'—')+' ('+h.aggregate.count+') · '+h.offer.price+'만원';const location=ps.find(p=>/서울/.test(p.textContent));if(location)location.textContent=h.location+' · '+t.name;const desc=ps.find(p=>/만족|회복|응대|가격|접근|편안/.test(p.textContent));if(desc)desc.textContent=M.L.reasonLines(h.id,t.id,prefs,M.reviews(state))[0];card.dataset.hospitalId=h.id;card.dataset.treatmentId=t.id;action(card,()=>navigateDetail('hospital',h.id),M.hospital(h.id).name+' 상세');const existing=wrap.querySelector('[data-name="vector"]');if(existing)existing.hidden=true;const saveButton=document.createElement('button');saveButton.className='connected-bookmark';saveButton.setAttribute('aria-label',M.hospital(h.id).name+' 찜');saveButton.setAttribute('aria-pressed',state.savedHospitalIds.includes(h.id));saveButton.textContent=state.savedHospitalIds.includes(h.id)?'★':'☆';saveButton.onclick=e=>{e.stopPropagation();M.toggleSaved(state,'hospital',h.id);saveButton.textContent=state.savedHospitalIds.includes(h.id)?'★':'☆';saveButton.setAttribute('aria-pressed',state.savedHospitalIds.includes(h.id));};card.appendChild(saveButton);parent.appendChild(wrap);});
  for(const p of $$('p,span'))if(p.textContent.trim()==='45')p.textContent=String(ranked.length);
}
function wireTreatmentCards(){
  const seen=new Set();for(const image of $$('img[src$=".png"]')){let n=image.parentElement;for(let i=0;i<5&&n&&n!==app.firstElementChild;i++,n=n.parentElement){if(/만원/.test(n.textContent)&&n.textContent.length<350&&n.querySelectorAll('img[src$=".png"]').length===1){if(seen.has(n))break;seen.add(n);const t=M.treatment(n.textContent);if(t){const h=bestOffer(t,M.hospitalId(n.textContent));if(h)fillOffer(n,t,h);}break;}}
  }
}
function bindConnectedScreen(){
  connectedSelection=new Set();app.dataset.screen=routes[page];app.dataset.activeConcern=state.activeConcern||'';
  if(page===9)bindHome();
  if(page===10||page===11){for(const [n,id] of Object.entries(M.categories)){const c=M.D.concerns.find(c=>c.id===id);onText(c.name,()=>{const concern=M.D.subConcerns.find(c=>c.categoryId===id);M.activate(state,concern.id);selectedTreatmentId=M.rank(state)[0]?.id;go(id==='trouble'?11:10);});}}
  onText('추천기준',()=>showCriteria());onText('병원 비교하기',()=>go(13));
  if(page===9){onText('내 예약',()=>dialog('내 예약','<p>예약 화면은 디자인 완료 후 추가할 예정이에요.</p>'));onText('집 근처 병원',()=>{if(!state.regions.length)return go(6);go(10);});for(const c of M.D.concerns)onText(c.name,()=>{M.activate(state,c.concernIds[0]);selectedTreatmentId=null;render();});}
  if(page===9||page===11)for(const el of $$('p').filter(p=>p.textContent.trim()==='모두 보기 →'))action(el,()=>go(el.closest('[data-node-id="1444:864"]')?12:10),'모두 보기');
  if(page===3){for(const c of $$('.choice'))c.setAttribute('aria-pressed',c.dataset.selected==='true');}
}
function bindHome(){
  const ranked=M.rank(state),title=node('1438:653'),rail=node('1438:674');
  if(title)title.textContent=state.activeConcern?M.D.subConcerns.find(c=>c.id===state.activeConcern).name+' · 내 기준으로 골라봤어요':'관심 고민을 선택하고 추천받아보세요';
  if(rail&&ranked.length){const templates=[...rail.children].map(n=>n.cloneNode(true));rail.innerHTML='';rail.dataset.homeContent=state.activeConcern;ranked.slice(0,4).forEach((t,i)=>{const el=templates[i%templates.length].cloneNode(true);el.dataset.concernId=state.activeConcern;fillOffer(el,t,t.bestHospital);rail.appendChild(el);});}
  const section=node('1438:644');if(section){for(const p of [...section.querySelectorAll('p')]){const text=p.textContent.trim();const id={'색소침착':'pigmentation','모공·결':'pores','탄력':'elasticity'}[text];if(id)action(p,()=>{M.activate(state,id);render();},text+' 추천 보기');if(text==='전체')action(p,()=>{const ids=M.concernIds(state);if(ids[0])M.activate(state,ids[0]);render();},'선택한 고민 추천 보기');}}
  for(const text of ['지금,','내게 맞는 시술','을','간편하게 찾아보세요'])onText(text,()=>go(3));
  onText('최저가 시술 찾기',()=>{selectedTreatmentId=ranked[0]?.id||null;go(10);});
  app.dataset.recommendationCount=ranked.length;
}
function showCriteria(){dialog('추천 기준','<p>선택한 고민: '+escapeHTML(M.D.subConcerns.find(c=>c.id===state.activeConcern)?.name||'선택 전')+'</p><p>'+escapeHTML(state.priorities.join(' → ')||'선택 전')+'</p><p>선택한 지역: '+escapeHTML(state.regions.join(', ')||'선택 전')+'</p><p>같은 병원·같은 시술의 후기만 집계해 비교합니다.</p><p class="fixture-label">현재 병원·가격·후기는 포트폴리오 예시 데이터입니다.</p>',[['조건 수정',()=>go(3)]]);}
function wireSaved(){
  const isHospital=page===13,key=isHospital?'savedHospitalIds':'savedOfferIds';
  const originals=$$('[data-name="card"]');if(!originals.length)return;
  const template=originals[0].parentElement.cloneNode(true),parent=originals[0].parentElement.parentElement;
  cardCache[isHospital?'hospital':'offer']=template.cloneNode(true);parent.innerHTML='';parent.dataset.savedList=key;
  const ids=state[key];for(const id of ids){const wrap=template.cloneNode(true),card=wrap.querySelector('[data-name="card"]')||wrap;
    const [hid,tid]=isHospital?[id,null]:id.split(':'),h=M.hospital(hid);if(!h)continue;
    const t=tid?M.D.treatments.find(t=>t.id===tid):currentTreatment(),o=M.L.getOffer(hid,t.id,state.activeConcern),g=M.L.aggregateReviews(hid,tid,M.reviews(state));
    const ps=[...card.querySelectorAll('p')];if(isHospital){textAt(card,0,h.name);matchHospitalLogo(card,hid);const rating=ps.find(p=>/\([\d]+\)/.test(p.textContent));if(rating)rating.textContent=(g.rating?.toFixed(1)||'—')+' ('+g.count+')';const loc=ps.find(p=>/서울/.test(p.textContent));if(loc)loc.textContent=h.location;}
    else {const title=ps.find(p=>M.treatment(p.textContent));if(title)title.textContent=t.name;const hp=ps.find(p=>/의원|클리닉/.test(p.textContent));if(hp)hp.textContent=h.name+' · '+h.location;const rating=ps.find(p=>/할인|\([\d]+\)/.test(p.textContent));if(rating)rating.textContent=(g.rating?.toFixed(1)||'—')+' ('+g.count+')';const price=ps.find(p=>/만원/.test(p.textContent));if(price)price.textContent=o.price+'만원';}
    card.dataset.savedId=id;card.dataset.hospitalId=hid;if(tid)card.dataset.treatmentId=tid;
    const trash=wrap.querySelector('[data-name*="쓰레기통"]');action(trash,()=>{M.toggleSaved(state,isHospital?'hospital':'offer',id);render();toast('찜에서 삭제했어요.');},(isHospital?h.name:t.name)+' 삭제');
    action(card,()=>{if(connectedSelection.has(id))connectedSelection.delete(id);else{if(connectedSelection.size===3)return toast('최대 3개까지 비교할 수 있어요.');connectedSelection.add(id);}card.classList.toggle('selected-card',connectedSelection.has(id));card.setAttribute('aria-pressed',connectedSelection.has(id));},(isHospital?h.name:t.name)+' 비교 선택');
    const title=ps[0];action(title,()=>navigateDetail(isHospital?'hospital':'offer',id),(isHospital?h.name:t.name)+' 상세');parent.appendChild(wrap);
  }
  if(!ids.length){const p=document.createElement('p');p.className='saved-empty';p.textContent='아직 찜한 '+(isHospital?'병원':'시술·혜택')+'이 없어요.';parent.appendChild(p);}
  const unmatched=state.legacyUnmatched[isHospital?'hospitals':'treatments'];if(unmatched.length){const p=document.createElement('p');p.className='saved-empty';p.textContent='이전 찜 항목(정보 연결 전): '+unmatched.join(', ');parent.appendChild(p);}
  onText('비교하기',()=>showComparison(isHospital),document.querySelector('.phone'));
  onText('병원',()=>go(13));onText('시술·혜택',()=>go(14));const tab=$$('[data-node-id]').find(n=>n.children.length===3&&norm(n.textContent)==='시술혜택');if(tab)action(tab,()=>go(14),'시술·혜택');
  const min=isHospital?1075:1072;heights[page]=Math.max(min,400+ids.length*(isHospital?145:190));resize();
}
function showComparison(isHospital){
  if(connectedSelection.size<2)return toast('비교할 항목을 2개 이상 선택해주세요.');
  const t=currentTreatment(),ids=[...connectedSelection];
  const offers=ids.map(id=>{const [h,tid]=isHospital?[id,t.id]:id.split(':');return {h:M.hospital(h),t:M.D.treatments.find(t=>t.id===tid),o:M.L.getOffer(h,tid,state.activeConcern),g:M.L.aggregateReviews(h,tid,M.reviews(state))};});
  const rows=[['병원',x=>x.h.name],['시술',x=>x.t.name],['가격',x=>x.o?money(x.o.price):'제공 정보 없음'],['지역',x=>x.h.location],['후기 수',x=>x.g.count+'개'],...Object.keys(M.L.fields).map(k=>[label(k),x=>x.g.means[k]?.toFixed(2)+' / 5'])];
  dialog('선택한 '+(isHospital?'병원':'시술·혜택')+' 비교','<p class="fixture-label">같은 시술의 후기 기준 · 포트폴리오 예시 데이터</p><div class="connected-compare"><table><tbody>'+rows.map(([name,f])=>'<tr><th>'+name+'</th>'+offers.map(x=>'<td>'+escapeHTML(f(x))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>');
  document.querySelector('#modal').dataset.comparedIds=ids.join(',');
}
function showSearch(){
  const box=document.createElement('div');box.className='search-box';box.innerHTML='<button class="close">← 뒤로</button><input aria-label="시술 및 병원 검색" placeholder="시술, 병원 검색"><div class="search-results"></div>';app.firstElementChild.appendChild(box);$('.close',box).onclick=()=>box.remove();const input=$('input',box);
  input.oninput=()=>{const q=norm(input.value).toLowerCase(),results=$('.search-results',box);results.innerHTML='';if(!q)return;
    for(const h of M.D.hospitals){const dh=M.hospital(h.id);if(norm(dh.name+' '+dh.originalName+' '+dh.location).toLowerCase().includes(q)){const b=document.createElement('button');b.textContent=dh.name+' · '+dh.location;b.dataset.hospitalId=h.id;b.onclick=()=>{box.remove();navigateDetail('hospital',h.id);};results.appendChild(b);}}
    const terms=q.includes('프락셀')?['fraxel','fractional','pico-fractional']:[];
    for(const t of M.D.treatments){const concerns=t.concernIds.map(id=>M.D.subConcerns.find(c=>c.id===id).name).join(' ');if(norm(t.name+' '+concerns).toLowerCase().includes(q)||terms.includes(t.id)){const h=bestOffer(t);if(!h)continue;const b=document.createElement('button');b.textContent=t.name+' · '+M.hospital(h.id).name;b.dataset.treatmentId=t.id;b.dataset.offerId=offerKey(h.id,t.id);b.onclick=()=>{box.remove();selectedTreatmentId=t.id;navigateDetail('offer',offerKey(h.id,t.id));};results.appendChild(b);}}
    if(!results.children.length)results.textContent='검색 결과가 없어요.';
  };input.focus();
}
function wireReviews(){
  const reviewBlocks=[node('1496:985'),node('1510:1228'),node('1510:1275')].filter(Boolean);
  const rows=M.reviews(state).filter(r=>communityMode!=='interest'||!state.activeConcern||M.D.treatments.find(t=>t.id===r.treatmentId)?.concernIds.includes(state.activeConcern));
  for(const [i,block] of reviewBlocks.entries()){const r=rows[i];if(!r){block.hidden=true;continue;}block.dataset.reviewId=r.id;block.dataset.hospitalId=r.hospitalId;block.dataset.treatmentId=r.treatmentId;const ps=[...block.querySelectorAll('p')];const content=ps.find(p=>p.textContent.length>40);if(content)content.textContent=(r.content||r.text||'').slice(0,125)+'…';const date=ps.find(p=>/\d{2}-\d{2}-\d{4}/.test(p.textContent));if(date)date.textContent=r.date||'예시 후기';const title=ps.find(p=>M.treatment(p.textContent));if(title)title.textContent=M.D.treatments.find(t=>t.id===r.treatmentId).name;const rating=ps.find(p=>/^\s*[1-5]\.\d\s*$/.test(p.textContent));if(rating)rating.textContent=Number(r.overallRating).toFixed(1);action(block,()=>navigateDetail('offer',offerKey(r.hospitalId,r.treatmentId)),'후기 시술 보기');}
  for(const n of $$('[data-name="heart"]')){const id=n.closest('[data-review-id]')?.dataset.reviewId||n.dataset.nodeId;n.style.opacity=state.likes.includes(id)?'.5':'1';action(n,()=>{toggle('likes',id);n.style.opacity=state.likes.includes(id)?'.5':'1';toast('공감 상태를 저장했어요.');},'후기 공감');}
  for(const n of $$('[data-name="share"]'))action(n,async()=>{try{await navigator.clipboard.writeText(location.href);toast('링크를 복사했어요.');}catch{toast('주소창의 링크를 복사해주세요.');}},'후기 공유');
  onText('관심후기',()=>{communityMode='interest';render();});onText('전체',()=>{communityMode='all';render();});
  for(const name of ['자유게시판','피부 가이드','기타'])onText(name,()=>toast('디자인 완료 후 추가할 예정이에요.'));
}
window.skinmateDebug={snapshot:()=>M.snapshot(state),state:()=>structuredClone(state)};
