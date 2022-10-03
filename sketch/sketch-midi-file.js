let json;

const RESOLUTION = new p5.Vector(1280, 720);
let playTime = 0;
let currentTick = 0;

const VOLUME = 0.2;

let osc = new p5.Oscillator("triangle");
let tempos = [];
let ticksPerQuarter = 192;
let currentTempo = 120;
let msInTick = (60000 / (currentTempo * ticksPerQuarter));
let key = {};
let signatures = [];
let notes = [];
let nowPlaying = [];
let usedNotes = new Set();
let oldestPlayingNote = { "index": 0, "set": false };
let endOfTrackTicks = 120769;

let lastAction = "No action";
let debugLines = [];

// B]C   D   E F   G   A   B]C
//    C#  D#    F#  G#  A#
const octave = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const octaves = ["1", "2", "3", "4", "5", "6"];
let keys = [];
const offset = 60-36;

function preload() {
	json = loadJSON("assets/Ghibli.json");
}

let midi = null;  // global MIDIAccess object
function onMIDISuccess(midiAccess) {
  console.log("MIDI ready!");
  midi = midiAccess;  // store in the global (in real usage, would probably keep in an object instance)

  handleMIDI(midi);
}

function onMIDIMessage(event) {
  let str = `MIDI message received at timestamp ${event.timeStamp}[${event.data.length} bytes]: `;
  for (const character of event.data) {
    str += `0x${character.toString(16)} `;
  }
  console.log(str);
  let message = parseMIDIMessage(event.data);
  console.log(message);
  if (message.event == "note-on") {
  	setPlaying(message.note);
  } else if (message.event == "note-off") {
  	noteOff()
  }
}

function handleMIDI(midiAccess, indexOfPort) {
  midiAccess.inputs.forEach((entry) => {entry.onmidimessage = onMIDIMessage;});
}

function onMIDIFailure(msg) {
  console.error(`Failed to get MIDI access - ${msg}`);
}


function setup() {
	navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
	
	console.log(MIDIInputMap)
	createCanvas(RESOLUTION.x, RESOLUTION.y);
	background(0,0,0, 255);
	stroke(160,160,160, 255);
	fill(100,100,100,255);
	textSize(16);
	osc.amp(0);
	osc.freq(261);
	
	if (getAudioContext().state !== 'running') {
		osc.start();
	}
	
	for (let tempo of json.header.tempos) {
		tempos.push([tempo.bpm, tempo.ticks]);
	}
	signatures = json.header.timeSignatures;
	ticksPerQuarter = json.header.ppq;
	notes = json.tracks[0].notes;
	for (let note of notes) {
		usedNotes.add(note.name);
	}
	endOfTrackTicks = json.tracks[0].endOfTrackTicks;
	key = json.header.keySignatures[0];

	let notesCount = octave.length * octaves.length;
	for (let i = 0; i < notesCount; i++) {
		keys.push(`${octave[i % 12]}${octaves[Math.floor(i / 12)]}`);
	}

	//	noLoop();
}

function updateTime(delta) {
	playTime += delta;
	currentTick += delta / msInTick;
	let lastBpm;
	for (let tempo of tempos) {
		lastBpm = tempo[0];
		if (tempo[1] >= currentTick) {
			changeTempo(lastBpm);
			break;
		}
	}
}

function changeTempo(newTempo) {
	currentTempo = newTempo;
	msInTick = (60000 / (currentTempo * ticksPerQuarter));
}

function mousePressed() {
	if (getAudioContext().state !== 'running') {
		getAudioContext().resume();
		osc.start();
	}
	let keySize = RESOLUTION.x / keys.length;
	let note = Math.floor(mouseX / keySize);
	setPlaying(note);
}


function setPlaying(note) {
	nowPlaying.push({ "name": keys[note], "preview": true });
	lastAction = "Note " + keys[note];
	osc.freq(midiToFreq(note));
	osc.amp(VOLUME);
}

function stahhp() {
	osc.amp(0);
}

