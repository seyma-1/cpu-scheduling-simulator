import { simulate, verifySimulation } from "./algorithms.js";

const $ = id => document.getElementById(id);
const colors = ["#78a9ff", "#4dd4bd", "#ffbd69", "#d8a5ff", "#ff8b9a", "#9fd36b", "#ffa66d", "#72d7e9", "#e9d778"];
let processCounter = 1;
const workloads = {
  A: [{ id: "P1", arrival: 0, burst: 8 }, { id: "P2", arrival: 1, burst: 4 }, { id: "P3", arrival: 2, burst: 2 }, { id: "P4", arrival: 4, burst: 1 }],
  B: [{ id: "P1", arrival: 2, burst: 3 }, { id: "P2", arrival: 2, burst: 1 }, { id: "P3", arrival: 8, burst: 2 }, { id: "P4", arrival: 9, burst: 1 }]
};

function makeRow(p = { id: `P${processCounter++}`, arrival: 0, burst: 1 }) {
  const tr = document.createElement("tr");

  for (const [field, label, type, min] of [["id", "Process ID", "text", null], ["arrival", "Arrival time", "number", 0], ["burst", "CPU burst", "number", 1]]) {
    const td = document.createElement("td"), input = document.createElement("input");
    input.type = type;
    input.value = p[field];
    input.dataset.field = field;
    input.setAttribute("aria-label", `${p.id} ${label}`);

    if (type === "number") { 
      input.min = String(min); input.step = "1"; 
    }

    td.append(input); 
    tr.append(td);
  }

  const action = document.createElement("td"), remove = document.createElement("button");

  remove.type = "button";
  remove.className = "delete-button";
  remove.textContent = "Remove";
  remove.setAttribute("aria-label", `Remove ${p.id}`);
  remove.addEventListener("click", () => { tr.remove(); updateCount(); clearMessages(); });

  action.append(remove); 
  tr.append(action); 
  $("processRows").append(tr); 
  updateCount();
}

function updateCount() {
  $("processCount").textContent = `${$("processRows").children.length} 
  
  process${$("processRows").children.length === 1 ? "" : "es"}`;
}

function getProcesses() {
  return [...$("processRows").querySelectorAll("tr")].map(tr => {
    const v = {}; tr.querySelectorAll("input").forEach(
      i => v[i.dataset.field] = i.dataset.field === "id" ? i.value.trim() : Number(i.value)
    );
    return v;
  });
}

function setWorkload(key) {
  $("processRows").replaceChildren();
  workloads[key].forEach(p => makeRow({ ...p }));
  processCounter = workloads[key].length + 1;
  clearMessages();
  $("results").hidden = true;
}

function clearMessages() {
  $("errorBox").hidden = true;
  $("successBox").hidden = true;
}


function clearResults() {
  $("results").hidden = true;

  $("resultTitle").textContent = "Simulation results";
  $("algorithmPill").textContent = "";

  $("ganttChart").replaceChildren();
  $("timelineTicks").replaceChildren();
  $("scheduleNotes").textContent = "";

  $("resultRows").replaceChildren();

  $("avgTurnaround").textContent = "—";
  $("avgWaiting").textContent = "—";
  $("avgResponse").textContent = "—";
}

function fmt(n) {
  return Number(n).toFixed(2).replace(/\.00$/, "");
}

