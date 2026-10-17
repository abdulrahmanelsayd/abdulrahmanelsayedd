import assert from "node:assert/strict";
import test from "node:test";
import { projectCardPose, projectCardState, modulo, settleDuration, power3Out, nearestProjectPhase } from "../../src/lib/project-card-state.ts";
import { footerProgress, footerLetterOffset } from "../../src/components/footer/footer-geometry.ts";
import { homeProjectIds, getProject } from "../../src/content/projects.ts";

test("Home resolves four real projects in the approved order",()=>{
  assert.deepEqual(homeProjectIds,["rifq-shop","dehaz-skincare","jood-plus","next-gen"]);
  assert.equal(new Set(homeProjectIds).size,4);
  assert.deepEqual(homeProjectIds.map(id=>getProject(id).name),["Rifq Shop","Dehaz Skincare","Jood Plus Pharmacy","Next Gen"]);
});
test("the five visible poses reproduce reference depth, translation and rotation",()=>{
  const poses=Array.from({length:8},(_,i)=>projectCardState(i,0,8));
  assert.equal(poses.filter(pose=>pose.opacity===1).length,5);
  assert.deepEqual(poses[0],{xPercent:0,yPercent:0,rotation:0,scale:1,opacity:1,zIndex:5});
  assert.deepEqual(poses[1],{xPercent:25,yPercent:1,rotation:10,scale:.9,opacity:1,zIndex:4});
  assert.deepEqual(poses[6],{xPercent:-45,yPercent:5,rotation:-15,scale:.8,opacity:1,zIndex:3});
  assert.deepEqual(poses[3],{xPercent:55,yPercent:5,rotation:20,scale:.6,opacity:0,zIndex:2});
});
test("every pose is continuous through forward and reverse loop seams",()=>{
  for(const seam of [-8,-1,0,1,7,8,16])for(let i=0;i<8;i++){
    const left=projectCardPose(i,seam-1e-7,8),right=projectCardPose(i,seam+1e-7,8);
    for(const key of ["xPercent","yPercent","rotation","scale","opacity"] as const) assert.ok(Math.abs(left[key]-right[key])<.0001,`${seam}, ${i}, ${key}`);
  }
  for(let i=0;i<8;i++){
    const a=projectCardPose(i,-.6,8),b=projectCardPose(i,7.4,8);
    for(const key of Object.keys(a) as (keyof typeof a)[])assert.ok(Math.abs(a[key]-b[key])<1e-10);
  }
});
test("settling is bounded and uses the reference power3.out equivalent",()=>{
  assert.equal(settleDuration(0),200);assert.equal(settleDuration(.5),340);assert.equal(settleDuration(1),480);assert.equal(settleDuration(9),480);
  assert.equal(power3Out(0),0);assert.equal(power3Out(.5),.9375);assert.equal(power3Out(1),1);
  assert.equal(nearestProjectPhase(0,3,4),4);assert.equal(nearestProjectPhase(3,0,4),-1);assert.equal(modulo(-1,4),3);
});
test("footer reveal spans top-bottom to bottom-bottom with staggered NEXT UP",()=>{
  assert.equal(footerProgress(900,1500,400,600),0);assert.equal(footerProgress(1100,1500,400,600),.5);assert.equal(footerProgress(1300,1500,400,600),1);
  assert.equal(footerLetterOffset(.3,0),110);assert.equal(footerLetterOffset(.8,0),0);assert.ok(footerLetterOffset(.95,6)<1e-10);
  assert.ok(footerLetterOffset(.5,6)>footerLetterOffset(.5,0));
});
