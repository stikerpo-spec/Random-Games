(() => {
"use strict";
const $ = id => document.getElementById(id);
const STORE = "globalClash.v2";
const COLORS = ["#53eedc", "#c5ff67", "#ff6688", "#ad91ff"];
const CLASS = {
  striker: { name:"Striker", hp:100, speed:245, energy:100, regen:15, shield:1, color:"#53eedc" },
  guardian:{ name:"Guardian",hp:135,speed:205,energy:115,regen:12,shield:.25,color:"#c5ff67" },
  runner:{ name:"Runner",hp:85,speed:305,energy:90,regen:13,shield:1,color:"#ff6688" },
  technician:{name:"Technician",hp:95,speed:225,energy:135,regen:26,shield:.85,color:"#ad91ff"}
};
const SKINS = [
  {id:"standard",name:"NEON CORE",cost:0,color:"#53eedc",desc:"The original arena glow."},
  {id:"acid",name:"ACID CIRCUIT",cost:250,color:"#c5ff67",desc:"Bright and electric."},
  {id:"rose",name:"PULSE ROSE",cost:400,color:"#ff6688",desc:"A bold pink energy trail."},
  {id:"violet",name:"NIGHT SHIFT",cost:550,color:"#ad91ff",desc:"Deep violet radiance."},
  {id:"solar",name:"SOLAR FLARE",cost:800,color:"#ffbd67",desc:"A warm golden glow."},
  {id:"ice",name:"GLACIER",cost:1000,color:"#9bdcff",desc:"Frosted crystal armour and ice-blue accents."},
  {id:"storm",name:"STORM RIDER",cost:1250,color:"#7dcbff",desc:"Electric shoulder coils and a charged helmet crest."},
  {id:"ember",name:"EMBER TITAN",cost:1500,color:"#ff8b56",desc:"Heat-forged shoulder plates and glowing orange armour."},
  {id:"phantom",name:"PHANTOM",cost:1800,color:"#b7a1ff",desc:"Dark stealth plating, a halo and violet energy details."},
  {id:"tide",name:"TIDAL WAVE",cost:2100,color:"#56e5df",desc:"Flowing fin armour and a bright ocean visor."}
];
const MAPS = {
  neon:{name:"Neon Harbor",bg:"#0b1723",grid:"#53eedc",accent:"#c5ff67",blocks:[[330,205,95,34],[775,205,95,34],[330,520,95,34],[775,520,95,34]]},
  sky:{name:"Sky Grid",bg:"#11172a",grid:"#8d9dff",accent:"#53eedc",blocks:[[260,160,90,38],[850,160,90,38],[260,560,90,38],[850,560,90,38]]},
  frost:{name:"Frostline",bg:"#10202c",grid:"#a8e7ff",accent:"#8fc9e8",blocks:[[430,155,340,28],[430,577,340,28],[350,310,35,140],[815,310,35,140]]},
  ember:{name:"Ember Plaza",bg:"#201724",grid:"#ff9d6f",accent:"#ffc76e",blocks:[[235,240,105,52],[860,240,105,52],[235,465,105,52],[860,465,105,52]]}
};
const MODES = {
  training:{name:"Training Lab",kind:"solo",limit:2,seconds:150,desc:"Practice against a training bot."},
  tournament:{name:"Tournament Circuit",kind:"solo",limit:2,seconds:90,desc:"Beat three challengers in a row."},
  survival:{name:"Survival",kind:"solo",limit:4,seconds:180,desc:"Survive as many waves as you can."},
  duel:{name:"Duel",kind:"online",limit:2,seconds:120,desc:"A private 1v1, first to five."},
  teams:{name:"Team Clash",kind:"online",limit:4,seconds:150,desc:"Two teams, four fighters, one objective."},
  ffa:{name:"Free For All",kind:"online",limit:4,seconds:120,desc:"Every fighter for themselves."},
  king:{name:"King of the Arena",kind:"solo",limit:4,seconds:120,desc:"Control the centre zone."},
  core:{name:"Capture the Core",kind:"online",limit:4,seconds:150,desc:"Hold the central energy core as a team."}
};
function randomCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let out="";for(let i=0;i<6;i++)out+=chars[Math.floor(Math.random()*chars.length)];return out;}
function defaultProfile(){
  return {id:randomCode(),name:"PLAYER ONE",classId:"striker",skin:"standard",owned:["standard"],customSkins:[],coins:150,xp:0,level:1,stats:{matches:0,wins:0,losses:0,kos:0,deaths:0,bestStreak:0,streak:0,bestScore:0,rankPoints:0},friends:[],history:[],daily:{date:"",progress:{matches:0,kos:0,wins:0},claimed:[]}};
}
function loadProfile(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORE)||"null");
    if(!saved || typeof saved!=="object")return defaultProfile();
    const base=defaultProfile();
    const merged={...base,...saved,stats:{...base.stats,...(saved.stats||{})},daily:{...base.daily,...(saved.daily||{}),progress:{...base.daily.progress,...((saved.daily||{}).progress||{})}}};
    if(!Array.isArray(merged.owned))merged.owned=["standard"];
    if(!Array.isArray(merged.friends))merged.friends=[];
    if(!Array.isArray(merged.history))merged.history=[];
    if(!Array.isArray(merged.customSkins))merged.customSkins=[];
    merged.customSkins=merged.customSkins.filter(s=>s&&typeof s==="object"&&/^custom_[a-z0-9_-]{4,32}$/i.test(String(s.id||""))&&/^#[0-9a-f]{6}$/i.test(String(s.color||""))&&/^#[0-9a-f]{6}$/i.test(String(s.accent||""))).slice(0,40).map(s=>({id:String(s.id),name:cleanName(s.name||"CUSTOM SKIN").slice(0,18),color:s.color,accent:s.accent,style:["vanguard","runner","tech","shadow"].includes(s.style)?s.style:"vanguard",desc:"Your original custom outfit."}));
    if(!merged.owned.includes("standard"))merged.owned.unshift("standard");
    const validSkinIds=new Set([...SKINS.map(s=>s.id),...merged.customSkins.map(s=>s.id)]);
    merged.owned=merged.owned.filter(id=>validSkinIds.has(id));
    merged.customSkins.forEach(s=>{if(!merged.owned.includes(s.id))merged.owned.push(s.id);});
    if(!validSkinIds.has(merged.skin)||!merged.owned.includes(merged.skin))merged.skin="standard";
    if(!CLASS[merged.classId])merged.classId="striker";
    return merged;
  }catch(e){return defaultProfile();}
}
let profile=loadProfile();
let selectedMode="training",selectedMap="neon";
let peer=null,hostConn=null,connections=[],role="",roomCode="",myId="",lobbyPlayers=[],game=null;
let keys={},mouse={x:600,y:380},pointerDown=false,gamePaused=false,pointerLockUnavailable=false,lastFrame=performance.now(),lastSend=0,lastInput=0,lastHudUpdate=0,lastTouchAim=0,feedItems=[],endHandled=false;
let audioContext=null,soundEnabled=true;
try{soundEnabled=localStorage.getItem("globalClashSfx")!=="off";}catch(e){}
function playSfx(kind){
  if(!soundEnabled)return;
  try{
    const AudioCtor=window.AudioContext||window.webkitAudioContext;if(!AudioCtor)return;
    audioContext=audioContext||new AudioCtor();
    if(audioContext.state==="suspended")audioContext.resume().catch(()=>{});
    const now=audioContext.currentTime;
    const presets={pulse:[520,190,.085,"triangle",.035],hit:[175,75,.12,"sawtooth",.045],confirm:[780,390,.07,"sine",.025],pickup:[480,980,.18,"sine",.045],ultimate:[170,880,.34,"sawtooth",.055],ko:[300,85,.22,"square",.04],start:[320,640,.2,"triangle",.035]};
    const [from,to,duration,type,volume]=presets[kind]||presets.pulse;
    const osc=audioContext.createOscillator(),gain=audioContext.createGain();
    osc.type=type;osc.frequency.setValueAtTime(from,now);osc.frequency.exponentialRampToValueAtTime(Math.max(35,to),now+duration);
    gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(volume,now+.012);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    osc.connect(gain);gain.connect(audioContext.destination);osc.start(now);osc.stop(now+duration+.025);
  }catch(e){}
}
function updateSoundButton(){const button=$("soundToggle");if(button)button.textContent=soundEnabled?"SFX ON":"SFX OFF";}
let touchState={};
const canvas=$("arenaCanvas"),ctx=canvas.getContext("2d");
const arena3d=window.GlobalClash3D?window.GlobalClash3D.createArena(canvas):null;
const preview3d=window.GlobalClash3D?window.GlobalClash3D.createPreview($("previewAvatar")):null;
if(!arena3d){const renderBadge=document.querySelector(".render-badge");if(renderBadge)renderBadge.style.display="none";}
const localStorageSafe={
  set(key,value){try{localStorage.setItem(key,value);}catch(e){}}
};
function save(){localStorageSafe.set(STORE,JSON.stringify(profile));renderAll();}
function displayName(){return profile.name||"PLAYER";}
function myCode(){return "GC-"+profile.id;}
function skinInfo(id=profile.skin){return SKINS.find(x=>x.id===id)||profile.customSkins.find(x=>x.id===id)||SKINS[0];}
function skinColor(id=profile.skin){return skinInfo(id).color;}
function safeSkinData(data){
  if(!data||typeof data!=="object")return null;
  const validHex=v=>/^#[0-9a-f]{6}$/i.test(String(v||""));
  const id=String(data.id||"custom_remote").slice(0,40);
  if(!/^custom_[a-z0-9_-]{4,32}$/i.test(id)||!validHex(data.color)||!validHex(data.accent))return null;
  return {id,name:cleanName(data.name||"CUSTOM SKIN").slice(0,18),color:data.color,accent:data.accent,style:["vanguard","runner","tech","shadow"].includes(data.style)?data.style:"vanguard",desc:"Custom outfit"};
}
function currentSkinData(){const skin=skinInfo();return {...skin};}
function rankInfo(points=profile.stats.rankPoints){
  const ranks=[["BRONZE",0,500],["SILVER",500,1200],["GOLD",1200,2400],["PLATINUM",2400,4200],["DIAMOND",4200,7000],["MASTER",7000,11000],["GLOBAL ELITE",11000,Infinity]];
  let index=ranks.findIndex(r=>points>=r[1]&&points<r[2]);if(index<0)index=ranks.length-1;
  const current=ranks[index],next=ranks[index+1];
  return {name:current[0],min:current[1],max:current[2],next:next?next[0]:"MAX RANK",progress:next?Math.max(0,Math.min(100,(points-current[1])/(current[2]-current[1])*100)):100};
}
function dailyReset(){
  const date=new Date().toISOString().slice(0,10);
  if(profile.daily.date!==date){profile.daily={date,progress:{matches:0,kos:0,wins:0},claimed:[]};save();}
}
const QUESTS=[
  {id:"matches",title:"Play one arena match",target:1,reward:50,xp:25,icon:"◎"},
  {id:"kos",title:"Earn three arena points",target:3,reward:75,xp:35,icon:"✦"},
  {id:"wins",title:"Win one match",target:1,reward:100,xp:50,icon:"♛"}
];
function addXp(amount){
  profile.xp+=Math.max(0,Math.floor(amount));
  let didLevel=false;
  while(profile.xp>=profile.level*100){profile.xp-=profile.level*100;profile.level++;profile.coins+=50;didLevel=true;}
  if(didLevel)toast("LEVEL UP · LEVEL "+profile.level);
}
function toast(message){
  let el=$("toast");if(!el){el=document.createElement("div");el.id="toast";el.className="toast";document.body.appendChild(el);}
  el.textContent=message;el.classList.add("show");clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove("show"),2300);
}
function setView(view){
  document.querySelectorAll(".view").forEach(el=>el.classList.toggle("active",el.id==="view-"+view));
  document.querySelectorAll("[data-view]").forEach(el=>el.classList.toggle("active",el.dataset.view===view));
  $("main-nav").classList.remove("open");
  if(view==="loadout")renderLoadout();
  if(view==="social")renderSocial();
  if(view==="leaderboard")renderLeaderboard();
  if(view==="shop")renderShop();
  if(view==="profile")renderProfile();
  window.scrollTo({top:0,behavior:"smooth"});
}
function renderHeader(){
  $("headerCoins").textContent=profile.coins;
  $("headerName").textContent=profile.name;
  $("headerAvatar").textContent=(profile.name[0]||"G").toUpperCase();
  $("headerLevel").textContent="LV "+profile.level;
}
function renderHome(){
  $("statMatches").textContent=profile.stats.matches;
  $("statWins").textContent=profile.stats.wins;
  $("statKOs").textContent=profile.stats.kos;
  $("statStreak").textContent=profile.stats.bestStreak;
  $("selectedModeName").textContent=MODES[selectedMode].name.toUpperCase();
  $("selectedClassName").textContent=CLASS[profile.classId].name.toUpperCase();
  $("selectedMapName").textContent=MAPS[selectedMap].name.toUpperCase();
  $("launchHint").textContent=MODES[selectedMode].kind==="online"?"Private Online-Lobby · Invite friends with a room code":"Solo simulation · Local progress";
  $("homeXpBar").style.width=(profile.xp/(profile.level*100)*100)+"%";
  $("homeXpText").textContent=profile.xp+" / "+profile.level*100+" XP";
  $("homeLevel").textContent="LEVEL "+profile.level;
  renderQuests();
}
function renderQuests(){
  dailyReset();
  const list=$("dailyQuestList");list.innerHTML="";
  QUESTS.forEach(q=>{
    const progress=Math.min(q.target,profile.daily.progress[q.id]||0),claimed=profile.daily.claimed.includes(q.id),complete=progress>=q.target;
    const row=document.createElement("div");row.className="quest-row";
    const icon=document.createElement("span");icon.className="quest-icon";icon.textContent=q.icon;
    const title=document.createElement("span");title.textContent=q.title;
    const reward=document.createElement("small");reward.textContent=claimed?"CLAIMED":complete?"CLAIM":"+"+q.reward+" ◈";
    row.append(icon,title,reward);
    const bar=document.createElement("div");bar.className="quest-progress";const inner=document.createElement("i");inner.style.width=(progress/q.target*100)+"%";bar.append(inner);
    list.append(row,bar);
    if(complete&&!claimed){reward.style.color="var(--lime)";reward.style.cursor="pointer";reward.addEventListener("click",()=>claimQuest(q.id));}
  });
}
function claimQuest(id){
  const quest=QUESTS.find(q=>q.id===id);if(!quest||profile.daily.claimed.includes(id))return;
  if((profile.daily.progress[id]||0)<quest.target)return;
  profile.daily.claimed.push(id);profile.coins+=quest.reward;addXp(quest.xp);save();toast("DAILY REWARD CLAIMED");
}
function renderModeSelection(){
  document.querySelectorAll(".mode-card").forEach(el=>el.classList.toggle("selected",el.dataset.mode===selectedMode));
  document.querySelectorAll(".map-option").forEach(el=>el.classList.toggle("active",el.dataset.map===selectedMap));
}
function renderLoadout(){
  $("previewName").textContent=profile.name.toUpperCase();
  $("previewClass").textContent=CLASS[profile.classId].name.toUpperCase()+" · LEVEL "+profile.level;
  $("previewAvatar").style.borderColor=skinColor();
  $("previewAvatar").style.boxShadow="0 0 65px "+skinColor()+"25";
  $("previewAvatar").querySelector(".avatar-figure").style.background="linear-gradient(135deg,"+skinColor()+",#c5ff67)";
  const c=CLASS[profile.classId];
  $("previewStats").innerHTML=[["HP",c.hp],["SPEED",Math.round(c.speed/3)],["ENERGY",c.energy]].map(([k,v])=>'<div class="preview-stat"><b>'+v+'</b><small>'+k+'</small></div>').join("");
  document.querySelectorAll(".class-card").forEach(el=>el.classList.toggle("selected",el.dataset.class===profile.classId));
  const skin=skinInfo();
  $("equippedCosmetic").innerHTML='<span class="cosmetic-swatch" style="background:'+skin.color+';color:'+skin.color+'"></span><span><b>'+skin.name+'</b><br><small>'+(skin.desc||"Personal custom outfit.")+'</small></span>';
  const nameField=$("customSkinName");if(nameField&&!nameField.dataset.dirty)syncSkinCreatorFields();
  updateSkinDraftPreview();
}

