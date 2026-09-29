import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export const WIDTH=8.5;
const points=[[0,-260],[0,-100],[0,100],[18,220],[125,282],[276,240],[335,130],[320,20],[220,-55],[252,-156],[193,-255],[86,-320]];
export const curve=new THREE.CatmullRomCurve3(points.map(([x,z])=>new THREE.Vector3(x,0,z)),true,'centripetal');
export const LENGTH=curve.getLength();
const N=1100;
export const samples=[];
for(let i=0;i<=N;i++){
 const t=i/N,p=curve.getPointAt(t),tangent=curve.getTangentAt(t);tangent.y=0;tangent.normalize();
 samples.push({p,tangent,normal:new THREE.Vector3(tangent.z,0,-tangent.x)});
}
const curvatures=samples.map((f,i)=>{const b=samples[(i+7)%N].tangent;return Math.atan2(f.tangent.z*b.x-f.tangent.x*b.z,f.tangent.dot(b))/(7*LENGTH/N)});
export function frame(s,lateral=0,out={p:new THREE.Vector3(),tangent:new THREE.Vector3(),normal:new THREE.Vector3()}){
 const a=((s%LENGTH)+LENGTH)%LENGTH/LENGTH*N,i=Math.floor(a),f=a-i;
 out.p.lerpVectors(samples[i].p,samples[i+1].p,f);
 out.tangent.lerpVectors(samples[i].tangent,samples[i+1].tangent,f).normalize();
 out.normal.set(out.tangent.z,0,-out.tangent.x);out.p.addScaledVector(out.normal,lateral);return out;
}
export function curvature(s){const a=((s%LENGTH)+LENGTH)%LENGTH/LENGTH*N,i=Math.floor(a);return THREE.MathUtils.lerp(curvatures[i],curvatures[(i+1)%N],a-i)}
let rngSeed=9248;function rand(){rngSeed=(rngSeed*1664525+1013904223)>>>0;return rngSeed/4294967296}
function canvasTexture(w,h,draw){const cv=document.createElement('canvas');cv.width=w;cv.height=h;draw(cv.getContext('2d'),w,h);const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;return tex}
function ribbon(scene,left,right,mat,y=.02){if(left>right)[left,right]=[right,left];const pos=[],uv=[],ix=[];for(let i=0;i<=N;i++){const {p,normal}=samples[i];for(const offset of [left,right]){pos.push(p.x+normal.x*offset,y,p.z+normal.z*offset);uv.push(offset/6,i*LENGTH/N/6)}if(i<N){let a=i*2;ix.push(a,a+2,a+1,a+1,a+2,a+3)}}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geo.setIndex(ix);geo.computeVertexNormals();const mesh=new THREE.Mesh(geo,mat);mesh.receiveShadow=true;scene.add(mesh);return mesh}
function frondGeometry(){
 const pos=[],uv=[],ix=[];const seg=18;
 for(let i=0;i<=seg;i++){const t=i/seg,w=Math.sin(Math.PI*t)*.42*(i%2?.48:1),y=-1.1*t*t,z=t*4.3;pos.push(-w,y,z,w,y,z);uv.push(0,t,1,t);if(i<seg){const a=i*2;ix.push(a,a+1,a+2,a+1,a+3,a+2)}}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return g;
}
function mountainGeometry(radius,height,seed){
 const positions=[],colors=[],indices=[],radial=36,rings=13;
 for(let r=0;r<=rings;r++)for(let j=0;j<=radial;j++){
   const a=j/radial*Math.PI*2,t=r/rings,noise=(Math.sin(a*7+seed)*.14+Math.sin(a*13+seed)*.08+Math.sin(a*3+seed)*.2);
   const rad=radius*(1-t)*(1+noise),y=height*Math.pow(t,1.25)+Math.sin(a*5+seed)*(1-t)*t*height*.16;
   const x=Math.cos(a)*rad+Math.sin(t*3+seed)*t*radius*.14,z=Math.sin(a)*rad*1.4;
   positions.push(x,y,z);const shade=.78+Math.sin(a*11+t*31+seed)*.07+t*.14;colors.push(shade,shade,shade*.98);
   if(r<rings&&j<radial){let q=r*(radial+1)+j;indices.push(q,q+radial+1,q+1,q+1,q+radial+1,q+radial+2)}
 }
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
export function buildCircuit(scene){
 const asphalt=canvasTexture(256,256,(ctx,w,h)=>{ctx.fillStyle='#555957';ctx.fillRect(0,0,w,h);for(let i=0;i<25000;i++){let c=55+Math.floor(rand()*70);ctx.fillStyle=`rgba(${c},${c},${c},.32)`;ctx.fillRect(rand()*w,rand()*h,1,1)}ctx.fillStyle='#181e1c30';ctx.fillRect(67,0,13,h);ctx.fillRect(176,0,13,h)});asphalt.wrapS=asphalt.wrapT=THREE.RepeatWrapping;asphalt.anisotropy=8;
 ribbon(scene,-WIDTH,WIDTH,new THREE.MeshStandardMaterial({map:asphalt,roughness:.94}));
 const white=new THREE.MeshStandardMaterial({color:0xe6e3d6,roughness:.88});
 ribbon(scene,-WIDTH+.16,-WIDTH+.30,white,.038);ribbon(scene,WIDTH-.30,WIDTH-.16,white,.038);
 const kerbTex=canvasTexture(16,128,(ctx,w,h)=>{ctx.fillStyle='#e5e2d5';ctx.fillRect(0,0,w,h);ctx.fillStyle='#be3527';ctx.fillRect(0,0,w,h/2);ctx.fillStyle='#00000015';for(let i=0;i<16;i++)ctx.fillRect(0,i*8,w,1)});kerbTex.wrapS=kerbTex.wrapT=THREE.RepeatWrapping;
 // Kerb UVs use a compact stripe pattern distinct from the wide asphalt grain.
 const kerb=new THREE.MeshStandardMaterial({map:kerbTex,roughness:.9});
 for(let side of [-1,1])ribbon(scene,side*WIDTH,side*(WIDTH+.9),kerb,.075);
 const runoff=new THREE.MeshStandardMaterial({color:0x688275,roughness:1});for(let side of [-1,1])ribbon(scene,side*(WIDTH+1),side*(WIDTH+4),runoff,.005);
 const grass=canvasTexture(128,128,(ctx,w,h)=>{ctx.fillStyle='#536342';ctx.fillRect(0,0,w,h);for(let i=0;i<9000;i++){ctx.fillStyle=rand()>.5?'#3b60241f':'#8d995325';ctx.fillRect(rand()*w,rand()*h,1,2)}});grass.wrapS=grass.wrapT=THREE.RepeatWrapping;grass.repeat.set(180,180);
 const ground=new THREE.Mesh(new THREE.PlaneGeometry(1800,1800),new THREE.MeshStandardMaterial({map:grass,roughness:1}));ground.rotation.x=-Math.PI/2;ground.position.set(560,-.05,0);ground.receiveShadow=true;scene.add(ground);
 const water=new THREE.Mesh(new THREE.PlaneGeometry(6500,6500,1,1),new THREE.ShaderMaterial({uniforms:{time:{value:0},fogColor:{value:new THREE.Color(0xbac8bd)}},vertexShader:'varying vec3 vWorld; void main(){vec4 p=modelMatrix*vec4(position,1.);vWorld=p.xyz;gl_Position=projectionMatrix*viewMatrix*p;}',fragmentShader:'uniform float time; uniform vec3 fogColor; varying vec3 vWorld; void main(){float w=sin(vWorld.x*.11+time*.4)*sin(vWorld.z*.17+time*.6); vec3 col=mix(vec3(.13,.37,.38),vec3(.37,.57,.53),w*.3+.4); float glow=pow(max(0.,sin(vWorld.x*.08+vWorld.z*.12+time*.5)),24.)*.13; col+=glow; float fog=1.-exp(-length(vWorld-cameraPosition)*.00034);gl_FragColor=vec4(mix(col,fogColor,fog),1.);}',side:THREE.DoubleSide}));water.rotation.x=-Math.PI/2;water.position.set(-1400,-1.3,0);scene.add(water);
 // One draw call for the entire double-sided Armco barrier around the track.
 const matrix=new THREE.Matrix4(),dummy=new THREE.Object3D();
 const rails=new THREE.InstancedMesh(new THREE.BoxGeometry(.17,.28,6.2),new THREE.MeshStandardMaterial({color:0xa5aaa0,metalness:.72,roughness:.5}),Math.floor(LENGTH/6)*4);
 const posts=new THREE.InstancedMesh(new THREE.BoxGeometry(.13,.9,.13),new THREE.MeshStandardMaterial({color:0x6b746d,metalness:.55,roughness:.7}),Math.floor(LENGTH/6)*2);let ri=0,pi=0;
 for(let s=0;s<LENGTH-6;s+=6){for(let side of [-1,1]){const f=frame(s,side*(WIDTH+5.8));dummy.position.copy(f.p);dummy.rotation.set(0,Math.atan2(f.tangent.x,f.tangent.z),0);for(let y of [.45,.77]){dummy.position.y=y;dummy.updateMatrix();rails.setMatrixAt(ri++,dummy.matrix)}dummy.position.y=.4;dummy.updateMatrix();posts.setMatrixAt(pi++,dummy.matrix)}}
 rails.count=ri;posts.count=pi;scene.add(rails,posts);
 const staticParts={};
 const staticMats={dark:new THREE.MeshStandardMaterial({color:0x24332e,roughness:.75}),white:new THREE.MeshStandardMaterial({color:0xd4d6c4,roughness:.85}),orange:new THREE.MeshStandardMaterial({color:0xee4d2b,roughness:.68}),metal:new THREE.MeshStandardMaterial({color:0x75877c,metalness:.6,roughness:.7}),stone:new THREE.MeshStandardMaterial({color:0xb4ad92,roughness:1})};
 function box(w,h,d,x,y,z,mat='white',rot=0){let geo=new THREE.BoxGeometry(w,h,d);geo.rotateY(rot);geo.translate(x,y,z);(staticParts[mat]??=[]).push(geo.toNonIndexed())}
 // Grid, pit buildings, main grandstand and gantry.
 for(let i=0;i<8;i++){const f=frame(60+(7-i)*8,(i%2?1:-1)*3);for(let side of [-1,1])box(.08,.02,3,f.p.x+side*1.3,.055,f.p.z,'white');box(2.65,.02,.12,f.p.x,.055,f.p.z-1.5,'white')}
 const gridTex=canvasTexture(256,32,(ctx,w,h)=>{for(let y=0;y<2;y++)for(let x=0;x<16;x++){ctx.fillStyle=(x+y)%2?'#ece9dd':'#222c26';ctx.fillRect(x*16,y*16,16,16)}});
 const finish=new THREE.Mesh(new THREE.PlaneGeometry(WIDTH*2,1.3),new THREE.MeshStandardMaterial({map:gridTex,roughness:1}));finish.rotation.x=-Math.PI/2;const ff=frame(58);finish.position.copy(ff.p);finish.position.y=.052;finish.rotation.z=-Math.atan2(ff.tangent.x,ff.tangent.z);scene.add(finish);
 for(let x of [-14,14])box(.55,9,.55,x,4.5,-190,'metal');box(29,1.7,1.3,0,8.4,-190,'dark');
 function sign(text,width,height,x,y,z,rotation=0){const tex=canvasTexture(1024,128,(ctx,w,h)=>{ctx.fillStyle='#172820';ctx.fillRect(0,0,w,h);ctx.fillStyle='#f5f1dc';ctx.font='italic 700 76px Arial';ctx.textAlign='center';ctx.fillText(text,w/2,91)});const m=new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=rotation;scene.add(m)}
 sign('APEX  /  RIVIERA',25,1.5,0,8.4,-190.68,Math.PI);
 for(let i=0;i<8;i++){box(13,5.5,16,-31,2.7,-155+i*19,'white');box(14,.5,18,-31,5.7,-155+i*19,'dark');box(.1,2.1,12,-24.4,3.6,-155+i*19,'dark');box(.1,2.7,10,-24.35,1.6,-155+i*19,'metal')}
 sign('APEX GP    /    PIT LANE',140,1.2,-23.8,5.2,-83,Math.PI/2);
 // Tiered stand, open roof, orange seating and a low-cost instanced crowd.
 for(let k=0;k<8;k++){box(2,1,155,30+k*1.7,1+k*.72,-43,'stone');box(1.4,.15,154,30+k*1.7,1.57+k*.72,-43,k%2?'orange':'dark')}
 box(17,.35,160,37,10,-43,'white');for(let z=-115;z<40;z+=24)box(.3,10,.3,45,5,z,'metal');
 const crowd=new THREE.InstancedMesh(new THREE.BoxGeometry(.42,.8,.38),new THREE.MeshStandardMaterial({roughness:1}),640);let ci=0;
 for(let k=0;k<8;k++)for(let j=0;j<80;j++){dummy.position.set(30+k*1.7,2.05+k*.72,-117+j*1.86);dummy.rotation.set(0,0,0);dummy.updateMatrix();crowd.setMatrixAt(ci,dummy.matrix);crowd.setColorAt(ci,new THREE.Color().setHSL(rand(),.3,.22+rand()*.4));ci++}scene.add(crowd);
 // Sponsor boards facing the racing surface.
 for(let s=210;s<LENGTH;s+=150){const f=frame(s,WIDTH+5.55);sign(s%300<150?'APEX  //  PUSH THE LIMIT':'RIVIERA  GRAND PRIX',18,1.1,f.p.x,1,f.p.z,Math.atan2(f.tangent.x,f.tangent.z)+Math.PI/2)}
 // Palm trees are instanced; hundreds of leaves share a pair of draw calls.
 const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.18,.3,9,7),new THREE.MeshStandardMaterial({color:0x796b4c,roughness:1}),110);
 const leaves=new THREE.InstancedMesh(frondGeometry(),new THREE.MeshStandardMaterial({color:0x294d30,roughness:1,side:THREE.DoubleSide}),110*7);let ti=0,li=0;
 for(let s=0;s<LENGTH;s+=20){let side=rand()>.45?1:-1;const f=frame(s,side*(22+rand()*45));if(f.p.x<-50||f.p.x<65&&f.p.z<55&&f.p.z>-170)continue;let height=7+rand()*4;
 dummy.position.set(f.p.x,height*.5,f.p.z);dummy.rotation.set(.04,rand()*6,.05);dummy.scale.set(1,height/9,1);dummy.updateMatrix();trunks.setMatrixAt(ti++,dummy.matrix);
 for(let j=0;j<7;j++){const angle=j/7*Math.PI*2;dummy.position.set(f.p.x,height,f.p.z);dummy.rotation.set(0,angle,0);dummy.scale.set(.75+rand()*.2,.8+rand()*.4,1+rand()*.3);dummy.updateMatrix();leaves.setMatrixAt(li++,dummy.matrix)}}trunks.count=ti;leaves.count=li;scene.add(trunks,leaves);dummy.scale.set(1,1,1);
 // Terraced Riviera villas along the hillside.
 for(let i=0;i<35;i++){const x=420+rand()*200,z=-470+rand()*1000,h=5+rand()*9;box(12+rand()*12,h,14,x,h*.5,z,'white');box(22,.6,19,x,h+.2,z,'orange');box(20,2,3,x,1,z+10,'stone')}
 for(const key in staticParts){const geo=mergeGeometries(staticParts[key],false),m=new THREE.Mesh(geo,staticMats[key]);m.receiveShadow=true;m.castShadow=true;scene.add(m);staticParts[key].forEach(g=>g.dispose())}
 // Soft, layered mountain silhouettes create depth without large texture downloads.
 const mountainMats=[0x6a7b70,0x8b9c92,0xa5b5ae].map(c=>new THREE.MeshStandardMaterial({color:c,roughness:1,vertexColors:true}));
 for(let ring=0;ring<3;ring++){
   const geos=[];
   for(let j=0;j<11;j++){
    const angle=-Math.PI*.40+j/10*Math.PI*1.30,dist=1800+ring*750,h=220+rand()*310,rad=340+rand()*210;
    const geo=mountainGeometry(rad,h,rand()*50);geo.translate(170+Math.cos(angle)*dist,-14,Math.sin(angle)*dist);geos.push(geo);
   }
   scene.add(new THREE.Mesh(mergeGeometries(geos,false),mountainMats[ring]));geos.forEach(g=>g.dispose());
 }
 const sky=new THREE.Mesh(new THREE.SphereGeometry(5000,32,24),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{sunDirection:{value:new THREE.Vector3(-.65,.45,-.35).normalize()}},vertexShader:'varying vec3 vDir; void main(){vDir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 vDir; uniform vec3 sunDirection; void main(){vec3 d=normalize(vDir); float h=max(d.y,0.); vec3 col=mix(vec3(.76,.83,.84),vec3(.31,.55,.72),pow(h,.6));float sun=max(dot(d,sunDirection),0.);col+=vec3(.9,.65,.35)*pow(sun,64.)*.38;col=mix(col,vec3(1.,.96,.8),smoothstep(.9992,.99965,sun));float cloud=sin(d.x*13.+d.z*7.)*sin(d.z*22.-d.x*5.);col+=max(0.,cloud-.48)*.13*smoothstep(.08,.3,d.y)*(1.-smoothstep(.45,.65,d.y));gl_FragColor=vec4(col,1.);}'}));sky.frustumCulled=false;scene.add(sky);
 return {water,sky};
}
