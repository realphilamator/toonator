import { addFrame } from "./frames.js";
import { initCanvas } from "./canvas.js";
import { initTimeline } from "./timeline.js";

document.addEventListener("DOMContentLoaded", () => {

  initCanvas();
  initTimeline();

  // UI buttons later
  // document.getElementById("addFrame").onclick = addFrame;

});