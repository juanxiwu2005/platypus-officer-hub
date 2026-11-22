import "../../styles/quest-room.css"
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react"
import { DEFAULT_CAMERA, mountRoom, nearestProp, type RoomRenderer } from "./room3d"
import { footprint, moveProp, PROP_NAMES, type PropKind, type VenueLayout } from "./venue"
import { prefersReducedMotion, tokenMs } from "../../lib/motion"
export interface RoomViewProps { layout: VenueLayout; selected: string | null; tool: PropKind | null; onSelect: (id: string | null) => void; onMove: (id: string, x: number, z: number) => void; onPlace: (kind: PropKind, x: number, z: number) => void; arrivals?: boolean }
/** Strong-planner geometry integration. Every action has a DOM/floor-plan equivalent. */
export default function RoomView({layout,selected,tool,onSelect,onMove,onPlace,arrivals=false}:RoomViewProps){
  const canvas=useRef<HTMLCanvasElement>(null),renderer=useRef<RoomRenderer|null>(null),drawRef=useRef<()=>void>(()=>{})
  const [available,setAvailable]=useState<boolean|null>(null),[mode,setMode]=useState<"3d"|"plan">("3d"),[camera,setCamera]=useState(DEFAULT_CAMERA),[screen,setScreen]=useState<[number,number]>([0,0]),[cursor,setCursor]=useState(0),[guests,setGuests]=useState(0)
  const drag=useRef<{id:string|null;x:number;y:number;floor:{x:number;z:number};moved:boolean;preview:VenueLayout|null}|null>(null)
  const announce=useRef<HTMLParagraphElement>(null)
  const say=(text:string)=>{if(announce.current)announce.current.textContent=text}
  drawRef.current=()=>{if(renderer.current&&mode==="3d"){renderer.current.draw(drag.current?.preview??layout,camera,selected,guests);setScreen(renderer.current.project(6,.25,1.85))}}
  useEffect(()=>{
    if(!canvas.current)return
    const engine=mountRoom(canvas.current);renderer.current=engine;setAvailable(!!engine)
    if(!engine){setMode("plan");return}
    const observer=new ResizeObserver(()=>drawRef.current());observer.observe(canvas.current)
    const lost=(event:Event)=>{event.preventDefault();setAvailable(false);setMode("plan");say("3D paused. The floor plan has the same controls.")}
    const element=canvas.current;element.addEventListener("webglcontextlost",lost);drawRef.current()
    return()=>{observer.disconnect();element.removeEventListener("webglcontextlost",lost);engine.dispose();renderer.current=null}
  },[])
  useEffect(()=>{drawRef.current()},[layout,camera,selected,mode,guests])
  useEffect(()=>{const colors=window.matchMedia("(prefers-color-scheme: dark)"),redraw=()=>drawRef.current();colors.addEventListener("change",redraw);const observer=new MutationObserver(redraw);observer.observe(document.documentElement,{attributes:true,attributeFilter:["data-theme"]});return()=>{colors.removeEventListener("change",redraw);observer.disconnect()}},[])
  useEffect(()=>{
    if(!arrivals){setGuests(0);return}
    if(prefersReducedMotion()){setGuests(layout.headcount);return}
    const start=performance.now(),duration=tokenMs("--quest-arrival-dur",5000);let frame=0
    const step=()=>{const progress=Math.min(1,(performance.now()-start)/duration);setGuests(Math.ceil(progress*layout.headcount));if(progress<1)frame=requestAnimationFrame(step)}
    frame=requestAnimationFrame(step);return()=>cancelAnimationFrame(frame)
  },[arrivals,layout.headcount])
  const point=(event:PointerEvent<HTMLCanvasElement>)=>{const r=event.currentTarget.getBoundingClientRect();return{x:event.clientX-r.left,y:event.clientY-r.top}}
  const down=(event:PointerEvent<HTMLCanvasElement>)=>{
    if(arrivals||event.button!==0||!renderer.current)return
    const p=point(event),hit=renderer.current.hitTest(layout,p.x,p.y)
    drag.current={id:tool?null:hit?.id??null,x:p.x,y:p.y,floor:renderer.current.floorAt(p.x,p.y),moved:false,preview:null}
    if(hit&&!tool)onSelect(hit.id)
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const motion=(event:PointerEvent<HTMLCanvasElement>)=>{
    const d=drag.current;if(!d||!d.id||!renderer.current)return
    const p=point(event);if(Math.hypot(p.x-d.x,p.y-d.y)<8&&!d.moved)return
    d.moved=true;const f=renderer.current.floorAt(p.x,p.y),item=layout.items.find(i=>i.id===d.id)!
    d.preview=moveProp(layout,d.id,item.x+f.x-d.floor.x,item.z+f.z-d.floor.z);renderer.current.draw(d.preview,camera,d.id,guests)
  }
  const up=(event:PointerEvent<HTMLCanvasElement>)=>{
    const d=drag.current;drag.current=null;if(!d||!renderer.current)return
    const p=point(event),f=renderer.current.floorAt(p.x,p.y)
    if(d.preview&&d.id){const item=d.preview.items.find(i=>i.id===d.id)!;onMove(d.id,item.x,item.z);say(`${PROP_NAMES[item.kind]} moved.`)}
    else if(tool)onPlace(tool,f.x,f.z)
    else if(!d.id&&selected)onMove(selected,f.x,f.z)
    else if(d.id)onSelect(d.id)
    drawRef.current();event.currentTarget.releasePointerCapture(event.pointerId)
  }
  const cancel=()=>{drag.current=null;drawRef.current();say("Move cancelled.")}
  useEffect(()=>{const stop=(event:globalThis.KeyboardEvent)=>{if(event.key==="Escape"&&drag.current){cancel()}};window.addEventListener("keydown",stop);return()=>window.removeEventListener("keydown",stop)})
  const place=(x:number,z:number)=>{
    if(arrivals)return
    if(tool){onPlace(tool,x,z);return}
    if(selected){onMove(selected,x,z);say("Furniture moved.");return}
    const item=nearestProp(layout,x+.5,z+.5);if(item)onSelect(item.id)
  }
  const navigate=(event:KeyboardEvent<HTMLButtonElement>,index:number)=>{
    const delta:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-12,ArrowDown:12}
    if(event.key==="Escape"){onSelect(null);say("Selection cancelled.");return}
    const next=event.key==="Home"?0:event.key==="End"?119:event.key in delta?Math.max(0,Math.min(119,index+delta[event.key])):null
    if(next!==null){event.preventDefault();setCursor(next);document.querySelector<HTMLButtonElement>(`[data-floor-cell="${next}"]`)?.focus()}
  }
  return <div className="sample-room-view">
    <div className="sample-view-tools" role="group" aria-label="Room view"><button type="button" aria-pressed={mode==="3d"} disabled={available===false} onClick={()=>setMode("3d")}>3D</button><button type="button" aria-pressed={mode==="plan"} onClick={()=>setMode("plan")}>Floor plan</button><button type="button" aria-label="Rotate left" onClick={()=>setCamera(c=>({...c,yaw:c.yaw-.2}))}><span aria-hidden="true">↶</span></button><button type="button" aria-label="Rotate right" onClick={()=>setCamera(c=>({...c,yaw:c.yaw+.2}))}><span aria-hidden="true">↷</span></button><button type="button" aria-label="Zoom in" onClick={()=>setCamera(c=>({...c,zoom:Math.min(1.8,c.zoom+.1)}))}><span aria-hidden="true">＋</span></button><button type="button" aria-label="Zoom out" onClick={()=>setCamera(c=>({...c,zoom:Math.max(.6,c.zoom-.1)}))}><span aria-hidden="true">−</span></button></div>
    <div className="sample-model-frame" hidden={mode!=="3d"}>
      <canvas ref={canvas} role="img" data-renderer={available?"webgl":"fallback"} aria-label="Three-dimensional room model. Drag furniture or use the floor plan and furniture controls." onPointerDown={down} onPointerMove={motion} onPointerUp={up} onPointerCancel={cancel}/>
      <span className="sample-screen-name" style={{left:screen[0],top:screen[1]} as CSSProperties}>{layout.name}</span>
      <span className="sample-room-caption">EXIT ← · Projection wall · → EXIT</span>
    </div>
    {mode==="plan"&&<div className="sample-floor" role="grid" aria-label="Room floor plan. One square is 36 inches." aria-rowcount={10} aria-colcount={12}>{Array.from({length:10},(_,z)=><div className="sample-floor-row" role="row" key={z}>{Array.from({length:12},(_,x)=>{const item=layout.items.find(i=>{const r=footprint(i);return x+.5>=r.x&&x+.5<r.x+r.w&&z+.5>=r.z&&z+.5<r.z+r.d});return <button role="gridcell" type="button" key={x} data-floor-cell={z*12+x} tabIndex={cursor===z*12+x?0:-1} aria-selected={!!item&&item.id===selected} aria-label={`Column ${x+1}, row ${z+1}${item?`, ${PROP_NAMES[item.kind]}`:""}. ${tool?"Place "+PROP_NAMES[tool]:selected?"Move selected furniture":"Select furniture"}.`} disabled={arrivals} onKeyDown={e=>navigate(e,z*12+x)} onClick={()=>{setCursor(z*12+x);place(x,z)}} className={`sample-floor-cell${item?" has-prop":""}${item?.id===selected?" is-selected":""}${(x===0||x===11||x===5||x===6||z>=8)?" is-aisle":""}`}><span aria-hidden="true">{item?item.kind==="row"?"▦":item.kind==="accessible"?"♿":item.kind==="cover"?"═":"●":""}</span></button>})}</div>)}</div>}
    {available===false&&<p className="sample-small" role="status">3D unavailable. The floor plan has the same controls.</p>}
    <p className="sr-only" ref={announce} aria-live="polite"/>
  </div>
}
