import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

export function createCar(color, number=7) {
  const root = new THREE.Group(), parts={paint:[],carbon:[],metal:[],rubber:[],accent:[]};
  const paint = new THREE.MeshStandardMaterial({color,metalness:.48,roughness:.25});
  const materials={paint,carbon:new THREE.MeshStandardMaterial({color:0x111718,roughness:.54,metalness:.35}),metal:new THREE.MeshStandardMaterial({color:0xa6b2b1,metalness:.8,roughness:.32}),rubber:new THREE.MeshStandardMaterial({color:0x151719,roughness:.98}),accent:new THREE.MeshStandardMaterial({color:0xf7efd9,roughness:.4})};
  function part(geo, pos, mat='paint', rot=[0,0,0], scale=[1,1,1]) {
    geo.deleteAttribute('uv');
    geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...pos),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)),new THREE.Vector3(...scale)));
    parts[mat].push(geo.index ? geo.toNonIndexed() : geo);
  }
  function box(w,h,d,x,y,z,mat='paint',rot=[0,0,0]){part(new THREE.BoxGeometry(w,h,d),[x,y,z],mat,rot)}
  function rod(a,b,r,mat='carbon') {
    const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b), dir=end.clone().sub(start);
    const geo=new THREE.CylinderGeometry(r,r,dir.length(),8);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),dir.normalize()));
    part(geo,start.add(end).multiplyScalar(.5).toArray(),mat);
  }
  function shell(rings,mat='paint') {
    const verts=[], indices=[];
    rings.forEach(([z,w,h,y])=>verts.push(-w,y,z,w,y,z,w,y+h,z,-w,y+h,z));
    for(let k=0;k<rings.length-1;k++)for(let j=0;j<4;j++){let a=k*4+j,b=k*4+(j+1)%4,c=b+4,d=a+4;indices.push(a,b,d,b,c,d)}
    indices.push(0,2,1,0,3,2);let n=(rings.length-1)*4;indices.push(n,n+1,n+2,n,n+2,n+3);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(indices);g.computeVertexNormals();part(g,[0,0,0],mat);
  }
  box(1.75,.1,4.35,0,.19,-.2,'carbon');
  shell([[-2.15,.24,.35,.32],[-1.45,.42,.73,.3],[-.75,.39,.8,.3],[-.05,.33,.64,.3],[.55,.28,.39,.32],[1.7,.16,.23,.36],[2.55,.11,.14,.26]]);
  for(let side of [-1,1]){
    shell([[-1.65,.32,.31,.27],[-1.15,.33,.46,.28],[.15,.32,.45,.28],[.5,.18,.2,.3]]);
    const last=parts.paint.pop();last.translate(side*.59,0,0);parts.paint.push(last);
    box(.26,.25,.28,side*.62,.65,.25,'carbon',[.1,0,0]);
    box(.05,.28,1.15,side*1.06,.31,2.03,'paint');
    box(.06,.56,.76,side*.85,.88,-2.13,'paint');
    box(.08,.18,.7,side*.9,.32,-1.35,'carbon');
    for(let z of [-1.4,1.35]){
      part(new THREE.CylinderGeometry(.4,.4,.34,20),[side*.94,.43,z],'rubber',[0,0,Math.PI/2]);
      part(new THREE.CylinderGeometry(.25,.25,.355,12),[side*.94,.43,z],'carbon',[0,0,Math.PI/2]);
      part(new THREE.CylinderGeometry(.12,.12,.365,10),[side*.94,.43,z],'metal',[0,0,Math.PI/2]);
      part(new THREE.TorusGeometry(.32,.013,4,28),[side*1.118,.43,z],'accent',[0,Math.PI/2,0]);
      rod([side*.27,.55,z-.22],[side*.9,.43,z],.025);
      rod([side*.27,.24,z+.25],[side*.9,.43,z],.021);
      rod([side*.26,.55,z+.25],[side*.9,.43,z],.02);
    }
    box(.2,.11,.25,side*.58,.95,.53,'carbon');rod([side*.28,.88,.35],[side*.58,.95,.53],.018);
  }
  // Layered aerodynamic wings, diffuser and the characteristic open cockpit halo.
  for(let i=0;i<3;i++)box(2.12,.045,.22,0,.27+i*.065,2.24-i*.21,'carbon',[-.11,0,0]);
  box(1.7,.09,.62,0,1.23,-2.12,'paint',[.1,0,0]);box(1.65,.06,.33,0,1.06,-2.18,'carbon',[.2,0,0]);
  rod([0,.4,-1.65],[0,1.2,-2.1],.045,'metal');
  for(let x of [-.65,-.32,0,.32,.65])box(.045,.2,.6,x,.26,-2.2,'carbon',[.2,0,0]);
  part(new THREE.SphereGeometry(.34,16,10),[0,.88,-.42],'carbon',[0,0,0],[1,.3,1.65]);
  part(new THREE.SphereGeometry(.19,16,12),[0,1.05,-.55],'accent');
  part(new THREE.SphereGeometry(.194,16,8,0,Math.PI*2,.95,.5),[0,1.05,-.55],'carbon');
  const haloPath=new THREE.CatmullRomCurve3([new THREE.Vector3(-.35,1.04,-.9),new THREE.Vector3(-.38,1.17,-.4),new THREE.Vector3(-.25,1.18,.15),new THREE.Vector3(0,1.18,.39),new THREE.Vector3(.25,1.18,.15),new THREE.Vector3(.38,1.17,-.4),new THREE.Vector3(.35,1.04,-.9)]);
  part(new THREE.TubeGeometry(haloPath,24,.032,6,false),[0,0,0],'carbon');rod([0,.8,.43],[0,1.18,.39],.032);
  shell([[-1.4,.09,.75,.68],[-.95,.15,.85,.62],[-.7,.08,.4,.72]],'paint');
  box(.18,.22,.025,0,.61,-2.5,'carbon');
  for(const key in parts){
    const geo=mergeGeometries(parts[key],false);geo.computeBoundingSphere();
    const mesh=new THREE.Mesh(geo,materials[key]);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);
    parts[key].forEach(g=>g.dispose());
  }
  // Decals are generated locally, keeping the complete car asset tiny.
  const cv=document.createElement('canvas');cv.width=256;cv.height=128;const ctx=cv.getContext('2d');
  ctx.fillStyle='#f7f3df';ctx.font='italic 900 78px Arial';ctx.textAlign='center';ctx.fillText(String(number).padStart(2,'0'),128,84);
  const decal=new THREE.Mesh(new THREE.PlaneGeometry(.30,.18),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(cv),transparent:true,depthWrite:false}));
  decal.rotation.x=-Math.PI/2;decal.position.set(0,.617,1.05);root.add(decal);
  const logoCanvas=document.createElement('canvas');logoCanvas.width=512;logoCanvas.height=128;
  const logoCtx=logoCanvas.getContext('2d');logoCtx.fillStyle='#f5f1df';logoCtx.font='italic 900 95px Arial';logoCtx.textAlign='center';logoCtx.fillText('APEX',256,100);
  const logoMat=new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(logoCanvas),transparent:true,depthWrite:false,side:THREE.DoubleSide});
  const rearLogo=new THREE.Mesh(new THREE.PlaneGeometry(1.25,.34),logoMat);rearLogo.rotation.x=-Math.PI/2;rearLogo.position.set(0,1.30,-2.10);root.add(rearLogo);
  for(const side of [-1,1]){const sideLogo=new THREE.Mesh(new THREE.PlaneGeometry(.85,.22),logoMat);sideLogo.position.set(side*.93,.57,-.4);sideLogo.rotation.y=side*Math.PI/2;root.add(sideLogo)}
  root.userData.paint=paint;
  return root;
}
