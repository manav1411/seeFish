import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CityId } from '../model/types';
import './particle-map.css';

type Props = { city: CityId; count: number; baseline: number; onCityChange?: (id: CityId) => void };
// 1 is the current motion baseline. Increase this to make drift faster and farther.
const movement_factor = 1.5;
// Keep desktop detail, but avoid overdraw and slow startup on small screens.
const desktop_particle_count = 32000;
const mobile_particle_count = 16000;
const project = (lon: number, lat: number): [number, number] => [(lon - 134) * 2, (lat + 27) * 2.1];
const MAINLAND = [[113.15,-26.2],[113.8,-22.3],[114.2,-21.9],[114,-22.5],[115.5,-21],[117.5,-20.7],[119,-20],[121,-19],[122,-18],[122.5,-16.5],[123.7,-16.3],[123.6,-15.1],[124.5,-15.2],[125,-14],[126.6,-14],[127,-13.9],[128,-14.9],[129,-15],[129.6,-14],[130.7,-12.5],[131,-12.2],[132.4,-12.3],[132.9,-11.5],[134.3,-11.8],[135,-12.1],[136.5,-11.9],[136.9,-12.4],[136,-13.3],[135.6,-14.5],[136.6,-15.6],[138.2,-16.7],[139.6,-17.7],[140.9,-17.7],[141.5,-16],[141.5,-13.8],[142,-11],[142.5,-10.7],[143.2,-12.1],[143.7,-14.2],[145,-14.8],[145.7,-16.3],[146.1,-17.7],[147,-19],[148.8,-20.3],[149.8,-22.5],[150.8,-22.9],[152.7,-25.3],[153.2,-27.5],[153.6,-28.7],[153,-30.9],[152,-32.8],[151.2,-33.9],[150.6,-35],[150,-37.5],[147.8,-37.8],[146.4,-39.1],[145,-38.4],[144.8,-38],[143.4,-38.9],[141.5,-38.3],[140,-37.5],[139,-35.7],[138.5,-35.5],[138.1,-34.1],[137.8,-35.2],[136.9,-35.3],[137.5,-33],[136.6,-32.5],[135.9,-34.6],[135,-34.8],[134,-33],[132,-32],[129,-31.6],[126,-32.3],[124,-33],[123,-33.8],[120,-33.9],[118,-35],[116,-35],[115,-34],[115.5,-32],[114.5,-30]].map(([x,y]) => project(x,y));
const TASMANIA = [[144.7,-40.7],[146.5,-41],[148.2,-40.8],[148.4,-42.2],[147.2,-43.6],[146,-43.4],[145,-42]].map(([x,y]) => project(x,y));
const CITIES = [
  { id: 'perth', name: 'Perth', p: project(115.86,-31.95) }, { id:'adelaide', name:'Adelaide', p:project(138.6,-34.93) },
  { id:'melbourne', name:'Melbourne', p:project(144.96,-37.81) }, { id:'sydney', name:'Sydney', p:project(151.21,-33.87) },
  { id:'brisbane', name:'Brisbane', p:project(153.03,-27.47) }, { id:'canberra', name:'Canberra', p:project(149.13,-35.28) },
  { id:'darwin', name:'Darwin', p:project(130.84,-12.46) }, { id:'hobart', name:'Hobart', p:project(147.33,-42.88) },
] as const;
const inside = (x:number,y:number,p:[number,number][]) => { let yes=false; for(let i=0,j=p.length-1;i<p.length;j=i++){const [xi,yi]=p[i],[xj,yj]=p[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)yes=!yes;}return yes; };
const hash=(i:number)=>{const n=Math.sin(i*127.1+311.7)*43758.5453;return n-Math.floor(n);};
function particles(maxParticles=desktop_particle_count){const positions:number[]=[],ranks:number[]=[],sizes:number[]=[],phases:number[]=[],tones:number[]=[];for(let i=0;positions.length<maxParticles*3&&i<170000;i++){const x=hash(i*2)*86-44,y=hash(i*2+1)*73-37;if(!inside(x,y,MAINLAND)&&!inside(x,y,TASMANIA))continue;positions.push(x,y,(hash(i*3)-.5)*1.6);ranks.push(hash(i*7+22));sizes.push(.8+Math.pow(hash(i*5),3)*1.5);phases.push(hash(i*9)*Math.PI*2);tones.push(hash(i*11+4));}return{positions:new Float32Array(positions),ranks:new Float32Array(ranks),sizes:new Float32Array(sizes),phases:new Float32Array(phases),tones:new Float32Array(tones)};}
const vertexShader=`
attribute float aRank; attribute float aSize; attribute float aPhase; attribute float aTone;
uniform float uTime; uniform float uRatio; uniform float uDpr; uniform float uHover; uniform vec2 uPointer; uniform float uZoom; uniform float uSizeScale; uniform vec2 uRippleOrigin; uniform float uRippleAge; uniform float uColorShift;
varying float vLight; varying float vTone; varying float vColorShift;
void main(){
 vec3 p=position;
 float movementFactor=${movement_factor};
 float geo=p.x*.014+p.y*.009;
 float breathe=sin(uTime*.35*movementFactor+geo+aPhase*.4)*.28+sin(uTime*.22*movementFactor+geo*1.4+aPhase*.25)*.16;
 float current=sin(uTime*1.40*movementFactor+p.x*.11+aPhase)*.24+sin(uTime*.80*movementFactor+p.y*.17+aPhase*1.7)*.14;
 float wanderX=sin(uTime*(0.55+aPhase*.24)*movementFactor+aPhase*2.3)*.21;
 float wanderY=sin(uTime*(0.72+aPhase*.20)*movementFactor+aPhase*1.7)*.18;
 p.x+=(current+breathe*.8+wanderX)*movementFactor; p.y+=(cos(uTime*1.35*movementFactor+aPhase)*.32+sin(uTime*.85*movementFactor+p.x*.08)*.14+breathe+wanderY)*movementFactor;
 vec2 delta=p.xy-uPointer; float dist=length(delta); float radius=8.0/uZoom;
 float influence=exp(-dist*dist/(radius*radius))*uHover;
 vec2 direction=delta/max(dist,.1);
 p.xy+=direction*influence*2.2/uZoom;
 p.xy+=vec2(-direction.y,direction.x)*influence*.9/uZoom;
 vec2 rippleDelta=p.xy-uRippleOrigin; float rippleDist=length(rippleDelta); float rippleWave=exp(-pow((rippleDist-uRippleAge*18.0)/1.15,2.0))*exp(-uRippleAge*1.15)*step(0.0,uRippleAge);
 p.xy+=rippleDelta/max(rippleDist,.1)*rippleWave*.5;
 float isLit=uRatio<=0.0?0.0:(uRatio>=1.0?1.0:1.0-smoothstep(uRatio-.006,uRatio+.006,aRank));
 float shimmer=.055*sin(uTime*.72+aPhase*1.9+p.x*.14)+.035*sin(uTime*.39+aPhase+p.y*.19);
 float idlePulse=max(0.0,sin(uTime*.18+aPhase*6.28+p.x*.05))*max(0.0,sin(uTime*.11+aPhase*4.71))*.04*(1.0-isLit);
 vLight=isLit*(.45+.3*sin(aPhase+uTime*.15)*sin(aPhase+uTime*.15)+influence*.32+shimmer+rippleWave*.42)+idlePulse;
 vTone=aTone; vColorShift=uColorShift;
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=aSize*uDpr*3.25*uSizeScale*min(1.5,sqrt(uZoom))*(1.0+(.14*(1.0-uRatio)));
}`;
const fragmentShader=`varying float vLight; varying float vTone; varying float vColorShift; void main(){float r=length(gl_PointCoord-.5);float core=exp(-r*r*52.0);float halo=exp(-r*r*12.0);vec3 pearl=vec3(.96,.97,1.0);vec3 lilac=vec3(.88,.86,1.0);vec3 ice=vec3(.86,.96,1.0);vec3 peach=vec3(1.0,.93,.88);vec3 warm=vec3(.012,-.004,-.010)*vColorShift;vec3 color=vTone<.26?pearl:(vTone<.52?lilac:(vTone<.78?ice:peach));gl_FragColor=vec4(color+warm,(core+.27*halo)*vLight);}`;

