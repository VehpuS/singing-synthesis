import React from "react";
import { map } from "lodash";
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
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ErrorIcon from "@mui/icons-material/Error";

import { SplitParams } from "./oddVoiceJSON";
import { OddVoiceJSON } from "./oddVoiceJSON/oddVoiceHelpers";
import { PhonemeGuide } from "./PhonemeGuide";
import { OpenSheetMusicDisplay } from "./OpenSheetMusicDisplay";
import { base64EncArr } from "./oddvoices/oddvoicesUtils";
import { useOddVoicesApp } from "./oddvoices";
import { MediaControls } from "./MediaControls";

import "./App.css";
import { UploadButton } from "./UploadButton";

function App() {
    const [rawFile, setRawFile] = React.useState<string>("");
    const [oddVoiceOutputs, setOddVoiceOutputs] = React.useState<
        Array<{ output: OddVoiceJSON; splitParams: SplitParams }>
    >([]);
    const [audioOutputs, setAudioOutputs] = React.useState<Uint8Array[]>([]);
    if (oddVoiceOutputs.length > 0) {
        console.log({ oddVoiceOutputs });
    }

    const { isLoadingApp, isLoadingVoice, voiceLoadingFailed, generateVoiceFromOddVoiceJson } = useOddVoicesApp();

    const [isGeneratingAudio, setIsGeneratingAudio] = React.useState(false);

    return (
        <Paper>
            <Accordion
                variant="outlined"
                sx={{
                    top: 0,
                    position: "sticky",
                    zIndex: 1,
                    backgroundColor: (theme) => theme.palette.background.paper,
                }}
            >
                <AccordionSummary disabled={!rawFile} expandIcon={rawFile ? <ExpandMoreIcon /> : null}>
                    <Typography variant="body1" textAlign="center" width="100%">
                        {voiceLoadingFailed ? (
                            <>
                                <ErrorIcon />
                                Error loading voice!
                            </>
                        ) : isGeneratingAudio ? (
                            <>
                                <CircularProgress size={16} /> Generating audio...
                            </>
                        ) : isLoadingVoice ? (
                            <>
                                <CircularProgress size={16} /> Loading voice...
                            </>
                        ) : rawFile ? (
                            "View MusicXML"
                        ) : (
                            "Upload a MusicXML file to view it here."
                        )}
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ overflow: "auto", height: 300 }}>
                    <OpenSheetMusicDisplay autoResize file={rawFile} />
                </AccordionDetails>
            </Accordion>

            {isLoadingApp ? (
                <CircularProgress />
            ) : (
                <>
                    <Grid
                        item
                        sx={{
                            top: 50,
                            position: "sticky",
                            zIndex: 1,
                        }}
                    >
                        <Paper
                            elevation={0}
                            sx={{
                                display: "flex",
                                border: (theme) => `1px solid ${theme.palette.divider}`,
                                flexWrap: "wrap",
                            }}
                        >
                            <UploadButton
                                isLoadingVoice={isLoadingVoice}
                                setIsGeneratingAudio={setIsGeneratingAudio}
                                setOddVoiceOutputs={setOddVoiceOutputs}
                                setAudioOutputs={setAudioOutputs}
                                setRawFile={setRawFile}
                                generateVoiceFromOddVoiceJson={generateVoiceFromOddVoiceJson}
                            />
                            {audioOutputs.length > 0 && <MediaControls />}
                        </Paper>
                    </Grid>
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
