import { parentPort, workerData } from "node:worker_threads";
import { analyze } from "./analysis.mjs";
try {
  parentPort.postMessage({
    rows: analyze(workerData.team, workerData.threats, workerData.options),
  });
} catch (e) {
  parentPort.postMessage({ error: e.message });
}
