(() => {
"use strict";
const THREE=window.THREE;
if(!THREE)return;
const MAPS={neon:{bg:"#091722",grid:"#53eedc",accent:"#c5ff67"},sky:{bg:"#10172a",grid:"#8d9dff",accent:"#53eedc"},frost:{bg:"#0c1c29",grid:"#a8e7ff",accent:"#8fc9e8"},ember:{bg:"#201521",grid:"#ff9d6f",accent:"#ffc76e"}};
const DEFAULT_COLORS=["#53eedc","#c5ff67","#ff6688","#ad91ff"];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const color=c=>new THREE.Color(c||DEFAULT_COLORS[0]);
const standard=(c,metalness=.48,roughness=.32,glow=.22)=>{const col=color(c);return new THREE.MeshStandardMaterial({color:col,metalness,roughness,emissive:col,emissiveIntensity:glow});};
const glowMaterial=c=>new THREE.MeshBasicMaterial({color:c});
const add=(parent,geometry,material,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
const capsuleGeometry=(r,len)=>THREE.CapsuleGeometry?new THREE.CapsuleGeometry(r,len,4,8):new THREE.CylinderGeometry(r,r,len+r*2,10);

function makeTextSprite(text,tint){
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=112;
  const g=canvas.getContext("2d");g.fillStyle="rgba(3,10,17,.78)";g.beginPath();
  if(g.roundRect)g.roundRect(5,7,502,98,18);else g.rect(5,7,502,98);g.fill();
  g.strokeStyle=tint||"#53eedc";g.lineWidth=5;g.stroke();
  g.font="700 38px Arial";g.textAlign="center";g.textBaseline="middle";g.fillStyle="#f2fbff";g.shadowColor=tint||"#53eedc";g.shadowBlur=12;g.fillText(String(text).slice(0,20),256,56);
  const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthWrite:false}));sprite.scale.set(1.75,.39,1);return sprite;
}
function makeFighter(classId,hex,withLabel=true){
  const tint=color(hex||DEFAULT_COLORS[0]),main=standard(tint,.62,.27,.38),mainDark=standard("#172b3a",.72,.31,.12),silver=standard("#9fb5c2",.82,.24,.12),dark=standard("#07111b",.46,.4,.04);
  const bright=new THREE.MeshStandardMaterial({color:tint,metalness:.25,roughness:.2,emissive:tint,emissiveIntensity:1.25});
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const torso=add(body,new THREE.CylinderGeometry(.34,.47,.93,8,1),main,0,1.28,0);torso.rotation.y=Math.PI/8;
  add(body,new THREE.CylinderGeometry(.19,.19,.22,8),silver,0,1.83,0);
  const chest=add(body,new THREE.BoxGeometry(.48,.45,.12),mainDark,0,1.38,.345);chest.rotation.y=Math.PI/8;
  add(body,new THREE.BoxGeometry(.24,.12,.035),bright,0,1.48,.414);
  add(body,new THREE.BoxGeometry(.12,.07,.04),silver,0,1.21,.42);
  const head=new THREE.Group();body.add(head);
  add(head,new THREE.IcosahedronGeometry(.30,1),silver,0,2.03,0);
  const helmet=add(head,new THREE.SphereGeometry(.355,18,14),main,0,2.09,-.015);helmet.scale.set(1,.88,1);
  add(head,new THREE.BoxGeometry(.47,.16,.075),dark,0,2.02,.284);
  add(head,new THREE.BoxGeometry(.36,.075,.025),bright,0,2.035,.326);
  add(head,new THREE.BoxGeometry(.17,.07,.035),silver,0,1.79,.12);
  add(body,new THREE.BoxGeometry(.63,.16,.58),mainDark,0,1.46,-.34);
  add(body,new THREE.BoxGeometry(.43,.12,.12),bright,0,1.48,-.65);
  add(body,new THREE.BoxGeometry(.22,.22,.1),silver,0,1.16,-.41);
  const arm=side=>{const pivot=new THREE.Group();pivot.position.set(side*.49,1.57,0);body.add(pivot);const shoulder=add(pivot,new THREE.SphereGeometry(.235,12,10),main,0,0,0);shoulder.scale.set(1,.9,1);add(pivot,capsuleGeometry(.145,.43),mainDark,0,-.34,.015);add(pivot,new THREE.BoxGeometry(.27,.24,.28),main,0,-.67,.09);add(pivot,new THREE.BoxGeometry(.23,.12,.22),silver,0,-.71,.12);add(pivot,new THREE.BoxGeometry(.17,.055,.035),bright,0,-.67,.245);return pivot;};
  const leftArm=arm(-1),rightArm=arm(1);
  const leg=side=>{const pivot=new THREE.Group();pivot.position.set(side*.205,.88,0);body.add(pivot);add(pivot,capsuleGeometry(.17,.49),mainDark,0,-.31,0);add(pivot,new THREE.BoxGeometry(.31,.19,.48),main,0,-.65,.12);add(pivot,new THREE.BoxGeometry(.28,.075,.24),silver,0,-.56,.28);add(pivot,new THREE.BoxGeometry(.13,.05,.04),bright,0,-.23,.17);return pivot;};
  const leftLeg=leg(-1),rightLeg=leg(1),extras=new THREE.Group();body.add(extras);
  let drones=[];
  if(classId==="guardian"){
    body.scale.x=1.12;
    const shieldMat=standard("#c5ff67",.72,.24,.85);
    const plate=add(extras,new THREE.IcosahedronGeometry(.43,1),shieldMat,-.78,1.22,.12);plate.scale.set(.48,1.18,.3);
    add(extras,new THREE.TorusGeometry(.37,.035,7,24),bright,-.78,1.22,.16).rotation.y=Math.PI/2;
    add(extras,new THREE.BoxGeometry(.2,.55,.2),silver,-.52,1.12,.2);
    add(body,new THREE.BoxGeometry(.78,.18,.38),main,-.02,1.82,0);
  }else if(classId==="runner"){
    const fin1=add(extras,new THREE.BoxGeometry(.18,.8,.19),main,-.31,1.38,-.46),fin2=add(extras,new THREE.BoxGeometry(.18,.8,.19),main,.31,1.38,-.46);fin1.rotation.z=-.22;fin2.rotation.z=.22;
    const jetMat=standard("#ff6688",.25,.2,1.2);
    add(extras,new THREE.CylinderGeometry(.12,.17,.28,8),silver,-.23,1.05,-.55).rotation.x=Math.PI/2;
    add(extras,new THREE.CylinderGeometry(.12,.17,.28,8),silver,.23,1.05,-.55).rotation.x=Math.PI/2;
    const jet1=add(extras,new THREE.SphereGeometry(.13,10,8),jetMat,-.23,.99,-.73),jet2=add(extras,new THREE.SphereGeometry(.13,10,8),jetMat,.23,.99,-.73);jet1.scale.z=.7;jet2.scale.z=.7;
  }else if(classId==="technician"){
    const droneMat=standard("#ad91ff",.5,.2,1);
    for(let n=0;n<2;n++){const d=new THREE.Group();add(d,new THREE.OctahedronGeometry(.17,1),droneMat,0,0,0);add(d,new THREE.TorusGeometry(.22,.025,6,18),bright,0,0,0).rotation.x=Math.PI/2;extras.add(d);drones.push(d);d.userData.side=n===0?-1:1;}
    add(extras,new THREE.BoxGeometry(.72,.26,.42),main,-.02,1.78,-.25);add(extras,new THREE.BoxGeometry(.22,.18,.08),bright,0,1.79,-.48);
  }else{
    add(extras,new THREE.BoxGeometry(.24,.18,.26),silver,.63,1.05,.02);add(extras,new THREE.TorusGeometry(.19,.035,7,20),bright,.68,1.08,.1).rotation.x=Math.PI/2;add(extras,new THREE.BoxGeometry(.16,.34,.15),mainDark,-.58,1.57,-.04);
  }
  const groundRing=add(root,new THREE.TorusGeometry(.56,.035,8,36),bright,0,.075,0);groundRing.rotation.x=-Math.PI/2;
  const teamRing=add(root,new THREE.TorusGeometry(.7,.018,6,36),glowMaterial("#53eedc"),0,.045,0);teamRing.rotation.x=-Math.PI/2;
  const ultimateRing=add(root,new THREE.TorusGeometry(.83,.045,8,40),glowMaterial("#ad91ff"),0,.1,0);ultimateRing.rotation.x=-Math.PI/2;
  const boostRing=add(root,new THREE.TorusGeometry(.92,.028,6,40),glowMaterial("#ffbd67"),0,.12,0);boostRing.rotation.x=-Math.PI/2;
  const shield=new THREE.Mesh(new THREE.IcosahedronGeometry(.79,2),new THREE.MeshBasicMaterial({color:"#c9ffff",transparent:true,opacity:.16,wireframe:true,depthWrite:false}));
  shield.position.y=1.15;shield.scale.set(.88,1.33,.88);root.add(shield);shield.visible=false;
  const respawnRing=add(root,new THREE.TorusGeometry(.64,.04,6,32),glowMaterial("#ff6688"),0,.12,0);respawnRing.rotation.x=-Math.PI/2;respawnRing.visible=false;
  add(root,new THREE.PlaneGeometry(1.2,.11),new THREE.MeshBasicMaterial({color:"#07111b",side:THREE.DoubleSide}),0,2.77,0).rotation.x=-Math.PI/2;
  const barFill=add(root,new THREE.PlaneGeometry(1.08,.055),new THREE.MeshBasicMaterial({color:"#c5ff67",side:THREE.DoubleSide}),0,2.785,0);barFill.rotation.x=-Math.PI/2;
  const label=withLabel?makeTextSprite("FIGHTER",hex||"#53eedc"):null;if(label){label.position.set(0,3.12,0);root.add(label);}
  return {root,body,leftArm,rightArm,leftLeg,rightLeg,shield,ultimateRing,boostRing,respawnRing,teamRing,barFill,label,drones,lastX:null,lastZ:null,phase:Math.random()*6,tint,groundRing,classId,colorHex:hex||DEFAULT_COLORS[0]};
}
function disposeTree(obj){if(!obj)return;obj.traverse(n=>{if(n.geometry)n.geometry.dispose();if(n.material){const mats=Array.isArray(n.material)?n.material:[n.material];mats.forEach(m=>{if(m.map)m.map.dispose();m.dispose();});}});}
function makeBlock(parent,x,y,w,d,tint){
  const ww=w/50,dd=d/50;
  const base=add(parent,new THREE.BoxGeometry(ww,.72,dd),standard("#182b3a",.74,.35,.12),x/50,.36,y/50);
  const top=add(parent,new THREE.BoxGeometry(ww*.91,.055,dd*.83),standard("#263e50",.72,.26,.16),x/50,.755,y/50);
  add(parent,new THREE.BoxGeometry(ww*.76,.025,.045),glowMaterial(tint),x/50,.795,y/50);
  [-1,1].forEach(side=>add(parent,new THREE.BoxGeometry(.055,.34,dd*.52),standard(tint,.45,.3,.48),x/50+side*(ww/2+.006),.37,y/50));
}
function addBeacon(parent,x,z,tint){
  add(parent,new THREE.CylinderGeometry(.22,.32,.32,8),standard("#172a39",.75,.3,.12),x,.16,z);
  add(parent,new THREE.CylinderGeometry(.12,.12,.72,8),standard("#526e7c",.7,.25,.2),x,.64,z);
  const cap=add(parent,new THREE.OctahedronGeometry(.18,1),standard(tint,.4,.2,1),x,1.1,z);cap.rotation.y=Math.PI/4;
  add(parent,new THREE.TorusGeometry(.31,.025,6,24),glowMaterial(tint),x,.9,z).rotation.x=-Math.PI/2;
}
function addMapProp(parent,key,tint){
  if(key==="sky"){
    [-8.8,8.8].forEach(x=>[-5.7,5.7].forEach(z=>{add(parent,new THREE.CylinderGeometry(.13,.24,1.9,6),standard("#343e67",.8,.3,.2),x,.95,z);add(parent,new THREE.TorusGeometry(.24,.025,6,20),glowMaterial(tint),x,1.7,z).rotation.x=-Math.PI/2;}));
  }else if(key==="frost"){
    [-8,8].forEach(x=>[-5.6,5.6].forEach(z=>{const crystal=add(parent,new THREE.OctahedronGeometry(.55,1),standard("#87dfff",.35,.22,.65),x,.58,z);crystal.scale.set(.65,1.9,.65);crystal.rotation.y=Math.PI/5;}));
  }else if(key==="ember"){
    [-8.9,8.9].forEach(x=>[-5.6,5.6].forEach(z=>{add(parent,new THREE.CylinderGeometry(.34,.48,.55,6),standard("#483044",.72,.36,.22),x,.28,z);add(parent,new THREE.TorusGeometry(.39,.035,7,24),glowMaterial(tint),x,.58,z).rotation.x=-Math.PI/2;}));
  }else{
    [-8.9,8.9].forEach(x=>[-5.6,5.6].forEach(z=>addBeacon(parent,x,z,tint)));
  }
}