function showResults(algorithm, result) {
  $("results").hidden = false;

  const labels = { 
    fcfs: "FCFS", 
    sjf: "SJF (non-preemptive)", 
    srtf: "SRTF (preemptive)", 
    rr: `Round Robin (q = ${$("quantum").value})` 
  };

  $("resultTitle").textContent = "Simulation results";

  $("algorithmPill").textContent = labels[algorithm];

  const processOrder = getProcesses();

  const colorById = new Map(
      processOrder.map((p, i) => [
          p.id,
          colors[i % colors.length]
      ])
  );

  const chart = $("ganttChart");

  chart.replaceChildren();

  // const total = Math.max(...result.timeline.map(s => s.end), 1);

  result.timeline.forEach((s, i) => {
    const el = document.createElement("div");
    el.className = "gantt-segment" + (s.kind === "idle" ? " idle" : "");
    el.style.setProperty("--duration", String(s.end - s.start));

    if (s.kind !== "idle") 
      el.style.background = colorById.get(s.id) || colors[0];

    el.title = `${s.id}: ${s.start} to ${s.end} (duration ${s.end - s.start})`;

    const name = document.createElement("strong");
    name.textContent = s.id; el.append(name);

    const time = document.createElement("span");
    time.textContent = `${s.start}–${s.end}`; el.append(time);

    if (algorithm === "rr" && s.kind !== "idle" && s.end - s.start === Number($("quantum").value)) {
      el.dataset.quantumBoundary = "true";
    }

    chart.append(el);
  });

const ticks = $("timelineTicks");
ticks.replaceChildren();

const segments = [...chart.children];

if (segments.length) {
  const tickArea = ticks.getBoundingClientRect();

  function addTick(value, x) {
    const span = document.createElement("span");
    span.textContent = value;
    span.style.left = `${x}px`;
    ticks.append(span);
  }

  addTick(
    result.timeline[0].start,
    segments[0].getBoundingClientRect().left - tickArea.left
  );

  for (let i = 1; i < segments.length; i++) {
    const previous = segments[i - 1].getBoundingClientRect();
    const current = segments[i].getBoundingClientRect();

    const boundary = (previous.right + current.left) / 2;

    addTick(
      result.timeline[i].start,
      boundary - tickArea.left
    );
  }

  const lastSegment = segments[segments.length - 1];
  const lastRect = lastSegment.getBoundingClientRect();

  addTick(
    result.timeline[result.timeline.length - 1].end,
    lastRect.right - tickArea.left
  );
}

  $("scheduleNotes").textContent = algorithm === "rr" ? "Each block is a separate CPU time slice; adjacent slices are intentionally not merged, so quantum boundaries remain visible." : "Each block shows one uninterrupted execution interval; SRTF may interrupt and later resume a process.";

  const body = $("resultRows"); body.replaceChildren();

  result.rows.forEach(p => {
    const tr = document.createElement("tr");
    [p.id, p.arrival, p.burst, p.firstStart, p.completion, p.turnaround, p.waiting, p.response].forEach(
      v => {
        const td = document.createElement("td");
        td.textContent = typeof v === "number" ? fmt(v) : v;
        tr.append(td);
      });
    body.append(tr);
  });

  $("avgTurnaround").textContent = fmt(result.averages.turnaround);
  $("avgWaiting").textContent = fmt(result.averages.waiting);
  $("avgResponse").textContent = fmt(result.averages.response);

  const errors = verifySimulation(getProcesses(), result);

  if (errors.length) {
    $("errorBox").hidden = false;
    $("errorBox").textContent = "Internal validation warning: " + errors.join(" ");
    $("successBox").hidden = true;
  }

  else {
    $("successBox").hidden = false;
    $("successBox").textContent = "Simulation completed. Basic timeline invariants passed.";
  }
}

function updateQuantumState() {
  const isRoundRobin = $("algorithm").value === "rr";

  $("quantum").disabled = !isRoundRobin;
  $("quantumLabel").style.opacity = isRoundRobin ? "1" : ".55";
}

$("empty").addEventListener("click", () => {
  $("processRows").replaceChildren();
  processCounter = 1;
  updateCount();
  clearMessages();
  clearResults();
});

$("addProcess").addEventListener("click", () => { 
  makeRow(); 
  clearMessages(); 
});

$("loadA").addEventListener("click", () => setWorkload("A"));

$("loadB").addEventListener("click", () => setWorkload("B"));

// $("algorithm").addEventListener("change", () => { $("quantumLabel").style.opacity = $("algorithm").value === "rr" ? "1" : ".55"; });

$("algorithm").addEventListener("change", updateQuantumState);

$("runSimulation").addEventListener("click", () => {
  clearMessages();
  clearResults();

  try {
    const result = simulate(getProcesses(), $("algorithm").value, Number($("quantum").value));
    showResults($("algorithm").value, result);
    $("results").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (e) {
    $("errorBox").hidden = false;
    $("errorBox").textContent = e.message;
    $("results").hidden = true;
  }
});

$("processRows").replaceChildren();
processCounter = 1;
updateCount();
clearMessages();
clearResults();
updateQuantumState();