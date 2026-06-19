import React from "react";
import { map } from "lodash";

import { useOddVoicesApp } from "../../oddvoices";
import { OddVoiceJSON } from "../../oddVoiceJSON/oddVoiceHelpers";
import { Voice } from "../../oddvoices/oddvoicesUtils";
import { useVoiceGenerationWorker } from "../../workers/useVoiceGenerationWorker";

export const useGenerateAudio = () => {
  const {
    isLoadingApp,
    isLoadingVoice,
    voiceLoadingFailed,
    generateVoiceFromOddVoiceJson,
  } = useOddVoicesApp();

  // Use worker-based voice generation
  const {
    isReady: isWorkerReady,
    isProcessing: isWorkerProcessing,
    error: workerError,
    generateAudio: workerGenerateAudio,
  } = useVoiceGenerationWorker();

  const [audioOutputs, setAudioOutputs] = React.useState<
    Array<Uint8Array | undefined>
  >([]);
  const [useWorker, setUseWorker] = React.useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = React.useState(false);
  const generateAudioForPart = React.useCallback(
    (
      oddVoiceJson: OddVoiceJSON,
      splitIndex: number,
      voice: Voice = Voice.air
    ) => {
      try {
        setIsGeneratingAudio(true);
        const outputAudio = generateVoiceFromOddVoiceJson.current?.(
          oddVoiceJson,
          voice
        );
        if (!outputAudio || outputAudio.length === 0) {
          console.error("Failed to generate audio output.");
          return;
        }
        setAudioOutputs((prev) => {
          prev[splitIndex] = outputAudio;
          return [...prev];
        });
        setIsGeneratingAudio(false);
      } catch (error) {
        console.error("Error generating audio:", error);
      }
      setIsGeneratingAudio(false);
    },
    [generateVoiceFromOddVoiceJson]
  );

  const generateAudioForAllParts = React.useCallback(
    async (
      parts: Array<{
        oddVoiceJson: OddVoiceJSON;
        voice?: Voice;
      }>
    ) => {
      try {
        setIsGeneratingAudio(true);
        const partsAudio = await Promise.all(
          map(parts, async ({ oddVoiceJson, voice = Voice.air }) => {
            if (useWorker && isWorkerReady) {
              try {
                return workerGenerateAudio(oddVoiceJson, voice);
              } catch (workerErr) {
                console.error(
                  "Worker error, falling back to legacy mode:",
                  workerErr
                );
                // Fall back to legacy mode
                return generateVoiceFromOddVoiceJson.current?.(
                  oddVoiceJson,
                  voice
                );
              }
            } else {
              // Use legacy mode
              return generateVoiceFromOddVoiceJson.current?.(
                oddVoiceJson,
                voice
              );
            }
          })
        );
        setAudioOutputs(partsAudio);
      } catch (error) {
        console.error("Error generating audio:", error);
      }
      setIsGeneratingAudio(false);
    },
    [
      isWorkerReady,
      generateVoiceFromOddVoiceJson,
      useWorker,
      workerGenerateAudio,
    ]
  );

  const resetAudioOutputs = React.useCallback(() => {
    setAudioOutputs([]);
  }, []);

  // Toggle between worker and legacy mode
  const toggleWorkerMode = React.useCallback(() => {
    setUseWorker((prev) => !prev);
  }, []);

  return {
    audioOutputs,
    isLoadingApp,
    isLoadingVoice,
    voiceLoadingFailed,
    isWorkerReady,
    isWorkerProcessing,
    workerError,
    useWorker,
    isGeneratingAudio,
    toggleWorkerMode,
    resetAudioOutputs,
    generateAudioForPart,
    generateAudioForAllParts,
  };
};
