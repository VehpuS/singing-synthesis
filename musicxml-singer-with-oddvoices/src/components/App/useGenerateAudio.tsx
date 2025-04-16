import React from "react";
import { isEmpty } from "lodash";

import { useOddVoicesApp } from "../../oddvoices";
import { OddVoiceJSON } from "../../oddVoiceJSON/oddVoiceHelpers";
import { Voice } from "../../oddvoices/oddvoicesUtils";
import { useVoiceGenerationWorker } from "../../workers/useVoiceGenerationWorker";

export const useGenerateAudio = () => {
  // Keep legacy voice generation for fallback
  const {
    isLoadingApp: isLegacyLoadingApp,
    isLoadingVoice: isLegacyLoadingVoice,
    voiceLoadingFailed: legacyVoiceLoadingFailed,
    generateVoiceFromOddVoiceJson: legacyGenerateVoice,
  } = useOddVoicesApp();

  // Use worker-based voice generation
  const {
    isReady: isWorkerReady,
    isProcessing: isWorkerProcessing,
    error: workerError,
    generateAudio: workerGenerateAudio,
  } = useVoiceGenerationWorker();

  const [audioOutputs, setAudioOutputs] = React.useState<Uint8Array[]>([]);
  const [useWorker, setUseWorker] = React.useState(true);

  // Create a queue for audio generation to avoid memory spikes
  const audioQueue = React.useRef<
    { json: OddVoiceJSON; index: number; voice: Voice }[]
  >([]);
  const processingQueue = React.useRef(false);

  // Process one audio part at a time from the queue
  const processAudioQueue = React.useCallback(() => {
    if (processingQueue.current || audioQueue.current.length === 0) {
      return;
    }

    processingQueue.current = true;

    const { json, index, voice } = audioQueue.current.shift()!;

    // Use setTimeout to give the UI a chance to update between processing
    setTimeout(async () => {
      try {
        let outputAudio: Uint8Array | undefined;
        
        // Try to use the worker if enabled and ready
        if (useWorker && isWorkerReady) {
          try {
            outputAudio = await workerGenerateAudio(json, voice);
          } catch (workerErr) {
            console.error("Worker error, falling back to legacy mode:", workerErr);
            // Fall back to legacy mode
            outputAudio = legacyGenerateVoice.current?.(json, voice);
          }
        } else {
          // Use legacy mode
          outputAudio = legacyGenerateVoice.current?.(json, voice);
        }
        
        if (!isEmpty(outputAudio)) {
          setAudioOutputs((prev) => {
            const newOutputs = [...prev];
            newOutputs[index] = outputAudio!;
            return newOutputs;
          });
        } else {
          console.error("Failed to generate audio output.");
        }
      } catch (error) {
        console.error("Error generating audio:", error);
      } finally {
        processingQueue.current = false;

        // If we have more items in queue, process the next one
        if (!isEmpty(audioQueue.current)) {
          processAudioQueue();
        }
      }
    }, 0);
  }, [isWorkerReady, legacyGenerateVoice, useWorker, workerGenerateAudio]);

  // Add a part to the queue and start processing if not already
  const queueAudioGeneration = React.useCallback(
    (
      oddVoiceJson: OddVoiceJSON,
      splitIndex: number,
      voice: Voice = Voice.air
    ) => {
      audioQueue.current.push({ json: oddVoiceJson, index: splitIndex, voice });
      if (!processingQueue.current) {
        processAudioQueue();
      }
    },
    [processAudioQueue]
  );

  const resetAudioOutputs = React.useCallback(() => {
    audioQueue.current = [];
    processingQueue.current = false;
    setAudioOutputs([]);
  }, []);

  // Toggle between worker and legacy mode
  const toggleWorkerMode = React.useCallback(() => {
    setUseWorker((prev) => !prev);
  }, []);

  return {
    audioOutputs,
    isLoadingApp: useWorker ? !isWorkerReady : isLegacyLoadingApp,
    isLoadingVoice: useWorker ? false : isLegacyLoadingVoice,
    voiceLoadingFailed: useWorker ? false : legacyVoiceLoadingFailed,
    isWorkerReady,
    isWorkerProcessing,
    workerError,
    useWorker,
    toggleWorkerMode,
    resetAudioOutputs,
    queueAudioGeneration,
  };
};
