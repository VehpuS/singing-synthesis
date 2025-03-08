import {
    Dictionary,
    cloneDeep,
    compact,
    filter,
    find,
    findLast,
    findLastIndex,
    flatMap,
    forEach,
    includes,
    last,
    map,
    pick,
    reduce,
    reject,
    slice,
    some,
    sortBy,
    split,
    times,
    uniq,
} from "lodash";
import { EventType, OddVoiceJSON, createdOddVoiceJSONEvent } from "./oddVoiceHelpers";
import {
    DEFAULT_TEMPO,
    convertMusicXmlElementToHertz,
    durationToSeconds,
    isLyric,
    isMeasureAttributes,
    isMeasureDirection,
    isMeasureNote,
    parseVocalPartsFromRoot,
} from "../musicXmlParsing";
import {
    LYRICS_TO_CONSIDER_AS_CONTINUATIONS,
    LETTERS_TO_CONSIDER_APPENDING,
    modifyLyricsForOddvoices,
    VOWELS_WITHOUT_Y,
} from "./lyricsHelpers";
import {
    MeasureSound,
    MusicXmlJson,
    ScorePart,
    Measure,
    MusicXmlLyricsEvent,
    MusicXmlTempoEvent,
    MusicXmlNoteEvent,
    MeasureAttributes,
    MeasureDirection,
    MeasureNote,
    MeasurePrint,
    OrderedXMLNode,
    TextNode,
    ScorePartList,
} from "../musicXmlParsing/types";
import {
    findAllChildrenByTagName,
    findChildByTagName,
    getAllChildren,
    getAttributeValue,
    getTagName,
    getTextNode,
    isOrderedXMLNode,
} from "../musicXmlParsing/xmlHelpers";

export interface SplitParams {
    partIdx: number;
    partName: string;
    voice: number | string;
    chordLevel: number;
    largestChordLvl: number;
    numVoices: number;
}

const parseTempoChangesFromMeasureChild = ({
    measureChild,
    timeElapsed,
    currentDivisions,
    currentTempo,
    partIdx,
    partName,
    measureIdx,
}: {
    measureChild: MeasureAttributes | MeasureDirection | MeasureNote | MeasurePrint;
    timeElapsed: number;
    currentDivisions: number;
    currentTempo: number;
    partIdx: number;
    partName: string;
    measureIdx: number;
}): {
    newTempoEvents: MusicXmlTempoEvent[];
    newTempo: number;
    newDivisions: number;
} => {
    const tempoEvents: MusicXmlTempoEvent[] = [];

    if (isMeasureAttributes(measureChild)) {
        const divisionsEl = findChildByTagName(measureChild, "divisions") as OrderedXMLNode<string, TextNode>;
        const divisionsText = getTextNode(divisionsEl);
        if (divisionsText) {
            console.info(`Found new divisions ${divisionsText}`);
            currentDivisions = parseInt(divisionsText, 10);
            tempoEvents.push({
                time: timeElapsed,
                partIdx,
                partName,
                measureIdx,
                tempo: currentTempo,
                divisions: currentDivisions,
            });
        }
    } else if (isMeasureDirection(measureChild)) {
        console.info("Looking for tempo changes in measure direction");
        const soundElements = findAllChildrenByTagName<"sound", MeasureSound>(measureChild, "sound");

        const directionTempos = compact(
            map(soundElements, (s) => {
                const tempoValue = getAttributeValue(s, "tempo");
                if (tempoValue) {
                    return parseFloat(tempoValue);
                }
                return null;
            })
        );
        if (directionTempos.length > 0) {
            console.info(`Found new tempo ${last(directionTempos)}`);
            currentTempo = last(directionTempos)!;
            tempoEvents.push({
                time: timeElapsed,
                partIdx,
                partName,
                measureIdx,
                tempo: currentTempo,
                divisions: currentDivisions,
            });
        }
    }
    return {
        newTempoEvents: tempoEvents,
        newTempo: currentTempo,
        newDivisions: currentDivisions,
    };
};

