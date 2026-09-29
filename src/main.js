import './style.css';
import * as THREE from 'three';
import {createCar} from './car.js';
import {buildCircuit,frame,curvature,LENGTH,WIDTH,samples} from './circuit.js';
import {EngineAudio} from './audio.js';

const $=id=>document.getElementById(id),clamp=THREE.MathUtils.clamp,lerp=THREE.MathUtils.lerp;
const dom={};['menu','hud','modal','modal-content','countdown','count-text','position','lap','time','best','speed','gear','boost-fill','boost-text','leaderboard','corner','notice','header-label','sound'].forEach(id=>dom[id]=$(id));
let state='menu',previousState='racing',cameraMode=0,quality='auto',muted=false;
let bestEver=0;
try{bestEver=Number(localStorage.getItem('apex-gp-best-v1'))||0;quality=localStorage.getItem('apex-gp-quality')||'auto';muted=localStorage.getItem('apex-gp-muted')==='true'}catch{}
const save=(key,value)=>{try{localStorage.setItem(key,String(value))}catch{}};
let renderer;
try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'})}catch(e){$('loading').innerHTML='<div class="brand">APEX GP</div><p>This game needs WebGL 2. Try a recent browser with hardware acceleration enabled.</p>';throw e}
renderer.setSize(innerWidth,innerHeight);renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;$('world').appendChild(renderer.domElement);
const scene=new THREE.Scene();scene.background=new THREE.Color(0xbac8b0);scene.fog=new THREE.FogExp2(0xbac8b0,.0006);
const camera=new THREE.PerspectiveCamera(49,innerWidth/innerHeight,.15,6500);
const hemi=new THREE.HemisphereLight(0xd9e8ed,0x6b775b,1.8);scene.add(hemi);
const sun=new THREE.DirectionalLight(0xffe6bb,2.7);sun.position.set(-120,170,-80);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-35;sun.shadow.camera.right=35;sun.shadow.camera.top=35;sun.shadow.camera.bottom=-35;sun.shadow.camera.near=10;sun.shadow.camera.far=380;sun.shadow.normalBias=.035;sun.shadow.bias=-.00015;scene.add(sun,sun.target);
const env=buildCircuit(scene);
const colors=[0xff5031,0x36c8b0,0x5195f8,0xf5cd6b,0xa788de,0xece7d7,0x74ba61,0xe37ea5];
const names=['YOU','VERDI','HAYES','MOREAU','SILVA','TANAKA','KOVAC','ROSSI'];
const cars=names.map((name,i)=>{const mesh=createCar(colors[i],i===0?7:11+i*4);scene.add(mesh);return {name,mesh,s:60+(7-i)*8,lateral:(i%2?1:-1)*3,speed:0,base:81+(i%3)*2.2,finished:false,finishTime:0,cooldown:0,frame:{p:new THREE.Vector3(),tangent:new THREE.Vector3(),normal:new THREE.Vector3()}}});
const player=cars[0];player.s=60;player.lateral=-3;
const keys=new Set(),audio=new EngineAudio();audio.enabled=!muted;
let elapsed=0,lapTime=0,lastLapAt=0,currentLap=1,sessionBest=0,boost=100,boosting=false,countElapsed=0,countStage=-1,noticeTimer=0,steer=0,shake=0,finishedCount=0;
const START=60,LAPS=3;
const rpmSegments=Array.from({length:16},()=>{let i=document.createElement('i');$('rpm').append(i);return i});
const minimap=$('map'),mapCtx=minimap.getContext('2d');
$('track-length').textContent=(LENGTH/1000).toFixed(2);
const cameraTarget=new THREE.Vector3(),desiredCamera=new THREE.Vector3(),targetPosition=new THREE.Vector3(),lookPoint=new THREE.Vector3();
const clock=new THREE.Clock();let accumulator=0,wall=0,frames=0,performanceTime=0,lastFps=60,pixelRatio=Math.min(devicePixelRatio,1.65),uiTime=0;
// Small, pooled dust particles: one draw call and no new objects during play.
const dustCount=90,dustPos=new Float32Array(dustCount*3),dustLife=new Float32Array(dustCount),dustVel=new Float32Array(dustCount*3);dustPos.fill(-1000);
const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
const dust=new THREE.Points(dustGeo,new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{size:{value:45}},vertexShader:'uniform float size; varying float fade; void main(){vec4 mv=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(size*70./-mv.z,1.,38.);fade=clamp((position.y-.1)*.18,0.,.12);}',fragmentShader:'varying float fade;void main(){float d=length(gl_PointCoord-vec2(.5));if(d>.5)discard;gl_FragColor=vec4(.79,.73,.55,(1.-d*2.)*.16);}'}));dust.frustumCulled=false;scene.add(dust);let dustCursor=0;
const boostGlow=new THREE.Mesh(new THREE.SphereGeometry(.14,8,6),new THREE.MeshBasicMaterial({color:0x9de5ff,transparent:true,opacity:.8}));boostGlow.position.set(0,.57,-2.6);boostGlow.scale.set(1,.6,4);boostGlow.visible=false;player.mesh.add(boostGlow);

