import { investment } from "./investment.mjs";
import { parentPort, workerData } from "node:worker_threads";
import { analyze } from "./analysis.mjs";
try {
  parentPort.postMessage({
    rows:
      workerData.task === "investment"
        ? investment(workerData.input)
        : analyze(workerData.team, workerData.threats, workerData.options),
  });
} catch (e) {
  parentPort.postMessage({ error: e.message });
}