export const musicXMLToEvents = (
    parsedMusicXml: MusicXmlJson
): {
    noteEvents: MusicXmlNoteEvent[];
    tempoEvents: MusicXmlTempoEvent[];
    lyricsEvents: MusicXmlLyricsEvent[];
} => {
    const scorePartwise = parsedMusicXml[1];
    const basePartList = findChildByTagName(scorePartwise, "part-list");
    if (!basePartList) {
        throw new Error("Could not find part-list");
    }

    const partNames = compact<string>(
        // @ts-expect-error - TODO: fix this
        map(
            findAllChildrenByTagName(basePartList as ScorePartList, "score-part"),
            (scorePart: ScorePart): string | undefined => {
                const partNameEl = findChildByTagName(scorePart, "part-name");
                return partNameEl
                    ? (getTextNode(partNameEl as OrderedXMLNode<string, TextNode>) as string | undefined)
                    : undefined;
            }
        )
    );
    const allPartMeasures = findAllChildrenByTagName<"part">(scorePartwise, "part");

    const allPartsMeasures = map(
        allPartMeasures,
        (part) => findAllChildrenByTagName(part, "measure") as unknown as Measure[]
    );

    const tempoEvents: MusicXmlTempoEvent[] = [];
    const noteEvents: MusicXmlNoteEvent[] = [];
    const lyricsEvents: MusicXmlLyricsEvent[] = [];

    const numMeasures = Math.max(...map(allPartsMeasures, (measuresInPart) => measuresInPart.length));

    const partChordLyricsTexts: Dictionary<string> = {};

    for (let measureIdx = 0; measureIdx < numMeasures; measureIdx++) {
        // const measureChild = measureChildren[measureChildIdx];
        // Update the tempo if we find a new one
        console.info("Looking for tempo changes in measure across all parts");
        const partHasTempoChangesInMeasure = map(allPartsMeasures, (partMeasures) => {
            const partMeasureChildren = partMeasures ? getAllChildren<"measure", Measure>(partMeasures) : [];
            const matchingChild = partMeasureChildren[measureIdx];
            if (matchingChild && isOrderedXMLNode(matchingChild)) {
                const soundElements = findAllChildrenByTagName<"sound", MeasureSound>(matchingChild, "sound");
                return some(soundElements, (s) => getAttributeValue(s, "tempo"));
            }
            return false;
        });
        const partsOrderedByTempoChanges = sortBy(times(partNames.length), (partIdx) =>
            partHasTempoChangesInMeasure[partIdx] ? 0 : 1
        );
        for (const partIdx of partsOrderedByTempoChanges) {
            const partName = partNames[partIdx];
            const measureElement = allPartsMeasures[partIdx]?.[measureIdx];
            const measureChildren = getAllChildren<"measure", Measure>(measureElement);

            const timeElapsedAtStartOfMeasure = Math.max(
                ...compact(
                    map(
                        filter(
                            noteEvents,
                            (e) => e.partIdx === partIdx && e.measureIdx < measureIdx && !isNaN(Number(e.time))
                        ),
                        ({ time, eventSeconds }) => Number(time ?? 0) + Number(eventSeconds ?? 0)
                    )
                ),
                0
            );
            const timeElapsedPerPartAndVoice: Dictionary<Dictionary<number>> = {};
            let currentDivisions =
                findLast(tempoEvents, (e) => e.measureIdx <= measureIdx && !isNaN(Number(e.tempo)))?.divisions ?? 1;

            let currentVoice = 1;
            let currentTempo =
                findLast(tempoEvents, (e) => e.measureIdx <= measureIdx && !isNaN(Number(e.tempo)))?.tempo ??
                DEFAULT_TEMPO;

            const currentChordDurationPerPartAndVoice: Dictionary<Dictionary<number>> = {};
            let currChordLvl = 1;
            forEach(measureChildren, (measureChild, measureChildIdx) => {
                const voiceEl = findChildByTagName(measureChild, "voice");
                const voiceText = getTextNode(voiceEl as OrderedXMLNode<string, TextNode>);
                if (voiceText) {
                    currentVoice = parseInt(voiceText, 10);
                }
                if (isMeasureAttributes(measureChild) || isMeasureDirection(measureChild)) {
                    const timeElapsedForPartAndVoice =
                        timeElapsedPerPartAndVoice?.[partIdx]?.[currentVoice] ?? timeElapsedAtStartOfMeasure;
                    const { newTempoEvents, newTempo, newDivisions } = parseTempoChangesFromMeasureChild({
                        measureChild,
                        timeElapsed: timeElapsedForPartAndVoice,
                        currentDivisions,
                        currentTempo,
                        partIdx,
                        partName,
                        measureIdx,
                    });
                    tempoEvents.push(...newTempoEvents);
                    currentTempo = newTempo;
                    currentDivisions = newDivisions;
                } else {
                    // chord detection https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/
                    const chordEl = findChildByTagName(measureChild, "chord");

                    const timeElapsedForPartAndVoice =
                        timeElapsedPerPartAndVoice?.[partIdx]?.[currentVoice] ?? timeElapsedAtStartOfMeasure;

                    if (chordEl) {
                        currChordLvl += 1;

                        const lastChordEvent = findLast(
                            noteEvents,
                            (e) => e.partIdx === partIdx && e.voice === currentVoice && e.chordLevel === currChordLvl
                        );
                        const lastChordEventTime = lastChordEvent?.time ?? 0;
                        // Find all note events after the last chord event and add them to this chord level as rests
                        const restEvents = filter(noteEvents, (e) =>
                            Boolean(
                                e.partIdx === partIdx &&
                                    e.voice === currentVoice &&
                                    e.time >= lastChordEventTime &&
                                    e.time < timeElapsedForPartAndVoice
                            )
                        );
                        console.log("Found rest events", {
                            restEvents,
                            noteEvents: [...noteEvents],
                            lastChordEvent,
                            timeElapsedForPartAndVoice,
                        });
                        forEach(restEvents, (restEvent) => {
                            // Check if a rest event already exists for this chord level at this time
                            const existingRestEvent = find(
                                noteEvents,
                                (e) =>
                                    e.partIdx === partIdx &&
                                    e.voice === currentVoice &&
                                    e.time === restEvent.time &&
                                    e.chordLevel === currChordLvl
                            );
                            if (existingRestEvent) {
                                console.log("Event already exists for this chord level at this time", {
                                    restEvent,
                                    existingRestEvent,
                                });
                                return;
                            }
                            const newRestEvent = cloneDeep(
                                pick(restEvent, [
                                    "time",
                                    "partIdx",
                                    "partName",
                                    "measureIdx",
                                    "voice",
                                    "eventSeconds",
                                    // These will be replaced
                                    "chordLevel",
                                    "isRest",
                                ])
                            );
                            newRestEvent.isRest = true;
                            newRestEvent.chordLevel = currChordLvl;

                            noteEvents.push(newRestEvent);
                        });
                    } else {
                        currChordLvl = 1;

                        const previousChordDuration =
                            currentChordDurationPerPartAndVoice?.[partIdx]?.[currentVoice] ?? 0;

                        // Progress the time elapsed with the previous chord
                        timeElapsedPerPartAndVoice[partIdx] = timeElapsedPerPartAndVoice?.[partIdx] || {};
                        timeElapsedPerPartAndVoice[partIdx][currentVoice] =
                            timeElapsedForPartAndVoice + previousChordDuration;

                        // Reset the chord duration - we're starting a new chord
                        currentChordDurationPerPartAndVoice[partIdx] =
                            currentChordDurationPerPartAndVoice?.[partIdx] || {};
                        currentChordDurationPerPartAndVoice[partIdx][currentVoice] = 0;
                    }

                    const durationEl = findChildByTagName(measureChild, "duration");
                    const durationText = getTextNode(durationEl as OrderedXMLNode<string, TextNode>);

                    if (!isMeasureNote(measureChild) || findChildByTagName(measureChild, "rest")) {
                        // Not a note / is a rest
                        console.log("Not a note / is a rest", { measureChild, measureChildIdx });
                        const durationEl = findChildByTagName(measureChild, "duration");
                        if (durationEl) {
                            if (!durationText) {
                                throw new Error(`No duration text content: ${JSON.stringify(durationEl)}`);
                            }
                            const isBackup = getTagName(measureChild) === "backup";
                            const duration = parseFloat(durationText) * (isBackup ? -1 : 1);
                            const eventSeconds = durationToSeconds(duration, currentDivisions, currentTempo);

                            const timeElapsedForPartAndVoice =
                                timeElapsedPerPartAndVoice?.[partIdx]?.[currentVoice] ?? timeElapsedAtStartOfMeasure;
                            noteEvents.push({
                                time: timeElapsedForPartAndVoice,
                                partIdx,
                                partName,
                                measureIdx,
                                voice: currentVoice,
                                chordLevel: currChordLvl,
                                eventSeconds,
                                isRest: true,
                            });
                            timeElapsedPerPartAndVoice[partIdx] = timeElapsedPerPartAndVoice?.[partIdx] || {};
                            timeElapsedPerPartAndVoice[partIdx][currentVoice] =
                                timeElapsedForPartAndVoice + eventSeconds;
                        }
                    } else {
                        if (!isMeasureNote(measureChild)) {
                            throw new Error(`Unexpected measure child: ${JSON.stringify(measureChild)}`);
                        }

                        // Check for grace notes
                        const graceEl = findChildByTagName(measureChild, "grace");
                        if (graceEl) {
                            console.log("Found grace note", { measureChild }, "skipping");
                            return;
                        }

                        // Extract lyrics
                        const latestVoiceLyricStartIndex = findLastIndex(
                            lyricsEvents,
                            (e) => !e.continuesPrevious && e.partIdx === partIdx && e.voice === measureIdx
                        );
                        const hasVoiceLyric = latestVoiceLyricStartIndex !== -1;

                        const latestPartLyricStartIndex = !hasVoiceLyric
                            ? findLastIndex(lyricsEvents, (e) => !e.continuesPrevious && e.partIdx === partIdx)
                            : -1;
                        const hasPartLyric = latestPartLyricStartIndex !== -1;

                        const latestLyricEvents = hasVoiceLyric
                            ? filter(
                                  slice(
                                      lyricsEvents,
                                      latestVoiceLyricStartIndex !== -1
                                          ? latestVoiceLyricStartIndex
                                          : latestPartLyricStartIndex
                                  ),
                                  (e) => e.partIdx === partIdx && e.voice === currentVoice
                              )
                            : hasPartLyric
                            ? filter(slice(lyricsEvents, latestPartLyricStartIndex), (e) => e.partIdx === partIdx)
                            : [];

                        const previousLyricText = reduce(
                            latestLyricEvents,
                            (acc, e) => (acc + (e.continuesPrevious ? "" : " ") + e.lyric).trim(),
                            ""
                        );

                        partChordLyricsTexts[`${partIdx}_${currChordLvl}`] =
                            partChordLyricsTexts[`${partIdx}_${currChordLvl}`] ?? "";
                        let newLyricText = "";

                        const timeElapsedForPartAndVoice =
                            timeElapsedPerPartAndVoice?.[partIdx]?.[currentVoice] ?? timeElapsedAtStartOfMeasure;

                        let continuesPreviousLyric = false;
                        const staccatoEl = findChildByTagName(measureChild, "staccato");
                        const { frequency, isUnpitched } = convertMusicXmlElementToHertz(measureChild);
                        const lastPartVoiceChord = findLast(
                            noteEvents,
                            (e) => e.partIdx === partIdx && e.voice === currentVoice && e.chordLevel === currChordLvl
                        );
                        const lastPartVoiceChordFrequency = lastPartVoiceChord?.frequency;
                        const lastPartVoiceChordIsUnpitched = lastPartVoiceChord?.isUnpitched;
                        const lastPartVoiceChordIsRest = lastPartVoiceChord?.isRest;
                        const didChangeFrequency =
                            lastPartVoiceChordIsRest ||
                            frequency !== lastPartVoiceChordFrequency ||
                            isUnpitched !== lastPartVoiceChordIsUnpitched;

                        forEach(getAllChildren(measureChild), (lyricEl) => {
                            if (!isLyric(lyricEl)) {
                                // No lyric element
                                return;
                            }
                            const textEl = findChildByTagName(lyricEl, "text");
                            if (!textEl) {
                                console.log("No text in the lyric", { lyricEl });
                                return;
                            }

                            const newTextString = getTextNode(textEl as OrderedXMLNode<string, TextNode>)?.trim() ?? "";
                            if (!newTextString || LYRICS_TO_CONSIDER_AS_CONTINUATIONS.includes(newTextString)) {
                                console.log("Lyrics are continuation strings, no need to add them", {
                                    lyricEl,
                                    newTextString,
                                    LYRICS_TO_CONSIDER_AS_CONTINUATIONS,
                                });
                                if (didChangeFrequency) {
                                    // But if this is a new sound, add it, with the last vowel of the previous lyric. Or add ah if nothing is found
                                    const lastLyric =
                                        previousLyricText ||
                                        last(split(partChordLyricsTexts[`${partIdx}_${currChordLvl}`], " ")) ||
                                        "ah";
                                    const lastVowelIndex = findLastIndex(
                                        lastLyric,
                                        (c) => !includes(VOWELS_WITHOUT_Y, c)
                                    );
                                    const continuationLyricString =
                                        lastVowelIndex !== -1 ? lastLyric.slice(lastVowelIndex) : lastLyric;
                                    newLyricText += continuationLyricString;
                                    console.log("Adding continuation lyric", {
                                        lyricEl,
                                        newTextString,
                                        newLyricText,
                                        partChordLyrics: partChordLyricsTexts[`${partIdx}_${currChordLvl}`],
                                    });
                                    lyricsEvents.push({
                                        time: timeElapsedForPartAndVoice,
                                        partIdx,
                                        partName,
                                        measureIdx,
                                        voice: currentVoice,
                                        chordLevel: currChordLvl,
                                        lyric: continuationLyricString,
                                        continuesPrevious: !lastPartVoiceChordIsRest,
                                    });
                                    continuesPreviousLyric = !lastPartVoiceChordIsRest;
                                }
                                return;
                            }

                            // If this is the first lyric, add it
                            if (!previousLyricText) {
                                newLyricText += newTextString;
                                console.log("First lyric", {
                                    lyricEl,
                                    measureChild,
                                    newTextString,
                                    newLyricText,
                                    partChordLyrics: partChordLyricsTexts[`${partIdx}_${currChordLvl}`],
                                });
                                lyricsEvents.push({
                                    time: timeElapsedForPartAndVoice,
                                    partIdx,
                                    partName,
                                    measureIdx,
                                    voice: currentVoice,
                                    chordLevel: currChordLvl,
                                    lyric: newTextString,
                                    continuesPrevious: false,
                                });
                                return;
                            }

                            const syllabicEl = findChildByTagName(lyricEl, "syllabic");
                            const syllabicText = getTextNode(syllabicEl as OrderedXMLNode<string, TextNode>);
                            if (
                                !syllabicText ||
                                // Always add the first syllable
                                syllabicText === "single" ||
                                syllabicText === "begin" ||
                                // Add lyrics that are not vowels / h as a new syllable
                                !includes(LETTERS_TO_CONSIDER_APPENDING, newTextString[0])
                            ) {
                                newLyricText += ` ${newTextString}`;
                                console.log("Adding new syllable", {
                                    lyricEl,
                                    measureChild,
                                    newTextString,
                                    newLyricText,
                                    partChordLyrics: partChordLyricsTexts[`${partIdx}_${currChordLvl}`],
                                    syllabicText,
                                    LETTERS_TO_CONSIDER_APPENDING,
                                });
                                lyricsEvents.push({
                                    time: timeElapsedForPartAndVoice,
                                    partIdx,
                                    partName,
                                    measureIdx,
                                    voice: currentVoice,
                                    chordLevel: currChordLvl,
                                    lyric: newTextString,
                                    continuesPrevious: false,
                                });
                                return;
                            }

                            // If the previous lyrics ended in or are a vowel and the new lyric is the same, skip it
                            // Only add the new lyric if it starts with a different letter
                            const lastLetterInPreviousLyric = last(previousLyricText);
                            let firstNewLetter = newTextString.length;

                            for (let i = 0; i < newTextString.length; i++) {
                                if (newTextString[i] !== lastLetterInPreviousLyric) {
                                    firstNewLetter = i;
                                    break;
                                }
                            }

                            if (firstNewLetter === newTextString.length && didChangeFrequency) {
                                // If this is a new sound, add it, with the last vowel of the previous lyric or the whole previous lyric if no vowel is found
                                const lastVowelIndex = findLastIndex(
                                    newTextString,
                                    (c) => !includes(VOWELS_WITHOUT_Y, c)
                                );
                                firstNewLetter = lastVowelIndex !== -1 ? lastVowelIndex + 1 : 0;
                            }

                            const newText = newTextString.slice(firstNewLetter).trim();
                            if (newText) {
                                // If the new text is only one letter, it's likely an ending consonant, h or y
                                const isNewTextOnlyOneLetter = uniq(newText).length === 1;
                                // If the new text is a vowel without y, it's going to form a new sound
                                const isVowerWithoutY = includes(VOWELS_WITHOUT_Y, newText[0]);
                                continuesPreviousLyric =
                                    isNewTextOnlyOneLetter &&
                                    !isVowerWithoutY &&
                                    !lastPartVoiceChordIsRest &&
                                    !didChangeFrequency &&
                                    !staccatoEl;
                                newLyricText += `${continuesPreviousLyric ? "" : " "}${newText}`;
                                console.log("Adding after new letter", {
                                    lyricEl,
                                    measureChild,
                                    newText,
                                    newLyricText,
                                    partChordLyrics: partChordLyricsTexts[`${partIdx}_${currChordLvl}`],
                                    firstNewLetter,
                                    newTextString,
                                    lastLetterInPreviousLyric,
                                    continuesPreviousLyric,
                                });
                                lyricsEvents.push({
                                    time: timeElapsedForPartAndVoice,
                                    partIdx,
                                    partName,
                                    measureIdx,
                                    voice: currentVoice,
                                    chordLevel: currChordLvl,
                                    lyric: newText,
                                    continuesPrevious: continuesPreviousLyric,
                                });
                                return;
                            }
                        });

                        // Chords with no lyrics should have the previous lyrics added to them
                        if (!newLyricText && currChordLvl > 1) {
                            // Find the last lyric event for this part and voice with a lower chord level
                            const lastLyricEvent = findLast(
                                lyricsEvents,
                                (e) =>
                                    e.partIdx === partIdx &&
                                    e.voice === currentVoice &&
                                    e.time === timeElapsedForPartAndVoice
                            );
                            if (lastLyricEvent) {
                                const newLyricEvent = cloneDeep(lastLyricEvent);
                                newLyricEvent.chordLevel = currChordLvl;
                                // Only add this event if it doesn't exist yet
                                if (!find(lyricsEvents, newLyricEvent)) {
                                    continuesPreviousLyric = Boolean(newLyricEvent.continuesPrevious);
                                    newLyricText = `${continuesPreviousLyric ? "" : " "}${newLyricEvent.lyric ?? ""}`;
                                    console.log("Adding previous lyric", {
                                        measureChild,
                                        newLyricText,
                                        partChordLyrics: partChordLyricsTexts[`${partIdx}_${currChordLvl}`],
                                        lastLyricEvent,
                                        newLyricEvent,
                                    });
                                    lyricsEvents.push(newLyricEvent);
                                }
                            }
                        }

                        const lyricsChanged = Boolean(newLyricText);

                        // Update the lyrics for the part
                        partChordLyricsTexts[`${partIdx}_${currChordLvl}`] += newLyricText;

                        if (!durationText) {
                            throw new Error(`No duration element found: ${JSON.stringify(measureChild)}`);
                        }
                        const duration = parseFloat(durationText);

                        const eventSeconds = durationToSeconds(duration, currentDivisions, currentTempo);
                        console.log(
                            `Note number ${measureChildIdx} with duration ${duration} (${eventSeconds} seconds) and frequency ${frequency}`
                        );

                        if (
                            continuesPreviousLyric &&
                            lastPartVoiceChord &&
                            lastPartVoiceChord.eventSeconds !== undefined &&
                            lastPartVoiceChord.eventSeconds !== null
                        ) {
                            lastPartVoiceChord.lyrics += newLyricText;
                            lastPartVoiceChord.lyricsChanged = lyricsChanged;
                            lastPartVoiceChord.eventSeconds += eventSeconds;
                        } else {
                            if (continuesPreviousLyric) {
                                console.warn("Continues previous lyric but no previous note found", {
                                    partIdx,
                                    currentVoice,
                                    currChordLvl,
                                    newLyricText,
                                    partChordLyrics: partChordLyricsTexts[`${partIdx}_${currChordLvl}`],
                                    lastPartVoiceChord,
                                });
                            }
                            noteEvents.push({
                                time: timeElapsedForPartAndVoice,
                                partIdx,
                                partName,
                                measureIdx,
                                voice: currentVoice,
                                chordLevel: currChordLvl,
                                eventSeconds,
                                frequency,
                                isRest: false,
                                lyricsChanged,
                                lyrics: newLyricText,
                                isStaccato: Boolean(staccatoEl),
                                isUnpitched,
                            });
                        }
                        const currentChordDuration =
                            currentChordDurationPerPartAndVoice?.[partIdx]?.[currentVoice] ?? 0;
                        currentChordDurationPerPartAndVoice[partIdx] =
                            currentChordDurationPerPartAndVoice?.[partIdx] || {};
                        currentChordDurationPerPartAndVoice[partIdx][currentVoice] = Math.max(
                            currentChordDuration,
                            eventSeconds
                        );
                    }
                }
            });
        }
    }
    return {
        noteEvents,
        tempoEvents,
        lyricsEvents,
    };
};

