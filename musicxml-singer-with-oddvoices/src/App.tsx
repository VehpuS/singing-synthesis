import React from "react";
import { map } from "lodash";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    CircularProgress,
    Divider,
    Grid,
    Paper,
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ErrorIcon from "@mui/icons-material/Error";

import { PhonemeGuide } from "./PhonemeGuide";
import { OpenSheetMusicDisplay } from "./OpenSheetMusicDisplay";
import { useOddVoicesApp } from "./oddvoices";
import { MediaControls } from "./MediaControls";
import { UploadButton } from "./UploadButton";
import { LicenseFooter } from "./LicenseFooter";
import { VoicePart } from "./VoicePart";
import { createSplitOddVoiceJsonInputsFromMusicXml } from "./oddVoiceJSON";

import "./App.css";

function App() {
    const [rawFile, setRawFile] = React.useState<string>("");
    const [oddVoiceOutputs, setOddVoiceOutputs] = React.useState<
        ReturnType<typeof createSplitOddVoiceJsonInputsFromMusicXml>
    >([]);
    const [audioOutputs, setAudioOutputs] = React.useState<Uint8Array[]>([]);
    if (oddVoiceOutputs.length > 0) {
        console.log({ oddVoiceOutputs });
    }

    const { isLoadingApp, isLoadingVoice, voiceLoadingFailed, generateVoiceFromOddVoiceJson } = useOddVoicesApp();

    const [isGeneratingAudio, setIsGeneratingAudio] = React.useState(false);

    return (
        <Paper elevation={1} sx={{ maxWidth: 800, paddingInline: 3, marginInline: 1 }}>
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
                        {isLoadingApp ? (
                            <>
                                <CircularProgress />
                                Loading app...
                            </>
                        ) : voiceLoadingFailed ? (
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

            {!isLoadingApp && (
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
                    <Grid container direction="column" gap={3} alignItems="center" paddingBlock={2}>
                        <Grid item container direction="column" gap={3} alignItems="center" alignSelf="center">
                            {map(oddVoiceOutputs, (oddVoiceOutput, i) => (
                                <VoicePart
                                    key={i}
                                    partIndex={i}
                                    output={oddVoiceOutput.output}
                                    splitParams={oddVoiceOutput.splitParams}
                                    debugInfo={oddVoiceOutput.unparsedPartEvents}
                                    audioOutput={audioOutputs[i]}
                                />
                            ))}
                            <Divider />
                        </Grid>
                    </Grid>
                </>
            )}

            <Grid container direction="column" gap={3} alignItems="center" paddingBlock={2}>
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">About Oddvoices</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <PhonemeGuide />
                    </AccordionDetails>
                </Accordion>
            </Grid>
            <Divider />
            <LicenseFooter />
        </Paper>
    );
}

export default App;
