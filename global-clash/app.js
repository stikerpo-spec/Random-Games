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
  {id:"ice",name:"GLACIER",cost:1000,color:"#9bdcff",desc:"Cool blue visual effects."}
];
const MAPS = {
  neon:{name:"Neon Harbor",bg:"#0b1723",grid:"#53eedc",accent:"#c5ff67",blocks:[[330,205,95,34],[775,205,95,34],[330,520,95,34],[775,520,95,34]]},
  sky:{name:"Sky Grid",bg:"#11172a",grid:"#8d9dff",accent:"#53eedc",blocks:[[260,160,90,38],[850,160,90,38],[260,560,90,38],[850,560,90,38]]},
  frost:{name:"Frostline",bg:"#10202c",grid:"#a8e7ff",accent:"#8fc9e8",blocks:[[430,155,340,28],[430,577,340,28],[350,310,35,140],[815,310,35,140]]},
  ember:{name:"Ember Plaza",bg:"#201724",grid:"#ff9d6f",accent:"#ffc76e",blocks:[[235,240,105,52],[860,240,105,52],[235,465,105,52],[860,465,105,52]]}
};
const MODES = {
  training:{name:"Training Lab",kind:"solo",limit:2,seconds:150,desc:"Practice against a training bot."},
  survival:{name:"Survival",kind:"solo",limit:4,seconds:180,desc:"Survive as many waves as you can."},
  duel:{name:"Duel",kind:"online",limit:2,seconds:120,desc:"A private 1v1, first to five."},
  teams:{name:"Team Clash",kind:"online",limit:4,seconds:150,desc:"Two teams, four fighters, one objective."},
  ffa:{name:"Free For All",kind:"online",limit:4,seconds:120,desc:"Every fighter for themselves."},
  king:{name:"King of the Arena",kind:"solo",limit:4,seconds:120,desc:"Control the centre zone."},
  core:{name:"Capture the Core",kind:"online",limit:4,seconds:150,desc:"Hold the central energy core as a team."}
};
function randomCode(){const chars="ABCDEFGHJKLMNPQRSTUVWXYZ23456789";let out="";for(let i=0;i<6;i++)out+=chars[Math.floor(Math.random()*chars.length)];return out;}
function defaultProfile(){
  return {id:randomCode(),name:"PLAYER ONE",classId:"striker",skin:"standard",owned:["standard"],coins:150,xp:0,level:1,stats:{matches:0,wins:0,losses:0,kos:0,deaths:0,bestStreak:0,streak:0,bestScore:0,rankPoints:0},friends:[],history:[],daily:{date:"",progress:{matches:0,kos:0,wins:0},claimed:[]}};
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
    if(!merged.owned.includes("standard"))merged.owned.unshift("standard");
    if(!SKINS.some(s=>s.id===merged.skin && merged.owned.includes(s.id)))merged.skin="standard";
    if(!CLASS[merged.classId])merged.classId="striker";
    return merged;
  }catch(e){return defaultProfile();}
}
let profile=loadProfile();
let selectedMode="training",selectedMap="neon";
let peer=null,hostConn=null,connections=[],role="",roomCode="",myId="",lobbyPlayers=[],game=null;
let keys={},mouse={x:600,y:380},pointerDown=false,lastFrame=performance.now(),lastSend=0,lastInput=0,feedItems=[],endHandled=false;
let touchState={};
const canvas=$("arenaCanvas"),ctx=canvas.getContext("2d");
const localStorageSafe={
  set(key,value){try{localStorage.setItem(key,value);}catch(e){}}
};
function save(){localStorageSafe.set(STORE,JSON.stringify(profile));renderAll();}
function displayName(){return profile.name||"PLAYER";}
function myCode(){return "GC-"+profile.id;}
function skinColor(id=profile.skin){return (SKINS.find(x=>x.id===id)||SKINS[0]).color;}
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
  const skin=SKINS.find(s=>s.id===profile.skin)||SKINS[0];
  $("equippedCosmetic").innerHTML='<span class="cosmetic-swatch" style="background:'+skin.color+';color:'+skin.color+'"></span><span><b>'+skin.name+'</b><br><small>'+skin.desc+'</small></span>';
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
  SKINS.forEach(skin=>{
    const owned=profile.owned.includes(skin.id),equipped=profile.skin===skin.id;
    const card=document.createElement("article");card.className="shop-item"+(owned?" owned":"");
    const preview=document.createElement("div");preview.className="shop-preview";const swatch=document.createElement("i");swatch.style.setProperty("--skin",skin.color);preview.append(swatch);
    const title=document.createElement("h3");title.textContent=skin.name;
    const desc=document.createElement("p");desc.textContent=skin.desc;
    const foot=document.createElement("div");foot.className="shop-item-foot";
    const price=document.createElement("span");price.className="shop-price";price.textContent=owned?(equipped?"EQUIPPED":"UNLOCKED"):(skin.cost+" ◈");
    const action=document.createElement("button");action.className="btn "+(owned?"btn-outline":"btn-primary");action.textContent=equipped?"ACTIVE":owned?"EQUIP":"UNLOCK";action.disabled=equipped;
    action.addEventListener("click",()=>{
      if(owned){profile.skin=skin.id;save();renderShop();renderLoadout();toast("STYLE EQUIPPED");}
      else if(profile.coins>=skin.cost){profile.coins-=skin.cost;profile.owned.push(skin.id);profile.skin=skin.id;save();renderShop();renderLoadout();toast("COSMETIC UNLOCKED");}
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
  if(!window.Peer){$("lobbyError").textContent="PeerJS konnte nicht geladen werden. Prüfe deine Internetverbindung.";return;}
  $("lobbyModeSummary").textContent=MODES[selectedMode].name.toUpperCase()+" · "+MAPS[selectedMap].name.toUpperCase()+" · "+CLASS[profile.classId].name.toUpperCase();
  $("lobbyError").textContent="";$("roomState").classList.add("hidden");
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
function makeRosterPlayer(id,name,classId,index,isBot=false){
  return {id,name:cleanName(name),classId:CLASS[classId]?classId:"striker",color:COLORS[index%COLORS.length],isBot};
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
        const id="p"+(lobbyPlayers.length+1);conn.playerId=id;
        lobbyPlayers.push(makeRosterPlayer(id,message.name,message.classId,lobbyPlayers.length));
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
  const code=String($("joinCode").value||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6);
  if(code.length!==6){setLobbyError("Enter a valid six-character room code.");return;}
  disconnectNetwork();role="guest";roomCode=code;
  setLobbyError("Connecting to room "+code+" …");
  peer=new Peer(undefined,{debug:0});
  peer.on("open",()=>{
    hostConn=peer.connect("gc-"+code.toLowerCase(),{reliable:true});
    hostConn.on("open",()=>hostConn.send({type:"join",name:profile.name,classId:profile.classId}));
    hostConn.on("data",message=>{
      if(!message||typeof message!=="object")return;
      if(message.type==="welcome"){
        myId=message.id;roomCode=message.roomCode;lobbyPlayers=message.players||[];
        selectedMode=message.mode||selectedMode;selectedMap=message.map||selectedMap;
        $("roomModeSummary").textContent=MODES[selectedMode].name.toUpperCase()+" · "+MAPS[selectedMap].name.toUpperCase();
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
  if(mode==="survival"&&list.length<4){while(list.length<4){const i=list.length;list.push(makeRosterPlayer("bot"+i,"WAVE BOT "+i,i%2?"runner":"guardian",i,true));}}
  if(mode==="king"&&list.length<3){while(list.length<3){const i=list.length;list.push(makeRosterPlayer("bot"+i,"ZONE BOT "+i,"technician",i,true));}}
  list.slice(0,4).forEach((item,i)=>{
    const cs=classStats(item.classId),pos=spawnPositions(i);
    people[item.id]={id:item.id,name:item.name,classId:item.classId||"striker",color:item.color||COLORS[i],team:i<2?"A":"B",x:pos.x,y:pos.y,
      hp:cs.maxHp,maxHp:cs.maxHp,energy:cs.maxEnergy,maxEnergy:cs.maxEnergy,speed:cs.speed,regen:cs.regen,shieldScale:cs.shield,
      score:0,kos:0,deaths:0,angle:0,attackCooldown:0,dashCooldown:0,dashTimer:0,shieldTimer:0,respawn:0,
      input:cleanInput({aimX:600,aimY:380}),isBot:!!item.isBot,disconnected:false};
  });
  return {id:"m"+Date.now()+Math.random().toString(36).slice(2,7),mode,map,online,phase:"playing",time:MODES[mode].seconds,elapsed:0,players:people,bullets:[],objective:{A:0,B:0},wave:1,spawnTimer:0,feed:[]};
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
  $("gameModeLabel").textContent=MODES[game.mode].name.toUpperCase();$("gameMapLabel").textContent=MAPS[game.map].name.toUpperCase();
  $("gameClock").textContent=formatTime(game.time);renderGame();lastFrame=performance.now();
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
  return {up:!!input.up,down:!!input.down,left:!!input.left,right:!!input.right,attack:!!input.attack,dash:!!input.dash,shield:!!input.shield,aimX:number(input.aimX,600),aimY:number(input.aimY,380)};
}
function getInput(){
  return cleanInput({
    up:keys.w||keys.arrowup||touchState.w,down:keys.s||keys.arrowdown||touchState.s,left:keys.a||keys.arrowleft||touchState.a,right:keys.d||keys.arrowright||touchState.d,
    attack:keys.j||pointerDown||touchState.j,dash:keys[" "]||touchState[" "],shield:keys.e||touchState.e,aimX:mouse.x,aimY:mouse.y
  });
}
function botInput(bot){
  const other=Object.values(game.players).filter(p=>p.id!==bot.id&&!p.disconnected&&p.hp>0);
  const targets=other.filter(p=>game.mode!=="teams"||p.team!==bot.team);
  const target=(targets.length?targets:other).sort((a,b)=>Math.hypot(a.x-bot.x,a.y-bot.y)-Math.hypot(b.x-bot.x,b.y-bot.y))[0];
  let tx=600,ty=380,dist=0,ang=0;
  if(target){tx=target.x;ty=target.y;dist=Math.hypot(tx-bot.x,ty-bot.y);ang=Math.atan2(ty-bot.y,tx-bot.x);}
  if(game.mode==="king"||game.mode==="core"){
    tx=600;ty=380;ang=Math.atan2(ty-bot.y,tx-bot.x);dist=Math.hypot(tx-bot.x,ty-bot.y);
  }
  const orbit=Math.sin(game.elapsed*1.5+(bot.id.charCodeAt(0)||0))>0?1:-1;
  const a=dist>240?ang:ang+orbit*1.2;
  return cleanInput({up:Math.sin(a)<-.3,down:Math.sin(a)>.3,left:Math.cos(a)<-.3,right:Math.cos(a)>.3,attack:!!target&&dist<650,shield:!!target&&dist<130&&bot.energy>35,dash:dist<110&&bot.dashCooldown<=0,aimX:tx,aimY:ty});
}
function pulse(p){
  const a=p.angle;
  game.bullets.push({owner:p.id,x:p.x+Math.cos(a)*24,y:p.y+Math.sin(a)*24,vx:Math.cos(a)*680,vy:Math.sin(a)*680,r:6,damage:18,life:1.25,color:p.color});
}
function addArenaBot(){
  const ids=Object.keys(game.players);
  if(ids.length>=6)return;
  const id="wave"+Math.floor(game.elapsed)+"_"+ids.length;
  const pos=spawnPositions(Math.floor(Math.random()*4));
  const c=classStats("runner");
  game.players[id]={id,name:"WAVE "+game.wave+" BOT",classId:"runner",color:"#ff9b6c",team:"B",x:pos.x,y:pos.y,hp:c.maxHp,maxHp:c.maxHp,energy:c.maxEnergy,maxEnergy:c.maxEnergy,speed:c.speed,regen:c.regen,shieldScale:c.shield,score:0,kos:0,deaths:0,angle:0,attackCooldown:0,dashCooldown:0,dashTimer:0,shieldTimer:0,respawn:0,input:cleanInput({}),isBot:true,disconnected:false};
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
  if(scorer){scorer.kos=(scorer.kos||0)+1;if(game.mode!=="king")scorer.score++;}
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
function updateHost(dt){
  if(!game||game.phase!=="playing")return;
  game.elapsed+=dt;game.time=Math.max(0,MODES[game.mode].seconds-game.elapsed);
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
    if(p.respawn>0){p.respawn-=dt;if(p.respawn<=0){const idx=Object.keys(game.players).indexOf(p.id);const pos=spawnPositions(idx);p.x=pos.x;p.y=pos.y;p.hp=p.maxHp;p.energy=p.maxEnergy*.65;}return;}
    if(p.hp<=0)return;
    let dx=(input.right?1:0)-(input.left?1:0),dy=(input.down?1:0)-(input.up?1:0);
    const length=Math.hypot(dx,dy)||1;dx/=length;dy/=length;
    p.angle=Math.atan2(input.aimY-p.y,input.aimX-p.x);
    if(input.dash&&p.dashCooldown<=0&&p.energy>=22){
      const vx=dx||Math.cos(p.angle),vy=dy||Math.sin(p.angle),len=Math.hypot(vx,vy)||1;
      resolvePlayerPosition(p,vx/len*112,vy/len*112);p.dashCooldown=1.35;p.dashTimer=.17;p.energy-=22;
    }
    resolvePlayerPosition(p,dx*p.speed*dt*(p.dashTimer>0?1.5:1),dy*p.speed*dt*(p.dashTimer>0?1.5:1));
    if(input.shield&&p.energy>0){p.shieldTimer=.12;p.energy=Math.max(0,p.energy-34*dt);}else{p.shieldTimer=Math.max(0,p.shieldTimer-dt);p.energy=Math.min(p.maxEnergy,p.energy+p.regen*dt);}
    if(input.attack&&p.attackCooldown<=0&&p.energy>=8){pulse(p);p.attackCooldown=.36;p.energy-=8;}
  });
  game.bullets.forEach(b=>{b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;});
  for(let i=game.bullets.length-1;i>=0;i--){
    const b=game.bullets[i];let consumed=false;
    for(const p of Object.values(game.players)){
      if(p.id===b.owner||p.disconnected||p.hp<=0||p.respawn>0)continue;
      if(game.mode==="teams"&&game.players[b.owner]&&game.players[b.owner].team===p.team)continue;
      if(Math.hypot(p.x-b.x,p.y-b.y)<22){
        const damage=p.shieldTimer>0?b.damage*.25:b.damage;
        p.hp=Math.max(0,p.hp-damage);
        if(p.hp<=0)addKO(b.owner,p);
        consumed=true;break;
      }
    }
    if(consumed||b.life<=0||b.x<0||b.x>1200||b.y<0||b.y>760)game.bullets.splice(i,1);
  }
  updateObjective(dt);
  const people=Object.values(game.players).filter(p=>!p.isBot&&!p.disconnected);
  const bots=Object.values(game.players).filter(p=>p.isBot&&!p.disconnected);
  if(game.phase==="playing"){
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
    $("fighterStatus").innerHTML='<div class="meter-row"><span>INTEGRITY</span><b>'+Math.round(me.hp)+' / '+me.maxHp+'</b></div><div class="meter"><i style="width:'+hp+'%;background:var(--lime)"></i></div><div class="meter-row"><span>ENERGY</span><b>'+Math.round(me.energy)+' / '+me.maxEnergy+'</b></div><div class="meter"><i style="width:'+energy+'%"></i></div><div class="meter-row"><span>CLASS</span><b>'+CLASS[me.classId].name.toUpperCase()+'</b></div>'+(["king","core"].includes(game.mode)?'<div class="meter-row"><span>ZONE A</span><b>'+Math.floor(game.objective.A)+'</b></div><div class="meter-row"><span>ZONE B</span><b>'+Math.floor(game.objective.B)+'</b></div>':'');
  }
  drawArena();
  if(game.phase==="ended")handleMatchEnd();
}
function drawArena(){
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
  game.bullets.forEach(b=>{c.save();c.shadowBlur=18;c.shadowColor=b.color;c.fillStyle=b.color;c.beginPath();c.arc(b.x,b.y,6,0,Math.PI*2);c.fill();c.globalAlpha=.45;c.fillRect(b.x-20,b.y-2,17,4);c.restore();});
  Object.values(game.players).forEach(p=>{
    if(p.disconnected)return;
    if(p.respawn>0){c.save();c.globalAlpha=.3+.25*Math.sin(performance.now()/90);c.strokeStyle=p.color;c.lineWidth=3;c.beginPath();c.arc(p.x,p.y,25,0,Math.PI*2);c.stroke();c.restore();return;}
    c.save();c.translate(p.x,p.y);c.rotate(p.angle);
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
  $("gameScreen").classList.remove("open");game=null;pointerDown=false;keys={};touchState={};
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
  $("endToMenu").addEventListener("click",leaveMatch);
  $("rematchButton").addEventListener("click",rematch);
  $("addFriendForm").addEventListener("submit",e=>{e.preventDefault();addFriend($("friendCodeInput").value);$("friendCodeInput").value="";});
  $("copyFriendCode").addEventListener("click",()=>copyText(myCode()).then(()=>toast("FRIEND CODE COPIED")).catch(()=>toast(myCode())));
  $("shareProfile").addEventListener("click",()=>{const text="Add me on Global Clash: "+myCode();if(navigator.share)navigator.share({title:"Global Clash",text}).catch(()=>{});else copyText(text).then(()=>toast("PROFILE CODE COPIED")).catch(()=>toast(myCode()));});
  $("editName").addEventListener("click",editName);
  $("saveCallsign").addEventListener("click",saveName);
  $("callsignInput").addEventListener("keydown",e=>{if(e.key==="Enter")saveName();});
  $("mobileMenu").addEventListener("click",()=>$("main-nav").classList.toggle("open"));
  $("lobbyModal").addEventListener("click",e=>{if(e.target===$("lobbyModal"))closeModal("lobbyModal");});
  const invite=new URLSearchParams(location.search).get("room");
  if(invite){$("joinCode").value=invite.toUpperCase().slice(0,6);setTimeout(openLobby,250);}
}
function setAim(e){
  const r=canvas.getBoundingClientRect();mouse.x=Math.max(0,Math.min(1200,(e.clientX-r.left)/r.width*1200));mouse.y=Math.max(0,Math.min(760,(e.clientY-r.top)/r.height*760));
}
canvas.addEventListener("pointermove",setAim);
canvas.addEventListener("pointerdown",e=>{setAim(e);pointerDown=true;canvas.setPointerCapture(e.pointerId);});
canvas.addEventListener("pointerup",()=>pointerDown=false);
canvas.addEventListener("pointercancel",()=>pointerDown=false);
window.addEventListener("keydown",e=>{
  const k=e.key.toLowerCase();if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(k))e.preventDefault();keys[k]=true;
  if(k==="escape"&&$("gameScreen").classList.contains("open"))leaveMatch();
});
window.addEventListener("keyup",e=>{keys[e.key.toLowerCase()]=false;});
document.querySelectorAll("[data-key]").forEach(button=>{
  const k=button.dataset.key;const down=e=>{e.preventDefault();touchState[k]=true;};const up=e=>{e.preventDefault();touchState[k]=false;};
  button.addEventListener("pointerdown",down);button.addEventListener("pointerup",up);button.addEventListener("pointerleave",up);button.addEventListener("pointercancel",up);
});
function frame(now){
  const dt=Math.min(.04,Math.max(0,(now-lastFrame)/1000));lastFrame=now;
  if(game&&game.phase==="playing"){
    if(role==="solo"||role==="host")updateHost(dt);
    else if(role==="guest"&&now-lastInput>40){sendHost({type:"input",input:getInput()});lastInput=now;}
  }
  if(game&&role==="host"&&now-lastSend>75){sendAll({type:"state",state:game});lastSend=now;}
  if(game&&$("gameScreen").classList.contains("open"))renderGame();
  requestAnimationFrame(frame);
}
dailyReset();attachEvents();renderModeSelection();renderAll();renderLoadout();requestAnimationFrame(frame);
})();