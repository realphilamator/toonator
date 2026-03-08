import { frames, currentFrame, previousFrame, setFrame } from "./frames.js";

export function updateTimeline() {

  const timeline = document.getElementById("timeline");
  timeline.innerHTML = "";

  frames.forEach((frame, index) => {

    const frameBox = document.createElement("div");
    frameBox.className = "frameBox";

    if (index === currentFrame)
      frameBox.classList.add("active");

    if (index === previousFrame)
      frameBox.classList.add("prev");

    frameBox.onclick = () => {
      setFrame(index);
      updateTimeline();
    };

    timeline.appendChild(frameBox);

  });

}

export function initTimeline() {
  console.log("timeline initialized");
}