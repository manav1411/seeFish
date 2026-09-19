import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { CityId } from '../model/types';
import './particle-map.css';

type Props = { city: CityId; count: number; baseline: number; onCityChange?: (id: CityId) => void };
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
function particles(){const positions:number[]=[],ranks:number[]=[],sizes:number[]=[],phases:number[]=[];for(let i=0;positions.length<96000&&i<170000;i++){const x=hash(i*2)*86-44,y=hash(i*2+1)*73-37;if(!inside(x,y,MAINLAND)&&!inside(x,y,TASMANIA))continue;positions.push(x,y,(hash(i*3)-.5)*1.6);ranks.push(hash(i*7+22));sizes.push(.8+Math.pow(hash(i*5),3)*1.5);phases.push(hash(i*9)*Math.PI*2);}return{positions:new Float32Array(positions),ranks:new Float32Array(ranks),sizes:new Float32Array(sizes),phases:new Float32Array(phases)};}
const vertexShader=`
attribute float aRank; attribute float aSize; attribute float aPhase;
uniform float uTime; uniform float uRatio; uniform float uDpr; uniform float uHover; uniform vec2 uPointer; uniform float uZoom; uniform float uSizeScale;
varying float vLight;
void main(){
 vec3 p=position;
 p.x+=sin(uTime*.35+aPhase)*.075; p.y+=cos(uTime*.29+aPhase)*.075;
 vec2 delta=p.xy-uPointer; float dist=length(delta); float radius=8.0/uZoom;
 float influence=exp(-dist*dist/(radius*radius))*uHover;
 vec2 direction=delta/max(dist,.1);
 p.xy+=direction*influence*2.2/uZoom;
 p.xy+=vec2(-direction.y,direction.x)*influence*.9/uZoom;
 float isLit=uRatio<=0.0?0.0:(uRatio>=1.0?1.0:1.0-smoothstep(uRatio-.006,uRatio+.006,aRank));
 vLight=.018+isLit*(.45+.3*sin(aPhase+uTime*.15)*sin(aPhase+uTime*.15))+influence*.32*isLit;
 vec4 mv=modelViewMatrix*vec4(p,1.0);
 gl_Position=projectionMatrix*mv;
 gl_PointSize=aSize*uDpr*3.1*uSizeScale*min(1.5,sqrt(uZoom));
}`;
const fragmentShader=`varying float vLight; void main(){float r=length(gl_PointCoord-.5);float glow=exp(-r*r*44.0)+.19*exp(-r*r*9.0);gl_FragColor=vec4(vec3(.93,.95,1.0),glow*vLight);}`;

