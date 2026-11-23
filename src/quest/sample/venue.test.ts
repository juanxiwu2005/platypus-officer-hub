import { describe, expect, it } from "vitest"
import { addProp, checkVenue, initialVenue, moveProp, validVenue, type VenueLayout } from "./venue"
export function safeVenue(): VenueLayout {
  let v = initialVenue(); v.headcount = 80
  for (const [id,x,z] of [["left-0",1,3],["welcome",1,1],["buffet",9,1],["round",7,1],["access",4,2],["front",3,2],["photo",0,0]] as const) v = moveProp(v,id,x,z)
  return addProp(v,"cover",5,4)
}
const failed = (v: VenueLayout) => checkVenue(v).filter(c => !c.passed).map(c => c.id)
describe("fictional venue geometry",()=>{
 it("starts with all six actionable problems and has a physically valid solution",()=>{expect(failed(initialVenue())).toHaveLength(6);expect(failed(safeVenue())).toEqual([])})
 it("enforces capacity at 80, not the number of possible chair props",()=>{const v=safeVenue();v.headcount=81;expect(failed(v)).toContain("capacity");v.headcount=NaN;expect(failed(v)).toContain("capacity")})
 it("detects rear exit, fire alarm and outside-room obstructions",()=>{for(const [x,z] of [[1,8],[11,.5],[13,1]])expect(failed(moveProp(safeVenue(),"welcome",x,z))).toContain("exits")})
 it("checks all buffet bounds, not just its anchor",()=>{expect(failed(moveProp(safeVenue(),"buffet",11,1))).toContain("catering")})
 it("detects furniture collisions, missing center/side aisles and row rotation",()=>{for(const [id,x,z] of [["round",5,5],["left-0",0,3],["left-0",1,4]])expect(failed(moveProp(safeVenue(),id as string,x as number,z as number))).toContain("theatre");const v=safeVenue();v.items[0].turn=1;expect(failed(v)).toContain("theatre")})
 it("requires reachable accessible seating, reserved front seats and screen sightlines",()=>{expect(failed(moveProp(safeVenue(),"access",1,3))).toContain("accessibility");expect(failed(moveProp(safeVenue(),"front",8,7))).toContain("accessibility");expect(failed(moveProp(safeVenue(),"photo",5,1))).toContain("accessibility")})
 it("requires a cover to contain the entire crossing cable",()=>{const v=safeVenue();expect(failed(moveProp(v,v.items.at(-1)!.id,5.5,4))).toContain("cables");v.items=v.items.filter(i=>i.kind!=="cover");expect(failed(v)).toContain("cables");v.items=v.items.filter(i=>i.kind!=="cable");expect(failed(v)).not.toContain("cables")})
 it("preserves original layouts, bounds prop count and rejects unsupported saved geometry",()=>{const v=initialVenue();let full=v;for(let n=full.items.length;n<60;n++)full=addProp(full,"sign",2,2);expect(addProp(full,"sign",3,3)).toBe(full);for(const bad of [null,[],{...v,items:[null]},{...v,items:[{id:"x",kind:{toString:"bad"},x:0,z:0,turn:0}]},{...v,headcount:Infinity}])expect(validVenue(bad)).toBe(false);expect(validVenue(v)).toBe(true);expect(moveProp(v,"left-0",1,3).items[0].x).toBe(1);expect(v.items[0].x).toBe(0);expect(validVenue({...v,items:[...v.items,v.items[0]]})).toBe(false);expect(validVenue({...v,theme:"unknown"})).toBe(false);expect(validVenue({...v,items:[{id:"x",kind:"unknown",x:0,z:0,turn:0}]})).toBe(false)})
 it("keeps venue checks separately sourced from the fixed 33 scored rules",()=>{const checks=checkVenue(safeVenue());expect(checks.filter(c=>c.checklist).map(c=>c.id)).toEqual(["accessibility","cables"]);expect(checks.every(c=>c.sources.length>0)).toBe(true)})
})
