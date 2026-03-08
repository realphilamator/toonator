export function initCanvas() {

  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");

  console.log("canvas initialized");

}

export function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

