import React from "react";

import { useOddVoicesApp } from "../../oddvoices";
import { OddVoiceJSON } from "../../oddVoiceJSON/oddVoiceHelpers";
import { Voice } from "../../oddvoices/oddvoicesUtils";

export const useGenerateAudio = () => {
    const { isLoadingApp, isLoadingVoice, voiceLoadingFailed, generateVoiceFromOddVoiceJson } = useOddVoicesApp();

    const [audioOutputs, setAudioOutputs] = React.useState<Uint8Array[]>([]);
    const generateAudioForPart = React.useCallback(
        (oddVoiceJson: OddVoiceJSON, splitIndex: number, voice: Voice = Voice.air) => {
            const outputAudio = generateVoiceFromOddVoiceJson.current?.(oddVoiceJson, voice);
            if (!outputAudio || outputAudio.length === 0) {
                console.error("Failed to generate audio output.");
                return;
            }
            setAudioOutputs((prev) => {
                prev[splitIndex] = outputAudio;
                return [...prev];
            });
        },
        [generateVoiceFromOddVoiceJson]
    );

    const resetAudioOutputs = React.useCallback(() => {
        setAudioOutputs([]);
    }, []);

    return {
        audioOutputs,
        isLoadingApp,
        isLoadingVoice,
        voiceLoadingFailed,
        resetAudioOutputs,
        generateAudioForPart,
    };
};
