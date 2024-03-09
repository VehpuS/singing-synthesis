import React from "react";
import { forEach } from "lodash";

import { base64EncArr } from "../oddvoices/oddvoicesUtils";
import { MusicXmlLyricsEvent } from "../musicXmlParsing/types";

export interface PartAudioProps {
    audioOutput?: Uint8Array;
    lyricsEvents: MusicXmlLyricsEvent[];
}

export const PartAudio: React.FC<PartAudioProps> = ({ audioOutput, lyricsEvents }) => {
    const setCaptions = React.useCallback(
        (audioEl: HTMLAudioElement) => {
            if (!audioEl) {
                return;
            }
            const captionsTrack = audioEl.addTextTrack("captions", "Lyrics", "en");
            if (!captionsTrack) return;
            forEach(lyricsEvents, (event, i) => {
                const duration = lyricsEvents[i + 1] ? lyricsEvents[i + 1]?.time - event.time : 3;
                if (event.lyric && event.time !== undefined) {
                    captionsTrack.addCue(new VTTCue(event.time, event.time + duration, event.lyric));
                }
            });
        },
        [lyricsEvents]
    );

    return audioOutput ? (
        <audio
            controls
            src={audioOutput ? "data:audio/wav;base64," + base64EncArr(audioOutput) : undefined}
            ref={setCaptions}
        />
    ) : null;
};
