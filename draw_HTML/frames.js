export let frames = [];
export let currentFrame = 0;
export let previousFrame = -1;

export function addFrame(canvas) {

  const copy = document.createElement("canvas");
  copy.width = canvas.width;
  copy.height = canvas.height;

  const ctx = copy.getContext("2d");
  ctx.drawImage(canvas, 0, 0);

  frames.splice(currentFrame + 1, 0, copy);

  previousFrame = currentFrame;
  currentFrame++;

}

export function setFrame(index) {
  previousFrame = currentFrame;
  currentFrame = index;
}