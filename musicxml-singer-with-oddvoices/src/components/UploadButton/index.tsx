import React from "react";
import { Button, styled } from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";

import { createSplitOddVoiceJsonInputsFromMusicXml } from "../../oddVoiceJSON";
import { parseXmlText } from "../../musicXmlParsing/xmlHelpers";

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
    setOddVoiceOutputs: React.Dispatch<
        React.SetStateAction<ReturnType<typeof createSplitOddVoiceJsonInputsFromMusicXml>>
    >;
    setRawFile: React.Dispatch<React.SetStateAction<string>>;
    resetAudioOutputs: () => void;
}> = ({ isLoadingVoice, setOddVoiceOutputs, setRawFile, resetAudioOutputs }) => {
    const [, startTransition] = React.useTransition();

    const loadMusicXmlFile: React.ChangeEventHandler<HTMLInputElement> = React.useCallback(
        (e) => {
            const file = e?.target?.files?.[0];
            if (!file) {
                return;
            }
            const reader = new FileReader();
            reader.onload = (e) => {
                if (!e?.target?.result) {
                    return;
                }
                resetAudioOutputs();
                setOddVoiceOutputs([]);
                setRawFile("");
                const rawText = e.target.result as string;
                startTransition(() => {
                    const newOddVoiceOutputs = createSplitOddVoiceJsonInputsFromMusicXml(parseXmlText(rawText));
                    setOddVoiceOutputs(newOddVoiceOutputs);
                    setRawFile(rawText);
                });
            };
            reader.readAsText(file);
        },
        [resetAudioOutputs, setOddVoiceOutputs, setRawFile, startTransition]
    );

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
            <VisuallyHiddenInput type="file" onChange={loadMusicXmlFile} />
        </Button>
    );
};
