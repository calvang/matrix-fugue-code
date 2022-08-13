
const swipeThreshold = 60 // number of pixels needed to register swipe

var startCoords = [0, 0]
const endTouch = e => {
  const deltas = [
    e.changedTouches[0].clientX - startCoords[0],
    e.changedTouches[0].clientY - startCoords[1]
  ]
  
  if (deltas[0] >  swipeThreshold) {
    move('right')
  } else if (deltas[0] < -swipeThreshold) {
    move('left')
  }
  else if (deltas[1] >  swipeThreshold) {
    move('down')
  } else if (deltas[1] < -swipeThreshold) {
    move('up')
  }
  // body.removeEventListener('touchmove', moveTouch)
  document.body.removeEventListener('touchend', endTouch)
}
// const moveTouch = e => {
//   const progressX = startX - e.touches[0].clientX
//   const translation = progressX > 0
//     ? parseInt(-Math.abs(progressX))
//     : parseInt(Math.abs(progressX))
//   root.style.setProperty('--translate', translation)
// }
const startTouch = e => {
  const { touches } = e
  if (touches && touches.length === 1) {
    startCoords = [touches[0].clientX, touches[0].clientY]
    // body.addEventListener('touchmove', moveTouch)
    document.body.addEventListener('touchend', endTouch)
  }
}
body.addEventListener('touchstart', startTouch)