export const generateOddVoiceJsonForSplit = ({
    splitParams,
    noteEvents,
}: {
    splitParams: SplitParams;
    noteEvents: MusicXmlNoteEvent[];
}): OddVoiceJSON => {
    const partJson: OddVoiceJSON = { lyrics: "", events: [] };

    const splitNoteEvents = filter(
        noteEvents,
        (e) =>
            e.partIdx === splitParams.partIdx &&
            e.voice === splitParams.voice &&
            e.chordLevel === splitParams.chordLevel
    );

    partJson.lyrics = modifyLyricsForOddvoices(
        map(reject(splitNoteEvents, "isRest"), (e) => e.lyrics ?? "")
            .join("")
            .trim()
    );
    partJson.events = flatMap(splitNoteEvents, (noteEvent, noteEventIdx) => {
        const { time, frequency, lyricsChanged, isStaccato, eventSeconds, isRest } = noteEvent;
        const newEvents = [];
        if (isRest) {
            newEvents.push(
                createdOddVoiceJSONEvent({
                    eventType: EventType.NoteOff,
                    time,
                })
            );
            newEvents.push(
                createdOddVoiceJSONEvent({
                    eventType: EventType.Empty,
                    time,
                })
            );
        } else {
            if (lyricsChanged) {
                // Add a note off event before the new lyrics
                console.log("Found new lyrics");
                newEvents.push(
                    createdOddVoiceJSONEvent({
                        eventType: EventType.NoteOff,
                        time,
                    })
                );
            }
            newEvents.push(
                createdOddVoiceJSONEvent({
                    eventType: EventType.SetTargetFrequency,
                    time,
                    frequency,
                })
            );
            if (lyricsChanged) {
                newEvents.push(
                    createdOddVoiceJSONEvent({
                        eventType: EventType.NoteOn,
                        time,
                    })
                );

                if (isStaccato) {
                    newEvents.push(
                        createdOddVoiceJSONEvent({
                            eventType: EventType.SetPhonemeSpeed,
                            time,
                            phonemeSpeed: 1.5,
                        })
                    );
                    newEvents.push(
                        createdOddVoiceJSONEvent({
                            eventType: EventType.SetPhonemeSpeed,
                            time: time + (eventSeconds ?? 0),
                            phonemeSpeed: 1.0,
                        })
                    );
                }
            }
        }

        console.log({ noteEvent, noteEventIdx, newEvents });

        return newEvents;
    });

    const lastEvent = last(splitNoteEvents);
    if (lastEvent) {
        if (!lastEvent.isRest) {
            partJson.events.push(
                createdOddVoiceJSONEvent({
                    eventType: EventType.NoteOff,
                    time: lastEvent.time + (lastEvent.eventSeconds ?? 0),
                })
            );
        }
    }

    return partJson;
};

