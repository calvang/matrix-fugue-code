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
  [0,3,6,1],
  [0,1,2,3,4,5,6,7,8],
  [2,5,8,7],
  [3,6,7],
  [6,7,8,5],
  [5,7,8,6]
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
var visited = 0 // count of tiles have been visited
var finished = false // indicates end of piece
var traveled = []
// shows whether audio of the index is active
var active = []


function createGrid(matrix) {	
  var element = document.getElementById('grid-main')
  for (let i=0; i<matrix.length; i++) {
    let div = document.createElement('div')
    // div.textContent = matrix[i].toString()
    div.textContent = (i+1).toString() // does not correspond to the tracks
    div.className = 'grid-item'
    div.id = `block${i+1}`
    element.appendChild(div)
        
    traveled.push(false)
    active.push(false)
  }
}

function createTracks(matrix) {
  var tracks = []
  for (let i=0; i<matrix.length; i++) {
    var player = new Tone.Player(`./sources/tracks/track${matrix[i]}.mp3`).toDestination()
    player.volume.value = volumes[i]
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
// solo.loopEnd = loopLength
// solo.onstop = playTracks
var soloLoop = new Tone.Loop((time) => {
  if (prev != -1) {
    soloLoop.stop(0.05)
    trackLoop.start()
  }
  else if (solo.state === 'started') {
    backupSolo.start()
  }
  else {
    solo.start()
  }
}, loopLength)

var trackLoop = new Tone.Loop((time) => {
  if (!finished) {
    for (let i=0; i<tracks.length; i++) {
      if (active[i]) {
        if (tracks[i].state === "started")
          backupTracks[i].start(loopLength)
        else
          tracks[i].start(loopLength)
      }
    }
  }
  else {
    end.start()
    let element = document.getElementById('instructions')
    element.textContent = 'Thanks for Listening! Press Space to Restart'
    let description = document.getElementById('textBody')
    description.textContent = endDescription
    trackLoop.stop(0.05)
  }
}, loopLength)

function fadeStop(track) {

}

function playTracks() {
  if (!finished) {
    for (let i=0; i<tracks.length; i++) {
      if (active[i]) {
        if (tracks[i].state === "started")
          backupTracks[i].start(loopLength)
        else
          tracks[i].start(loopLength)
      }
    }
    setTimeout(playTracks, loopLength*1000)
  }
  else {
    end.start()
    let description = document.getElementById('textBody')
    description.textContent = endDescription
  }
}
function playSolo() {
  if (prev != -1) {
    playTracks()
  }
  else {
    solo.start()
    setTimeout(playSolo, loopLength*1000)
  }
}

function move(direction) {
  var temp = position
  var moved = false
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
    // recolor the tiles
    document.getElementById(`block${prev+1}`).style.backgroundColor = 'white'
    document.getElementById(`block${position+1}`).style.backgroundColor = 'yellow'
    
    // update the text based on the current tile
    if (visited === traveled.length) {
      if (position === startPosition) {
        let element = document.getElementById('instructions')
        element.textContent = 'Press Space to Finish'
      }
      else {
        let element = document.getElementById('instructions')
        element.textContent = 'Return To the Center'
      }
    }
    let description = document.getElementById('textBody')
    description.textContent = descriptions[position]
  }
  
}

function start() {
  // while (!introduction.loaded) {}
  // introduction.start(0,introductionStart,introductionStop-introductionStart)
  try {
    introduction.start()
    if (introduction.state === 'stopped')
      return
    Tone.Transport.start()
    soloLoop.start(soloStart)
  }
  catch (e) {
    let element = document.getElementById('instructions')
    element.textContent = 'Audio Not Loaded Yet, Please Press Space Again'
    return
  }
  // let currentTime = Tone.now()
  
  let element = document.getElementById('instructions')
  element.textContent = 'Playing Introduction'
  let description = document.getElementById('textBody')
  description.textContent = introDescription

  // soloLoop.start(introduction.toSeconds(currentTime)+soloStart)
  // setTimeout(playSolo, soloStart*1000)
  // return
  // perform actions once the introduction is finished
  setTimeout(function() {
    traveled[position] = true
    visited++
    document.getElementById(`block${position+1}`).style.backgroundColor = 'yellow' 
    finishedIntro = true

    let element = document.getElementById('instructions')
    element.textContent = 'Use the Arrow Keys to move around'
    let description = document.getElementById('textBody')
    description.textContent = soloDescription
  }, (soloStart+0.5)*1000)  
}

function restart() {
  position = startPosition
  prev = -1
  finishedIntro = false
  visited = 0 // count of tiles have been visited
  finished = false // indicates end of piece
  traveled = []
  // shows whether audio of the index is active
  active = []
  createGrid(grid)
  start()
}

var space_bar = 32;
var right_arrow = 39;
var left_arrow = 37
var up_arrow = 38
var down_arrow = 40

// pause/play using space bar
document.onkeydown = function(gfg){
  if (gfg.keyCode === space_bar) {
    if (introduction.state === "stopped" && !finishedIntro && gfg.keyCode === space_bar)
      start()
    else if (gfg.keyCode === space_bar && visited === grid.length)
      finished = true
    else if (end.state === 'stopped' && finished)
      restart()
  }
  // else {
  //   solo.loop = !solo.loop
  //   console.log(solo.toSeconds(solo.now()))
  //   if (solo.loop) {
  //     solo.start()
  //     solo.fadeOut = 10
  //   }  
  //   else {
  //     solo.fadeOut = 10
  //   }
  // }
  //   finishedIntro = true
  if (finishedIntro) {

    if (gfg.keyCode === right_arrow)
      move('right')
    else if (gfg.keyCode === left_arrow)
      move('left')
    else if (gfg.keyCode === up_arrow)
      move('up')
    else if (gfg.keyCode === down_arrow)
      move('down')
  }
};

createGrid(grid)
