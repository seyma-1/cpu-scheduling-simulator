export function validateProcesses(processes, algorithm, quantum) {
  
  if (!Array.isArray(processes) || processes.length === 0) 
    throw new Error("Add at least one process before running the simulation.");

  const ids = new Set();

  processes.forEach((p, index) => {
    const id = String(p.id ?? "").trim();

    if (!id) 
      throw new Error(`Process ${index + 1}: Process ID cannot be empty.`);

    if (ids.has(id)) 
      throw new Error(`Process IDs must be unique. "${id}" appears more than once.`);

    ids.add(id);

    if (!Number.isInteger(p.arrival) || p.arrival < 0) 
      throw new Error(`${id}: arrival time must be a non-negative integer.`);

    if (!Number.isInteger(p.burst) || p.burst <= 0) 
      throw new Error(`${id}: CPU burst must be a positive integer.`);
  });

  if (algorithm === "rr" && (!Number.isInteger(quantum) || quantum <= 0)) {
    throw new Error("Round Robin quantum must be a positive integer.");
  }
}

function prepare(processes) {
  return processes.map((p, index) => ({
    id: String(p.id).trim(), arrival: p.arrival, burst: p.burst,
    remaining: p.burst, index, firstStart: null, completion: null
  }));
}

function segment(list, id, start, end, kind = "run") {
  if (end <= start) 
    return;
  list.push({ id, start, end, kind });
}

function addIdleIfNeeded(timeline, time, nextArrival) {
  if (nextArrival > time) 
    segment(timeline, "IDLE", time, nextArrival, "idle");
  return nextArrival;
}

function byArrivalThenInput(a, b) { 
  return a.arrival - b.arrival || a.index - b.index; 
}

export function simulateFCFS(input) {
  const ps = prepare(input), timeline = [];
  let time = 0;
  const pending = [...ps].sort(byArrivalThenInput);

  for (const p of pending) {
    if (time < p.arrival) 
      time = addIdleIfNeeded(timeline, time, p.arrival);

    p.firstStart = time;
    segment(timeline, p.id, time, time + p.burst);
    time += p.burst; 
    p.remaining = 0; 
    p.completion = time;
  }

  return finish(ps, timeline);
}

export function simulateSJF(input) {
  const ps = prepare(input), timeline = [];
  let time = 0, completed = 0;
  while (completed < ps.length) {
    const ready = ps.filter(p => p.remaining > 0 && p.arrival <= time);

    if (!ready.length) {
      const next = Math.min(...ps.filter(p => p.remaining > 0).map(p => p.arrival));
      time = addIdleIfNeeded(timeline, time, next);
      continue;
    }

    ready.sort((a, b) => a.burst - b.burst || byArrivalThenInput(a, b));
    const p = ready[0];
    p.firstStart = time;
    segment(timeline, p.id, time, time + p.remaining);
    time += p.remaining; 
    p.remaining = 0; 
    p.completion = time; 
    completed++;
  }
  return finish(ps, timeline);
}

export function simulateSRTF(input) {
  const ps = prepare(input), timeline = [];
  let time = 0, completed = 0, running = null;

  while (completed < ps.length) {
    const ready = ps.filter(p => p.remaining > 0 && p.arrival <= time);
    if (!ready.length) {
      const next = Math.min(...ps.filter(p => p.remaining > 0).map(p => p.arrival));
      time = addIdleIfNeeded(timeline, time, next);
      running = null;
      continue;
    }

    // Keep the running process on equal remaining time; preempt only for a strictly shorter job.
    let chosen = running && running.remaining > 0 && running.arrival <= time ? running : null;
    const shortest = [...ready].sort((a, b) => a.remaining - b.remaining || byArrivalThenInput(a, b))[0];

    if (!chosen || shortest.remaining < chosen.remaining) 
      chosen = shortest;
    else if (chosen.remaining <= shortest.remaining) {
      // A newly arrived process cannot preempt the current one on equality.
      // If the current process is not tied for shortest, use the shortest ready process.
      const minimum = Math.min(...ready.map(p => p.remaining));
      if (chosen.remaining > minimum) 
        chosen = shortest;
    }

    if (chosen.firstStart === null) 
      chosen.firstStart = time;
    
    const nextArrival = Math.min(...ps.filter(
      p => p.remaining > 0 && p.arrival > time
    ).map(p => p.arrival), Infinity);

    const runFor = Math.min(chosen.remaining, nextArrival - time);

    // If no future arrival exists, run to completion.
    const duration = Number.isFinite(runFor) ? runFor : chosen.remaining;
    const start = time, end = time + duration;
    segment(timeline, chosen.id, start, end);
    chosen.remaining -= duration; time = end;
    if (chosen.remaining === 0) { 
      chosen.completion = time; 
      completed++; 
      running = null; 
    }
    else 
      running = chosen;
  }
  return finish(ps, timeline);
}

