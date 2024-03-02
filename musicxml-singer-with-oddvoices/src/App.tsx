import React from "react";
import { forEach, map } from "lodash";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    CircularProgress,
    Divider,
    Grid,
    Paper,
    Typography,
    styled,
} from "@mui/material";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { SplitParams, createSplitOddVoiceJsonInputsFromMusicXml } from "./oddVoiceJSON";
import { parseXmlText } from "./musicXmlParsing/xmlHelpers";
import { OddVoiceJSON } from "./oddVoiceJSON/oddVoiceHelpers";
import { PhonemeGuide } from "./PhonemeGuide";
import { OpenSheetMusicDisplay } from "./OpenSheetMusicDisplay";
import { base64EncArr } from "./oddvoices/oddvoicesUtils";
import { useOddVoicesApp } from "./oddvoices";

import "./App.css";

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

function App() {
    const [rawFile, setRawFile] = React.useState<string>("");
    const [oddVoiceOutputs, setOddVoiceOutputs] = React.useState<
        Array<{ output: OddVoiceJSON; splitParams: SplitParams }>
    >([]);
    const [audioOutputs, setAudioOutputs] = React.useState<Uint8Array[]>([]);
    if (oddVoiceOutputs.length > 0) {
        console.log({ oddVoiceOutputs });
    }

    const { oddVoiceApp, generateVoiceFromOddVoiceJson } = useOddVoicesApp();

    const [isGeneratingAudio, setIsGeneratingAudio] = React.useState(false);

    const [, startTransition] = React.useTransition();

    return (
        <Paper>
            {!oddVoiceApp ? (
                <CircularProgress />
            ) : (
                <>
                    <Grid item>
                        <Button
                            component="label"
                            role={undefined}
                            variant="contained"
                            tabIndex={-1}
                            startIcon={<CloudUploadIcon />}
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
                                                    const outputAudio = generateVoiceFromOddVoiceJson(
                                                        oddVoiceOutput.output
                                                    );
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
                        {audioOutputs.length > 0 && (
                            <Button
                                onClick={() => {
                                    const allAudios = document.querySelectorAll("audio");
                                    forEach(allAudios, (audio) => {
                                        audio.currentTime = 0;
                                        audio.play();
                                    });
                                }}
                            >
                                Play All
                            </Button>
                        )}
                    </Grid>
                    <Divider />
                    {isGeneratingAudio ? (
                        <CircularProgress />
                    ) : (
                        Boolean(rawFile) && (
                            <Accordion variant="outlined">
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Typography variant="body1" textAlign="center" width="100%">
                                        View MusicXML
                                    </Typography>
                                </AccordionSummary>
                                <AccordionDetails>
                                    <OpenSheetMusicDisplay autoResize file={rawFile} />
                                </AccordionDetails>
                            </Accordion>
                        )
                    )}
                    <Divider />
                    {!isGeneratingAudio && (
                        <Grid container direction="column" gap={3} alignItems="center" paddingBlock={2}>
                            <Grid item container direction="column" gap={3} alignItems="center" alignSelf="center">
                                {map(oddVoiceOutputs, (oddVoiceOutput, i) => {
                                    const fileNamePrefix = `${oddVoiceOutput.splitParams.partName}_(voice_${
                                        oddVoiceOutput.splitParams.voice
                                    })${
                                        oddVoiceOutput.splitParams.largestChordLvl > 1
                                            ? `_chord-level_${oddVoiceOutput.splitParams.chordLvl}-${oddVoiceOutput.splitParams.largestChordLvl}`
                                            : ``
                                    }`;
                                    return (
                                        <Grid item container key={i} direction="column">
                                            <Grid item>
                                                <Typography variant="h6">Part {i + 1}</Typography>
                                            </Grid>
                                            <Grid item>
                                                <Typography variant="body1">
                                                    {oddVoiceOutput.splitParams.partName} (voice{" "}
                                                    {oddVoiceOutput.splitParams.voice})
                                                    {oddVoiceOutput.splitParams.largestChordLvl > 1
                                                        ? ` - chord level ${oddVoiceOutput.splitParams.chordLvl}/${oddVoiceOutput.splitParams.largestChordLvl}`
                                                        : ``}
                                                </Typography>
                                            </Grid>
                                            <Grid item>
                                                <audio
                                                    controls
                                                    src={
                                                        audioOutputs[i]
                                                            ? "data:audio/wav;base64," + base64EncArr(audioOutputs[i])
                                                            : undefined
                                                    }
                                                />
                                            </Grid>
                                            <Grid item>
                                                <a
                                                    className="audio-download"
                                                    href={URL.createObjectURL(
                                                        new Blob([audioOutputs[i]], { type: "audio/wav" })
                                                    )}
                                                    download={fileNamePrefix + ".wav"}
                                                >
                                                    Download Audio (wav)
                                                </a>
                                            </Grid>
                                            <Grid item>
                                                <a
                                                    className="part-downloads"
                                                    href={`data:text/json;charset=utf-8,${encodeURIComponent(
                                                        JSON.stringify(oddVoiceOutput.output, null, 2)
                                                    )}`}
                                                    download={fileNamePrefix + ".json"}
                                                >
                                                    Download JSON
                                                </a>
                                            </Grid>
                                        </Grid>
                                    );
                                })}
                                <Divider />
                            </Grid>
                        </Grid>
                    )}
                    <Grid item>
                        {oddVoiceOutputs.length > 0 && (
                            <Button
                                onClick={() => {
                                    const allAnchors = document.querySelectorAll("a.part-downloads");
                                    allAnchors.forEach((anchor) => {
                                        (anchor as HTMLAnchorElement).click();
                                    });
                                }}
                            >
                                Download All JSON Files
                            </Button>
                        )}
                    </Grid>
                    <Grid container direction="column" gap={3} alignItems="center" paddingBlock={2}>
                        <PhonemeGuide />
                    </Grid>
                </>
            )}
        </Paper>
    );
}

export default App;