function formatTime(t){if(!Number.isFinite(t)||t<0)return '—:—.———';const ms=Math.floor(t*1000);return `${Math.floor(ms/60000)}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`}
function notify(message,duration=2.5){dom.notice.textContent=message;dom.notice.classList.add('show');noticeTimer=duration}
function updateSound(){dom.sound.classList.toggle('active',!muted);dom.sound.textContent=muted?'♪':'♫';dom.sound.setAttribute('aria-label',muted?'Enable engine audio':'Mute engine audio');dom.sound.title=muted?'Audio off — enable':'Audio on — mute'}
function applyQuality(value){quality=['auto','high','medium','low'].includes(value)?value:'auto';$('quality').value=quality;pixelRatio=quality==='high'?Math.min(devicePixelRatio,2):quality==='medium'?Math.min(devicePixelRatio,1.25):quality==='low'?Math.min(devicePixelRatio,.85):Math.min(devicePixelRatio,1.65);renderer.setPixelRatio(pixelRatio);renderer.shadowMap.enabled=quality!=='low';save('apex-gp-quality',quality)}
applyQuality(quality);updateSound();

function resetRace(){elapsed=0;lapTime=0;lastLapAt=0;currentLap=1;sessionBest=0;boost=100;countElapsed=0;countStage=-1;steer=0;shake=0;finishedCount=0;cameraMode=0;keys.clear();dom.notice.classList.remove('show');noticeTimer=0;
 for(let i=0;i<cars.length;i++){let c=cars[i];c.s=i===0?START:START+(8-i)*8;c.lateral=(i%2?1:-1)*3;c.speed=0;c.finished=false;c.finishTime=0;c.cooldown=0}
 placeCars();const f=player.frame;desiredCamera.copy(f.p).addScaledVector(f.tangent,-11).addScaledVector(f.normal,1);desiredCamera.y=4.2;camera.position.copy(desiredCamera);cameraTarget.copy(f.p).addScaledVector(f.tangent,16);cameraTarget.y=1.05;camera.lookAt(cameraTarget);camera.fov=57;camera.updateProjectionMatrix();
}
async function startRace(){await audio.init().catch(()=>{});resetRace();state='countdown';dom.menu.hidden=true;dom.hud.hidden=false;dom.modal.hidden=true;dom.countdown.hidden=false;document.body.classList.add('racing');dom['header-label'].textContent='RIVIERA GRAND PRIX / RACE';dom['count-text'].textContent='GET READY';document.querySelectorAll('.lights i').forEach(e=>e.classList.remove('lit'));updateHUD();}
function goMenu(){state='menu';keys.clear();dom.menu.hidden=false;dom.hud.hidden=true;dom.modal.hidden=true;dom.countdown.hidden=true;document.body.classList.remove('racing');dom['header-label'].textContent='THE PURSUIT OF SPEED';player.s=110;player.lateral=-2;player.speed=0;boostGlow.visible=false;placeCars();}
function showModal(html){dom['modal-content'].innerHTML=html;dom.modal.hidden=false;requestAnimationFrame(()=>dom['modal-content'].querySelector('button')?.focus())}
function pauseRace(){if(state!=='racing'&&state!=='countdown')return;previousState=state;state='paused';keys.clear();showModal('<div class="tiny">TAKE A BREATHER</div><h2>RACE PAUSED.</h2><p>Your grid is waiting. Find your rhythm and chase the next corner.</p><button id="resume" class="primary">BACK TO THE RACE <span>↗</span></button><button id="restart" class="secondary">RESTART RACE</button><button id="exit" class="secondary">RETURN TO PADDOCK</button>');$('resume').onclick=resumeRace;$('restart').onclick=startRace;$('exit').onclick=goMenu;}
function resumeRace(){if(state!=='paused')return;state=previousState;dom.modal.hidden=true;audio.init().catch(()=>{});keys.clear()}
function showHelp(){showModal('<div class="tiny">A LITTLE RACECRAFT</div><h2>FIND YOUR APEX.</h2><div class="help-row"><span>Accelerate / brake</span><span><kbd>W / ↑</kbd><kbd>S / ↓</kbd></span></div><div class="help-row"><span>Steer left / right</span><span><kbd>A / ←</kbd><kbd>D / →</kbd></span></div><div class="help-row"><span>Hybrid boost</span><kbd>SPACE / SHIFT</kbd></div><div class="help-row"><span>Chase / cockpit camera</span><kbd>C</kbd></div><div class="help-row"><span>Pause / recover to track</span><span><kbd>ESC</kbd><kbd>R</kbd></span></div><p>Race three laps against seven rivals. Brake before tight corners: carrying too much speed pushes you wide. Steering assistance follows the circuit while you choose your line and make the passes. Boost recharges when released.</p><p>On touch screens, use the on-screen steering, brake, gas and boost buttons. Your fastest lap is saved on this device.</p><button id="close-help" class="primary">GOT IT <span>↗</span></button>');$('close-help').onclick=()=>dom.modal.hidden=true;}
function finishRace(){player.finished=true;player.finishTime=elapsed;finishedCount++;state='finished';keys.clear();boostGlow.visible=false;const rank=rankings().findIndex(c=>c===player)+1;dom['header-label'].textContent='CHEQUERED FLAG';
 if(sessionBest&&(!bestEver||sessionBest<bestEver)){bestEver=sessionBest;save('apex-gp-best-v1',bestEver)}
 showModal(`<div class="tiny">RIVIERA GRAND PRIX / CLASSIFIED</div><h2>${rank===1?'VICTORY.':rank<=3?'ON THE PODIUM.':'RACE COMPLETE.'}</h2><p>${rank===1?'You found the limit. Then you passed it.':rank<=3?'A hard-earned finish. There’s more time out there.':'Every corner is another chance. Come back faster.'}</p><div class="results"><span><small>POSITION</small><b>P${rank} / 8</b></span><span><small>RACE TIME</small><b>${formatTime(elapsed)}</b></span><span><small>BEST LAP</small><b>${formatTime(sessionBest)}</b></span></div><div class="tiny">PERSONAL BEST &nbsp; ${formatTime(bestEver)}</div><button id="again" class="primary">RACE AGAIN <span>↗</span></button><button id="exit" class="secondary">RETURN TO PADDOCK</button>`);$('again').onclick=startRace;$('exit').onclick=goMenu;
}
function rankings(){return [...cars].sort((a,b)=>{if(a.finished&&b.finished)return a.finishTime-b.finishTime;if(a.finished)return -1;if(b.finished)return 1;return b.s-a.s})}
function placeCars(){for(const c of cars){frame(c.s,c.lateral,c.frame);c.mesh.position.copy(c.frame.p);c.mesh.position.y=.055;c.mesh.rotation.y=Math.atan2(c.frame.tangent.x,c.frame.tangent.z)+(c===player?steer*.06:0);c.mesh.rotation.z=c===player?steer*.017:0}}
function emitDust(){const j=dustCursor++%dustCount,f=player.frame;dustLife[j]=.6+Math.random()*.4;dustPos[j*3]=f.p.x+(Math.random()-.5)*2;dustPos[j*3+1]=.4;dustPos[j*3+2]=f.p.z;dustVel[j*3]=-f.tangent.x*player.speed*.12+(Math.random()-.5)*2;dustVel[j*3+1]=1.2+Math.random();dustVel[j*3+2]=-f.tangent.z*player.speed*.12}

