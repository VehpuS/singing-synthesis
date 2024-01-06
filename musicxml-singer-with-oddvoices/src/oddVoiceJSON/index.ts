import { compact, first, flatMap, forEach, includes, last, map, slice, times } from "lodash";
import { EventType, OddVoiceJSON, createdOddVoiceJSONEvent } from "./oddVoiceHelpers";
import { DEFAULT_TEMPO, convertMusicXmlElementToHertz, durationToSeconds, isLyric, isMeasureAttributes, isMeasureNote, parseVocalPartsFromRoot } from "../musicXmlParsing";
import { LETTERS_TO_AVOID_APPENDING, LYRICS_TO_CONSIDER_AS_CONTINUATIONS } from "./lyricsHelpers";
import { Lyric, MeasureSound, MusicXmlJson, ScorePart, Measure, ScorePartMeasures } from "../musicXmlParsing/types";
import { findAllChildrenByTagName, findChildByTagName, getAllChildren, getAttributeValue, getTagName, getTextNode, isOrderedXMLNode } from "../musicXmlParsing/xmlHelpers";

export interface SplitParams {
    partIdx: number;
    partName: string;
    voice: number | string;
    chordLvl: number;
    largestChordLvl: number;
}

export const createOddVoicePart = (
    parsedMusicXml: MusicXmlJson,
    params: SplitParams,
): OddVoiceJSON => {
    const scorePartwise = parsedMusicXml[1];
    const basePartList = findChildByTagName(scorePartwise, "part-list");
    if (!basePartList) {
        throw new Error("Could not find part-list");
    }

    const partNames = compact(
        map(
            findAllChildrenByTagName<"score-part", ScorePart>(basePartList, "score-part"),
            (scorePart) => {
                const partNameEl = findChildByTagName(scorePart, "part-name");
                return partNameEl && getTextNode(partNameEl);
            })
    );
    const splitPartName = partNames[params.partIdx];
    if (!splitPartName) {
        throw new Error(
            `Wrong part name while expecting ${params.partName} at index ${params.partIdx}. Found part ${splitPartName}`,
        );
    }

    console.log(`Processing part ${splitPartName}`);

    const allPartMeasures = findAllChildrenByTagName<"part", ScorePartMeasures>(scorePartwise, "part");

    const allPartsMeasures = map(
        allPartMeasures,
        (part) => findChildByTagName<"measure", Measure>(part, "measure")
    );

    let foundSegment = false;

    let partJson: OddVoiceJSON = {
        lyrics: "",
        events: [],
    };
    let timeElapsed = 0;
    let currentDivisions = 1;
    let currentTempo = DEFAULT_TEMPO;

    const basePartMeasures = allPartsMeasures[params.partIdx];
    const measureChildren = basePartMeasures ? getAllChildren<"measure", Measure>(basePartMeasures) : [];

    let currChordLvl = 1;
    let lyricBeforeSegment: Lyric | null = null;
    let chordStartIdx = -1;

    for (let measureChildIdx = 0; measureChildIdx < measureChildren.length; measureChildIdx++) {
        const measureChild = measureChildren[measureChildIdx];
        // Update the tempo if we find a new one
        console.log("Looking for tempo changes in measure across all parts");
        const measureChildrenInAllParts: Array<typeof measureChild> = (
            compact(map(
                allPartsMeasures,
                (partMeasures) => {
                    const partMeasureChildren = partMeasures ? getAllChildren<"measure", Measure>(partMeasures) : [];
                    const matchingChild = partMeasureChildren[measureChildIdx];
                    if (matchingChild && isOrderedXMLNode(matchingChild)) {
                        return matchingChild;
                    }
                    return null;
                },
            )));

        for (const measureChildInAllParts of measureChildrenInAllParts) {
            const soundElements = findAllChildrenByTagName<"sound", MeasureSound>(measureChildInAllParts, "sound");
            const directionTempos = compact(map(
                soundElements,
                (s) => {
                    const tempoValue = getAttributeValue(s, "tempo");
                    if (tempoValue) {
                        return parseFloat(tempoValue);
                    }
                    return null;
                },
            ));
            if (directionTempos.length > 0) {
                console.log(`Found new tempo ${last(directionTempos)}`);
                currentTempo = last(directionTempos)!;
                break;
            }
        }

        const lyricsInAllParts = map(
            measureChildrenInAllParts,
            (measureChildInAllParts) => findChildByTagName<"lyric", Lyric>(measureChildInAllParts, "lyric"),
        );

        console.log({ params, lyricsInAllParts })

        const lyricForPart = lyricsInAllParts[params.partIdx];
        const firstLyric = first(compact(lyricsInAllParts));
        if (lyricForPart && !foundSegment) {
            console.log("Found lyric before segment", { lyricForPart });
            lyricBeforeSegment = lyricForPart;
        } else if (firstLyric && !foundSegment && !lyricBeforeSegment) {
            console.log("Found lyric before segment", { firstLyric });
            lyricBeforeSegment = firstLyric;
        }


        // forEach(lyricsInAllParts, (measureChildInAllParts, currPartIdx) => {
        //     // The lyrics can be assigned to another voice, so we need to keep track of the first occurrence
        //     const measureLyricEl = findChildByTagName<"lyric", Lyric>(measureChildInAllParts, "lyric");
        //     if (measureLyricEl && !foundSegment && (!lyricBeforeSegment || currPartIdx === params.partIdx)) {
        //         console.log("Found lyric before segment", { measureLyricEl });
        //         lyricBeforeSegment = measureLyricEl;
        //     }
        // })

        // Update the divisions if we find a new one
        console.log("Looking for divisions");
        if (isMeasureAttributes(measureChild)) {
            const divisionsEl = findChildByTagName(measureChild, "divisions");
            const divisionsText = getTextNode(divisionsEl);
            if (divisionsText) {
                console.log(`Found new divisions ${divisionsText}`);
                currentDivisions = parseInt(divisionsText, 10);
            }
        }

        const restEl = findChildByTagName(measureChild, "rest");
        if (!isMeasureNote(measureChild) || restEl) {
            // Not a note / is a rest
            console.log("Not a note / is a rest");
            chordStartIdx = measureChildIdx;
            currChordLvl = 0;

            const durationEl = findChildByTagName(measureChild, "duration");
            if (durationEl) {
                const durationText = getTextNode(durationEl);
                if (!durationText) {
                    throw new Error(`No duration text content: ${durationEl}`);
                }
                const isBackup = getTagName(measureChild) === "backup";
                const duration = parseFloat(durationText) * (isBackup ? -1 : 1);
                const eventSeconds = durationToSeconds(
                    duration,
                    currentDivisions,
                    currentTempo,
                );
                partJson.events.push(
                    createdOddVoiceJSONEvent({
                        eventType: EventType.NoteOff,
                        time: timeElapsed,
                    })
                );
                partJson.events.push(
                    createdOddVoiceJSONEvent({
                        eventType: EventType.Empty,
                        time: timeElapsed,
                    })
                );
                timeElapsed += eventSeconds;
            }
            continue;
        }

        foundSegment = true;
        const voiceEl = findChildByTagName(measureChild, "voice");
        if (voiceEl && `${getTextNode(voiceEl)}` !== `${params.voice}`) {
            console.log(`Found voice ${getTextNode(voiceEl)} but processing ${params.voice}`)
            // Wrong voice
            continue;
        }

        // chord detection https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/
        const chordEl = findChildByTagName(measureChild, "chord");
        if (chordEl) {
            currChordLvl += 1;
        } else {
            chordStartIdx = measureChildIdx;
            currChordLvl = 1;
        }

        if (currChordLvl !== params.chordLvl) {
            // Not the chord we want to split
            console.log(`Not the chord we want to split: ${currChordLvl} !== ${params.chordLvl}`);
            continue;
        }

        let lyricForChord: Lyric | null = null;
        const allPartsLyricsForChord = map(
            allPartsMeasures,
            (partMeasures) => {
                const partMeasureChildren = partMeasures ? getAllChildren<"measure", Measure>(partMeasures) : [];
                const matchingChild = partMeasureChildren[measureChildIdx];
                if (matchingChild && isOrderedXMLNode(matchingChild)) {
                    return findChildByTagName<"lyric", Lyric>(matchingChild, "lyric");
                }
                return null;
            },
        );
        console.log({ allPartsLyricsForChord });
        forEach(measureChildrenInAllParts, (measureChildInAllParts, currPartIdx) => {
            if (!lyricForChord || (currPartIdx !== params.partIdx && lyricForChord)) {
                return;
            }

            // // Found the chord we want to split
            // const chordSubEl = chordStartIdx > 0
            //     ? cloneXmlElWithChanges(
            //         partChild,
            //         {
            //             newChildren: slice(
            //                 measureChildren,
            //                 chordStartIdx,
            //                 chordStartIdx + params.largestChordLvl + 1,
            //             ),
            //         },
            //     )
            //     : null;

            // Found the chord we want to split
            const chordMeasures = chordStartIdx > 0
                ? slice(
                    getAllChildren(measureChildInAllParts),
                    chordStartIdx,
                    chordStartIdx + params.largestChordLvl + 1,
                )
                : null;

            lyricForChord = findChildByTagName(chordMeasures, "lyric") ?? lyricForChord;
        });

        // If there is no lyric for the chord, use the lyric we found for another voice
        if (!lyricForChord) {
            lyricForChord = lyricBeforeSegment;
        }
        lyricBeforeSegment = null;

        const noteChildren = getAllChildren(measureChild as any);
        const newVoiceMeasureChildChildren: typeof noteChildren = [];
        let hasLyric = false;
        for (const c of noteChildren) {
            const childTagName = getTagName(c);
            if (childTagName !== "chord") {
                newVoiceMeasureChildChildren.push(c);
            }
            if (childTagName === "lyric") {
                hasLyric = true;
            }
        }
        if (lyricForChord && !hasLyric) {
            newVoiceMeasureChildChildren.push(lyricForChord);
        }

        const oldLyricsText = partJson.lyrics;
        for (const lyricEl of newVoiceMeasureChildChildren) {
            if (!isLyric(lyricEl)) {
                // No lyric element
                console.log("Not a lyric element", { lyricEl });
                continue;
            }
            const textEl = findChildByTagName(lyricEl, "text");
            if (!textEl) {
                // No text in the lyric
                console.log("No text in the lyric", { lyricEl });
                continue;
            }

            const newTextString = getTextNode(textEl)?.trim() ?? "";
            if (!newTextString || (
                LYRICS_TO_CONSIDER_AS_CONTINUATIONS.includes(newTextString)
            )) {
                // No text in the lyric
                console.log("No text in the lyric", { lyricEl, newTextString });
                continue;
            }

            // If this is the first lyric, add it
            const previousLyricText = last(oldLyricsText.split(" ")) ?? "";
            if (!previousLyricText) {
                partJson.lyrics += newTextString;
                console.log("First lyric", { lyricEl, newTextString, partJson: { ...partJson } });
                continue;
            }

            const syllabicEl = findChildByTagName(lyricEl, "syllabic");
            const syllabicText = getTextNode(syllabicEl);
            if (
                !syllabicText
                // Always add the first syllable
                || syllabicText === "single"
                || syllabicText === "begin"
                // Add lyrics that are not vowels / h as a new syllable
                || !includes(LETTERS_TO_AVOID_APPENDING, newTextString[0])
            ) {
                partJson.lyrics += ` ${newTextString}`;
                console.log("Adding new syllable", { lyricEl, newTextString, partJson: { ...partJson } });
                continue;
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
                console.log("Adding new syllable", { lyricEl, newText, partJson: { ...partJson } });
                partJson.lyrics += ` ${newText}`;
            }
        }
        const lyricsChanged = oldLyricsText !== partJson.lyrics;

        if (lyricsChanged) {
            // Add a note off event before the new lyrics
            console.log("Found new lyrics");
            partJson.events.push(
                createdOddVoiceJSONEvent({
                    eventType: EventType.NoteOff,
                    time: timeElapsed,
                })
            );
        }

        const durationEl = findChildByTagName(measureChild, "duration");
        const durationText = getTextNode(durationEl);
        if (!durationText) {
            throw new Error(`No duration element found: ${JSON.stringify(measureChild)}`);
        }
        const duration = parseFloat(durationText);

        const eventSeconds = durationToSeconds(duration, currentDivisions, currentTempo);
        const frequency = convertMusicXmlElementToHertz(measureChild);
        console.log(`Note number ${measureChildIdx} with duration ${duration} (${eventSeconds} seconds) and frequency ${frequency}`);

        partJson.events.push(
            createdOddVoiceJSONEvent({
                eventType: EventType.SetTargetFrequency,
                time: timeElapsed,
                frequency,
            })
        );
        if (lyricsChanged) {
            partJson.events.push(
                createdOddVoiceJSONEvent({
                    eventType: EventType.NoteOn,
                    time: timeElapsed,
                })
            );

            const staccatoEl = findChildByTagName(measureChild, "staccato");
            if (staccatoEl) {
                partJson.events.push(
                    createdOddVoiceJSONEvent({
                        eventType: EventType.SetPhonemeSpeed,
                        time: timeElapsed,
                        phonemeSpeed: 1.5,
                    })
                );
                partJson.events.push(
                    createdOddVoiceJSONEvent({
                        eventType: EventType.SetPhonemeSpeed,
                        time: timeElapsed + eventSeconds,
                        phonemeSpeed: 1.0,
                    })
                );
            }
        }
        timeElapsed += eventSeconds;
    }
    console.log(`Finished processing part ${params.partName}`);
    return partJson;
}

export const createSplitOddVoiceJsonInputsFromMusicXml = (
    parsedMusicXml: MusicXmlJson,
): Array<{
    output: OddVoiceJSON,
    splitParams: SplitParams,
}> => {
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
            }))));

    console.log({ partsDetails, splitsToGenerate });
    return map(splitsToGenerate, (splitParams) => ({
        output: createOddVoicePart(parsedMusicXml, splitParams),
        splitParams,
    }));
}
