const RESOLUTION = new p5.Vector(1280, 720);
const VOLUME = 0.2;

let synth;
let nowPlaying = [];
let midi = null;  // global MIDIAccess object
let debugLines = [];

//     C#  D#    F#  G#  A#
//B| C   D   E F   G   A   B |C
const octave = ["A", "A#", "B", "C", "C#", "D", "D#", "E", "F", "F#", "G", "G#"];
const octaves = ["1", "2", "3", "4", "5", "6"];
let keys = [];
const offset = 60-39;

function pianoKey(a) {
	return keys[a-offset]
}

function preload() {
}

function setup() {
	navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);
	createCanvas(RESOLUTION.x, RESOLUTION.y);
	background(0,0,0, 255);
	stroke(160,160,160, 255);
	fill(100,100,100,255);
	textSize(16);
	
	synth = new p5.PolySynth();
	const attack = 0.05;
	const decay = 0.5;
	const sustain = 0.8;
	const release = 0.5;
	//synth.setADSR(attack, decay, sustain, release);
		
	let notesCount = octave.length * octaves.length;
	for (let i = 0; i < notesCount; i++) {
		keys.push(`${octave[i % 12]}${octaves[Math.floor(i / 12)]}`);
	}
	noLoop();
}

function mousePressed() {
	if (getAudioContext().state !== 'running') {
		getAudioContext().resume();
	}
}

function setPlaying(note, velocity) {
	if (!nowPlaying.includes(note)) { 
		nowPlaying.push([note, velocity]);
		//console.log(note + " " + (velocity / 127) / 4);
		synth.play(pianoKey(note), (velocity / 127) / 4, 0, 1);
	}
}

function noteOff(note) {
	nowPlaying = nowPlaying.filter((playing) => { return note != playing[0] });
}

function draw() {
	background(0,0,0, 255);	
	if (getAudioContext().state !== 'running') {
		debugLines.push("AudioContext state is " + getAudioContext().state);
	}

	for (note of nowPlaying) {
		debugLines.push(pianoKey(note[0]) + " " + note[1]);
	}
	
	for (let i = 0; i < debugLines.length; i++) {
		text(debugLines[i], 10, 20 + 20 * i);
	}
	debugLines = [];
}

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
  //console.log(str);
  let message = parseMIDIMessage(event.data);
  if (!message) return;
	//console.log(message);
  if (message.event == NOTEON) {
  	setPlaying(message.note, message.velocity);
  } else if (message.event == NOTEOFF) {
  	noteOff(message.note)
  }
}

function handleMIDI(midiAccess, indexOfPort) {
  midiAccess.inputs.forEach((entry) => {entry.onmidimessage = onMIDIMessage;});
}

function onMIDIFailure(msg) {
  console.error(`Failed to get MIDI access - ${msg}`);
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
                        return { event: NOTEOFF, channel, note, velocity};
                    }
                    return;
                case 0x90: // Note-On event
                    if (bytes.length > 2) {
                        var note = bytes[1] & 0x7F;
                        var velocity = bytes[2] & 0x7F;
                        if (velocity > 0x00)
                        return { event: NOTEON,channel,note, velocity};
                        else
                        return { event: NOTEOFF, channel, note, velocity};
                    }
                    return;
              }
              }
}

const NOTEON = "note-on";
const NOTEOFF = "note-off";