function simulate(dt){
 if(state==='countdown'){countElapsed+=dt;const stage=Math.min(5,Math.floor(countElapsed/.65));if(stage!==countStage){countStage=stage;document.querySelectorAll('.lights i').forEach((el,i)=>el.classList.toggle('lit',i<stage));if(stage>0&&stage<5)audio.beep(460,.08);if(stage===5){audio.beep(900,.25);state='racing';dom['count-text'].textContent='GO';document.querySelectorAll('.lights i').forEach(e=>e.classList.remove('lit'));notify('LIGHTS OUT. MAKE IT COUNT.',2.5)}}return;}
 if(state!=='racing')return;
 elapsed+=dt;lapTime=elapsed-lastLapAt;countElapsed+=dt;if(countElapsed>4.1)dom.countdown.hidden=true;
 if(noticeTimer>0){noticeTimer-=dt;if(noticeTimer<=0)dom.notice.classList.remove('show')}
 const gas=keys.has('KeyW')||keys.has('ArrowUp'),brake=keys.has('KeyS')||keys.has('ArrowDown');
 const left=keys.has('KeyA')||keys.has('ArrowLeft'),right=keys.has('KeyD')||keys.has('ArrowRight');
 const turn=(right?1:0)-(left?1:0);steer=lerp(steer,turn,1-Math.exp(-dt*9));
 boosting=(keys.has('Space')||keys.has('ShiftLeft')||keys.has('ShiftRight'))&&boost>1&&gas&&player.speed>8&&!brake;
 boost=clamp(boost+(boosting?-26:12)*dt,0,100);boostGlow.visible=boosting;
 const offroad=Math.abs(player.lateral)>WIDTH-.15,k=curvature(player.s),safeSpeed=Math.min(91,Math.sqrt(24/(Math.abs(k)+.0005)));
 const max=boosting?103:89;
 let accel=gas?20*(1-player.speed/(max+13)): -4.5;
 if(brake)accel-=35;if(player.speed>max)accel-=15;
 if(offroad)accel-=17+player.speed*.19;
 player.speed=clamp(player.speed+accel*dt,0,max+2);
 // Circuit-following steering assistance; tyre grip still demands sensible corner entry speeds.
 const overload=Math.max(0,player.speed-safeSpeed),drift=-Math.sign(k)*overload*overload*Math.abs(k)*.075;
 player.lateral+=steer*(3.5+player.speed*.095)*dt+drift*dt;
 if(!turn&&!offroad&&overload<8)player.lateral*=Math.exp(-dt*.13);
 player.lateral=clamp(player.lateral,-WIDTH-5,WIDTH+5);
 if(Math.abs(player.lateral)>WIDTH+3.8){player.speed=Math.min(player.speed,32);if(player.cooldown<=0){notify('BARRIER CONTACT — R TO RECOVER',1.8);player.cooldown=1.1;shake=.13}}
 player.s+=player.speed*dt;player.cooldown=Math.max(0,player.cooldown-dt);
 for(let i=1;i<cars.length;i++){
   const c=cars[i];if(c.finished)continue;const bend=Math.max(Math.abs(curvature(c.s+16)),Math.abs(curvature(c.s+42))),target=Math.min(c.base,Math.sqrt(27/(bend+.0006)));
   c.speed=clamp(c.speed+clamp((target-c.speed)*1.8,-25,14)*dt,0,90);
   const raceLine=Math.sin((c.s+i*95)*.012)*1.7;
   let avoid=0;for(const other of cars){if(other===c||other.finished)continue;const ahead=other.s-c.s;if(ahead>0&&ahead<16&&Math.abs(c.lateral-other.lateral)<2.2){avoid=c.lateral<other.lateral?-2.8:2.8;if(ahead<7)c.speed=Math.min(c.speed,other.speed+2)}}
   c.lateral=lerp(c.lateral,clamp(raceLine+avoid,-6,6),dt*1.7);c.s+=c.speed*dt;
   if(c.s>=START+LENGTH*LAPS){c.finished=true;c.finishTime=elapsed;finishedCount++}
   if(Math.abs(c.s-player.s)<4.7&&Math.abs(c.lateral-player.lateral)<1.65&&player.cooldown<=0){player.speed*=.68;c.speed*=.87;player.lateral+=player.lateral<c.lateral?-1.1:1.1;player.cooldown=1;shake=.18;notify('CONTACT — KEEP IT CLEAN',1.6)}
 }
 const lap=Math.floor((player.s-START)/LENGTH)+1;
 if(lap>currentLap){const completed=elapsed-lastLapAt;sessionBest=sessionBest?Math.min(sessionBest,completed):completed;lastLapAt=elapsed;currentLap=lap;if(lap<=LAPS){notify(lap===LAPS?'FINAL LAP. LEAVE NOTHING.':`LAP ${lap} — ${formatTime(completed)}`,2.5);audio.beep(710,.12)}else{placeCars();updateHUD();finishRace();return}}
 placeCars();if(offroad&&player.speed>12&&Math.random()<dt*70)emitDust();
 for(let i=0;i<dustCount;i++)if(dustLife[i]>0){dustLife[i]-=dt;for(let j=0;j<3;j++)dustPos[i*3+j]+=dustVel[i*3+j]*dt;if(dustLife[i]<=0)dustPos[i*3+1]=-1000}
 dustGeo.attributes.position.needsUpdate=true;
 shake*=Math.exp(-dt*5);
}