function skinDraft(){
  const name=cleanName($("customSkinName").value||"MY SKIN").slice(0,18);
  const color=$("customSkinPrimary").value||"#53eedc";
  const accent=$("customSkinAccent").value||"#ad91ff";
  const style=$("customSkinStyle").value||"vanguard";
  return {id:"custom_preview",name,color,accent,style,desc:"Your live outfit design."};
}
function syncSkinCreatorFields(){
  const skin=skinInfo();
  $("customSkinName").value=skin.name||"MY CUSTOM SKIN";
  $("customSkinPrimary").value=skin.color||"#53eedc";
  $("customSkinAccent").value=skin.accent||"#ad91ff";
  $("customSkinStyle").value=["vanguard","runner","tech","shadow"].includes(skin.style)?skin.style:"vanguard";
}
function updateSkinDraftPreview(){
  if(!preview3d||!$("customSkinName"))return;
  const draft=skinDraft();
  preview3d.setCharacter(profile.classId,draft.color,draft);
}
function saveCustomSkin(){
  const draft=skinDraft();
  if(!/^#[0-9a-f]{6}$/i.test(draft.color)||!/^#[0-9a-f]{6}$/i.test(draft.accent)){toast("CHOOSE VALID COLOURS");return;}
  const id="custom_"+randomCode().toLowerCase()+"_"+Math.random().toString(36).slice(2,5);
  const outfit={...draft,id,desc:"Custom outfit created in Outfit Lab."};
  profile.customSkins=Array.isArray(profile.customSkins)?profile.customSkins:[];
  profile.customSkins.unshift(outfit);
  profile.customSkins=profile.customSkins.slice(0,40);
  if(!Array.isArray(profile.owned))profile.owned=["standard"];
  profile.owned.push(id);profile.skin=id;
  $("customSkinName").dataset.dirty="";
  save();renderLoadout();renderShop();
  toast("CUSTOM SKIN SAVED & EQUIPPED");
}
function randomiseSkinDraft(){
  const palette=["#53eedc","#c5ff67","#ff6688","#ad91ff","#ffbd67","#9bdcff","#ff8b56","#7dcbff","#56e5df","#d8b4ff"];
  const accents=["#f7fbff","#c5ff67","#53eedc","#ff6688","#ad91ff","#ffcf9e"];
  const styles=["vanguard","runner","tech","shadow"];
  $("customSkinPrimary").value=palette[Math.floor(Math.random()*palette.length)];
  $("customSkinAccent").value=accents[Math.floor(Math.random()*accents.length)];
  $("customSkinStyle").value=styles[Math.floor(Math.random()*styles.length)];
  $("customSkinName").value="CUSTOM "+randomCode().slice(0,4);
  $("customSkinName").dataset.dirty="1";
  updateSkinDraftPreview();
}

function renderSocial(){
  $("friendCodeDisplay").textContent=myCode();$("friendCount").textContent=profile.friends.length+" SAVED";
  const list=$("friendList");list.innerHTML="";
  if(!profile.friends.length){const empty=document.createElement("div");empty.className="empty-state";empty.textContent="Noch keine Freunde gespeichert. Teile deinen Code oder füge einen Freund hinzu.";list.append(empty);return;}
  profile.friends.forEach(friend=>{
    const card=document.createElement("div");card.className="friend-card";
    const avatar=document.createElement("div");avatar.className="friend-avatar";avatar.textContent=(friend.name[0]||"?").toUpperCase();
    const detail=document.createElement("div");detail.className="friend-detail";
    const name=document.createElement("b");name.textContent=friend.name;
    const code=document.createElement("small");code.textContent=friend.code;
    detail.append(name,code);
    const remove=document.createElement("button");remove.className="remove-friend";remove.textContent="REMOVE";
    remove.addEventListener("click",()=>{profile.friends=profile.friends.filter(x=>x.code!==friend.code);save();renderSocial();});
    card.append(avatar,detail,remove);list.append(card);
  });
}
function renderLeaderboard(){
  const points=profile.stats.rankPoints,r=rankInfo(points);
  $("rankTier").textContent=r.name;$("rankDescription").textContent=r.name==="GLOBAL ELITE"?"Top local tier reached. Keep your edge.":"Earn rank points from matches and keep improving.";
  $("rankPoints").textContent=points.toLocaleString("de-DE");
  $("rankProgress").style.width=r.progress+"%";
  $("rankNext").textContent=r.max===Infinity?"MAX RANK ACHIEVED":(points-r.min)+" / "+(r.max-r.min)+" TO "+r.next;
  const history=profile.history.slice(0,10);
  const table=$("leaderTable");table.innerHTML="";
  const records=history.length?history:[{mode:"No matches yet",map:"Start your first run",score:0,points:0}];
  records.forEach((item,index)=>{
    const row=document.createElement("div");row.className="leader-row";
    row.innerHTML='<span class="leader-place">#'+String(index+1).padStart(2,"0")+'</span><span class="leader-identity"><b>'+escapeHtml(item.mode)+'</b><small>'+escapeHtml(item.map)+' · '+escapeHtml(item.date||"PERSONAL RECORD")+'</small></span><span class="leader-points">'+item.score+' PTS</span><span class="leader-tier">PERSONAL</span>';
    table.append(row);
  });
}
function renderShop(){
  $("shopCoins").textContent=profile.coins;
  const list=$("shopGrid");list.innerHTML="";
  [...SKINS,...profile.customSkins].forEach(skin=>{
    const owned=profile.owned.includes(skin.id),equipped=profile.skin===skin.id;
    const card=document.createElement("article");card.className="shop-item"+(owned?" owned":"");
    const preview=document.createElement("div");preview.className="shop-preview";const swatch=document.createElement("i");swatch.style.setProperty("--skin",skin.color);preview.append(swatch);
    const title=document.createElement("h3");title.textContent=skin.name;
    const desc=document.createElement("p");desc.textContent=skin.desc;
    const foot=document.createElement("div");foot.className="shop-item-foot";
    const price=document.createElement("span");price.className="shop-price";price.textContent=owned?(equipped?"EQUIPPED":"UNLOCKED"):(skin.cost+" ◈");
    const action=document.createElement("button");action.className="btn "+(owned?"btn-outline":"btn-primary");action.textContent=equipped?"ACTIVE":owned?"EQUIP":"UNLOCK";action.disabled=equipped;
    action.addEventListener("click",()=>{
      if(owned){profile.skin=skin.id;$("customSkinName").dataset.dirty="";save();renderShop();renderLoadout();toast("STYLE EQUIPPED");}
      else if(profile.coins>=skin.cost){profile.coins-=skin.cost;profile.owned.push(skin.id);profile.skin=skin.id;$("customSkinName").dataset.dirty="";save();renderShop();renderLoadout();toast("COSMETIC UNLOCKED");}
      else toast("NOT ENOUGH COINS");
    });
    foot.append(price,action);card.append(preview,title,desc,foot);list.append(card);
  });
}
function renderProfile(){
  const r=rankInfo();
  $("profileAvatar").textContent=(profile.name[0]||"G").toUpperCase();
  $("profileAvatar").style.color=skinColor();
  $("profileName").textContent=profile.name.toUpperCase();
  $("profileCode").textContent=myCode();$("profileTier").textContent=r.name;$("profileLevel").textContent="LEVEL "+profile.level;
  $("profileLevelBig").textContent=profile.level;
  $("profileXpBar").style.width=(profile.xp/(profile.level*100)*100)+"%";
  $("profileXpText").textContent=profile.xp+" / "+profile.level*100+" XP";
  $("profileNextReward").textContent="+50 COINS NEXT LEVEL";
  const stats=[["MATCHES",profile.stats.matches],["WINS",profile.stats.wins],["WIN RATE",profile.stats.matches?Math.round(profile.stats.wins/profile.stats.matches*100)+"%":"0%"],["ARENA POINTS",profile.stats.kos],["LOSSES",profile.stats.losses],["DEATHS",profile.stats.deaths],["RANK POINTS",profile.stats.rankPoints],["BEST STREAK",profile.stats.bestStreak]];
  $("profileStats").innerHTML=stats.map(([label,value])=>'<div class="profile-stat"><strong>'+value+'</strong><span>'+label+'</span></div>').join("");
  const achievements=[
    ["FIRST DROP","Complete your first match.",profile.stats.matches>=1],
    ["FIRST VICTORY","Win your first match.",profile.stats.wins>=1],
    ["TEN RUNS","Play ten matches.",profile.stats.matches>=10],
    ["ARENA ACE","Earn 25 arena points.",profile.stats.kos>=25],
    ["COLLECTOR","Unlock three visual styles.",profile.owned.length>=3],
    ["STREAK FIVE","Reach a five-win streak.",profile.stats.bestStreak>=5]
  ];
  $("achievementList").innerHTML=achievements.map(([name,desc,ok])=>'<div class="achievement '+(ok?"":"locked")+'"><b>'+(ok?"✓ ":"◇ ")+name+'</b><small>'+desc+'</small></div>').join("");
}
function renderAll(){renderHeader();renderHome();if($("view-loadout").classList.contains("active"))renderLoadout();}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function chooseMode(mode){if(!MODES[mode])return;selectedMode=mode;renderModeSelection();renderHome();}
function launchSelected(){
  if(MODES[selectedMode].kind==="online")openLobby();
  else startSolo(selectedMode);
}
function openLobby(){
  $("lobbyModeSummary").textContent=MODES[selectedMode].name.toUpperCase()+" · "+MAPS[selectedMap].name.toUpperCase()+" · "+CLASS[profile.classId].name.toUpperCase();
  $("lobbyError").textContent=window.Peer?"":"PeerJS konnte nicht geladen werden. Prüfe deine Internetverbindung.";
  $("roomState").classList.add("hidden");
  $("lobbyModal").classList.add("open");
}
function closeModal(id){$(id).classList.remove("open");}
function setLobbyError(message){$("lobbyError").textContent=message||"";}
function makeRoomCode(){return randomCode();}
function disconnectNetwork(){
  connections.forEach(c=>{try{c.close();}catch(e){}});
  connections=[];
  try{if(hostConn)hostConn.close();}catch(e){}
  hostConn=null;
  try{if(peer&&!peer.destroyed)peer.destroy();}catch(e){}
  peer=null;
}
function makeRosterPlayer(id,name,classId,index,isBot=false,skinId,remoteSkinData){
  const skin=(id==="p1"&&!isBot)?currentSkinData():(safeSkinData(remoteSkinData)||skinInfo(skinId||"standard"));
  return {id,name:cleanName(name),classId:CLASS[classId]?classId:"striker",skinId:skin.id,skinData:{...skin},color:skin.color,isBot};
}
function cleanName(name){return String(name||"PLAYER").replace(/[^A-Za-z0-9ÄÖÜäöüß _-]/g,"").trim().slice(0,14)||"PLAYER";}
function renderRoster(){
  const wrap=$("roomMembers");wrap.innerHTML="";
  lobbyPlayers.forEach((p,i)=>{
    const node=document.createElement("div");node.className="room-member";
    const dot=document.createElement("i");dot.style.background=p.color||COLORS[i%4];
    node.append(dot,document.createTextNode(p.name+" · "+(CLASS[p.classId]||CLASS.striker).name.toUpperCase()+(p.id==="p1"?" · HOST":"")));
    wrap.append(node);
  });
  const min=selectedMode==="duel"?2:2;
  $("startOnlineMatch").disabled=role!=="host"||lobbyPlayers.length<min;
  $("roomStatus").textContent=lobbyPlayers.length+" / "+MODES[selectedMode].limit+" CONNECTED";
}
function createRoom(){
  if(!window.Peer){setLobbyError("PeerJS could not be loaded. Check your internet connection.");return;}
  disconnectNetwork();role="host";roomCode=makeRoomCode();myId="p1";
  lobbyPlayers=[makeRosterPlayer("p1",profile.name,profile.classId,0)];
  setLobbyError("Connecting to the peer network …");
  $("roomState").classList.remove("hidden");$("roomCode").textContent=roomCode;renderRoster();
  peer=new Peer("gc-"+roomCode.toLowerCase(),{debug:0});
  peer.on("open",()=>{setLobbyError("");$("roomStatus").textContent="ROOM LIVE · SHARE THE CODE";renderRoster();});
  peer.on("connection",conn=>{
    conn.on("data",message=>{
      if(!message||typeof message!=="object")return;
      if(message.type==="join"){
        if(game||lobbyPlayers.length>=MODES[selectedMode].limit){conn.send({type:"error",message:game?"The match has already started.":"This room is full."});conn.close();return;}
        let seat=2;while(lobbyPlayers.some(player=>player.id==="p"+seat))seat++;const id="p"+seat;conn.playerId=id;
        lobbyPlayers.push(makeRosterPlayer(id,message.name,message.classId,lobbyPlayers.length,false,message.skinId,message.skinData));
        connections.push(conn);
        conn.send({type:"welcome",id,roomCode,players:lobbyPlayers,mode:selectedMode,map:selectedMap});
        sendRoster();toast("FIGHTER CONNECTED");
      }else if(message.type==="input"&&game&&conn.playerId&&game.players[conn.playerId]){
        game.players[conn.playerId].input=cleanInput(message.input);
      }else if(message.type==="rematch"&&role==="host"){
        restartNetworkMatch();
      }
    });
    conn.on("close",()=>{
      if(!conn.playerId)return;
      lobbyPlayers=lobbyPlayers.filter(p=>p.id!==conn.playerId);
      if(game&&game.players[conn.playerId])game.players[conn.playerId].disconnected=true;
      connections=connections.filter(c=>c!==conn);
      if(!game)sendRoster();else pushFeed("» "+conn.playerId+" left the room.");
    });
  });
  peer.on("error",err=>{
    setLobbyError(err&&err.type==="unavailable-id"?"Room code collision. Please create a new room.":"Network error: "+((err&&err.type)||"connection failed"));
    $("roomStatus").textContent="CONNECTION ERROR";
  });
}
function sendRoster(){
  const message={type:"roster",players:lobbyPlayers};
  connections.forEach(c=>{if(c.open)c.send(message);});
  renderRoster();
}
function joinRoom(){
  if(!window.Peer){setLobbyError("PeerJS could not be loaded. Check your internet connection.");return;}
  const code=String($("joinCode").value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
  if(code.length!==6){setLobbyError("Enter a valid six-character room code.");return;}
  disconnectNetwork();role="guest";roomCode=code;
  setLobbyError("Connecting to room "+code+" …");
  peer=new Peer(undefined,{debug:0});
  peer.on("open",()=>{
    hostConn=peer.connect("gc-"+code.toLowerCase(),{reliable:true});
    hostConn.on("open",()=>hostConn.send({type:"join",name:profile.name,classId:profile.classId,skinId:profile.skin,skinData:currentSkinData()}));
    hostConn.on("data",message=>{
      if(!message||typeof message!=="object")return;
      if(message.type==="welcome"){
        myId=message.id;roomCode=message.roomCode;lobbyPlayers=message.players||[];
        selectedMode=message.mode||selectedMode;selectedMap=message.map||selectedMap;
        $("lobbyModeSummary").textContent=MODES[selectedMode].name.toUpperCase()+" · "+MAPS[selectedMap].name.toUpperCase();
        $("roomState").classList.remove("hidden");$("roomCode").textContent=roomCode;setLobbyError("");renderRoster();
      }else if(message.type==="roster"){lobbyPlayers=message.players||[];renderRoster();}
      else if(message.type==="error"){setLobbyError(message.message||"Join failed.");}
      else if(message.type==="start"){game=message.state;endHandled=false;feedItems=["» Online match started.","» Good luck, operator."];openGame();}
      else if(message.type==="state"){game=message.state;if(game&&game.phase==="ended")handleMatchEnd();}
      else if(message.type==="feed"){pushFeed(message.text);}
    });
    hostConn.on("error",()=>setLobbyError("Could not connect. Check the room code and try again."));
    hostConn.on("close",()=>{if(game&&role==="guest")pushFeed("» Host connection closed.");});
  });
  peer.on("error",err=>setLobbyError(err&&err.type==="peer-unavailable"?"Room not found. Check that the host is online.":"Network error: "+((err&&err.type)||"connection failed")));
}
function sendAll(payload){connections.forEach(c=>{if(c&&c.open){try{c.send(payload);}catch(e){}}});}
function sendHost(payload){if(hostConn&&hostConn.open){try{hostConn.send(payload);}catch(e){}}}
function copyText(text){if(navigator.clipboard&&navigator.clipboard.writeText)return navigator.clipboard.writeText(text);return Promise.reject(new Error("Clipboard unavailable"));}
function copyInvite(){
  const url=location.origin+location.pathname+"?room="+roomCode;
  copyText(url).then(()=>toast("INVITE LINK COPIED")).catch(()=>toast("ROOM CODE: "+roomCode));
}
function classStats(classId){
  const c=CLASS[classId]||CLASS.striker;
  return {maxHp:c.hp,speed:c.speed,maxEnergy:c.energy,regen:c.regen,shieldScale:c.shield};
}
function spawnPositions(index){
  return [{x:180,y:170},{x:1020,y:170},{x:180,y:590},{x:1020,y:590}][index%4];
}
function createGame(players,mode,map,online){
  const people={},list=players.slice();
  if((mode==="teams"||mode==="core")&&list.length<4){
    while(list.length<4){const i=list.length;list.push(makeRosterPlayer("bot"+(i+1),"ARENA BOT "+(i-1),"guardian",i,true));}
  }
  if(mode==="training"&&list.length<2)list.push(makeRosterPlayer("bot1","TRAINING BOT","runner",1,true));
  if(mode==="tournament"&&list.length<2)list.push(makeRosterPlayer("bot1","ROUND 1 CHALLENGER","guardian",1,true));
  if(mode==="survival"&&list.length<4){while(list.length<4){const i=list.length;list.push(makeRosterPlayer("bot"+i,"WAVE BOT "+i,i%2?"runner":"guardian",i,true));}}
  if(mode==="king"&&list.length<3){while(list.length<3){const i=list.length;list.push(makeRosterPlayer("bot"+i,"ZONE BOT "+i,"technician",i,true));}}
  list.slice(0,4).forEach((item,i)=>{
    const cs=classStats(item.classId),pos=spawnPositions(i);
    people[item.id]={id:item.id,name:item.name,classId:item.classId||"striker",skinId:item.skinId||"standard",skinData:item.skinData||skinInfo(item.skinId||"standard"),color:item.color||COLORS[i],team:i%2===0?"A":"B",x:pos.x,y:pos.y,
      hp:cs.maxHp,maxHp:cs.maxHp,energy:cs.maxEnergy,maxEnergy:cs.maxEnergy,speed:cs.speed,regen:cs.regen,shieldScale:cs.shield,
      score:0,kos:0,deaths:0,angle:0,attackCooldown:0,dashCooldown:0,dashTimer:0,shieldTimer:0,respawn:0,
      ultimate:0,ultimateCooldown:0,overdriveTimer:0,speedBoostTimer:0,
      input:cleanInput({aimX:600,aimY:380}),isBot:!!item.isBot,disconnected:false};
  });
  return {id:"m"+Date.now()+Math.random().toString(36).slice(2,7),mode,map,online,phase:"playing",time:MODES[mode].seconds,elapsed:0,tournamentRound:1,players:people,bullets:[],pickups:[],particles:[],pickupTimer:5,objective:{A:0,B:0},wave:1,spawnTimer:0,feed:[]};
}
function startSolo(mode){
  disconnectNetwork();role="solo";roomCode="";myId="p1";
  game=createGame([makeRosterPlayer("p1",profile.name,profile.classId,0)],mode,selectedMap,false);
  endHandled=false;feedItems=["» Local simulation loaded.","» Controls ready."];openGame();
}
function startNetworkMatch(){
  if(role!=="host"||lobbyPlayers.length<2)return;
  game=createGame(lobbyPlayers,selectedMode,selectedMap,true);endHandled=false;
  sendAll({type:"start",state:game});
  closeModal("lobbyModal");openGame();
}
function restartNetworkMatch(){
  if(role!=="host")return;
  game=createGame(lobbyPlayers,selectedMode,selectedMap,true);endHandled=false;
  feedItems=["» Rematch initiated.","» Good luck, operator."];
  sendAll({type:"start",state:game});openGame();
}
function openGame(){
  closeModal("lobbyModal");$("gameScreen").classList.add("open");$("gameEndOverlay").classList.add("hidden");
  $("gamePauseOverlay").classList.add("hidden");gamePaused=false;
  $("gameModeLabel").textContent=MODES[game.mode].name.toUpperCase();$("gameMapLabel").textContent=MAPS[game.map].name.toUpperCase();
  $("gameClock").textContent=formatTime(game.time);updateSoundButton();playSfx("start");renderGame();lastFrame=performance.now();
  const coarse=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;
  if(coarse){pointerLockUnavailable=true;return;}
  captureGameMouse();
}
function pauseMatch(){
  if(!game||!$("gameScreen").classList.contains("open"))return;
  gamePaused=true;keys={};touchState={};pointerDown=false;
  if(role==="guest")sendHost({type:"input",input:cleanInput({aimX:mouse.x,aimY:mouse.y})});
  $("gamePauseOverlay").classList.remove("hidden");
  if(arena3d)arena3d.exitPointerLock();
}
function captureGameMouse(){
  if(!arena3d||!arena3d.requestPointerLock){pointerLockUnavailable=true;gamePaused=false;$("gamePauseOverlay").classList.add("hidden");return;}
  pointerLockUnavailable=false;
  arena3d.requestPointerLock().then(()=>{
    setTimeout(()=>{
      if(game&&$("gameScreen").classList.contains("open")&&!arena3d.isPointerLocked())pauseMatch();
    },260);
  }).catch(()=>pauseMatch());
}
function resumeMatch(){
  if(!game)return;
  keys={};touchState={};pointerDown=false;
  const coarse=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;
  if(coarse||!arena3d){pointerLockUnavailable=true;gamePaused=false;$("gamePauseOverlay").classList.add("hidden");return;}
  pointerLockUnavailable=false;
  arena3d.requestPointerLock().then(()=>{
    setTimeout(()=>{
      if(game&&$("gameScreen").classList.contains("open")&&!arena3d.isPointerLocked()){
        pointerLockUnavailable=true;gamePaused=false;$("gamePauseOverlay").classList.add("hidden");toast("CURSOR AIM ENABLED");
      }
    },260);
  }).catch(()=>{
    pointerLockUnavailable=true;gamePaused=false;$("gamePauseOverlay").classList.add("hidden");toast("CURSOR AIM ENABLED");
  });
}
function updateAimFromLockedCamera(){
  if(!arena3d||!arena3d.getAimPoint)return;
  const point=arena3d.getAimPoint();mouse.x=point.x;mouse.y=point.y;
}
function formatTime(t){return Math.floor(t/60).toString().padStart(2,"0")+":"+Math.ceil(t%60).toString().padStart(2,"0");}
function pushFeed(text){
  feedItems.unshift(String(text||""));feedItems=feedItems.slice(0,5);
  $("arenaFeed").innerHTML="";
  feedItems.forEach(line=>{const s=document.createElement("span");s.textContent=line;$("arenaFeed").append(s);});
}
function cleanInput(input){
  input=input||{};
  const number=(v,def)=>Number.isFinite(Number(v))?Math.max(0,Math.min(1200,Number(v))):def;
  const move=v=>typeof v==="number"&&Number.isFinite(v)?Math.max(-1,Math.min(1,v)):null;
  return {up:!!input.up,down:!!input.down,left:!!input.left,right:!!input.right,moveX:move(input.moveX),moveY:move(input.moveY),attack:!!input.attack,dash:!!input.dash,sprint:!!input.sprint,shield:!!input.shield,ultimate:!!input.ultimate,aimX:number(input.aimX,600),aimY:number(input.aimY,380)};
}
function getInput(){
  let aimX=mouse.x,aimY=mouse.y;
  const coarse=window.matchMedia&&window.matchMedia("(pointer: coarse)").matches;
  if(coarse&&performance.now()-lastTouchAim>1600&&game&&game.players[myId]){
    const me=game.players[myId];
    const targets=Object.values(game.players).filter(p=>p.id!==myId&&!p.disconnected&&p.hp>0&&p.respawn<=0&&(!["teams","core"].includes(game.mode)||p.team!==me.team));
    const target=targets.sort((a,b)=>Math.hypot(a.x-me.x,a.y-me.y)-Math.hypot(b.x-me.x,b.y-me.y))[0];
    if(target){aimX=target.x;aimY=target.y;}
  }
  const up=!!(keys.w||keys.arrowup||touchState.w),down=!!(keys.s||keys.arrowdown||touchState.s);
  const left=!!(keys.a||keys.arrowleft||touchState.a),right=!!(keys.d||keys.arrowright||touchState.d);
  let moveX=null,moveY=null;
  const me=game&&game.players[myId];
  if(me){
    const look=Math.atan2(aimY-me.y,aimX-me.x);
    const forward=(up?1:0)-(down?1:0),strafe=(right?1:0)-(left?1:0);
    moveX=Math.cos(look)*forward-Math.sin(look)*strafe;
    moveY=Math.sin(look)*forward+Math.cos(look)*strafe;
    const magnitude=Math.hypot(moveX,moveY)||1;moveX/=magnitude;moveY/=magnitude;
  }
  return cleanInput({up,down,left,right,moveX,moveY,
    attack:keys.j||pointerDown||touchState.j,dash:keys[" "]||touchState[" "],sprint:keys.shift||touchState.shift,shield:keys.e||touchState.e,ultimate:keys.q||touchState.q,aimX,aimY
  });
}
function botInput(bot){
  const other=Object.values(game.players).filter(p=>p.id!==bot.id&&!p.disconnected&&p.hp>0);
  const targets=other.filter(p=>!["teams","core"].includes(game.mode)||p.team!==bot.team);
  const target=(targets.length?targets:other).sort((a,b)=>Math.hypot(a.x-bot.x,a.y-bot.y)-Math.hypot(b.x-bot.x,b.y-bot.y))[0];
  let tx=600,ty=380,dist=0,ang=0;
  if(target){tx=target.x;ty=target.y;dist=Math.hypot(tx-bot.x,ty-bot.y);ang=Math.atan2(ty-bot.y,tx-bot.x);}
  if(game.mode==="king"||game.mode==="core"){
    tx=600;ty=380;ang=Math.atan2(ty-bot.y,tx-bot.x);dist=Math.hypot(tx-bot.x,ty-bot.y);
  }
  const orbit=Math.sin(game.elapsed*1.5+(bot.id.charCodeAt(0)||0))>0?1:-1;
  const a=dist>240?ang:ang+orbit*1.2;
  return cleanInput({up:Math.sin(a)<-.3,down:Math.sin(a)>.3,left:Math.cos(a)<-.3,right:Math.cos(a)>.3,attack:!!target&&dist<650,shield:!!target&&dist<130&&bot.energy>35,dash:dist<110&&bot.dashCooldown<=0,ultimate:bot.ultimate>=100&&!!target,aimX:tx,aimY:ty});
}
function pulse(p){
  const a=p.angle;
  game.bullets.push({owner:p.id,x:p.x+Math.cos(a)*24,y:p.y+Math.sin(a)*24,vx:Math.cos(a)*720,vy:Math.sin(a)*720,r:6,damage:p.overdriveTimer>0?29:18,life:1.25,color:p.color});
  if(p.id===myId)playSfx("pulse");
}
function spawnBurst(x,y,color,count=9){
  if(!game)return;
  game.particles=game.particles||[];
  for(let i=0;i<count;i++){
    const a=Math.random()*Math.PI*2,s=55+Math.random()*205,life=.22+Math.random()*.38;
    game.particles.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life,maxLife:life,color,size:1.5+Math.random()*3});
  }
  if(game.particles.length>140)game.particles.splice(0,game.particles.length-140);
}
function addArenaBot(){
  const ids=Object.keys(game.players);
  if(ids.length>=6)return;
  const id="wave"+Math.floor(game.elapsed)+"_"+ids.length;
  const pos=spawnPositions(Math.floor(Math.random()*4));
  const c=classStats("runner");
  game.players[id]={id,name:"WAVE "+game.wave+" BOT",classId:"runner",color:"#ff9b6c",team:"B",x:pos.x,y:pos.y,hp:c.maxHp,maxHp:c.maxHp,energy:c.maxEnergy,maxEnergy:c.maxEnergy,speed:c.speed,regen:c.regen,shieldScale:c.shield,score:0,kos:0,deaths:0,angle:0,attackCooldown:0,dashCooldown:0,dashTimer:0,shieldTimer:0,respawn:0,ultimate:0,ultimateCooldown:0,overdriveTimer:0,speedBoostTimer:0,input:cleanInput({}),isBot:true,disconnected:false};
}
function withinObstacle(x,y,r,blocks){
  return blocks.some(b=>x+r>b[0]-b[2]/2&&x-r<b[0]+b[2]/2&&y+r>b[1]-b[3]/2&&y-r<b[1]+b[3]/2);
}
function resolvePlayerPosition(p,dx,dy){
  const map=MAPS[game.map];
  let nx=Math.max(32,Math.min(1168,p.x+dx)),ny=Math.max(32,Math.min(728,p.y+dy));
  if(!withinObstacle(nx,ny,16,map.blocks)){p.x=nx;p.y=ny;}
  else{
    if(!withinObstacle(nx,p.y,16,map.blocks))p.x=nx;
    if(!withinObstacle(p.x,ny,16,map.blocks))p.y=ny;
  }
}
function addKO(owner,victim){
  victim.deaths++;
  const scorer=game.players[owner];
  if(scorer){scorer.kos=(scorer.kos||0)+1;scorer.ultimate=Math.min(100,(scorer.ultimate||0)+32);if(game.mode!=="king")scorer.score++;}
  spawnBurst(victim.x,victim.y,victim.color,24);
  if(victim.id===myId)playSfx("ko");
  pushHostFeed("» "+(scorer?scorer.name:"Arena")+" scored a point.");
  if(game.mode==="survival"&&victim.id==="p1"){victim.hp=0;game.phase="ended";game.winner=null;return;}
  victim.respawn=2.1;victim.hp=0;
}
function updateObjective(dt){
  if(!["king","core"].includes(game.mode))return;
  let a=0,b=0;
  Object.values(game.players).forEach(p=>{
    if(p.disconnected||p.hp<=0||p.respawn>0)return;
    if(Math.hypot(p.x-600,p.y-380)<105){if(game.mode==="king"){if(p.id==="p1")a++;else b++;}else if(p.team==="A")a++;else b++;}
  });
  if(a>b)game.objective.A+=dt*(game.mode==="king"?1.6:2.1);else if(b>a)game.objective.B+=dt*(game.mode==="king"?1.6:2.1);
  if(Math.max(game.objective.A,game.objective.B)>=30){
    game.phase="ended";
    if(game.mode==="king")game.winner={id:game.objective.A>game.objective.B?"p1":"bots",name:game.objective.A>game.objective.B?game.players.p1.name:"ARENA BOTS",score:30};
    else game.winner={id:game.objective.A>game.objective.B?"teamA":"teamB",name:game.objective.A>game.objective.B?"TEAM A":"TEAM B",score:30};
  }
}
function activateUltimate(p){
  if(!p||p.ultimate<100||p.ultimateCooldown>0)return false;
  p.ultimate=0;p.ultimateCooldown=2;
  if(p.id===myId)playSfx("ultimate");
  spawnBurst(p.x,p.y,p.color,24);
  if(p.classId==="guardian"){
    p.hp=Math.min(p.maxHp,p.hp+38);p.shieldTimer=3.3;
    pushHostFeed("» "+p.name+" activated FORTRESS.");
  }else if(p.classId==="runner"){
    p.speedBoostTimer=4.2;p.energy=Math.min(p.maxEnergy,p.energy+38);p.dashCooldown=0;
    pushHostFeed("» "+p.name+" activated OVERDRIVE.");
  }else if(p.classId==="technician"){
    p.energy=p.maxEnergy;
    for(let i=0;i<12;i++){const a=i*Math.PI/6;game.bullets.push({owner:p.id,x:p.x+Math.cos(a)*25,y:p.y+Math.sin(a)*25,vx:Math.cos(a)*570,vy:Math.sin(a)*570,r:7,damage:13,life:1.1,color:p.color});}
    pushHostFeed("» "+p.name+" unleashed a NOVA BURST.");
  }else{
    p.overdriveTimer=4.2;
    pushHostFeed("» "+p.name+" activated PLASMA RUSH.");
  }
  return true;
}
function spawnPickup(){
  if(!game.pickups)game.pickups=[];
  if(game.pickups.length>=3)return;
  const types=["repair","battery","charge"];
  for(let attempt=0;attempt<18;attempt++){
    const x=70+Math.random()*1060,y=70+Math.random()*620;
    if(withinObstacle(x,y,24,MAPS[game.map].blocks))continue;
    if(Object.values(game.players).some(p=>!p.disconnected&&Math.hypot(p.x-x,p.y-y)<75))continue;
    game.pickups.push({id:"pk"+Math.floor(game.elapsed*1000)+attempt,x,y,type:types[Math.floor(Math.random()*types.length)],life:15});
    break;
  }
}
function applyPickup(p,pickup){
  if(pickup.type==="repair")p.hp=Math.min(p.maxHp,p.hp+38);
  else if(pickup.type==="battery")p.energy=Math.min(p.maxEnergy,p.energy+55);
  else p.ultimate=Math.min(100,p.ultimate+42);
  spawnBurst(pickup.x,pickup.y,p.color,17);
  if(p.id===myId)playSfx("pickup");
  pushHostFeed("» "+p.name+" collected "+({repair:"REPAIR CELL",battery:"ENERGY CELL",charge:"ULTIMATE CHARGE"}[pickup.type])+".");
}
function updateHost(dt){
  if(!game||game.phase!=="playing")return;
  game.elapsed+=dt;game.time=Math.max(0,MODES[game.mode].seconds-game.elapsed);
  game.pickupTimer-=dt;
  if(game.pickupTimer<=0){spawnPickup();game.pickupTimer=8+Math.random()*5;}
  game.pickups=(game.pickups||[]).filter(p=>{p.life-=dt;return p.life>0;});
  game.particles=(game.particles||[]).filter(p=>{p.x+=p.vx*dt;p.y+=p.vy*dt;p.vx*=.94;p.vy*=.94;p.life-=dt;return p.life>0;});
  if(game.mode==="survival"){
    game.wave=1+Math.floor(game.elapsed/24);
    game.spawnTimer-=dt;
    const activeBots=Object.values(game.players).filter(p=>p.isBot&&!p.disconnected&&p.hp>0&&p.respawn<=0).length;
    if(game.spawnTimer<=0&&activeBots<Math.min(5,2+game.wave)){addArenaBot();game.spawnTimer=Math.max(.5,2.7-game.wave*.12);}
  }
  Object.values(game.players).forEach(p=>{
    if(p.disconnected)return;
    if(p.isBot)p.input=botInput(p);
    if(p.id===myId)p.input=getInput();
    const input=p.input||cleanInput({});
    p.attackCooldown=Math.max(0,p.attackCooldown-dt);p.dashCooldown=Math.max(0,p.dashCooldown-dt);p.dashTimer=Math.max(0,p.dashTimer-dt);
    p.ultimateCooldown=Math.max(0,(p.ultimateCooldown||0)-dt);p.overdriveTimer=Math.max(0,(p.overdriveTimer||0)-dt);p.speedBoostTimer=Math.max(0,(p.speedBoostTimer||0)-dt);
    if(input.ultimate&&p.ultimate>=100&&p.ultimateCooldown<=0)activateUltimate(p);
    if(p.respawn>0){p.respawn-=dt;if(p.respawn<=0){const idx=Object.keys(game.players).indexOf(p.id);const pos=spawnPositions(idx);p.x=pos.x;p.y=pos.y;p.hp=p.maxHp;p.energy=p.maxEnergy*.65;}return;}
    if(p.hp<=0)return;
    let dx=input.moveX===null?((input.right?1:0)-(input.left?1:0)):input.moveX;
    let dy=input.moveY===null?((input.down?1:0)-(input.up?1:0)):input.moveY;
    const length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
    p.angle=Math.atan2(input.aimY-p.y,input.aimX-p.x);
    if(input.dash&&p.dashCooldown<=0&&p.energy>=22){
      const moving=Math.hypot(dx,dy)>0.001,vx=moving?dx:Math.cos(p.angle),vy=moving?dy:Math.sin(p.angle),len=Math.hypot(vx,vy)||1;
      resolvePlayerPosition(p,vx/len*112,vy/len*112);p.dashCooldown=1.35;p.dashTimer=.17;p.energy-=22;
    }
    const speedFactor=(input.sprint?1.32:1)*(p.speedBoostTimer>0?1.65:1)*(p.dashTimer>0?1.5:1);
    resolvePlayerPosition(p,dx*p.speed*dt*speedFactor,dy*p.speed*dt*speedFactor);
    if(input.shield&&p.energy>0){p.shieldTimer=Math.max(p.shieldTimer,.12);p.energy=Math.max(0,p.energy-34*dt);}else{p.shieldTimer=Math.max(0,p.shieldTimer-dt);p.energy=Math.min(p.maxEnergy,p.energy+p.regen*dt);}
    if(input.attack&&p.attackCooldown<=0&&p.energy>=8){pulse(p);p.attackCooldown=p.overdriveTimer>0?.19:.36;p.energy-=8;}
    if(Math.hypot(p.x-600,p.y-380)<105&&game.mode==="core")p.ultimate=Math.min(100,p.ultimate+2.4*dt);
  });
  game.bullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;});
  for(let i=game.bullets.length-1;i>=0;i--){
    const b=game.bullets[i];let consumed=false;
    for(const p of Object.values(game.players)){
      if(p.id===b.owner||p.disconnected||p.hp<=0||p.respawn>0)continue;
      if(["teams","core"].includes(game.mode)&&game.players[b.owner]&&game.players[b.owner].team===p.team)continue;
      if(Math.hypot(p.x-b.x,p.y-b.y)<22){
        const damage=p.shieldTimer>0?b.damage*.4*p.shieldScale:b.damage;
        p.hp=Math.max(0,p.hp-damage);
        p.ultimate=Math.min(100,(p.ultimate||0)+5);
        spawnBurst(b.x,b.y,p.color,7);
        const attacker=game.players[b.owner];if(attacker){attacker.ultimate=Math.min(100,(attacker.ultimate||0)+14);if(attacker.id===myId)playSfx("confirm");}
        if(p.id===myId)playSfx("hit");
        if(p.hp<=0)addKO(b.owner,p);
        consumed=true;break;
      }
    }
    if(!consumed&&MAPS[game.map].blocks.some(block=>b.x>block[0]-block[2]/2&&b.x<block[0]+block[2]/2&&b.y>block[1]-block[3]/2&&b.y<block[1]+block[3]/2))consumed=true;
    if(consumed||b.life<=0||b.x<0||b.x>1200||b.y<0||b.y>760)game.bullets.splice(i,1);
  }
  (game.pickups||[]).forEach((pickup,index)=>{
    const collector=Object.values(game.players).find(p=>!p.disconnected&&p.hp>0&&p.respawn<=0&&Math.hypot(p.x-pickup.x,p.y-pickup.y)<28);
    if(collector){applyPickup(collector,pickup);game.pickups.splice(index,1);}
  });
  updateObjective(dt);
  if(game.phase==="playing"&&game.mode==="tournament"){
    const player=game.players.p1;
    const rival=Object.values(game.players).find(p=>p.id!=="p1"&&!p.disconnected);
    if(player&&rival&&(player.score>=5||rival.score>=5||game.time<=0)){
      if(player.score>rival.score){
        if(game.tournamentRound>=3){
          game.phase="ended";game.winner={id:"p1",name:player.name,score:player.score};
        }else{
          game.tournamentRound++;
          const nextClass=["runner","technician","guardian"][game.tournamentRound-1];
          const stats=classStats(nextClass);
          rival.name=["","SEMI-FINAL CHALLENGER","FINAL CHALLENGER"][game.tournamentRound-1];
          rival.classId=nextClass;rival.maxHp=stats.maxHp;rival.hp=stats.maxHp;rival.maxEnergy=stats.maxEnergy;rival.energy=stats.maxEnergy;
          rival.speed=stats.speed;rival.regen=stats.regen;rival.shieldScale=stats.shield;
          player.score=0;player.hp=player.maxHp;player.energy=player.maxEnergy;player.x=180;player.y=380;
          rival.score=0;rival.deaths=0;rival.respawn=0;rival.x=1020;rival.y=380;
          game.bullets=[];game.elapsed=0;game.time=MODES.tournament.seconds;
          pushHostFeed("» ROUND "+(game.tournamentRound-1)+" CLEARED · NEXT CHALLENGER");
        }
      }else{
        game.phase="ended";game.winner={id:rival.id,name:rival.name,score:rival.score};
      }
    }
  }else if(game.phase==="playing"){
    if(["duel","ffa","training"].includes(game.mode)){
      const leader=Object.values(game.players).filter(p=>!p.disconnected).sort((a,b)=>b.score-a.score)[0];
      if(game.mode!=="training"&&leader&&leader.score>=5){game.phase="ended";game.winner={id:leader.id,name:leader.name,score:leader.score};}
    }else if(game.mode==="teams"){
      const scoreA=Object.values(game.players).filter(p=>p.team==="A").reduce((n,p)=>n+p.score,0);
      const scoreB=Object.values(game.players).filter(p=>p.team==="B").reduce((n,p)=>n+p.score,0);
      if(Math.max(scoreA,scoreB)>=5){const team=scoreA>scoreB?"A":"B";game.phase="ended";game.winner={id:team==="A"?"teamA":"teamB",name:"TEAM "+team,score:Math.max(scoreA,scoreB)};}
    }
    if(game.time<=0){
      game.phase="ended";
      game.winner=game.mode==="survival"?{id:"p1",name:"SURVIVOR",score:game.players.p1.score}:selectWinner();
    }
  }
}
function selectWinner(){
  if(!game)return null;
  if(game.mode==="core")return {id:game.objective.A>=game.objective.B?"teamA":"teamB",name:game.objective.A>=game.objective.B?"TEAM A":"TEAM B",score:Math.floor(Math.max(game.objective.A,game.objective.B))};
  if(game.mode==="king")return {id:game.objective.A>=game.objective.B?"p1":"bots",name:game.objective.A>=game.objective.B?game.players.p1.name:"ARENA BOTS",score:Math.floor(Math.max(game.objective.A,game.objective.B))};
  const people=Object.values(game.players).filter(p=>!p.disconnected);
  if(game.mode==="teams"){
    const a=people.filter(p=>p.team==="A").reduce((n,p)=>n+p.score,0),b=people.filter(p=>p.team==="B").reduce((n,p)=>n+p.score,0);
    return {id:a>=b?"teamA":"teamB",name:a>=b?"TEAM A":"TEAM B",score:Math.max(a,b)};
  }
  const top=people.sort((a,b)=>b.score-a.score)[0];
  return top?{id:top.id,name:top.name,score:top.score}:null;
}
function pushHostFeed(text){pushFeed(text);if(role==="host")sendAll({type:"feed",text});}
function pushFeed(text){feedItems.unshift(String(text));feedItems=feedItems.slice(0,5);$("arenaFeed").innerHTML="";feedItems.forEach(t=>{const el=document.createElement("span");el.textContent=t;$("arenaFeed").append(el);});}
function renderGame(){
  if(!game)return;
  $("gameClock").textContent=formatTime(game.time);
  $("gameModeLabel").textContent=game.mode==="tournament"?"TOURNAMENT · ROUND "+game.tournamentRound+"/3":MODES[game.mode].name.toUpperCase();
  const entries=Object.values(game.players).filter(p=>!p.disconnected).sort((a,b)=>b.score-a.score);
  $("scoreboard").innerHTML="";
  entries.forEach(p=>{
    const row=document.createElement("div");row.className="score-entry";
    const left=document.createElement("div");const dot=document.createElement("i");dot.style.background=p.color;dot.style.color=p.color;
    const name=document.createElement("b");name.textContent=p.name+(p.id===myId?" · YOU":"");left.append(dot,name);
    const score=document.createElement("strong");score.textContent=Math.floor(p.score);row.append(left,score);$("scoreboard").append(row);
  });
  const me=game.players[myId];
  if(me){const hp=Math.max(0,Math.round(me.hp/me.maxHp*100)),energy=Math.max(0,Math.round(me.energy/me.maxEnergy*100));
    const ult=Math.max(0,Math.min(100,Math.round(me.ultimate||0)));
    $("fighterStatus").innerHTML='<div class="meter-row"><span>INTEGRITY</span><b>'+Math.round(me.hp)+' / '+me.maxHp+'</b></div><div class="meter"><i style="width:'+hp+'%;background:var(--lime)"></i></div><div class="meter-row"><span>ENERGY</span><b>'+Math.round(me.energy)+' / '+me.maxEnergy+'</b></div><div class="meter"><i style="width:'+energy+'%"></i></div><div class="meter-row"><span>ULTIMATE · Q</span><b>'+ult+'%</b></div><div class="meter"><i style="width:'+ult+'%;background:var(--violet)"></i></div><div class="meter-row"><span>CLASS</span><b>'+CLASS[me.classId].name.toUpperCase()+'</b></div>'+(["king","core"].includes(game.mode)?'<div class="meter-row"><span>ZONE A</span><b>'+Math.floor(game.objective.A)+'</b></div><div class="meter-row"><span>ZONE B</span><b>'+Math.floor(game.objective.B)+'</b></div>':'');
  }
  drawArena();
  if(game.phase==="ended")handleMatchEnd();
}
function drawArena(){
  if(arena3d&&game){arena3d.update(game,performance.now()/1000,myId);return;}
  const map=MAPS[game.map],c=ctx;c.clearRect(0,0,1200,760);c.fillStyle=map.bg;c.fillRect(0,0,1200,760);
  const glow=c.createRadialGradient(600,380,20,600,380,510);glow.addColorStop(0,map.grid+"22");glow.addColorStop(1,"#07101a00");c.fillStyle=glow;c.fillRect(0,0,1200,760);
  c.strokeStyle=map.grid+"18";c.lineWidth=1;
  for(let x=40;x<1200;x+=40){c.beginPath();c.moveTo(x,0);c.lineTo(x,760);c.stroke();}
  for(let y=40;y<760;y+=40){c.beginPath();c.moveTo(0,y);c.lineTo(1200,y);c.stroke();}
  c.strokeStyle=map.grid+"70";c.lineWidth=2;c.strokeRect(18,18,1164,724);
  const zone=c.createRadialGradient(600,380,20,600,380,115);zone.addColorStop(0,map.accent+"16");zone.addColorStop(1,map.accent+"00");c.fillStyle=zone;c.beginPath();c.arc(600,380,115,0,Math.PI*2);c.fill();
  c.strokeStyle=map.accent+"75";c.setLineDash([7,9]);c.beginPath();c.arc(600,380,105,0,Math.PI*2);c.stroke();c.setLineDash([]);
  c.font="10px DM Mono";c.textAlign="center";c.fillStyle=map.accent+"aa";c.fillText(game.mode==="core"?"ENERGY CORE":game.mode==="king"?"CONTROL ZONE":"ARENA CENTER",600,386);
  map.blocks.forEach(b=>{c.fillStyle="#172b39";c.strokeStyle=map.grid+"65";c.lineWidth=2;c.fillRect(b[0]-b[2]/2,b[1]-b[3]/2,b[2],b[3]);c.strokeRect(b[0]-b[2]/2,b[1]-b[3]/2,b[2],b[3]);c.fillStyle=map.grid+"44";c.fillRect(b[0]-b[2]/2+7,b[1]-2,b[2]-14,4);});
  if(game.mode==="core"){c.save();c.translate(600,380);c.rotate(performance.now()/1300);c.strokeStyle="#c5ff67";c.lineWidth=3;c.strokeRect(-17,-17,34,34);c.rotate(Math.PI/4);c.strokeStyle="#53eedc";c.strokeRect(-17,-17,34,34);c.restore();}
  (game.pickups||[]).forEach(pickup=>{
    const colors={repair:"#c5ff67",battery:"#53eedc",charge:"#ad91ff"},symbols={repair:"+",battery:"ϟ",charge:"◈"};
    const color=colors[pickup.type]||"#fff";
    c.save();c.translate(pickup.x,pickup.y);c.globalAlpha=.78+.22*Math.sin(performance.now()/150);c.shadowBlur=24;c.shadowColor=color;c.strokeStyle=color;c.fillStyle=color+"22";c.lineWidth=2;
    c.beginPath();c.arc(0,0,15,0,Math.PI*2);c.fill();c.stroke();c.fillStyle=color;c.font="bold 17px DM Mono";c.textAlign="center";c.textBaseline="middle";c.fillText(symbols[pickup.type],0,1);c.restore();
  });
  (game.particles||[]).forEach(particle=>{
    c.save();c.globalAlpha=Math.max(0,particle.life/particle.maxLife);c.fillStyle=particle.color;c.shadowBlur=12;c.shadowColor=particle.color;c.beginPath();c.arc(particle.x,particle.y,particle.size,0,Math.PI*2);c.fill();c.restore();
  });
  game.bullets.forEach(b=>{c.save();c.shadowBlur=18;c.shadowColor=b.color;c.fillStyle=b.color;c.beginPath();c.arc(b.x,b.y,6,0,Math.PI*2);c.fill();c.globalAlpha=.45;c.fillRect(b.x-20,b.y-2,17,4);c.restore();});
  Object.values(game.players).forEach(p=>{
    if(p.disconnected)return;
    if(p.respawn>0){c.save();c.globalAlpha=.3+.25*Math.sin(performance.now()/90);c.strokeStyle=p.color;c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,25,0,Math.PI*2);c.stroke();c.restore();return;}
    c.save();c.translate(p.x,p.y);c.rotate(p.angle);
    if(p.ultimate>=100){c.strokeStyle="#ad91ff";c.lineWidth=2;c.shadowBlur=18;c.shadowColor="#ad91ff";c.beginPath();c.arc(0,0,34,0,Math.PI*2);c.stroke();}
    if(p.overdriveTimer>0||p.speedBoostTimer>0){c.strokeStyle=p.overdriveTimer>0?"#ffbd67":"#ff6688";c.globalAlpha=.7;c.lineWidth=2;c.beginPath();c.arc(0,0,30,0,Math.PI*2);c.stroke();}
    if(p.shieldTimer>0){c.strokeStyle="#e6ffff";c.lineWidth=3;c.shadowBlur=18;c.shadowColor="#b8ffff";c.beginPath();c.arc(0,0,29,0,Math.PI*2);c.stroke();}
    c.shadowBlur=18;c.shadowColor=p.color;c.fillStyle=p.color;c.beginPath();c.moveTo(23,0);c.lineTo(3,-16);c.lineTo(-15,-13);c.lineTo(-11,0);c.lineTo(-15,13);c.lineTo(3,16);c.closePath();c.fill();
    c.shadowBlur=0;c.fillStyle="#06111b";c.beginPath();c.arc(1,0,5,0,Math.PI*2);c.fill();c.fillStyle="#f0fffa";c.fillRect(12,-2,8,4);c.restore();
    c.save();c.fillStyle="#030910";c.fillRect(p.x-24,p.y-34,48,5);c.fillStyle=p.hp/p.maxHp>.5?"#c5ff67":"#ff6688";c.fillRect(p.x-24,p.y-34,48*Math.max(0,p.hp/p.maxHp),5);
    c.textAlign="center";c.font="10px DM Mono";c.fillStyle="#dbe8e9";c.fillText(p.name,p.x,p.y-43);c.restore();
  });
}
function handleMatchEnd(){
  if(endHandled||!game||game.phase!=="ended")return;
  endHandled=true;
  const me=game.players[myId];if(!me)return;
  const winner=game.winner;
  let won=false;
  if(winner){
    if(winner.id==="teamA"||winner.id==="teamB")won=(winner.id==="teamA"&&me.team==="A")||(winner.id==="teamB"&&me.team==="B");
    else won=winner.id===myId;
  }
  const kills=Math.floor(me.kos||0);
  profile.stats.matches++;profile.stats.kos+=kills;profile.stats.deaths+=me.deaths||0;
  if(won){profile.stats.wins++;profile.stats.streak++;profile.stats.bestStreak=Math.max(profile.stats.bestStreak,profile.stats.streak);profile.stats.rankPoints+=100+kills*18;profile.daily.progress.wins++;}
  else{profile.stats.losses++;profile.stats.streak=0;profile.stats.rankPoints+=Math.max(10,kills*8);}
  profile.stats.bestScore=Math.max(profile.stats.bestScore,kills);
  profile.daily.progress.matches++;profile.daily.progress.kos+=kills;
  const coins=25+kills*8+(won?55:0);
  const xp=35+kills*12+(won?60:0)+(game.mode==="survival"?Math.floor(game.elapsed/4):0);
  profile.coins+=coins;addXp(xp);
  profile.history.unshift({mode:MODES[game.mode].name,map:MAPS[game.map].name,score:kills,points:profile.stats.rankPoints,date:new Date().toLocaleDateString("de-DE")});
  profile.history=profile.history.slice(0,20);
  save();
  $("endTitle").textContent=won?"VICTORY":game.mode==="survival"?"RUN OVER":"MATCH COMPLETE";
  $("endTitle").style.color=won?"var(--lime)":"var(--cyan)";
  $("endMessage").textContent=(winner?winner.name+" takes the round. ":"The round is complete. ")+(won?"Well played, operator.":"Good run. Queue up another match.");
  $("endRewards").textContent="+"+coins+" COINS  ·  +"+xp+" XP  ·  "+kills+" POINTS";
  $("gameEndOverlay").classList.remove("hidden");
  $("rematchButton").style.display=(role==="solo"||role==="host")?"inline-flex":"inline-flex";
  pushFeed(won?"» Victory registered.":"» Match results recorded.");
}
function leaveMatch(){
  if(role==="host")sendAll({type:"feed",text:"» Host ended the room."});
  if(arena3d)arena3d.exitPointerLock();
  $("gameScreen").classList.remove("open");$("gamePauseOverlay").classList.add("hidden");
  game=null;gamePaused=false;pointerDown=false;keys={};touchState={};
  disconnectNetwork();role="";roomCode="";myId="";lobbyPlayers=[];
  $("gameEndOverlay").classList.add("hidden");
  renderAll();setView("home");
}
function rematch(){
  if(role==="solo"){startSolo(selectedMode);return;}
  if(role==="host"){restartNetworkMatch();return;}
  if(role==="guest"){sendHost({type:"rematch"});toast("REMATCH REQUEST SENT");}
}
function addFriend(code){
  const clean=String(code||"").toUpperCase().replace(/[^A-Z0-9]/g,"");
  if(clean===profile.id){toast("THAT'S YOUR OWN CODE");return;}
  if(clean.length!==8||!clean.startsWith("GC")){toast("USE A CODE LIKE GC-123456");return;}
  const normalized="GC-"+clean.slice(2);
  if(profile.friends.some(f=>f.code===normalized)){toast("ALREADY IN YOUR FRIEND LIST");return;}
  const name=prompt("Name this friend (a nickname shown only on this device):","FRIEND");
  if(name===null)return;
  profile.friends.push({code:normalized,name:cleanName(name)});
  save();renderSocial();toast("FRIEND SAVED LOCALLY");
}
function editName(){
  $("callsignInput").value=profile.name;$("nameError").textContent="";$("nameModal").classList.add("open");
}
function saveName(){
  const value=cleanName($("callsignInput").value);
  if(!value){$("nameError").textContent="Enter a display name.";return;}
  profile.name=value;save();closeModal("nameModal");renderAll();renderLoadout();toast("CALLSIGN UPDATED");
}
function attachEvents(){
  document.querySelectorAll("[data-view]").forEach(el=>el.addEventListener("click",()=>setView(el.dataset.view)));
  document.querySelectorAll(".mode-card").forEach(el=>el.addEventListener("click",()=>chooseMode(el.dataset.mode)));
  document.querySelectorAll(".map-option").forEach(el=>el.addEventListener("click",()=>{selectedMap=el.dataset.map;renderModeSelection();renderHome();}));
  document.querySelectorAll(".class-card").forEach(el=>el.addEventListener("click",()=>{if(!CLASS[el.dataset.class])return;profile.classId=el.dataset.class;save();renderLoadout();}));
  document.querySelectorAll("[data-close]").forEach(el=>el.addEventListener("click",()=>closeModal(el.dataset.close)));
  $("quickPlay").addEventListener("click",()=>{const online=["duel","teams","ffa","core"];if(online.includes(selectedMode))openLobby();else startSolo(selectedMode);});
  $("practicePlay").addEventListener("click",()=>startSolo("training"));
  $("launchMode").addEventListener("click",launchSelected);
  $("createRoom").addEventListener("click",createRoom);
  $("joinForm").addEventListener("submit",e=>{e.preventDefault();joinRoom();});
  $("startOnlineMatch").addEventListener("click",startNetworkMatch);
  $("copyInvite").addEventListener("click",copyInvite);
  $("leaveMatch").addEventListener("click",leaveMatch);
  $("resumeMatchButton").addEventListener("click",resumeMatch);
  $("pauseToMenuButton").addEventListener("click",leaveMatch);
  $("soundToggle").addEventListener("click",()=>{soundEnabled=!soundEnabled;try{localStorage.setItem("globalClashSfx",soundEnabled?"on":"off");}catch(e){}updateSoundButton();if(soundEnabled)playSfx("start");});
  $("endToMenu").addEventListener("click",leaveMatch);
  $("rematchButton").addEventListener("click",rematch);
  $("addFriendForm").addEventListener("submit",e=>{e.preventDefault();addFriend($("friendCodeInput").value);$("friendCodeInput").value="";});
  $("copyFriendCode").addEventListener("click",()=>copyText(myCode()).then(()=>toast("FRIEND CODE COPIED")).catch(()=>toast(myCode())));
  $("shareProfile").addEventListener("click",()=>{const text="Add me on Global Clash: "+myCode();if(navigator.share)navigator.share({title:"Global Clash",text}).catch(()=>{});else copyText(text).then(()=>toast("PROFILE CODE COPIED")).catch(()=>toast(myCode()));});
  $("editName").addEventListener("click",editName);
  $("saveCallsign").addEventListener("click",saveName);
  $("callsignInput").addEventListener("keydown",e=>{if(e.key==="Enter")saveName();});
  $("mobileMenu").addEventListener("click",()=>$("main-nav").classList.toggle("open"));
  ["customSkinName","customSkinPrimary","customSkinAccent","customSkinStyle"].forEach(id=>$(id).addEventListener("input",()=>{$("customSkinName").dataset.dirty="1";updateSkinDraftPreview();}));
  $("saveCustomSkin").addEventListener("click",saveCustomSkin);
  $("randomSkin").addEventListener("click",randomiseSkinDraft);
  $("lobbyModal").addEventListener("click",e=>{if(e.target===$("lobbyModal"))closeModal("lobbyModal");});
  const invite=new URLSearchParams(location.search).get("room");
  if(invite){$("joinCode").value=invite.toUpperCase().slice(0,6);setTimeout(openLobby,250);}
}
function setAim(e){
  const r=canvas.getBoundingClientRect();
  if(arena3d&&arena3d.pointerToGame){const point=arena3d.pointerToGame(e.clientX,e.clientY,r);mouse.x=point.x;mouse.y=point.y;}
  else{mouse.x=Math.max(0,Math.min(1200,(e.clientX-r.left)/r.width*1200));mouse.y=Math.max(0,Math.min(760,(e.clientY-r.top)/r.height*760));}
  const reticle=$("arenaReticle");
  if(reticle){const stage=canvas.parentElement.getBoundingClientRect();reticle.style.left=(e.clientX-stage.left)+"px";reticle.style.top=(e.clientY-stage.top)+"px";}
  if(e.pointerType==="touch")lastTouchAim=performance.now();
}
canvas.addEventListener("pointermove",e=>{
  if(arena3d&&arena3d.isPointerLocked()){
    arena3d.look(e.movementX||0,e.movementY||0);
    updateAimFromLockedCamera();
  }else setAim(e);
});
canvas.addEventListener("pointerdown",e=>{
  if(e.pointerType==="mouse"&&arena3d&&!arena3d.isPointerLocked()&&!pointerLockUnavailable){
    e.preventDefault();captureGameMouse();return;
  }
  if(arena3d&&arena3d.isPointerLocked())updateAimFromLockedCamera();else setAim(e);
  pointerDown=true;
  if(e.pointerType!=="mouse"&&canvas.setPointerCapture)canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointerup",()=>pointerDown=false);
canvas.addEventListener("pointercancel",()=>pointerDown=false);
canvas.parentElement.addEventListener("wheel",e=>{if(arena3d&&$("gameScreen").classList.contains("open")){e.preventDefault();arena3d.zoom(e.deltaY);}}, {passive:false});
document.addEventListener("pointerlockchange",()=>{
  if(!$("gameScreen").classList.contains("open")||!game)return;
  const locked=!!(arena3d&&arena3d.isPointerLocked());
  if(locked){
    pointerLockUnavailable=false;gamePaused=false;$("gamePauseOverlay").classList.add("hidden");
    updateAimFromLockedCamera();
  }else if(!gamePaused)pauseMatch();
});
document.addEventListener("pointerlockerror",()=>{
  if(game&&$("gameScreen").classList.contains("open"))pauseMatch();
});
window.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();
  if(k==="escape"&&$("gameScreen").classList.contains("open")){
    e.preventDefault();pauseMatch();return;
  }
  if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))e.preventDefault();
  keys[k]=true;
});
window.addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false;});
document.querySelectorAll("[data-key]").forEach(button=>{
  const k=button.dataset.key;const down=e=>{e.preventDefault();touchState[k]=true;};const up=e=>{e.preventDefault();touchState[k]=false;};
  button.addEventListener("pointerdown",down);button.addEventListener("pointerup",up);button.addEventListener("pointerleave",up);button.addEventListener("pointercancel",up);
});
function frame(now){
  const dt=Math.min(.04,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  if(game&&game.phase==="playing"&&!gamePaused){
    if(role==="solo"||role==="host")updateHost(dt);
    else if(role==="guest"&&now-lastInput>40){sendHost({type:"input",input:getInput()});lastInput=now;}
  }
  if(game&&role==="host"&&!gamePaused&&now-lastSend>45){sendAll({type:"state",state:game});lastSend=now;}
  if(game&&$("gameScreen").classList.contains("open")){
    if(now-lastHudUpdate>120){renderGame();lastHudUpdate=now;}
    else drawArena();
  }
  requestAnimationFrame(frame);
}
dailyReset();attachEvents();renderModeSelection();renderAll();renderLoadout();requestAnimationFrame(frame);
})();