export default function ParticleMap({city,count,baseline,onCityChange}:Props){
 const mount=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const previousCity=useRef(city);
 const [labelsReady,setLabelsReady]=useState(city==='australia');
 const latest=useRef({city,ratio:count<=0?0:Math.min(1,Math.sqrt(count/Math.max(1,baseline)))});
 latest.current={city,ratio:count<=0?0:Math.min(1,Math.sqrt(count/Math.max(1,baseline)))};
 const [aspect,setAspect]=useState(1.2);
 const invalidate=useRef<()=>void>(()=>{});
 useEffect(()=>{invalidate.current();},[city,count,baseline]);
 useEffect(()=>{
  if(previousCity.current===city)return;
  previousCity.current=city;
  setLabelsReady(false);
  const delay=matchMedia('(prefers-reduced-motion: reduce)').matches?0:(city==='australia'?1100:750);
  const timer=window.setTimeout(()=>setLabelsReady(true),delay);
  return()=>window.clearTimeout(timer);
 },[city]);
 useEffect(()=>{
  const host=mount.current, fallback=canvas.current;if(!host||!fallback)return;
  const smallScreen=matchMedia('(max-width: 760px)').matches; const data=particles(smallScreen?mobile_particle_count:desktop_particle_count); const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)'); let reduced=reducedQuery.matches;
  let renderer:THREE.WebGLRenderer|null=null;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'high-performance'});}catch{/* Canvas fallback below. */}
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-55,55,45,-45,.1,200);camera.position.z=100;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('aRank',new THREE.BufferAttribute(data.ranks,1));geometry.setAttribute('aSize',new THREE.BufferAttribute(data.sizes,1));geometry.setAttribute('aPhase',new THREE.BufferAttribute(data.phases,1));geometry.setAttribute('aTone',new THREE.BufferAttribute(data.tones,1));
  const uniforms={uTime:{value:0},uRatio:{value:latest.current.ratio},uDpr:{value:1},uHover:{value:0},uPointer:{value:new THREE.Vector2(999,999)},uZoom:{value:1},uSizeScale:{value:1},uRippleOrigin:{value:new THREE.Vector2(999,999)},uRippleAge:{value:99},uColorShift:{value:0}};
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  scene.add(new THREE.Points(geometry,material));
  const coastMaterial=new THREE.LineBasicMaterial({color:0x77708f,transparent:true,opacity:.48,depthWrite:false});
  const coastlines=[MAINLAND,TASMANIA].map(points=>{const lineGeometry=new THREE.BufferGeometry().setFromPoints(points.map(([x,y])=>new THREE.Vector3(x,y,1)));const line=new THREE.LineLoop(lineGeometry,coastMaterial);scene.add(line);return lineGeometry;});
  let width=1,height=1,halfHeight=45,raf=0,last=0,visible=true,lastInteraction=0,nextAutoRipple=15;
  const mouse={x:0,y:0,active:false}; let centerX=0,centerY=0,zoom=1;
  const context=renderer?null:fallback.getContext('2d');
  if(renderer){renderer.setClearColor(0x060708,0);renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);fallback.hidden=true;}
  const resize=()=>{const r=host.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);const a=width/height;setAspect(a);halfHeight=Math.max(43,46/a);camera.left=-halfHeight*a;camera.right=halfHeight*a;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();const dpr=Math.min(devicePixelRatio||1,2);uniforms.uDpr.value=dpr;uniforms.uSizeScale.value=Math.max(.27,Math.min(1,width/720));if(renderer){renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);}else{fallback.width=width*dpr;fallback.height=height*dpr;}};
  const move=(e:PointerEvent)=>{const r=host.getBoundingClientRect();mouse.x=(e.clientX-r.left)/width*2-1;mouse.y=1-(e.clientY-r.top)/height*2;mouse.active=true;lastInteraction=performance.now()/1000;};const leave=()=>{mouse.active=false;};
  const ripple=(e:MouseEvent)=>{if(reduced)return;const r=host.getBoundingClientRect();const px=(e.clientX-r.left)/width*2-1;const py=1-(e.clientY-r.top)/height*2;uniforms.uRippleOrigin.value.set(centerX+px*halfHeight*width/height/zoom,centerY+py*halfHeight/zoom);uniforms.uRippleAge.value=0;lastInteraction=performance.now()/1000;resume();};
  const draw=(now:number)=>{
   if(document.hidden||!visible){raf=0;return;} const dt=Math.min((now-last)/1000||.016,.05);last=now;
   const selected=CITIES.find(c=>c.id===latest.current.city);const targetX=selected?.p[0]||0,targetY=selected?.p[1]||0,targetZoom=selected?3.6:1;const ease=reduced?1:1-Math.exp(-dt*4.2);
   centerX+=(targetX-centerX)*ease;centerY+=(targetY-centerY)*ease;zoom+=(targetZoom-zoom)*ease;
   camera.position.x=centerX;camera.position.y=centerY;camera.zoom=zoom;camera.updateProjectionMatrix();
   uniforms.uZoom.value=zoom;uniforms.uRatio.value+=(latest.current.ratio-uniforms.uRatio.value)*ease;uniforms.uTime.value=reduced?0:now/1000;uniforms.uRippleAge.value=Math.min(99,uniforms.uRippleAge.value+dt);const _ns=now/1000;uniforms.uColorShift.value=Math.sin(_ns*.0785)*.5+.5;if(!reduced&&!mouse.active&&_ns>nextAutoRipple&&_ns-lastInteraction>8){let ax=0,ay=0;if(zoom>1.5){ax=centerX+(Math.random()-.5)*5;ay=centerY+(Math.random()-.5)*5;}else{const spts=[[-4,-9],[11,-21],[23,-13],[33,-9],[19,2],[-13,5],[29,-25],[-7,-19],[6,-4]];const s=spts[Math.floor(Math.random()*spts.length)];ax=s[0];ay=s[1];}uniforms.uRippleOrigin.value.set(ax,ay);uniforms.uRippleAge.value=0;nextAutoRipple=_ns+13+Math.random()*7;}
   const share=uniforms.uRatio.value*uniforms.uRatio.value;coastMaterial.opacity=Math.max(0,Math.min(.48,(.02-share)/.018*.48));
   uniforms.uHover.value+=((mouse.active&&!reduced?1:0)-uniforms.uHover.value)*ease;
   uniforms.uPointer.value.set(centerX+mouse.x*halfHeight*width/height/zoom,centerY+mouse.y*halfHeight/zoom);
   if(renderer)renderer.render(scene,camera);
   else if(context){const dpr=Math.min(devicePixelRatio||1,2);context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,width,height);const sx=zoom/(halfHeight*width/height),sy=zoom/halfHeight;const screen=(px:number,py:number)=>[ (px-centerX)*sx*width/2+width/2, height/2-(py-centerY)*sy*height/2 ];const share=uniforms.uRatio.value*uniforms.uRatio.value;const coastOpacity=Math.max(0,Math.min(.48,(.02-share)/.018*.48));context.strokeStyle=`rgba(119,112,143,${coastOpacity})`;context.lineWidth=.8;for(const outline of [MAINLAND,TASMANIA]){context.beginPath();outline.forEach(([px,py],index)=>{const [x,y]=screen(px,py);if(index===0)context.moveTo(x,y);else context.lineTo(x,y);});context.closePath();context.stroke();}for(let i=0;i<data.ranks.length;i++){if(data.ranks[i]>=uniforms.uRatio.value)continue;const phase=data.phases[i],mf=movement_factor,px=data.positions[i*3],py=data.positions[i*3+1],geo=px*.014+py*.009,breathe=Math.sin(now*.00035*mf+geo+phase*.4)*.28+Math.sin(now*.00022*mf+geo*1.4+phase*.25)*.16,current=Math.sin(now*.00140*mf+px*.11+phase)*.24+Math.sin(now*.00080*mf+py*.17+phase*1.7)*.14,wanderX=Math.sin(now*(.00055+phase*.00024)*mf+phase*2.3)*.21,wanderY=Math.sin(now*(.00072+phase*.00020)*mf+phase*1.7)*.18,baseX=px+(current+breathe*.8+wanderX)*mf,baseY=py+(Math.cos(now*.00135*mf+phase)*.32+Math.sin(now*.00085*mf+px*.08)*.14+breathe+wanderY)*mf;const dx=baseX-uniforms.uRippleOrigin.value.x,dy=baseY-uniforms.uRippleOrigin.value.y,dist=Math.hypot(dx,dy),wave=Math.exp(-Math.pow((dist-uniforms.uRippleAge.value*18)/1.15,2))*Math.exp(-uniforms.uRippleAge.value*1.15);const [x,y]=screen(baseX+dx/Math.max(dist,.1)*wave*.5,baseY+dy/Math.max(dist,.1)*wave*.5);if(x<0||x>width||y<0||y>height)continue;const tone=data.tones[i];context.fillStyle=tone<.26?'rgba(245,246,255,.82)':tone<.52?'rgba(225,220,255,.82)':tone<.78?'rgba(220,242,255,.82)':'rgba(255,235,220,.82)';const size=data.sizes[i]*(1+.14*(1-uniforms.uRatio.value)+wave*.42);context.shadowBlur=4+wave*8;context.shadowColor=context.fillStyle;context.fillRect(x,y,size*.6,size*.6);}context.shadowBlur=0;}
   raf=reduced?0:requestAnimationFrame(draw);
  };
  const resume=()=>{if(!raf&&!document.hidden&&visible)raf=requestAnimationFrame(draw);};
  const resizeObserver=new ResizeObserver(()=>{resize();resume();});resizeObserver.observe(host);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)resume();});intersection.observe(host);
  invalidate.current=resume;
  const motion=()=>{reduced=reducedQuery.matches;resume();};reducedQuery.addEventListener('change',motion);
 host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);host.addEventListener('click',ripple);document.addEventListener('visibilitychange',resume);resize();raf=requestAnimationFrame(draw);
 return()=>{invalidate.current=()=>{};cancelAnimationFrame(raf);resizeObserver.disconnect();intersection.disconnect();reducedQuery.removeEventListener('change',motion);host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);host.removeEventListener('click',ripple);document.removeEventListener('visibilitychange',resume);geometry.dispose();material.dispose();coastlines.forEach(g=>g.dispose());coastMaterial.dispose();renderer?.dispose();renderer?.domElement.remove();};
 },[]);
 const halfHeight=Math.max(43,46/aspect);
 return <div className={`particle-map ${city==='australia'?'is-national':'is-zoomed'} ${labelsReady?'labels-ready':''}`} aria-label={`Particle illustration of ${city === 'australia' ? 'Australia' : cityName(city)}. Fewer illuminated particles represent a smaller matching pool; dots are not individual locations.`}><div ref={mount} className="particle-map__render"><canvas ref={canvas} aria-hidden="true" /></div>{onCityChange&&<div className="particle-map__cities">{CITIES.map(c=><button key={c.id} tabIndex={city==='australia'&&labelsReady?0:-1} aria-hidden={city!=='australia'||!labelsReady} aria-label={`Explore ${c.name}`} onClick={()=>onCityChange(c.id)} style={{left:`${50+c.p[0]/(halfHeight*aspect)*50}%`,top:`${50-c.p[1]/halfHeight*50}%`}}><i/>{c.name}</button>)}</div>}{city!=='australia'&&<span className="particle-map__focus-label"><i/>{cityName(city)}</span>}</div>;
}
function cityName(id:CityId){return CITIES.find(c=>c.id===id)?.name||id;}