export function simulateRR(input, quantum) {
  const ps = prepare(input), timeline = [];
  const arrivals = [...ps].sort(byArrivalThenInput);
  let time = 0, nextIndex = 0, completed = 0;
  const queue = [];

  while (completed < ps.length) {
    while (nextIndex < arrivals.length && arrivals[nextIndex].arrival <= time) 
      queue.push(arrivals[nextIndex++]);

    if (!queue.length) {
      const next = arrivals[nextIndex].arrival;
      
      time = addIdleIfNeeded(timeline, time, next);

      while (nextIndex < arrivals.length && arrivals[nextIndex].arrival <= time) 
        queue.push(arrivals[nextIndex++]);
    }

    const p = queue.shift();

    if (p.firstStart === null) 
      p.firstStart = time;

    const duration = Math.min(quantum, p.remaining);
    const start = time, end = time + duration;
    segment(timeline, p.id, start, end, "run");
    p.remaining -= duration; time = end;

    // Arrivals at the exact quantum boundary enter before the unfinished process is re-enqueued.
    while (nextIndex < arrivals.length && arrivals[nextIndex].arrival <= time) 
      queue.push(arrivals[nextIndex++]);

    if (p.remaining > 0) 
      queue.push(p);
    else { 
      p.completion = time; 
      completed++; 
    }
  }

  return finish(ps, timeline);
}

function finish(processes, timeline) {
  const rows = processes.map(p => {
    const turnaround = p.completion - p.arrival;
    const waiting = turnaround - p.burst;
    const response = p.firstStart - p.arrival;
    return {
      id: p.id, arrival: p.arrival, burst: p.burst, firstStart: p.firstStart,
      completion: p.completion, turnaround, waiting, response, inputIndex: p.index
    };
  });

  const avg = key => rows.reduce((sum, p) => sum + p[key], 0) / rows.length;
  
  return {
    timeline, rows, averages: {
      turnaround: avg("turnaround"), waiting: avg("waiting"), response: avg("response")
    }
  };
}

export function simulate(processes, algorithm, quantum = 2) {
  validateProcesses(processes, algorithm, quantum);
  
  switch (algorithm) {
    case "fcfs": return simulateFCFS(processes);
    case "sjf": return simulateSJF(processes);
    case "srtf": return simulateSRTF(processes);
    case "rr": return simulateRR(processes, quantum);
    default: throw new Error("Select a supported scheduling algorithm.");
  }
}

export function verifySimulation(input, result) {
  const errors = [];

  for (const p of input) {
    const runs = result.timeline.filter(
      s => s.kind !== "idle" && s.id === p.id
    );

    const cpu = runs.reduce(
      (sum, s) => sum + s.end - s.start, 0
    );

    if (cpu !== p.burst) 
      errors.push(`${p.id} received ${cpu} CPU units instead of ${p.burst}.`);

    if (runs.some(s => s.start < p.arrival)) 
      errors.push(`${p.id} ran before arrival.`);
  }

  const sorted = [...result.timeline].sort(
    (a, b) => a.start - b.start || a.end - b.end
  );

  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].start < sorted[i - 1].end) 
      errors.push("Two timeline intervals overlap.");
    if (sorted[i].start > sorted[i - 1].end) 
      errors.push("Timeline has an unexplained gap.");
  }

  for (const p of result.rows) {
    if (p.waiting < 0 || p.response < 0) 
      errors.push(`${p.id} has a negative waiting or response time.`);
  }
  // No idle interval may overlap the time when a process is ready and unfinished.

  for (const s of result.timeline.filter(x => x.kind === "idle")) {
    if (input.some(p => p.arrival < s.end && p.arrival <= s.start)) {
      const finishedBeforeIdleStart = result.rows.filter(p => p.completion <= s.start).length;
      const activeAtStart = input.some(p => p.arrival <= s.start && !result.rows.some(
        r => r.id === p.id && r.completion <= s.start
      ));

      if (activeAtStart && finishedBeforeIdleStart < input.length) 
        errors.push("CPU was idle while a process was ready.");
    }
  }
  return errors;
}
