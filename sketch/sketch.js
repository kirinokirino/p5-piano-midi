let json;

const RESOLUTION = new p5.Vector(1280, 720);
let playTime = 0;
let currentTick = 0;

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
	json = loadJSON("https://github.com/kirinokirino/p5-piano-midi/blob/master/assets/Ghibli.json");
}

function setup() {
	createCanvas(RESOLUTION.x, RESOLUTION.y);
	background(0,0,0, 255);
	stroke(160,160,160, 255);
	fill(100,100,100,255);
	textSize(16);
	osc.amp(0);
	osc.freq(261);
	osc.start();
	
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
	let keySize = RESOLUTION.x / keys.length;
	let note = Math.floor(mouseX / keySize);
	let freq = midiToFreq(note+offset);
	nowPlaying.push({ "name": keys[note], "preview": true });
	lastAction = "Note " + keys[note];
	osc.freq(freq);
	osc.amp(0.005);
}

function setPlaying(note) {
	osc.freq(midiToFreq(note));
	osc.amp(0.005);
}

function stahhp() {
	osc.amp(0);
}

function mouseReleased() {
  // ramp amplitude to 0 over 0.5 seconds
  nowPlaying = nowPlaying.filter((note) => { note.preview === false });
  lastAction = "Note off";
  osc.amp(0, 0.2);
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
	background(0,0,0, 255);
	updateTime(deltaTime);
	debugLines.push(`DELTA: ${deltaTime} | TIME: ${playTime} | TICK: ${Math.floor(currentTick)} | BPM: ${currentTempo}`);
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
		if (playingNotes.includes(keys[i])) { brightness *= 2; }
		stroke(150);
		fill(brightness * 100,brightness * i * 2,brightness * i * 3);
		rect(x, y, keySize, y);
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
