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

    // Replace all repeated aas (more than 2) with ah. For example, "Aaaa" -> "Ah"
    // For some reason, oddvoices will read "aa" as "ay ay" instead of "ah", and splitting them into separate notes
    modifiedLyrics = modifiedLyrics.replace(/Aa+/g, "Ah");
    modifiedLyrics = modifiedLyrics.replace(/aa+/g, "ah");

    // Replace be lieve with be leave to help addvoices pronounce it correctly
    modifiedLyrics = modifiedLyrics.replace(/be lieve/g, "be leave");
    modifiedLyrics = modifiedLyrics.replace(/Be lieve/g, "Be leave");
    modifiedLyrics = modifiedLyrics.replace(/BE LIEVE/g, "BE LEAVE");

    // Replace be lieve with be leave to help addvoices pronounce it correctly
    modifiedLyrics = modifiedLyrics.replace(/lis ten/g, "liss sen");
    modifiedLyrics = modifiedLyrics.replace(/Lis ten/g, "Liss sen");
    modifiedLyrics = modifiedLyrics.replace(/LIS TEN/g, "LISS SEN");

    modifiedLyrics = modifiedLyrics.trim();
    return modifiedLyrics;
};