export const createSplitOddVoiceJsonInputsFromMusicXml = (
    parsedMusicXml: MusicXmlJson
): Array<{
    output: OddVoiceJSON;
    splitParams: SplitParams;
    unparsedPartEvents: {
        lyricsEvents: MusicXmlLyricsEvent[];
        tempoEvents: MusicXmlTempoEvent[];
        noteEvents: MusicXmlNoteEvent[];
    };
}> => {
    const scorePartwise = parsedMusicXml[1];
    const partsDetails = parseVocalPartsFromRoot(scorePartwise);

    const splitsToGenerate: SplitParams[] = flatMap(partsDetails, (p) =>
        flatMap(p.voices, (voice, voiceIdx) =>
            times(p.largestChordPerVoice[voiceIdx], (chordLevel) => ({
                partIdx: p.partIdx,
                partName: p.partName,
                voice,
                chordLevel: chordLevel + 1,
                largestChordLvl: p.largestChordPerVoice[voiceIdx],
                numVoices: p.voices.length,
            }))
        )
    );

    const parsedEvents = musicXMLToEvents(parsedMusicXml);
    return map(splitsToGenerate, (splitParams: SplitParams) => ({
        splitParams,
        output: generateOddVoiceJsonForSplit({ splitParams, ...parsedEvents }),
        unparsedPartEvents: {
            tempoEvents: parsedEvents?.tempoEvents,
            noteEvents: filter(
                parsedEvents?.noteEvents,
                (e) =>
                    e.partIdx === splitParams.partIdx &&
                    e.voice === splitParams.voice &&
                    e.chordLevel === splitParams.chordLevel
            ),
            lyricsEvents: filter(
                parsedEvents?.lyricsEvents,
                (e) =>
                    e.partIdx === splitParams.partIdx &&
                    e.voice === splitParams.voice &&
                    e.chordLevel === splitParams.chordLevel
            ),
        },
    }));
};
