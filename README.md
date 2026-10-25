# CPU Scheduling Simulator

A browser-based educational simulator for four CPU scheduling algorithms:

- **FCFS** — First-Come, First-Served
- **SJF** — Shortest Job First (non-preemptive)
- **SRTF** — Shortest Remaining Time First (preemptive)
- **RR** — Round Robin with a configurable positive integer quantum

The app supports adding, editing and removing processes; loading Workloads A and B; input validation; a labelled Gantt chart including idle periods; per-process timing metrics; and average turnaround, waiting and response times.

## Requirements

- A modern browser with JavaScript modules enabled.
- Python 3 for the simple local web server (recommended).
- Node.js 18+ only if you want to run the automated tests.
- No runtime packages, backend, database, login, or build step is required.
- Google Fonts are used for typography when internet access is available; system fonts are used as fallback.

## Run locally

1. Unzip the source archive.
2. Open a terminal in the project directory.
3. Start a static web server:

   ```bash
   python3 -m http.server 8000
   ```

4. Open [http://localhost:8000](http://localhost:8000) in your browser.
5. Load Workload A or B, choose an algorithm, set the quantum for Round Robin, and click **Run simulation**.

Using a local server is recommended because the app loads JavaScript as ES modules. Directly opening `index.html` as a `file://` URL may be blocked by browser security rules.

## Run tests

With Node.js 18 or newer installed:

```bash
npm test
```

Or run the test file directly:

```bash
node tests/scheduling.test.js
```

The tests check both supplied workloads against all four algorithms, selected known timelines, idle time, invalid inputs, and basic scheduling invariants.

## Model and implementation notes

- One CPU; each process has one CPU burst and no I/O.
- Context-switch cost is zero.
- Arrival times are non-negative integers; bursts and RR quantum are positive integers.
- Process IDs must be unique.
- Intervals are half-open: `[start, end)`. A process running from time 2 to time 5 receives 3 units of CPU time.
- FCFS follows arrival order, then input order.
- SJF selects the ready process with the shortest original burst when the CPU becomes free.
- SRTF selects by remaining time and only preempts the current process when a strictly shorter remaining time is available. Equal remaining time does not interrupt the current process.
- Round Robin is FIFO. Arrivals at a quantum boundary enter the queue before the unfinished process is re-enqueued. Separate time slices remain separate in the Gantt chart.
- The simulator shows idle intervals when no process is ready.
- Metrics are calculated from the generated timeline: turnaround = completion − arrival; waiting = turnaround − burst; response = first start − arrival.

## Limitations

- This is a teaching model, not a reproduction of Ubuntu/Linux's production scheduler.
- It assumes exact CPU burst lengths are known in advance, unlike real operating systems.
- Context switching, I/O blocking, multiple CPU cores, priorities, and dynamic workloads are not modelled.
- The site runs entirely in the browser and does not store workloads on a server.

## Project structure

```text
cpu-scheduling-simulator/
├── index.html
├── src/
│   ├── styles.css
│   ├── main.js
│   └── algorithms.js
├── tests/
│   └── scheduling.test.js
├── package.json
└── README.md
```