const sunOffset=new THREE.Vector3(-120,170,-80);
function updateCamera(dt){
 sun.target.position.copy(player.frame.p);sun.position.copy(player.frame.p).add(sunOffset);sun.target.updateMatrixWorld();
 if(state==='menu'){
   const f=frame(110,-2);const orbit=Math.sin(wall*.14)*.22;
   desiredCamera.copy(f.p).addScaledVector(f.tangent,9.5+orbit*2).addScaledVector(f.normal,9.5);desiredCamera.y=3.15;
   // Place the car on the right of the frame, leaving the title legible on the left.
   targetPosition.copy(f.p).addScaledVector(f.normal,-4.4).addScaledVector(f.tangent,-.8);targetPosition.y=1.05;
   if(innerWidth<760){desiredCamera.copy(f.p).addScaledVector(f.tangent,8.5).addScaledVector(f.normal,7.5);desiredCamera.y=3.6;targetPosition.copy(f.p).addScaledVector(f.normal,-2.8);targetPosition.y=2.2}
   camera.position.lerp(desiredCamera,1-Math.exp(-dt*2));cameraTarget.lerp(targetPosition,1-Math.exp(-dt*2));camera.lookAt(cameraTarget);camera.fov=lerp(camera.fov,49,dt*3);camera.updateProjectionMatrix();return;
 }
 if(state==='paused')return;
 const f=player.frame;
 if(cameraMode===0){desiredCamera.copy(f.p).addScaledVector(f.tangent,-6.8-player.speed*.012).addScaledVector(f.normal,steer*.4);desiredCamera.y=2.8+player.speed*.004;frame(player.s+10+player.speed*.065,player.lateral, {p:targetPosition,tangent:lookPoint,normal:desiredNormal});targetPosition.y=1.05;
   camera.position.lerp(desiredCamera,1-Math.exp(-dt*6));cameraTarget.lerp(targetPosition,1-Math.exp(-dt*8));
 }else{camera.position.copy(f.p).addScaledVector(f.tangent,-.55);camera.position.y=1.32;frame(player.s+26,player.lateral,{p:targetPosition,tangent:lookPoint,normal:desiredNormal});targetPosition.y=1.25;cameraTarget.lerp(targetPosition,1-Math.exp(-dt*12))}
 if(shake>0){camera.position.x+=(Math.random()-.5)*shake;camera.position.y+=(Math.random()-.5)*shake*.5}
 camera.lookAt(cameraTarget);const fov=cameraMode?70:54+player.speed*.055+(boosting?4:0);if(Math.abs(camera.fov-fov)>.04){camera.fov=lerp(camera.fov,fov,1-Math.exp(-dt*3));camera.updateProjectionMatrix()}
 
}
const desiredNormal=new THREE.Vector3();
const bounds={minX:Infinity,maxX:-Infinity,minZ:Infinity,maxZ:-Infinity};for(const {p} of samples){bounds.minX=Math.min(bounds.minX,p.x);bounds.maxX=Math.max(bounds.maxX,p.x);bounds.minZ=Math.min(bounds.minZ,p.z);bounds.maxZ=Math.max(bounds.maxZ,p.z)}
function mapPoint(p){return [30+(p.x-bounds.minX)/(bounds.maxX-bounds.minX)*260,20+(p.z-bounds.minZ)/(bounds.maxZ-bounds.minZ)*210]}
function drawMap(){mapCtx.clearRect(0,0,320,250);mapCtx.lineJoin='round';mapCtx.lineWidth=6;mapCtx.strokeStyle='#7d907960';mapCtx.beginPath();samples.forEach(({p},i)=>{const [x,y]=mapPoint(p);i?mapCtx.lineTo(x,y):mapCtx.moveTo(x,y)});mapCtx.closePath();mapCtx.stroke();const sf=mapPoint(frame(START).p);mapCtx.fillStyle='#dfe5d4';mapCtx.fillRect(sf[0]-6,sf[1]-3,12,5);
 for(let i=cars.length-1;i>=0;i--){const [x,y]=mapPoint(cars[i].frame.p);mapCtx.fillStyle=i===0?'#ff6041':'#b0c4a3';mapCtx.beginPath();mapCtx.arc(x,y,i===0?6:3.3,0,Math.PI*2);mapCtx.fill();if(i===0){mapCtx.strokeStyle='#fff';mapCtx.lineWidth=1.5;mapCtx.stroke()}}
}
function updateHUD(){
 const order=rankings(),rank=order.indexOf(player)+1;dom.position.textContent=rank;dom.lap.innerHTML=`${Math.min(currentLap,LAPS)} <i>/ ${LAPS}</i>`;dom.time.textContent=formatTime(elapsed);dom.best.textContent=(sessionBest||bestEver)?formatTime(sessionBest||bestEver):'—:—.———';
 const speed=Math.round(player.speed*3.6),gear=speed<1?'N':Math.min(8,Math.floor(speed/43)+1);dom.speed.textContent=speed;dom.gear.textContent=gear;dom['boost-fill'].style.width=`${boost}%`;dom['boost-fill'].style.background=boosting?'#80d8ff':'#c8ef9d';dom['boost-text'].textContent=`${Math.round(boost)}%`;
 const rpm=(speed%43)/43;rpmSegments.forEach((e,i)=>e.classList.toggle('on',i<3+rpm*13));
 const visible=order.length===8?order:order.slice(0,8);dom.leaderboard.innerHTML=visible.map((c,i)=>`<div class="driver-row ${c===player?'you':''}" style="--driver-color:#${c.mesh.userData.paint.color.getHexString()}"><span class="rank">${i+1}</span><span class="team-dot"></span><b>${c.name}</b><span class="gap">${c===player?'YOU':c.finished?'FIN':i===0?'LEADER':`+${Math.max(0,(order[0].s-c.s)/Math.max(30,order[0].speed)).toFixed(1)}`}</span></div>`).join('');
 const k=Math.abs(curvature(player.s));dom.corner.textContent=k>.012?'TIGHT CORNER / BRAKE':k>.0035?'SWEEPING CURVE':'FULL THROTTLE / STRAIGHT';drawMap();
 audio.update(player.speed,keys.has('KeyW')||keys.has('ArrowUp')?1:0,gear,state==='racing'||state==='countdown');
}
function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);wall+=dt;
 if(state==='countdown'||state==='racing'){accumulator+=dt;while(accumulator>=1/120){simulate(1/120);accumulator-=1/120;if(state==='finished')break}}else accumulator=0;
 updateCamera(dt);env.water.material.uniforms.time.value=wall;
 uiTime+=dt;if(uiTime>.075){uiTime=0;if(state==='racing'||state==='countdown')updateHUD();else audio.update(0,0,0,false)}
 renderer.render(scene,camera);
 frames++;performanceTime+=dt;if(performanceTime>2.5){lastFps=frames/performanceTime;frames=0;performanceTime=0;if(quality==='auto'&&state!=='paused'){if(lastFps<43&&pixelRatio>.75){pixelRatio=Math.max(.75,pixelRatio*.85);renderer.setPixelRatio(pixelRatio)}if(lastFps<31&&pixelRatio<1)renderer.shadowMap.enabled=false;}}
}