function createArena(canvas){
  try{
    const stage=canvas.parentElement,renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.6));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.18;
    renderer.domElement.className="arena-3d-canvas";renderer.domElement.setAttribute("aria-label","GLOBAL CLASH 3D arena");stage.insertBefore(renderer.domElement,canvas);canvas.classList.add("legacy-arena-canvas");
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-13,13,8.2,-8.2,.1,100);
    camera.position.set(0,28,13);camera.up.set(0,0,-1);camera.lookAt(0,0,0);
    scene.add(new THREE.HemisphereLight("#c7f4ff","#142030",2.05));
    const keyLight=new THREE.DirectionalLight("#ffffff",2.25);keyLight.position.set(-7,16,8);scene.add(keyLight);
    const rimLight=new THREE.DirectionalLight("#53eedc",.95);rimLight.position.set(10,10,-8);scene.add(rimLight);
    let world=null,worldKey="",worldMode="";
    const fighters=new Map(),bullets=[],pickups=[],particles=[];
    const vA=new THREE.Vector3(0,1,0),vB=new THREE.Vector3();
    function resize(){
      const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight),aspect=w/h;
      const worldW=Math.max(25.4,16.1*aspect),worldH=worldW/aspect;
      camera.left=-worldW/2;camera.right=worldW/2;camera.top=worldH/2;camera.bottom=-worldH/2;camera.updateProjectionMatrix();renderer.setSize(w,h,false);
    }
    resize();
    if(window.ResizeObserver)new ResizeObserver(resize).observe(stage);else window.addEventListener("resize",resize);
    function buildWorld(mapKey,mode){
      if(world){scene.remove(world);disposeTree(world);fighters.clear();}
      world=new THREE.Group();scene.add(world);
      const cfg=MAPS[mapKey]||MAPS.neon;scene.background=color(cfg.bg);
      const floor=add(world,new THREE.PlaneGeometry(25.1,15.85),new THREE.MeshStandardMaterial({color:cfg.bg,roughness:.86,metalness:.22}),0,-.12,0);floor.rotation.x=-Math.PI/2;
      const grid=new THREE.GridHelper(24.6,48,cfg.grid,cfg.grid);grid.position.y=-.105;grid.material.transparent=true;grid.material.opacity=.27;world.add(grid);
      const boundary=glowMaterial(cfg.grid);
      add(world,new THREE.BoxGeometry(24.45,.055,.045),boundary,0,.035,-7.7);add(world,new THREE.BoxGeometry(24.45,.055,.045),boundary,0,.035,7.7);
      add(world,new THREE.BoxGeometry(.045,.055,15.4),boundary,-12.25,.035,0);add(world,new THREE.BoxGeometry(.045,.055,15.4),boundary,12.25,.035,0);
      const haze=add(world,new THREE.PlaneGeometry(24.2,15),new THREE.MeshBasicMaterial({color:cfg.grid,transparent:true,opacity:.025,side:THREE.DoubleSide}),0,-.09,0);haze.rotation.x=-Math.PI/2;
      const zone1=add(world,new THREE.TorusGeometry(2.1,.032,8,72),glowMaterial(cfg.accent),0,.025,0);zone1.rotation.x=-Math.PI/2;
      const zone2=add(world,new THREE.TorusGeometry(2.34,.012,6,72),new THREE.MeshBasicMaterial({color:cfg.grid,transparent:true,opacity:.8}),0,.02,0);zone2.rotation.x=-Math.PI/2;
      for(let i=0;i<24;i++){const a=i*Math.PI/12;add(world,new THREE.SphereGeometry(.055,8,8),glowMaterial(i%2?cfg.grid:cfg.accent),Math.cos(a)*2.22,.04,Math.sin(a)*2.22);}
      const platform=add(world,new THREE.CylinderGeometry(1.02,1.12,.16,48),standard("#172b3a",.78,.32,.14),0,-.02,0);platform.position.y=-.02;
      const core=add(world,new THREE.OctahedronGeometry(.53,1),standard(cfg.accent,.48,.2,1.1),0,.78,0);core.userData.isCore=true;core.visible=mode==="core";
      const coreRing=add(world,new THREE.TorusGeometry(.82,.035,8,44),glowMaterial(cfg.grid),0,.55,0);coreRing.rotation.x=-Math.PI/2;coreRing.userData.isCore=true;coreRing.visible=mode==="core";
      const blocks={neon:[[330,205,95,34],[775,205,95,34],[330,520,95,34],[775,520,95,34]],sky:[[260,160,90,38],[850,160,90,38],[260,560,90,38],[850,560,90,38]],frost:[[430,155,340,28],[430,577,340,28],[350,310,35,140],[815,310,35,140]],ember:[[235,240,105,52],[860,240,105,52],[235,465,105,52],[860,465,105,52]]}[mapKey]||[];
      blocks.forEach(b=>makeBlock(world,b[0]-600,b[1]-380,b[2],b[3],cfg.grid));addMapProp(world,mapKey,cfg.accent);
      [[-9.8,-5.8],[9.8,-5.8],[-9.8,5.8],[9.8,5.8]].forEach((p,i)=>{const ring=add(world,new THREE.TorusGeometry(.68,.025,6,32),glowMaterial(i%2===0?cfg.grid:cfg.accent),p[0],.025,p[1]);ring.rotation.x=-Math.PI/2;});
      worldKey=mapKey;worldMode=mode;world.userData.coreObjects=[];world.traverse(o=>{if(o.userData.isCore)world.userData.coreObjects.push(o);});
    }
    function updatePlayers(state,time){
      const people=Object.values(state.players||{}),alive=new Set(people.map(p=>p.id));
      for(const [id,r] of fighters){if(!alive.has(id)){world.remove(r.root);disposeTree(r.root);fighters.delete(id);}}
      people.forEach((p)=>{
        let r=fighters.get(p.id);if(r&&(r.classId!==(p.classId||"striker")||r.colorHex!==(p.color||DEFAULT_COLORS[0]))){world.remove(r.root);disposeTree(r.root);fighters.delete(p.id);r=null;}if(!r){r=makeFighter(p.classId||"striker",p.color,true);world.add(r.root);fighters.set(p.id,r);}
        if(p.disconnected){r.root.visible=false;return;}
        const x=(p.x-600)/50,z=(p.y-380)/50,dx=r.lastX===null?0:p.x-r.lastX,dz=r.lastZ===null?0:p.y-r.lastZ,walk=clamp(Math.hypot(dx,dz)/4.2,0,1);
        r.lastX=p.x;r.lastZ=p.y;r.root.visible=true;r.body.visible=p.hp>0&&p.respawn<=0;
        r.root.position.set(x,.025+Math.abs(Math.sin(time*8+r.phase))*.035*walk,z);r.root.rotation.y=Math.PI/2-(p.angle||0);
        const swing=Math.sin(time*12+r.phase)*walk*.62;
        r.leftLeg.rotation.x=swing;r.rightLeg.rotation.x=-swing;r.leftArm.rotation.x=-swing*.78;r.rightArm.rotation.x=swing*.78;r.body.rotation.z=walk*Math.sin(time*12+r.phase)*.035;
        r.teamRing.material.color.set(p.team==="B"?"#ff6688":"#53eedc");
        r.shield.visible=(p.shieldTimer||0)>0;r.shield.material.opacity=.12+.08*Math.sin(time*9);
        r.ultimateRing.visible=(p.ultimate||0)>=99;r.ultimateRing.rotation.z=time*.65;
        r.boostRing.visible=(p.overdriveTimer||0)>0||(p.speedBoostTimer||0)>0;r.boostRing.rotation.z=-time*1.4;
        r.respawnRing.visible=p.respawn>0;r.respawnRing.rotation.z=time*2.4;
        const ratio=clamp((p.hp||0)/(p.maxHp||100),0,1);r.barFill.scale.x=Math.max(.001,ratio);r.barFill.position.x=-.54+.54*ratio;r.barFill.material.color.set(ratio>.5?"#c5ff67":"#ff6688");
        if(r.label){r.label.visible=p.hp>0&&p.respawn<=0;if(r.label.material.map&&r.label.userData.name!==p.name){
          r.label.userData.name=p.name;const g=r.label.material.map.image.getContext("2d");g.clearRect(0,0,512,112);g.fillStyle="rgba(3,10,17,.78)";g.beginPath();if(g.roundRect)g.roundRect(5,7,502,98,18);else g.rect(5,7,502,98);g.fill();g.strokeStyle=p.color||"#53eedc";g.lineWidth=5;g.stroke();g.font="700 38px Arial";g.textAlign="center";g.textBaseline="middle";g.fillStyle="#f2fbff";g.shadowColor=p.color||"#53eedc";g.shadowBlur=12;g.fillText(String(p.name||"FIGHTER").slice(0,20),256,56);r.label.material.map.needsUpdate=true;
        }}
        r.drones.forEach((d,i)=>{const side=d.userData.side,a=time*1.8+i*Math.PI;d.position.set(Math.cos(a)*.78*side,1.78+Math.sin(a*1.4)*.12,Math.sin(a)*.55-.05);d.rotation.y=time*2.2;});
      });
    }
    function updateBullets(list){
      while(bullets.length<list.length){const group=new THREE.Group(),orb=add(group,new THREE.SphereGeometry(.115,10,8),standard("#53eedc",.2,.16,1.3)),trail=add(group,new THREE.CylinderGeometry(.025,.075,.52,7),standard("#53eedc",.2,.2,1));scene.add(group);bullets.push({group,orb,trail});}
      bullets.forEach((b,i)=>{const item=list[i];b.group.visible=!!item;if(!item)return;const px=(item.x-600)/50,pz=(item.y-380)/50,dx=item.vx||1,dz=item.vy||0,dir=vB.set(dx,0,dz).normalize(),tint=item.color||"#53eedc";b.orb.material.color.set(tint);b.orb.material.emissive.set(tint);b.trail.material.color.set(tint);b.trail.material.emissive.set(tint);b.group.position.set(px,.35,pz);b.trail.position.set(-dir.x*.26,0,-dir.z*.26);b.trail.quaternion.setFromUnitVectors(vA,dir);});
    }
    function updatePickups(list,time){
      while(pickups.length<list.length){const group=new THREE.Group(),gem=add(group,new THREE.OctahedronGeometry(.27,1),standard("#53eedc",.38,.18,1.1)),ring=add(group,new THREE.TorusGeometry(.42,.025,6,28),glowMaterial("#53eedc"),0,0,0);ring.rotation.x=Math.PI/2;scene.add(group);pickups.push({group,gem,ring,type:""});}
      pickups.forEach((r,i)=>{const p=list[i];r.group.visible=!!p;if(!p)return;const type=p.type||"charge",tint=type==="repair"?"#c5ff67":type==="battery"?"#53eedc":"#ad91ff";if(r.type!==type){r.type=type;r.gem.material.color.set(tint);r.gem.material.emissive.set(tint);r.ring.material.color.set(tint);}r.group.position.set((p.x-600)/50,.55+Math.sin(time*3+i)*.08,(p.y-380)/50);r.gem.rotation.set(time*1.5,time*1.9,Math.sin(time)*.3);r.ring.rotation.z=time*1.5;});
    }
    function updateParticles(list){
      const shown=list.slice(-90);
      while(particles.length<shown.length){const m=add(scene,new THREE.SphereGeometry(.055,6,6),new THREE.MeshBasicMaterial({color:"#ffffff",transparent:true,depthWrite:false}));particles.push(m);}
      particles.forEach((m,i)=>{const p=shown[i];m.visible=!!p;if(!p)return;const life=clamp((p.life||0)/(p.maxLife||1),0,1);m.position.set((p.x-600)/50,.15,(p.y-380)/50);m.scale.setScalar((p.size||2)*.025*(.5+life));m.material.color.set(p.color||"#ffffff");m.material.opacity=life;});
    }
    function update(state,time){
      if(!state)return;const key=state.map||"neon",mode=state.mode||"training";
      if(!world||worldKey!==key)buildWorld(key,mode);
      else if(worldMode!==mode){worldMode=mode;world.userData.coreObjects.forEach(o=>o.visible=mode==="core");}
      updatePlayers(state,time);updateBullets(state.bullets||[]);updatePickups(state.pickups||[],time);updateParticles(state.particles||[]);
      (world.userData.coreObjects||[]).forEach(o=>{if(o.geometry&&o.geometry.type==="OctahedronGeometry"){o.rotation.y=time*.7;o.rotation.x=Math.sin(time)*.1;}});
      renderer.render(scene,camera);
    }
    function pointerToGame(clientX,clientY,rect){const d=new THREE.Vector3().subVectors(new THREE.Vector3(0,0,0),camera.position).normalize();const up=camera.up.clone().addScaledVector(d,-camera.up.dot(d)).normalize();const zScale=Math.max(.1,Math.abs(up.z));const worldW=camera.right-camera.left,worldH=camera.top-camera.bottom;return {x:clamp(600+(clientX-rect.left-rect.width/2)*50*worldW/rect.width,0,1200),y:clamp(380+(clientY-rect.top-rect.height/2)*50*worldH/(zScale*rect.height),0,760)};}
    return {update,resize,renderer,pointerToGame,dispose(){renderer.dispose();renderer.domElement.remove();canvas.classList.remove("legacy-arena-canvas");}};
  }catch(error){console.warn("GLOBAL CLASH 3D renderer unavailable; using 2D fallback.",error);return null;}
}

