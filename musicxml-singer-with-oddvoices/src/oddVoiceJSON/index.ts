import {
    Dictionary,
    compact,
    filter,
    findLast,
    findLastIndex,
    flatMap,
    forEach,
    includes,
    last,
    map,
    reduce,
    slice,
    some,
    sortBy,
    times,
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
import { LETTERS_TO_AVOID_APPENDING, LYRICS_TO_CONSIDER_AS_CONTINUATIONS } from "./lyricsHelpers";
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
    chordLvl: number;
    largestChordLvl: number;
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
                    if (chordEl) {
                        currChordLvl += 1;
                    } else {
                        currChordLvl = 1;

                        const timeElapsedForPartAndVoice =
                            timeElapsedPerPartAndVoice?.[partIdx]?.[currentVoice] ?? timeElapsedAtStartOfMeasure;

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
                            (acc, e) => acc + (e.continuesPrevious ? "" : " ") + e.lyric,
                            ""
                        );
                        let newLyricText = "";

                        const timeElapsedForPartAndVoice =
                            timeElapsedPerPartAndVoice?.[partIdx]?.[currentVoice] ?? timeElapsedAtStartOfMeasure;

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
                                console.log("Lyrics continues previous", { lyricEl, newTextString });
                                return;
                            }

                            // If this is the first lyric, add it
                            if (!previousLyricText) {
                                newLyricText += newTextString;
                                console.log("First lyric", { lyricEl, newTextString, newLyricText });
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
                                !includes(LETTERS_TO_AVOID_APPENDING, newTextString[0])
                            ) {
                                newLyricText += ` ${newTextString}`;
                                console.log("Adding new syllable", { lyricEl, newTextString, newLyricText });
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
                            let firstNewLetter = 0;

                            for (let i = 0; i < newTextString.length; i++) {
                                if (newTextString[i] !== lastLetterInPreviousLyric) {
                                    firstNewLetter = i;
                                    break;
                                }
                            }

                            const newText = newTextString.slice(firstNewLetter).trim();
                            if (newText) {
                                console.log("Adding new syllable", { lyricEl, newText, newLyricText });
                                newLyricText += ` ${newText}`;
                                lyricsEvents.push({
                                    time: timeElapsedForPartAndVoice,
                                    partIdx,
                                    partName,
                                    measureIdx,
                                    voice: currentVoice,
                                    chordLevel: currChordLvl,
                                    lyric: newText,
                                    continuesPrevious: false,
                                });
                                return;
                            }
                        });

                        if (!hasVoiceLyric && previousLyricText && !newLyricText) {
                            // If voice has no lyrics, but the part does, add the previous lyric
                            newLyricText += previousLyricText;
                            lyricsEvents.push({
                                time: timeElapsedForPartAndVoice,
                                partIdx,
                                partName,
                                measureIdx,
                                chordLevel: currChordLvl,
                                voice: currentVoice,
                                lyric: previousLyricText,
                                continuesPrevious: false,
                            });
                        }

                        const lyricsChanged = Boolean(newLyricText);

                        if (!durationText) {
                            throw new Error(`No duration element found: ${JSON.stringify(measureChild)}`);
                        }
                        const duration = parseFloat(durationText);

                        const eventSeconds = durationToSeconds(duration, currentDivisions, currentTempo);
                        const frequency = convertMusicXmlElementToHertz(measureChild);
                        console.log(
                            `Note number ${measureChildIdx} with duration ${duration} (${eventSeconds} seconds) and frequency ${frequency}`
                        );

                        const staccatoEl = findChildByTagName(measureChild, "staccato");
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
                        });
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
            e.partIdx === splitParams.partIdx && e.voice === splitParams.voice && e.chordLevel === splitParams.chordLvl
    );

    partJson.lyrics = map(splitNoteEvents, (e) => e.lyrics ?? "")
        .join("")
        .trim();
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
): Array<{ output: OddVoiceJSON; splitParams: SplitParams }> => {
    const scorePartwise = parsedMusicXml[1];
    const partsDetails = parseVocalPartsFromRoot(scorePartwise);

    const splitsToGenerate: SplitParams[] = flatMap(partsDetails, (p) =>
        flatMap(p.voices, (voice, voiceIdx) =>
            times(p.largestChordPerVoice[voiceIdx], (chordLvl) => ({
                partIdx: p.partIdx,
                partName: p.partName,
                voice,
                chordLvl: chordLvl + 1,
                largestChordLvl: p.largestChordPerVoice[voiceIdx],
            }))
        )
    );

    const parsedEvents = musicXMLToEvents(parsedMusicXml);
    return map(splitsToGenerate, (splitParams: SplitParams) => ({
        ...parsedEvents,
        splitParams,
        output: generateOddVoiceJsonForSplit({ splitParams, ...parsedEvents }),
    }));
};
