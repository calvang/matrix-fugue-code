import './style.css'

import * as Tone from 'tone'
import { descriptions, introDescription, soloDescription,
  endDescription } from './descriptions'

// map from grid positions (index) to track number (value)
const grid = [
  2,1,4,
  5,9,3,
  6,8,7
]

// 0 1 2
// 3 4 5
// 6 7 8
// map active track areas over the grid
// each index contains the grid indices that are active there
const areas = [
  [0,1,3,6],
  [0,1,2],
  [1,2,5,8],
  [0,3,6,7],
  [0,1,2,3,4,5,6,7,8],
  [2,5,8,7,1],
  [3,6,7],
  [6,7,8,5],
  [5,7,8,6,3]
]
// relative volumes for each track
const volumes = [
  -20, -12, -20,
  -12, 0,   -12,
  -20, -12, -20
]


const width = 3
const height = 3

// the index of the grid that you are currently at
const startPosition = 4
var position = startPosition
var prev = -1
var finishedIntro = false
var startedEnd = false
var visited = 0 // count of tiles have been visited
var finished = false // indicates end of piece
var traveled = []
// shows whether audio of the index is active
var active = []

// hotkeys/actions
var keys = {
  'space': { 'code': 32, 'down': false },
  'right': { 'code': 39, 'down': false },
  'left': { 'code': 37, 'down': false },
  'up': { 'code': 38, 'down': false },
  'down': { 'code': 40, 'down': false },
}


function createGrid(matrix) {	
  var element = document.getElementById('grid-main')
  for (let i=0; i<matrix.length; i++) {
    if (!finishedIntro) { // skip if restarting
      let div = document.createElement('div')
      div.textContent = (i+1).toString() // does not correspond to the tracks
      div.className = 'grid-item'
      div.id = `block${i+1}`
      element.appendChild(div)
    }
    document.getElementById(`block${i+1}`).style.backgroundColor = ''
    traveled.push(false)
    active.push(false)
  }
}

function createTracks(matrix) {
  var tracks = []
  for (let i=0; i<matrix.length; i++) {
    var player = new Tone.Player(`./sources/tracks/track${matrix[i]}.mp3`).toDestination()
    player.volume.value = volumes[i]
    player.mute = true
    tracks.push(player)
  }
  return tracks
}


var introduction = new Tone.Player(`./sources/Introduction.mp3`).toDestination()
var solo = new Tone.Player(`./sources/Solo.mp3`).toDestination()
var backupSolo = new Tone.Player(`./sources/Solo.mp3`).toDestination()
var end = new Tone.Player(`./sources/End.mp3`).toDestination()
var tracks = createTracks(grid)
var backupTracks = createTracks(grid)

var loopLength = 20.9
var soloStart = 36.55

end.onstop = (source) => { 
  let element = document.getElementById('instructions')
  element.textContent = 'Thanks for Listening! Press Space or Click Here to Restart'
}


function playTrackHelper(track, backupTrack) {
  if (track.state === 'started') 
    backupTrack.start()
  else 
    track.start()
}

// loop the solo and individual instrument tracks
var trackLoop = new Tone.Loop((time) => {
  if (!finished) {
    playTrackHelper(solo, backupSolo)
    for (let i=0; i<tracks.length; i++) {
      playTrackHelper(tracks[i], backupTracks[i])
    }
  }
  else {
    end.start()
    startedEnd = true

    let element = document.getElementById('instructions')
    element.textContent = 'Coda'
    let description = document.getElementById('textBody')
    description.textContent = endDescription

    trackLoop.stop(0.05)
  }
}, loopLength)

function fadeIn(track, backupTrack, duration, targetVolume, interval=0.2, step=4) {
  const startVolume = targetVolume-(duration/interval)*step

  track.volume.value = startVolume
  backupTrack.volume.value = startVolume

  track.mute = false
  backupTrack.mute = false

  var intervalId = setInterval(() => {
    if (track.state === 'started' || backupTrack.state === 'started') {
      backupTrack.volume.value += step
      track.volume.value += step
    }
  }, interval*1000)

  setTimeout(() => {
    clearInterval(intervalId)

    backupTrack.volume.value = targetVolume
    track.volume.value = targetVolume
  }, duration*1000)
}

function fadeOut(track, backupTrack, duration, interval=0.2, step=2) {
  var intervalId = setInterval(() => {
    if (track.state === 'started' || backupTrack.state === 'started') {
      backupTrack.volume.value -= step
      track.volume.value -= step
    }
  }, interval*1000)

  setTimeout(() => {
    clearInterval(intervalId)

    track.mute = true
    backupTrack.mute = true
  }, duration*1000)
}