$('camera-toggle').onclick=()=>{if(state==='racing'||state==='countdown'){cameraMode=(cameraMode+1)%2;notify(cameraMode?'COCKPIT CAMERA':'CHASE CAMERA',1.3)}};
$('start').onclick=startRace;$('pause').onclick=pauseRace;$('help').onclick=showHelp;
$('quality').onchange=e=>applyQuality(e.target.value);
$('sound').onclick=()=>{muted=!muted;audio.enabled=!muted;save('apex-gp-muted',muted);updateSound();if(!muted)audio.init().catch(()=>{})};
$('fullscreen').onclick=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else document.documentElement.requestFullscreen?.().catch(()=>notify('FULLSCREEN IS NOT AVAILABLE IN THIS BROWSER'))};
document.querySelector('.brand').onclick=e=>{e.preventDefault();if(state==='racing'||state==='countdown')pauseRace();else if(state==='menu')dom.modal.hidden=true;else if(state==='finished')goMenu()};
document.querySelectorAll('[data-color]').forEach(btn=>btn.onclick=()=>{player.mesh.userData.paint.color.setHex(Number(btn.dataset.color));document.querySelectorAll('[data-color]').forEach(b=>b.classList.toggle('selected',b===btn));save('apex-gp-color',btn.dataset.color)});
try{const color=localStorage.getItem('apex-gp-color');if(color){const btn=document.querySelector(`[data-color="${color}"]`);btn?.click()}}catch{}
const gameKeys=['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'];
addEventListener('keydown',e=>{if(gameKeys.includes(e.code)&&!['SELECT','INPUT','TEXTAREA'].includes(e.target.tagName)){if(state==='racing'||state==='countdown'){e.preventDefault();keys.add(e.code)}}if(e.repeat)return;if(e.code==='Escape'||e.code==='KeyP'){if(state==='paused')resumeRace();else if(state==='racing'||state==='countdown')pauseRace();else if(state==='menu')dom.modal.hidden=true}if(e.code==='KeyC'&&(state==='racing'||state==='countdown')){cameraMode=(cameraMode+1)%2;notify(cameraMode?'COCKPIT CAMERA':'CHASE CAMERA',1.3)}if(e.code==='KeyR'&&state==='racing'){player.lateral=0;player.speed=Math.min(player.speed,35);player.cooldown=1;notify('BACK ON TRACK',1.4)}});
addEventListener('keyup',e=>keys.delete(e.code));
addEventListener('blur',()=>{keys.clear();if(state==='racing'||state==='countdown')pauseRace()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(state==='racing'||state==='countdown'))pauseRace()});
for(const button of document.querySelectorAll('[data-key]')){button.addEventListener('pointerdown',e=>{e.preventDefault();if(state!=='racing'&&state!=='countdown')return;button.setPointerCapture(e.pointerId);keys.add(button.dataset.key);button.classList.add('pressed')});const release=e=>{keys.delete(button.dataset.key);button.classList.remove('pressed')};button.addEventListener('pointerup',release);button.addEventListener('pointercancel',release);button.addEventListener('lostpointercapture',release)}
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight)});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();pauseRace();notify('GRAPHICS INTERRUPTED — RELOAD TO RESTORE',20)});
player.s=110;player.lateral=-2;placeCars();const initial=frame(110,-2);camera.position.copy(initial.p).add(new THREE.Vector3(9.5,3.15,9.5));cameraTarget.copy(initial.p).add(new THREE.Vector3(-4.4,1.05,0));camera.lookAt(cameraTarget);
// Read-only diagnostics for checking rendering and race state in the browser.
window.__apex={get state(){return state},get stats(){return {fps:Math.round(lastFps),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,pixelRatio:renderer.getPixelRatio(),quality,elapsed,speed:player.speed,lap:currentLap,position:rankings().indexOf(player)+1,trackLength:LENGTH,boost,offroad:Math.abs(player.lateral)>WIDTH,cameraMode,bestEver}},get cars(){return cars.map(c=>({name:c.name,s:c.s,lateral:c.lateral,speed:c.speed,finished:c.finished}))}};
animate();requestAnimationFrame(()=>{const loading=$('loading');loading.style.opacity='0';setTimeout(()=>loading.hidden=true,550)});