export default function ParticleMap({city,count,baseline,onCityChange}:Props){
 const mount=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const latest=useRef({city,ratio:Math.max(0,Math.min(1,count/Math.max(1,baseline)))});
 latest.current={city,ratio:Math.max(0,Math.min(1,count/Math.max(1,baseline)))};
 const [aspect,setAspect]=useState(1.2);
 const invalidate=useRef<()=>void>(()=>{});
 useEffect(()=>{invalidate.current();},[city,count,baseline]);
 useEffect(()=>{
  const host=mount.current, fallback=canvas.current;if(!host||!fallback)return;
  const data=particles(); const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)'); let reduced=reducedQuery.matches;
  let renderer:THREE.WebGLRenderer|null=null;try{renderer=new THREE.WebGLRenderer({alpha:true,antialias:false,powerPreference:'high-performance'});}catch{/* Canvas fallback below. */}
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-55,55,45,-45,.1,200);camera.position.z=100;
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(data.positions,3));geometry.setAttribute('aRank',new THREE.BufferAttribute(data.ranks,1));geometry.setAttribute('aSize',new THREE.BufferAttribute(data.sizes,1));geometry.setAttribute('aPhase',new THREE.BufferAttribute(data.phases,1));
  const uniforms={uTime:{value:0},uRatio:{value:latest.current.ratio},uDpr:{value:1},uHover:{value:0},uPointer:{value:new THREE.Vector2(999,999)},uZoom:{value:1},uSizeScale:{value:1}};
  const material=new THREE.ShaderMaterial({vertexShader,fragmentShader,uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  scene.add(new THREE.Points(geometry,material));
  let width=1,height=1,halfHeight=45,raf=0,last=0,visible=true;
  const mouse={x:0,y:0,active:false}; let centerX=0,centerY=0,zoom=1;
  const context=renderer?null:fallback.getContext('2d');
  if(renderer){renderer.setClearColor(0x060708,0);renderer.domElement.setAttribute('aria-hidden','true');host.appendChild(renderer.domElement);fallback.hidden=true;}
  const resize=()=>{const r=host.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);const a=width/height;setAspect(a);halfHeight=Math.max(43,46/a);camera.left=-halfHeight*a;camera.right=halfHeight*a;camera.top=halfHeight;camera.bottom=-halfHeight;camera.updateProjectionMatrix();const dpr=Math.min(devicePixelRatio||1,2);uniforms.uDpr.value=dpr;uniforms.uSizeScale.value=Math.max(.27,Math.min(1,width/720));if(renderer){renderer.setPixelRatio(dpr);renderer.setSize(width,height,false);}else{fallback.width=width*dpr;fallback.height=height*dpr;}};
  const move=(e:PointerEvent)=>{const r=host.getBoundingClientRect();mouse.x=(e.clientX-r.left)/width*2-1;mouse.y=1-(e.clientY-r.top)/height*2;mouse.active=true;};const leave=()=>{mouse.active=false;};
  const draw=(now:number)=>{
   if(document.hidden||!visible){raf=0;return;} const dt=Math.min((now-last)/1000||.016,.05);last=now;
   const selected=CITIES.find(c=>c.id===latest.current.city);const targetX=selected?.p[0]||0,targetY=selected?.p[1]||0,targetZoom=selected?3.6:1;const ease=reduced?1:1-Math.exp(-dt*4.2);
   centerX+=(targetX-centerX)*ease;centerY+=(targetY-centerY)*ease;zoom+=(targetZoom-zoom)*ease;
   camera.position.x=centerX;camera.position.y=centerY;camera.zoom=zoom;camera.updateProjectionMatrix();
   uniforms.uZoom.value=zoom;uniforms.uRatio.value+=(latest.current.ratio-uniforms.uRatio.value)*ease;uniforms.uTime.value=reduced?0:now/1000;
   uniforms.uHover.value+=((mouse.active&&!reduced?1:0)-uniforms.uHover.value)*ease;
   uniforms.uPointer.value.set(centerX+mouse.x*halfHeight*width/height/zoom,centerY+mouse.y*halfHeight/zoom);
   if(renderer)renderer.render(scene,camera);
   else if(context){const dpr=Math.min(devicePixelRatio||1,2);context.setTransform(dpr,0,0,dpr,0,0);context.clearRect(0,0,width,height);for(let i=0;i<data.ranks.length;i++){const x=(data.positions[i*3]-centerX)*zoom/(halfHeight*width/height)*width/2+width/2,y=height/2-(data.positions[i*3+1]-centerY)*zoom/halfHeight*height/2;if(x<0||x>width||y<0||y>height)continue;context.fillStyle=data.ranks[i]<uniforms.uRatio.value?'rgba(230,234,255,.7)':'rgba(150,155,180,.035)';context.fillRect(x,y,data.sizes[i]*.6,data.sizes[i]*.6);}}
   raf=reduced?0:requestAnimationFrame(draw);
  };
  const resume=()=>{if(!raf&&!document.hidden&&visible)raf=requestAnimationFrame(draw);};
  const resizeObserver=new ResizeObserver(()=>{resize();resume();});resizeObserver.observe(host);
  const intersection=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;if(visible)resume();});intersection.observe(host);
  invalidate.current=resume;
  const motion=()=>{reduced=reducedQuery.matches;resume();};reducedQuery.addEventListener('change',motion);
  host.addEventListener('pointermove',move);host.addEventListener('pointerleave',leave);document.addEventListener('visibilitychange',resume);resize();raf=requestAnimationFrame(draw);
  return()=>{invalidate.current=()=>{};cancelAnimationFrame(raf);resizeObserver.disconnect();intersection.disconnect();reducedQuery.removeEventListener('change',motion);host.removeEventListener('pointermove',move);host.removeEventListener('pointerleave',leave);document.removeEventListener('visibilitychange',resume);geometry.dispose();material.dispose();renderer?.dispose();renderer?.domElement.remove();};
 },[]);
 const halfHeight=Math.max(43,46/aspect);
 return <div className={`particle-map ${city==='australia'?'is-national':'is-zoomed'}`} aria-label={`Particle illustration of ${city === 'australia' ? 'Australia' : cityName(city)}. Fewer illuminated particles represent a smaller matching pool; dots are not individual locations.`}><div ref={mount} className="particle-map__render"><canvas ref={canvas} aria-hidden="true" /></div>{onCityChange&&<div className="particle-map__cities">{CITIES.filter(c=>c.id!=='canberra'&&c.id!=='hobart').map(c=><button key={c.id} tabIndex={city==='australia'?0:-1} aria-hidden={city!=='australia'} aria-label={`Explore ${c.name}`} onClick={()=>onCityChange(c.id)} style={{left:`${50+c.p[0]/(halfHeight*aspect)*50}%`,top:`${50-c.p[1]/halfHeight*50}%`}}><i/>{c.name}</button>)}</div>}</div>;
}
function cityName(id:CityId){return CITIES.find(c=>c.id===id)?.name||id;}