function move(direction, fadeOutTime=8, fadeInTime=5) {
  if (keys.right.down)
    return

  for (let key in keys) // avoid race conditions
    keys[key].down = true
  
  var moved = false
  if (prev === -1)
    fadeOut(solo, backupSolo, fadeOutTime)
  if (direction === 'up' && position >= width) {
    prev = position
    moved = true
    position-=width
  }
  else if (direction === 'down' && position < height*(width-1)) {
    prev = position
    moved = true
    position+=width
  }
  else if (direction === 'left' && position%height != 0) {
    prev = position
    moved = true
    position--
  }
  else if (direction === 'right' && position%height != height-1) {
    prev = position
    moved = true
    position++
  }
  //
  if (moved) {   
    if (!traveled[position]) {
      visited++
      traveled[position] = true
    }
    var tempActive = [...active]
    // compute the active areas and what tracks to play
    for (let i=0; i<areas[prev].length; i++) {
      var index = areas[prev][i] // grid index of track
      active[index] = false
    }
    for (let i=0; i<areas[position].length; i++) {
      var index = areas[position][i] // grid index of track
      if (traveled[index]) {
        active[index] = true
      }
    }
    for (let i=0; i<active.length; i++) {
      if (active[i] && !tempActive[i])
        fadeIn(tracks[i], backupTracks[i], fadeInTime, volumes[i])
      else if (!active[i] && tempActive[i])
        fadeOut(tracks[i], backupTracks[i], fadeOutTime)
    }

    // recolor the tiles
    document.getElementById(`block${prev+1}`).style.backgroundColor = 'white'
    document.getElementById(`block${position+1}`).style.backgroundColor = 'yellow'
    
    // update the text based on the current tile
    if (visited === traveled.length) {
      if (position === startPosition) {
        let element = document.getElementById('instructions')
        element.textContent = 'Press Space or Click Here to Finish'
      }
      else {
        let element = document.getElementById('instructions')
        element.textContent = 'Return To the Center To Combine Everything'
      }
    }
    let description = document.getElementById('textBody')
    description.textContent = descriptions[position]
  }
  for (let key in keys) 
    keys[key].down = false
}

function start() {
  // while (!introduction.loaded) {}
  // introduction.start(0,introductionStart,introductionStop-introductionStart)
  try {
    introduction.start()
    if (introduction.state === 'stopped')
      return
    Tone.Transport.start()
    trackLoop.start(soloStart)
  }
  catch (e) {
    let element = document.getElementById('instructions')
    element.textContent = 'Audio Not Loaded Yet, Please Try Again'
    return
  }
  // let currentTime = Tone.now()
  
  let element = document.getElementById('instructions')
  element.textContent = 'Playing Introduction'
  let description = document.getElementById('textBody')
  description.textContent = introDescription

  // perform actions once the introduction is finished
  setTimeout(function() {
    traveled[position] = true
    visited++
    document.getElementById(`block${position+1}`).style.backgroundColor = 'yellow' 
    finishedIntro = true

    // start touch gestures
    window.addEventListener('touchstart', startTouch)

    let element = document.getElementById('instructions')
    element.textContent = 'Use the Arrow Keys Or Swipe to move around'
    let description = document.getElementById('textBody')
    description.textContent = soloDescription
  }, (soloStart+0.5)*1000)  
}

function resetTracks() {
  solo.volume.value = 0
  backupSolo.volume.value = 0
  solo.mute = false
  backupSolo.mute = false
  for (let i=0; i<tracks.length; i++) {
    tracks[i].volume.value = volumes[i]
    tracks[i].mute = true
    backupTracks[i].volume.value = volumes[i]
    backupTracks[i].mute = true
  }
}

function restart() {
  startedEnd = false
  position = startPosition
  prev = -1
  visited = 0 // count of tiles have been visited
  finished = false // indicates end of piece
  traveled = []
  // shows whether audio of the index is active
  active = []
  createGrid(grid)
  resetTracks()
  Tone.Transport.stop()
  finishedIntro = false
  start()
}


// main controls for the instruction button
function instructionControl() {
  if (keys.space.down)
    return
  console.log(startedEnd,finishedIntro,introduction.state)
  keys.space.down = true
  if (end.state === 'stopped') {
    if (startedEnd)
      restart()
    else if (introduction.state === "stopped" && !finishedIntro)
      start()
    else if (visited === grid.length)
      finished = true
  }
  keys.space.down = false
}

document.getElementById('instructionButton').onclick = function() {
  instructionControl()
}

// pause/play using space bar
document.onkeydown = function(gfg){
  if (gfg.keyCode === keys.space.code && !keys.space.down) {
    instructionControl()
  }
  if (finishedIntro && !startedEnd) {
    if (gfg.keyCode === keys.right.code && !keys.right.down)
      move('right')
    else if (gfg.keyCode === keys.left.code && !keys.left.down)
      move('left')
    else if (gfg.keyCode === keys.up.code && !keys.up.down)
      move('up')
    else if (gfg.keyCode === keys.down.code && !keys.down.down)
      move('down')
  }
};


// code for touch gestures
const swipeThreshold = 60 // number of pixels needed to register swipe

var startCoords = [0, 0]
const endTouch = e => {
  const deltas = [
    e.changedTouches[0].clientX - startCoords[0],
    e.changedTouches[0].clientY - startCoords[1]
  ]
  console.log(deltas)
  if (finishedIntro) {
    if (deltas[0] >  swipeThreshold) 
      move('right')
    else if (deltas[0] < -swipeThreshold) 
      move('left')
    else if (deltas[1] >  swipeThreshold) 
      move('down')
    else if (deltas[1] < -swipeThreshold) 
      move('up')
  }
  window.removeEventListener('touchend', endTouch)
}

const startTouch = e => {
  const { touches } = e
  if (touches && touches.length === 1) {
    startCoords = [touches[0].clientX, touches[0].clientY]
    window.addEventListener('touchend', endTouch)
  }
}


createGrid(grid)
