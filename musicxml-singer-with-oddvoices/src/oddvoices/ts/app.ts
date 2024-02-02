export {};

declare global {
  let Module: any;
  let FS: any;
};

const LEFT_BRACE = "{";
const RIGHT_BRACE = "}";

const XSAMPA_TO_IPA_AND_GUIDE = {
  ["{} " + LEFT_BRACE + " &"]: ["æ", "hAt"],
  "A O": ["ɑ ɔ", "cAUGHt, cOt"],
  "I": ["ɪ", "bIt"],
  "E": ["ɛ", "lEt"],
  "@ V": ["ə ʌ", "cUb"],
  "U": ["ʊ", "lOOk"],
  "@` 3`": ["ɚ ɝ", "bIRd"],
  "i": ["i", "sEEd"],
  "N": ["ŋ", "haNG"],
  "tS": ["tʃ", "CHild"],
  "dZ": ["dʒ", "Jet"],
  "T": ["θ", "THing"],
  "D": ["ð", "wiTHer"],
  "S": ["ʃ", "SHock"],
  "Z": ["ʒ", "meaSure"],
  "oU": ["oʊ", "dOE"],
  "eI": ["eɪ", "hAY"],
  "aI": ["aɪ", "lIE"],
  "OI": ["ɔɪ", "OIl"],
  "aU": ["aʊ", "OWl"],
  "l": ["l", "Long"],
  "r": ["r", "Red"],
  "w": ["w", "Wonder"],
  "j": ["j", "Yard"],
  "m": ["m", "Mat"],
  "n": ["n", "No"],
  "h": ["h", "Hay"],
  "k": ["k", "Cut"],
  "g": ["g", "God"],
  "p": ["p", "Pile"],
  "b": ["b", "Bay"],
  "t": ["t", "Toad"],
  "d": ["d", "Dine"],
  "f": ["f", "Fast"],
  "v": ["v", "Vase"],
  "s": ["s", "Sad"],
  "z": ["z", "Zany"],
  "u": ["u", "nEW"]
};

const makePhonemeGuide = () => {
  const table = document.getElementById("phoneme-guide");
  for (let key of Object.keys(XSAMPA_TO_IPA_AND_GUIDE).sort()) {
    const row = document.createElement("tr");
    table.appendChild(row);
    const xsampaCell = document.createElement("td");
    const ipaCell = document.createElement("td");
    const guideCell = document.createElement("td");
    table.appendChild(xsampaCell);
    table.appendChild(ipaCell);
    table.appendChild(guideCell);
    xsampaCell.innerText = key.split(" ").map((phoneme) => `/${phoneme}/`).join(", ");
    const ipa = XSAMPA_TO_IPA_AND_GUIDE[key][0];
    ipaCell.innerText = ipa.split(" ").map((phoneme) => `/${phoneme}/`).join(", ");
    const guide = XSAMPA_TO_IPA_AND_GUIDE[key][1];
    let i;
    for (i = 0; i < guide.length; i++) {
      const character = guide[i];
      if (character !== character.toLowerCase()) {
        const element = document.createElement("strong");
        element.innerText = character.toLowerCase();
        guideCell.appendChild(element);
      } else {
        const element = document.createElement("span");
        element.innerText = character;
        guideCell.appendChild(element);
      }
    }
  }
};

// From https://developer.mozilla.org/en-US/docs/Glossary/Base64.

function uint6ToB64 (nUint6) {
  return nUint6 < 26 ?
      nUint6 + 65
    : nUint6 < 52 ?
      nUint6 + 71
    : nUint6 < 62 ?
      nUint6 - 4
    : nUint6 === 62 ?
      43
    : nUint6 === 63 ?
      47
    :
      65;
}

function base64EncArr(aBytes) {
  var nMod3 = 2, sB64Enc = "";
  for (var nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
    nMod3 = nIdx % 3;
    if (nIdx > 0 && (nIdx * 4 / 3) % 76 === 0) { sB64Enc += "\r\n"; }
    nUint24 |= aBytes[nIdx] << (16 >>> nMod3 & 24);
    if (nMod3 === 2 || aBytes.length - nIdx === 1) {
      sB64Enc += String.fromCharCode(uint6ToB64(nUint24 >>> 18 & 63), uint6ToB64(nUint24 >>> 12 & 63), uint6ToB64(nUint24 >>> 6 & 63), uint6ToB64(nUint24 & 63));
      nUint24 = 0;
    }
  }
  return sB64Enc.substr(0, sB64Enc.length - 2 + nMod3) + (nMod3 === 2 ? '' : nMod3 === 1 ? '=' : '==');
}

const showLoadingMessage = async (message: string) => {
  document.getElementById("loading-text").textContent = message + "...";;
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const ALL_VOICES = ["quake", "cicada", "air"];

class OddVoicesApp {
  container: HTMLElement;
  voices: any;
  g2p: any;

  constructor() {
    FS.mkdir("/root/");
    FS.mkdir("/root/voices/");
    FS.mkdir("/root/midi/");
    this.downloadFiles();
  }

  async downloadFiles() {
    let fileNames = ["cmudict-0.7b"];
    for (let name of ALL_VOICES) {
      fileNames.push("/voices/" + name + ".voice");
    }
    for (let fileName of fileNames) {
      await showLoadingMessage(`Downloading "${fileName}"`);
      let response = await fetch(fileName);
      let buffer = await response.arrayBuffer();
      let view = new Uint8Array(buffer);
      FS.writeFile("/root/" + fileName, view);
    }
    await this.createWASMObjects();
  }

  async createWASMObjects() {
    await showLoadingMessage("Parsing dictionary");
    this.g2p = new Module.G2P("/root/cmudict-0.7b");
    this.voices = {};
    for (let name of ALL_VOICES) {
      await showLoadingMessage(`Loading voice "${name}"`);
      this.voices[name] = new Module.Voice();
      this.voices[name].initFromFile(`/root/voices/${name}.voice`);
    }
    document.getElementById("on-loaded-container").style.visibility = "visible";
    document.getElementById("loading-container").style.display = "none";
    document.getElementById("submit").addEventListener("click", () => {
      this.sing();
    });
  }

  async sing() {
    let text = (document.getElementById("text") as HTMLTextAreaElement).value;

    let midiFile = (document.getElementById("midi") as HTMLInputElement).files[0];
    if (midiFile === undefined) {
      this.error("Please upload a MIDI file.");
      return;
    }
    let midiBuffer = await midiFile.arrayBuffer();
    let midiBufferView = new Uint8Array(midiBuffer);
    FS.writeFile("/root/midi/in.mid", midiBufferView);

    let voice = (document.getElementById("voice") as HTMLSelectElement).value;

    const error: string = Module.sing(
      this.voices[voice],
      this.g2p,
      "/root/midi/in.mid",
      "/root/out.wav",
      text
    );
    if (error !== "") {
      this.error(error);
      return;
    }

    const buffer: Uint8Array = FS.readFile("/root/out.wav");
    let audio = document.getElementById("audio");
    audio.setAttribute("src", "data:audio/wav;base64," + base64EncArr(buffer));

    this.error("");
  }

  error(errorString: string) {
    document.getElementById("error").textContent = errorString;
  }
}

document.getElementById("loading-text").textContent = "Loading WebAssembly...";

(window as any).Module = {
  onRuntimeInitialized: async () => {
    (window as any).app = new OddVoicesApp();
  }
};

makePhonemeGuide();
