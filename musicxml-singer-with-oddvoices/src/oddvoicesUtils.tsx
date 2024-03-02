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

export const ALL_VOICES = ["air", "cicada", "quake"];
