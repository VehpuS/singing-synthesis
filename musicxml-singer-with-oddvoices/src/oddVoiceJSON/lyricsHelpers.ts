export const LYRICS_TO_CONSIDER_AS_CONTINUATIONS = ["", "-", "_", "..."];

export const VOWELS_WITHOUT_Y = ["a", "e", "i", "o", "u"];
export const LETTERS_TO_CONSIDER_APPENDING = [...VOWELS_WITHOUT_Y, "h"];

export const modifyLyricsForOddvoices = (lyrics: string): string => {
    let modifiedLyrics = lyrics;
    // Remove all non-alphabetic characters except whitespace and hyphens
    modifiedLyrics = modifiedLyrics.replace(/[^a-zA-Z\s-]/g, "");

    // Replace all hyphens with spaces
    modifiedLyrics = modifiedLyrics.replace(/-/g, " ");

    // Replace all whitespace with a single space
    modifiedLyrics = modifiedLyrics.replace(/\s+/g, " ");

    // Replace all repeated oos (more than 2) with 2 o's. For example, "Ooo" -> "Oo"
    // For some reason oddvoices doesn't like more than 2 o's in a row (it will split them into separate notes)
    modifiedLyrics = modifiedLyrics.replace(/Ooo+/g, "Oo");
    modifiedLyrics = modifiedLyrics.replace(/ooo+/g, "oo");

    modifiedLyrics = modifiedLyrics.trim();
    return modifiedLyrics;
};
