import { Module } from "./oddvoices_wasm.js";

declare global {
    let Module: any;
    let FS: any;
}

// From https://developer.mozilla.org/en-US/docs/Glossary/Base64.

function uint6ToB64(nUint6: number) {
    return nUint6 < 26
        ? nUint6 + 65
        : nUint6 < 52
        ? nUint6 + 71
        : nUint6 < 62
        ? nUint6 - 4
        : nUint6 === 62
        ? 43
        : nUint6 === 63
        ? 47
        : 65;
}

export function base64EncArr(aBytes: Uint8Array) {
    let nMod3 = 2,
        sB64Enc = "";

    for (let nLen = aBytes.length, nUint24 = 0, nIdx = 0; nIdx < nLen; nIdx++) {
        nMod3 = nIdx % 3;
        if (nIdx > 0 && ((nIdx * 4) / 3) % 76 === 0) {
            sB64Enc += "\r\n";
        }
        nUint24 |= aBytes[nIdx] << ((16 >>> nMod3) & 24);
        if (nMod3 === 2 || aBytes.length - nIdx === 1) {
            sB64Enc += String.fromCharCode(
                uint6ToB64((nUint24 >>> 18) & 63),
                uint6ToB64((nUint24 >>> 12) & 63),
                uint6ToB64((nUint24 >>> 6) & 63),
                uint6ToB64(nUint24 & 63)
            );
            nUint24 = 0;
        }
    }
    return sB64Enc.substr(0, sB64Enc.length - 2 + nMod3) + (nMod3 === 2 ? "" : nMod3 === 1 ? "=" : "==");
}

export const ALL_VOICES = ["quake", "cicada", "air"];
class OddVoicesApp {
    voices: any;

    g2p: any;

    constructor() {
        FS.mkdir("/root/");
        FS.mkdir("/root/voices/");
        FS.mkdir("/root/midi/");
        this.downloadFiles();
    }

    async downloadFiles() {
        const fileNames = ["cmudict-0.7b"];
        for (const name of ALL_VOICES) {
            fileNames.push("/voices/" + name + ".voice");
        }
        for (const fileName of fileNames) {
            // await showLoadingMessage(`Downloading "${fileName}"`);
            const response = await fetch(fileName);
            const buffer = await response.arrayBuffer();
            const view = new Uint8Array(buffer);
            FS.writeFile("/root/" + fileName, view);
        }
        await this.createWASMObjects();
    }

    async createWASMObjects() {
        // await showLoadingMessage("Parsing dictionary");
        this.g2p = new Module.G2P("/root/cmudict-0.7b");
        this.voices = {};
        for (const name of ALL_VOICES) {
            // await showLoadingMessage(`Loading voice "${name}"`);
            this.voices[name] = new Module.Voice();
            this.voices[name].initFromFile(`/root/voices/${name}.voice`);
        }
        // document.getElementById("on-loaded-container").style.visibility = "visible";
        // document.getElementById("loading-container").style.display = "none";

        // document.getElementById("submit").addEventListener("click", () => {
        //     this.sing();
        // });
    }

    async sing(text: string, midiBuffer: ArrayBuffer, voice: string) {
        // let text = (document.getElementById("text") as HTMLTextAreaElement).value;

        // let midiFile = (document.getElementById("midi") as HTMLInputElement).files[0];
        // if (midiFile === undefined) {
        //     this.error("Please upload a MIDI file.");
        //     return;
        // }
        // let midiBuffer = await midiFile.arrayBuffer();
        const midiBufferView = new Uint8Array(midiBuffer);
        FS.writeFile("/root/midi/in.mid", midiBufferView);

        // let voice = (document.getElementById("voice") as HTMLSelectElement).value;

        const error: string = Module.sing(this.voices[voice], this.g2p, "/root/midi/in.mid", "/root/out.wav", text);
        if (error !== "") {
            console.error(error);
            return;
        }

        const buffer: Uint8Array = FS.readFile("/root/out.wav");
        return buffer;
        // let audio = document.getElementById("audio");
        // audio.setAttribute("src", "data:audio/wav;base64," + base64EncArr(buffer));
    }
}

(window as any).Module = {
    onRuntimeInitialized: async () => {
        (window as any).app = new OddVoicesApp();
    },
};

// makePhonemeGuide();
