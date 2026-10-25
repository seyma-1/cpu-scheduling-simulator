import assert from "node:assert/strict";
import { simulate, verifySimulation } from "../src/algorithms.js";

const A=[{id:"P1",arrival:0,burst:8},{id:"P2",arrival:1,burst:4},{id:"P3",arrival:2,burst:2},{id:"P4",arrival:4,burst:1}];
const B=[{id:"P1",arrival:2,burst:3},{id:"P2",arrival:2,burst:1},{id:"P3",arrival:8,burst:2},{id:"P4",arrival:9,burst:1}];
for (const workload of [A,B]) for (const algorithm of ["fcfs","sjf","srtf","rr"]) {
  const result=simulate(workload,algorithm,2);
  assert.deepEqual(verifySimulation(workload,result),[],`${algorithm} invariant failure`);
  assert.equal(result.rows.length,workload.length);
}
assert.deepEqual(simulate(A,"fcfs").timeline.map(s=>[s.id,s.start,s.end]),[
  ["P1",0,8],["P2",8,12],["P3",12,14],["P4",14,15]
]);
assert.deepEqual(simulate(A,"sjf").timeline.map(s=>[s.id,s.start,s.end]),[
  ["P1",0,8],["P4",8,9],["P3",9,11],["P2",11,15]
]);
assert.deepEqual(simulate(A,"srtf").timeline.map(s=>[s.id,s.start,s.end]),[
  ["P1",0,1],["P2",1,2],["P3",2,4],["P4",4,5],["P2",5,8],["P1",8,15]
]);
assert.deepEqual(simulate([{id:"A",arrival:0,burst:3},{id:"B",arrival:0,burst:1}],"rr",2).timeline.map(s=>[s.id,s.start,s.end]),[
  ["A",0,2],["B",2,3],["A",3,4]
]);
assert.throws(()=>simulate([{id:"X",arrival:0,burst:1},{id:"X",arrival:1,burst:2}],"fcfs"),/unique/);
assert.throws(()=>simulate([{id:"X",arrival:-1,burst:1}],"fcfs"),/non-negative/);
assert.throws(()=>simulate([{id:"X",arrival:0,burst:0}],"fcfs"),/positive integer/);
assert.throws(()=>simulate([{id:"X",arrival:0,burst:1}],"rr",0),/quantum/);
const idle=simulate([{id:"Late",arrival:3,burst:2}],"fcfs");
assert.deepEqual(idle.timeline.map(s=>[s.id,s.start,s.end]),[["IDLE",0,3],["Late",3,5]]);
console.log("All scheduling tests passed.");