function noteOff() {
	
  // ramp amplitude to 0 over 0.5 seconds
  nowPlaying = nowPlaying.filter((note) => { note.preview === false });
  lastAction = "Note off";
  osc.amp(0, 0.2);
}

function mouseReleased() {
	noteOff();
}

function keyReleased() {
	lastAction = `Release keycode ${keyCode}`;
	if (keyCode === 32) {
		lastAction = "Reset time";
		playTime = 0;
		currentTick = 0;
		oldestPlayingNote = { "index": 0, "set": false };
	}
	return false; 
}

function draw() {
	background(0,0,0, 255);/*
	updateTime(deltaTime);
	*/
	
	if (getAudioContext().state !== 'running') {
		debugLines.push("AudioContext state is " + getAudioContext().state);
	}
	debugLines.push("Press space to restart.");
	debugLines.push(`DELTA: ${Math.floor(deltaTime)} | TIME: ${Math.floor(playTime)} | TICK: ${Math.floor(currentTick)} | BPM: ${Math.floor(currentTempo)}`);
	debugLines.push(lastAction);
	
	let notesCount = octave.length * octaves.length;
	let manuallyPlaying = structuredClone(nowPlaying);
	oldestPlayingNote.set = false;
	for (let i = oldestPlayingNote.index; i < notes.length; i++) {
		let noteStart = notes[i].ticks;
		let noteEnd = notes[i].durationTicks + noteStart;
		if (currentTick >= noteStart && currentTick < noteEnd) {
			if (!oldestPlayingNote.set) {
				oldestPlayingNote.index = i;
				oldestPlayingNote.set = true;
			}
			nowPlaying.push(notes[i]);
		} else if (currentTick >= noteEnd && oldestPlayingNote.set) break;
	}
	
	let keySize = RESOLUTION.x / keys.length;
	let playingNotes = nowPlaying.map((note) => { return note.name });
	for (let i = 0; i < keys.length; i++) {
		let x = i * keySize;
		let y = RESOLUTION.y / 2;
		let label = keys[i];
		let brightness = keys[i].includes("#") ? 0.3 : 1;
    let keyHeight = y
		if (playingNotes.includes(keys[i])) {
      brightness *= 2;
      keyHeight *= .9;
    }
		stroke(150);
		fill(brightness * 100,brightness * i * 2,brightness * i * 3);
		rect(x, y, keySize, keyHeight);
		fill(255);
		stroke(0);
		push();
		translate(x, y);
		rotate(PI/2);
		text(label, 0, 0);
		pop();
	}
	if (nowPlaying[0] == undefined) {
		stahhp()
	} else {
		
	
    for (let note of nowPlaying) {
    	if (debugLines[2]) {
    		debugLines[2] += ", " + note.name;
    	}	else {
    		debugLines.push(note.name);
    		setPlaying(note.midi);
    	}
    }}
	for (let i = 0; i < debugLines.length; i++) {
		text(debugLines[i], 10, 20 + 20 * i);
	}
	nowPlaying = manuallyPlaying;
    debugLines = [];
}

/*
https://github.com/hhromic/midi-utils-js/blob/master/midiparser.js
*/
function parseMIDIMessage(bytes) {
        if (bytes instanceof Uint8Array && bytes.length > 0) {
            var status = bytes[0] & 0xF0;
            var channel = bytes[0] & 0x0F;
            switch (status) {
                case 0x80: // Note-Off event
                    if (bytes.length > 1) {
                        var note = bytes[1] & 0x7F;
                        var velocity = bytes[2] & 0x7F;
                        return { event: "note-off", channel, note, velocity};
                    }
                    return;
                case 0x90: // Note-On event
                    if (bytes.length > 2) {
                        var note = bytes[1] & 0x7F;
                        var velocity = bytes[2] & 0x7F;
                        if (velocity > 0x00)
                        return { event: "note-on",channel,note, velocity};
                        else
                        return { event: "note-off", channel, note, velocity};
                    }
                    return;
              }
              }
}
