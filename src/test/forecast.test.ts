import { describe,it,expect } from "vitest"
import { seedDemo } from "../data/seed"
import { computeForecast,forecastColor,forecastQueue } from "../engine/forecast"
import { applySchedule } from "../engine/schedule"
describe("WP5 forecast",()=>{
 it("is pure and deterministic across node order, with 1,000 samples per node",()=>{const s=seedDemo(),before=JSON.stringify(s),a=computeForecast(s);expect(computeForecast(s)).toEqual(a);expect(computeForecast({...s,nodes:[...s.nodes].reverse()})).toEqual(a);expect(JSON.stringify(s)).toBe(before);expect(Object.values(a.nodes).every(r=>r.runs===1000&&r.probability>=0&&r.probability<=1&&r.reasons.length<=2)).toBe(true)})
 it("uses exact traffic-light boundaries",()=>{expect([.499,.5,.799,.8].map(forecastColor)).toEqual(["red","yellow","yellow","green"])})
 it("propagates blocked and unfinished dependencies and recomputes when time advances",()=>{const s=seedDemo();const f=computeForecast(s);expect(f.nodes['t-news'].probability).toBe(0);expect(forecastQueue(s,f).map(n=>n.id)).toContain('t-news');const child=s.nodes.find(n=>n.id==='e-night:usg')!;const missing=applySchedule({...s,nodes:s.nodes.map(n=>n.id===child.id?{...n,dependsOn:['missing']}:n)});expect(computeForecast(missing).nodes[child.id].probability).toBe(0);const later={...s,today:'2026-11-20'};expect(computeForecast(later).nodes['e-night:usg'].probability).toBe(0)})
 it("disabled personal buffer equals standard scheduling and never changes contribution scores",()=>{const s=seedDemo();const disabled={...s,people:s.people.map(p=>({...p,personalBufferDays:10,personalBufferEnabled:false}))};const standard={...s,people:s.people.map(p=>({...p,personalBufferDays:1}))};expect(computeForecast(disabled)).toEqual(computeForecast(standard));expect(disabled.contributions).toEqual(s.contributions)})
 it("handles dependency cycles conservatively",()=>{const s=seedDemo();s.nodes[0]={...s.nodes[0],status:'accepted',dependsOn:[s.nodes[0].id]};expect(computeForecast(s).nodes[s.nodes[0].id].probability).toBe(0)})
 it("finishes a representative 1,000-run forecast within one second",()=>{const start=performance.now();computeForecast(seedDemo());expect(performance.now()-start).toBeLessThan(1000)})
})
