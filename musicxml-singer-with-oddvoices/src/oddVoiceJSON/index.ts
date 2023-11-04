import { compact, flatMap, forEach, includes, last, map, slice, times } from "lodash";
import { EventType, OddVoiceJSON, createdOddVoiceJSONEvent } from "./oddVoiceHelpers";
import { cloneXmlElWithChanges, getXmlChildren } from "../musicXmlParsing/xmlHelpers";
import { DEFAULT_TEMPO, convertMusicXmlElementToHertz, durationToSeconds, parseVocalPartsFromRoot } from "../musicXmlParsing";
import { LETTERS_TO_AVOID_APPENDING, LYRICS_TO_CONSIDER_AS_CONTINUATIONS } from "./lyricsHelpers";

export interface SplitParams {
    partIdx: number;
    partName: string;
    voice: number | string;
    chordLvl: number;
    largestChordLvl: number;
}

export const createOddVoicePart = (
    xmlNode: Element,
    params: SplitParams,
): OddVoiceJSON => {
    const basePartList = xmlNode.querySelector("part-list");
    if (!basePartList) {
        throw new Error("Could not find part-list");
    }

    const partNameChildren: [string, Element][] = [];
    forEach(basePartList.querySelectorAll("part-name"), (partNameChild) => {
        const partName = partNameChild.textContent;
        if (partName) {
            partNameChildren.push([partName, partNameChild]);
        }
    });
    const splitPartNameChildTuple = partNameChildren[params.partIdx];
    if (!splitPartNameChildTuple) {
        throw new Error(
            `Wrong part name while expecting ${params.partName} at index ${params.partIdx}. Found part ${splitPartNameChildTuple[0]}`,
        );
    }

    console.log(`Processing part ${splitPartNameChildTuple[0]}`);

    const allParts = xmlNode.querySelectorAll("part");

    const allPartsChildren: Element[][] = map(
        allParts,
        (part) => getXmlChildren(part),
    );

    let foundSegment = false;

    let partJson: OddVoiceJSON = {
        lyrics: "",
        events: [],
    };
    let timeElapsed = 0;
    let currentDivisions = 1;
    let currentTempo = DEFAULT_TEMPO;

    const basePartChildren = allPartsChildren[params.partIdx];

    for (const partChild of basePartChildren) {
        if (partChild.tagName !== "measure") {
            // Not a measure
            continue;
        }
        let currChordLvl = 1;
        let lyricBeforeSegment: Element | null = null;
        let chordStartIdx = -1;

        const measureChildren = getXmlChildren(partChild);

        for (let measureChildIdx = 0; measureChildIdx < measureChildren.length; measureChildIdx++) {
            const measureChild = measureChildren[measureChildIdx];
            // Update the tempo if we find a new one
            console.log("Looking for tempo changes in measure across all parts");
            const measureChildrenInAllParts = compact(map(
                allPartsChildren,
                (partMeasureChildren) => {
                    if (partMeasureChildren.length > measureChildIdx) {
                        return partMeasureChildren[measureChildIdx];
                    }
                    return null;
                },
            ));

            for (const measureChildInAllParts of measureChildrenInAllParts) {
                const directionTempos = compact(map(
                    measureChildInAllParts?.querySelectorAll("sound"),
                    (s) => {
                        if (s.hasAttribute("tempo")) {
                            return parseFloat(s.getAttribute("tempo") || "");
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

            // Update the divisions if we find a new one
            console.log("Looking for divisions");
            if (measureChild.tagName === "attributes") {
                const divisionsEl = measureChild.querySelector("divisions");
                if (divisionsEl?.textContent) {
                    console.log(`Found new divisions ${divisionsEl.textContent}`);
                    currentDivisions = parseInt(divisionsEl.textContent, 10);
                }
            }


            // The lyrics can be assigned to another voice, so we need to keep track of the first occurrence
            const lyricEl = measureChild.querySelector("lyric");
            if (lyricEl && !foundSegment) {
                lyricBeforeSegment = lyricEl;
            }

            const restEl = measureChild.querySelector("rest");
            if (measureChild.tagName !== "note" || restEl) {
                // Not a note / is a rest
                chordStartIdx = measureChildIdx;
                currChordLvl = 0;

                const durationEl = measureChild.querySelector("duration");
                if (durationEl) {
                    if (!durationEl.textContent) {
                        throw new Error(`No duration text content: ${new XMLSerializer().serializeToString(measureChild)}`);
                    }
                    const isBackup = measureChild.tagName === "backup";
                    const duration = parseFloat(durationEl.textContent || "") * (isBackup ? -1 : 1);
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
            const voiceEl = measureChild.querySelector("voice");
            if (voiceEl && voiceEl.textContent !== params.voice.toString()) {
                // Wrong voice
                continue;
            }

            // chord detection https://www.w3.org/2021/06/musicxml40/musicxml-reference/elements/chord/
            const chordEl = measureChild.querySelector("chord");
            if (chordEl) {
                currChordLvl += 1;
            } else {
                chordStartIdx = measureChildIdx;
                currChordLvl = 1;
            }

            if (currChordLvl !== params.chordLvl) {
                // Not the chord we want to split
                continue;
            }
            // Found the chord we want to split
            const chordSubEl = chordStartIdx > 0
                ? cloneXmlElWithChanges(
                    partChild,
                    {
                        newChildren: slice(
                            measureChildren,
                            chordStartIdx,
                            chordStartIdx + params.largestChordLvl + 1,
                        ),
                    },
                )
                : null;

            let lyricForChord = chordSubEl?.querySelector("lyric") ?? null;
            // If there is no lyric for the chord, use the lyric we found for another voice
            if (!lyricForChord) {
                lyricForChord = lyricBeforeSegment;
            }
            lyricBeforeSegment = null;

            const newVoiceMeasureChildChildren: Element[] = [];
            let hasLyric = false;
            for (const c of getXmlChildren(measureChild)) {
                if (c.tagName !== "chord") {
                    newVoiceMeasureChildChildren.push(c);
                }
                if (c.tagName === "lyric") {
                    hasLyric = true;
                }
            }
            if (lyricForChord && !hasLyric) {
                newVoiceMeasureChildChildren.push(lyricForChord);
            }

            const newLyricsText = partJson.lyrics;
            for (const lyricEl of newVoiceMeasureChildChildren) {
                if (lyricEl.tagName !== "lyric") {
                    // No lyric element
                    continue;
                }
                const textEl = lyricEl.querySelector("text");
                if (!textEl) {
                    // No text in the lyric
                    continue;
                }

                const newTextString = textEl.textContent?.trim() ?? "";
                if (!newTextString || (
                    LYRICS_TO_CONSIDER_AS_CONTINUATIONS.includes(newTextString)
                )) {
                    // No text in the lyric
                    continue;
                }

                // If this is the first lyric, add it
                const previousLyricText = last(newLyricsText.split(" ")) ?? "";
                if (!previousLyricText) {
                    partJson.lyrics += newTextString;
                    continue;
                }

                const syllabicEl = lyricEl.querySelector("syllabic");
                if (
                    !syllabicEl
                    // Always add the first syllable
                    || syllabicEl.textContent === "single"
                    || syllabicEl.textContent === "begin"
                    // Add lyrics that are not vowels / h as a new syllable
                    || !includes(LETTERS_TO_AVOID_APPENDING, newTextString[0])
                ) {
                    partJson.lyrics += ` ${newTextString}`;
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
                    partJson.lyrics += ` ${newText}`;
                }
            }
            const lyricsChanged = newLyricsText !== partJson.lyrics;

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

            partJson.lyrics = newLyricsText;

            const durationEl = measureChild.querySelector("duration");
            if (!durationEl?.textContent) {
                throw new Error(`No duration element found: ${new XMLSerializer().serializeToString(measureChild)}`);
            }
            const duration = parseFloat(durationEl.textContent);

            const eventSeconds = durationToSeconds(
                duration,
                currentDivisions,
                currentTempo,
            );
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

                const staccatoEl = measureChild.querySelector("staccato");
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
    }
    console.log(`Finished processing part ${params.partName}`);
    return partJson;
}

export const createSplitOddVoiceJsonInputsFromMusicXml = (
    parsedMusicXml: Element,
): Array<{
    output: OddVoiceJSON,
    splitParams: SplitParams,
}> => {
    const partsDetails = parseVocalPartsFromRoot(parsedMusicXml);
    const splitsToGenerate: SplitParams[] = flatMap(partsDetails, (p) =>
        flatMap(p.voices, (voice, voiceIdx) =>
            times(p.largestChordPerVoice[voiceIdx], (chordLvl) => ({
                partIdx: p.partIdx,
                partName: p.partName,
                voice,
                chordLvl: chordLvl + 1,
                largestChordLvl: p.largestChordPerVoice[voiceIdx],
            }))));
    return map(splitsToGenerate, (splitParams) => ({
        output: createOddVoicePart(parsedMusicXml, splitParams),
        splitParams,
    }));
}
