import React from "react";
import { forEach } from "lodash";
import { Button, styled } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import { SplitParams, createSplitOddVoiceJsonInputsFromMusicXml } from "./oddVoiceJSON";
import { parseXmlText } from "./musicXmlParsing/xmlHelpers";
import { OddVoiceJSON } from "./oddVoiceJSON/oddVoiceHelpers";

const VisuallyHiddenInput = styled("input")({
    clip: "rect(0 0 0 0)",
    clipPath: "inset(50%)",
    height: 1,
    overflow: "hidden",
    position: "absolute",
    bottom: 0,
    left: 0,
    whiteSpace: "nowrap",
    width: 1,
});

export const UploadButton: React.FC<{
    isLoadingVoice: boolean;
    setOddVoiceOutputs: React.Dispatch<React.SetStateAction<Array<{ output: OddVoiceJSON; splitParams: SplitParams }>>>;
    setAudioOutputs: React.Dispatch<React.SetStateAction<Uint8Array[]>>;
    setRawFile: React.Dispatch<React.SetStateAction<string>>;
    setIsGeneratingAudio: React.Dispatch<React.SetStateAction<boolean>>;
    generateVoiceFromOddVoiceJson: (oddVoiceJson: OddVoiceJSON) => Uint8Array | undefined;
}> = ({
    isLoadingVoice,
    generateVoiceFromOddVoiceJson,
    setIsGeneratingAudio,
    setOddVoiceOutputs,
    setAudioOutputs,
    setRawFile,
}) => {
    const [, startTransition] = React.useTransition();

    return (
        <Button
            component="label"
            role={undefined}
            variant="contained"
            tabIndex={-1}
            startIcon={<CloudUploadIcon />}
            disabled={isLoadingVoice}
        >
            Upload file
            <VisuallyHiddenInput
                type="file"
                onChange={(e) => {
                    const file = e?.target?.files?.[0];
                    if (!file) {
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        if (e?.target?.result) {
                            setIsGeneratingAudio(true);
                            const result = e.target.result as string;
                            startTransition(() => {
                                const newOddVoiceOutputs = createSplitOddVoiceJsonInputsFromMusicXml(
                                    parseXmlText(result)
                                );
                                setOddVoiceOutputs(newOddVoiceOutputs);
                                setRawFile(result);
                                forEach(newOddVoiceOutputs, (oddVoiceOutput, i) => {
                                    const outputAudio = generateVoiceFromOddVoiceJson(oddVoiceOutput.output);
                                    if (!outputAudio || outputAudio.length === 0) {
                                        console.error("Failed to generate audio output.");
                                        return;
                                    }
                                    setAudioOutputs((prev) => {
                                        const newOutputs = [...prev];
                                        newOutputs[i] = outputAudio;
                                        return newOutputs;
                                    });
                                });
                                setIsGeneratingAudio(false);
                            });
                        }
                    };
                    reader.readAsText(file);
                }}
            />
        </Button>
    );
};
