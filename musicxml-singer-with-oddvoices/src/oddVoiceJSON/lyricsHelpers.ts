export const LYRICS_TO_CONSIDER_AS_CONTINUATIONS = ["", "-", "_", "..."];

export const VOWELS_WITHOUT_Y = ["a", "e", "i", "o", "u"];
export const LETTERS_TO_CONSIDER_APPENDING = [...VOWELS_WITHOUT_Y, "h"];

export const modifyLyricsForOddvoices = (lyrics: string): string => {
    let modifiedLyrics = lyrics;
    modifiedLyrics = modifiedLyrics.replace(/[^a-zA-Z\s-]/g, "");
    modifiedLyrics = modifiedLyrics.replace(/-/g, " ");
    modifiedLyrics = modifiedLyrics.replace(/\s+/g, " ");
    modifiedLyrics = modifiedLyrics.trim();
    return modifiedLyrics;
};
