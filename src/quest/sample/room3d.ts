import { checkVenue, footprint, propHeight, type VenueItem, type VenueLayout } from "./venue"
export interface RoomCamera { yaw: number; pitch: number; zoom: number }
export const DEFAULT_CAMERA: RoomCamera = { yaw: .62, pitch: .8, zoom: 1 }
export interface RoomRenderer { draw: (layout: VenueLayout, camera: RoomCamera, selected: string | null, guests?: number) => void; project: (x: number, z: number, y?: number) => [number, number]; floorAt: (x: number, y: number) => { x: number; z: number }; hitTest: (layout: VenueLayout, x: number, y: number) => VenueItem | null; dispose: () => void }
type Color = [number, number, number]
/** Tiny local WebGL mesh renderer. Orthographic camera transforms actual 3D vertices; no game engine or dependency. */
export function mountRoom(canvas: HTMLCanvasElement): RoomRenderer | null {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false, preserveDrawingBuffer: true })
  if (!gl) return null
  const program = gl.createProgram(), buffer = gl.createBuffer(), shaders: WebGLShader[] = []
  if (!program || !buffer) return null
  try {
    for (const [type, code] of [[gl.VERTEX_SHADER, `attribute vec3 p;attribute vec3 c;uniform vec3 right;uniform vec3 up;uniform vec3 depth;uniform vec2 scale;uniform vec3 center;varying vec3 color;void main(){vec3 q=p-center;gl_Position=vec4(dot(q,right)*scale.x,dot(q,up)*scale.y,-dot(q,depth)/30.,1.);color=c;}`], [gl.FRAGMENT_SHADER, `precision mediump float;varying vec3 color;void main(){gl_FragColor=vec4(color,1.);}`]] as const) {
      const shader = gl.createShader(type); if (!shader) throw new Error("Shader unavailable")
      shaders.push(shader); gl.shaderSource(shader, code); gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error("Room shader failed")
      gl.attachShader(program, shader)
    }
    gl.linkProgram(program); if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Room program failed")
  } catch { gl.deleteProgram(program); gl.deleteBuffer(buffer); shaders.forEach(s => gl.deleteShader(s)); return null }
  const p = gl.getAttribLocation(program, "p"), c = gl.getAttribLocation(program, "c")
  const uniforms = Object.fromEntries(["right", "up", "depth", "scale", "center"].map(k => [k, gl.getUniformLocation(program, k)]))
  const center = [7,0,5]
  let camera = DEFAULT_CAMERA, width = 1, height = 1, unit = 1, vertices: number[] = []
  const color = (token: string): Color => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
    if (/^#[0-9a-f]{6}$/i.test(value)) return [1, 3, 5].map(i => parseInt(value.slice(i, i + 2), 16) / 255) as Color
    const numbers = value.match(/[\d.]+/g)?.slice(0, 3).map(n => Number(n) / 255)
    return numbers?.length === 3 ? numbers as Color : [0, 0, 0]
  }
  const triangle = (a: number[], b: number[], d: number[], col: Color, shade = 1) => { for (const v of [a, b, d]) vertices.push(...v, ...col.map(n => Math.min(1, n * shade))) }
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, col: Color) => {
    const vs = [[x,y,z],[x+w,y,z],[x+w,y+h,z],[x,y+h,z],[x,y,z+d],[x+w,y,z+d],[x+w,y+h,z+d],[x,y+h,z+d]]
    for (const [a,b,c,d,shade] of [[0,1,2,3,.86],[4,7,6,5,.96],[0,4,5,1,.72],[3,2,6,7,1.08],[0,3,7,4,.78],[1,5,6,2,.94]]) { triangle(vs[a],vs[b],vs[c],col,shade);triangle(vs[a],vs[c],vs[d],col,shade) }
  }
  const cylinder = (x: number, z: number, y: number, radius: number, h: number, col: Color) => {
    for (let i=0;i<24;i++) {const a=i*Math.PI/12,b=(i+1)*Math.PI/12,pa=[x+Math.cos(a)*radius,y+h,z+Math.sin(a)*radius],pb=[x+Math.cos(b)*radius,y+h,z+Math.sin(b)*radius],qa=[pa[0],y,pa[2]],qb=[pb[0],y,pb[2]];triangle([x,y+h,z],pa,pb,col,1.08);triangle(pa,qa,pb,col,.86);triangle(qa,qb,pb,col,.86)}
  }
  const basis = () => {const {yaw,pitch}=camera,cy=Math.cos(yaw),sy=Math.sin(yaw),sp=Math.sin(pitch),cp=Math.cos(pitch);return {right:[cy,0,-sy],up:[-sy*sp,cp,-cy*sp],depth:[sy*cp,sp,cy*cp]}}
  const project = (x: number, z: number, y = 0): [number,number] => { const b=basis(),q=[x-center[0],y,z-center[2]]; return [width/2+q.reduce((n,v,i)=>n+v*b.right[i],0)*unit,height/2-q.reduce((n,v,i)=>n+v*b.up[i],0)*unit] }
  const floorAt = (x: number, y: number) => {const right=(x-width/2)/unit,forward=-(height/2-y)/unit/Math.sin(camera.pitch);return {x:center[0]+right*Math.cos(camera.yaw)+forward*Math.sin(camera.yaw),z:center[2]-right*Math.sin(camera.yaw)+forward*Math.cos(camera.yaw)}}
  const draw = (layout: VenueLayout, nextCamera: RoomCamera, selected: string | null, guests = 0) => {
    camera={yaw:nextCamera.yaw,pitch:Math.max(.45,Math.min(1.3,nextCamera.pitch)),zoom:Math.max(.6,Math.min(1.8,nextCamera.zoom))}
    const bounds=canvas.getBoundingClientRect();width=Math.max(1,bounds.width);height=Math.max(1,bounds.height);unit=Math.min(width/19,height/13)*camera.zoom
    const ratio=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.round(width*ratio);canvas.height=Math.round(height*ratio);gl.viewport(0,0,canvas.width,canvas.height)
    vertices=[]
    const bg=color("--bg"),edge=color("--edge"),paper=color("--surface"),ink=color("--ink"),teal=color("--accent"),warm=color("--warn"),soft=color("--warn-soft"),good=color("--good"),late=color("--late"),info=color("--info")
    const theme=layout.theme==="sunset"?warm:layout.theme==="sage"?good:teal,cloth=layout.tablecloth==="cream"?paper:layout.tablecloth==="sunset"?warm:teal
    const floor=layout.lighting==="cool"?color("--surface-2"):soft,wall=layout.lighting==="stage"?color("--surface-2"):paper
    box(0,-.2,0,12,.2,10,floor);box(12.3,-.21,0,2.7,.18,10,color("--surface-2"));box(-.12,0,0,12.24,2.7,.12,wall);box(-.12,0,0,.12,.8,8,wall)
    for(let x=0;x<=12;x++)box(x,.003,0,.012,.008,10,edge)
    for(let z=0;z<=10;z++)box(0,.003,z,12,.008,.012,edge)
    const safe=checkVenue(layout).find(c=>c.id==="exits")!.passed
    for(const x of [0,11]){box(x,.015,8,1,.015,2,safe?color("--good-soft"):color("--late-soft"));box(x===0?-.12:12,0,8,.12,1.8,1.4,safe?good:late)}
    box(11.55,.02,.7,.3,.15,.3,late);box(4.3,1.15,.12,3.4,1.3,.1,teal);box(4.45,1.3,.23,3.1,1,.025,paper)
    let guest=0
    for(const item of layout.items){
      const r=footprint(item),h=propHeight(item.kind)
      if(selected===item.id){box(r.x-.06,.03,r.z-.06,r.w+.12,.025,.04,teal);box(r.x-.06,.03,r.z+r.d+.02,r.w+.12,.025,.04,teal);box(r.x-.06,.03,r.z,.04,.025,r.d,teal);box(r.x+r.w+.02,.03,r.z,.04,.025,r.d,teal)}
      const local=(x:number,y:number,z:number,w:number,bh:number,d:number,col:Color)=>{if(item.turn)box(item.x+z,y,item.z+x,d,bh,w,col);else box(item.x+x,y,item.z+z,w,bh,d,col)}
      switch(item.kind){
        case "row": for(let seat=0;seat<8;seat++){const x=seat*.5+.06;local(x,.38,.05,.38,.1,.36,theme);local(x,.48,.43,.38,.44,.08,theme);local(x+.04,0,.09,.05,.38,.05,edge);local(x+.29,0,.33,.05,.38,.05,edge);if(guest++<guests){local(x+.07,.49,.12,.24,.42,.24,guest%2?teal:warm);local(x+.1,.91,.15,.18,.2,.18,soft)}}break
        case "table": cylinder(r.x+r.w/2,r.z+r.d/2,.66,.8,.12,cloth);cylinder(r.x+r.w/2,r.z+r.d/2,0,.12,.66,edge);break
        case "registration": case "catering": local(0,.72,0,2,.14,1,cloth);local(.12,0,.12,.1,.72,.76,edge);local(1.78,0,.12,.1,.72,.76,edge);for(let n=0;n<3;n++)local(.2+n*.55,.86,.2,.35,.1,.45,item.kind==="catering"?paper:theme);break
        case "accessible": case "reserved": local(0,.025,0,1,.02,.7,item.kind==="accessible"?info:warm);local(.18,.052,.15,.64,.018,.1,paper);local(.18,.052,.15,.1,.018,.4,paper);if(item.kind==="reserved"){local(.3,.4,.14,.4,.1,.35,theme);local(.3,.5,.49,.4,.45,.06,theme);local(.34,0,.18,.05,.4,.05,edge);local(.61,0,.4,.05,.4,.05,edge)}break
        case "cable": local(0,.025,0,2,.025,.15,ink);break
        case "cover": local(0,.06,0,2,.04,.3,warm);for(let n=0;n<6;n++)local(n*.33+.08,.101,.03,.06,.01,.24,ink);break
        case "microphone": cylinder(r.x+.12,r.z+.12,0,.025,1.2,edge);box(r.x+.04,1.2,r.z+.04,.16,.2,.16,ink);break
        case "sign": local(.17,0,.17,.06,.7,.06,edge);local(0,.7,0,.4,.5,.1,theme);break
        case "screen": local(0,.5,0,2,1.5,.25,teal);local(.08,.6,.26,1.84,1.32,.01,paper);local(.95,0,.1,.1,.5,.1,edge);break
        case "backdrop": local(0,0,0,2,2.3,.25,theme);if(layout.pattern!=="plain")for(let n=0;n<6;n++)local(n*.32+.08,.12,.255,layout.pattern==="stripes"?.1:.16,layout.pattern==="stripes"?2:.16,.01,paper);break
        default: local(0,0,0,item.turn?r.d:r.w,h,item.turn?r.w:r.d,item.kind==="speaker"?ink:item.kind==="bin"?edge:theme);break
      }
    }
    gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(vertices),gl.DYNAMIC_DRAW);gl.enableVertexAttribArray(p);gl.vertexAttribPointer(p,3,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(c);gl.vertexAttribPointer(c,3,gl.FLOAT,false,24,12)
    const b=basis();for(const key of ["right","up","depth"] as const)gl.uniform3fv(uniforms[key],b[key]);gl.uniform3fv(uniforms.center,center);gl.uniform2f(uniforms.scale,unit*2/width,unit*2/height);gl.clearColor(...bg,1);gl.enable(gl.DEPTH_TEST);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.drawArrays(gl.TRIANGLES,0,vertices.length/6)
  }
  const hitTest = (layout: VenueLayout, x: number, y: number) => {
    const depth = basis().depth
    return [...layout.items].sort((a,b)=>(b.x-a.x)*depth[0]+(b.z-a.z)*depth[2]).find(item=>{
      const r=footprint(item),points=[0,propHeight(item.kind)].flatMap(h=>[[r.x,r.z],[r.x+r.w,r.z],[r.x+r.w,r.z+r.d],[r.x,r.z+r.d]].map(([px,pz])=>project(px,pz,h)))
      const xs=points.map(p=>p[0]),ys=points.map(p=>p[1])
      return x>=Math.min(...xs)-4&&x<=Math.max(...xs)+4&&y>=Math.min(...ys)-4&&y<=Math.max(...ys)+4
    })??null
  }
  return {draw,project,floorAt,hitTest,dispose(){gl.deleteBuffer(buffer);gl.deleteProgram(program);shaders.forEach(s=>gl.deleteShader(s))}}
}
export function nearestProp(layout: VenueLayout, x: number, z: number): VenueItem | null {
  return [...layout.items].reverse().find(i=>{const r=footprint(i);return x>=r.x-.12&&x<=r.x+r.w+.12&&z>=r.z-.12&&z<=r.z+r.d+.12})??null
}