function createPreview(container){
  if(!container)return null;
  try{
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.22;renderer.setClearColor(0x000000,0);
    renderer.domElement.className="preview-3d-canvas";container.appendChild(renderer.domElement);
    const aura=container.querySelector(".avatar-aura"),oldIcon=container.querySelector(".avatar-figure");if(aura)aura.style.display="none";if(oldIcon)oldIcon.style.display="none";
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,1,.1,50);camera.position.set(3.8,2.55,5.4);camera.lookAt(0,1.16,0);
    scene.add(new THREE.HemisphereLight("#d5f4ff","#1a2634",2.2));const key=new THREE.DirectionalLight("#ffffff",2.7);key.position.set(3,7,5);scene.add(key);const rim=new THREE.PointLight("#53eedc",8,10);rim.position.set(-3,2.7,-2);scene.add(rim);
    add(scene,new THREE.CylinderGeometry(1.03,1.12,.18,48),standard("#172d3d",.78,.25,.25),0,-.02,0);
    const platformRing=add(scene,new THREE.TorusGeometry(1.04,.025,7,48),glowMaterial("#53eedc"),0,.08,0);platformRing.rotation.x=-Math.PI/2;
    const floor=add(scene,new THREE.CircleGeometry(2.6,48),new THREE.MeshBasicMaterial({color:"#112331",transparent:true,opacity:.42}),0,-.12,0);floor.rotation.x=-Math.PI/2;
    let record=null,lastClass="",lastColor="";
    function resize(){const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();}
    if(window.ResizeObserver)new ResizeObserver(resize).observe(container);else window.addEventListener("resize",resize);resize();
    function setCharacter(classId,hex){if(record&&lastClass===classId&&lastColor===hex)return;if(record){scene.remove(record.root);disposeTree(record.root);}record=makeFighter(classId,hex,false);record.root.position.y=.12;scene.add(record.root);lastClass=classId;lastColor=hex;}
    function animate(ms){
      if(!container.isConnected){renderer.dispose();return;}requestAnimationFrame(animate);
      if(container.clientWidth===0||container.clientHeight===0)return;const t=ms*.001;
      if(record){record.root.rotation.y=Math.sin(t*.52)*.72;record.body.position.y=.035+Math.sin(t*2.1)*.035;record.leftArm.rotation.x=Math.sin(t*2.3)*.06;record.rightArm.rotation.x=-Math.sin(t*2.3)*.06;record.drones.forEach((d,i)=>{d.position.set(Math.cos(t*1.7+i*Math.PI)*.82,1.8+Math.sin(t*2+i)*.1,Math.sin(t*1.7+i*Math.PI)*.45);d.rotation.y=t*2;});}
      platformRing.rotation.z=t*.12;renderer.render(scene,camera);
    }
    requestAnimationFrame(animate);return {setCharacter,resize,renderer};
  }catch(error){console.warn("GLOBAL CLASH 3D preview unavailable.",error);return null;}
}
window.GlobalClash3D={createArena,createPreview};
})();