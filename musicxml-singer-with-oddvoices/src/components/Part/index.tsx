import React from "react";
import { Accordion, AccordionDetails, AccordionSummary, CircularProgress, Grid, Typography } from "@mui/material";
import { JsonView, collapseAllNested, darkStyles } from "react-json-view-lite";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

import { PartAudio } from "./PartAudio";
import { SplitParams, createSplitOddVoiceJsonInputsFromMusicXml } from "../../oddVoiceJSON";
import { OddVoiceJSON } from "../../oddVoiceJSON/oddVoiceHelpers";
import { Voice } from "../../oddvoices/oddvoicesUtils";
import { MusicXmlLyricsEvent } from "../../musicXmlParsing/types";
import { CopyIconButton } from "../CopyIconButton";
import { VoiceSelect } from "./VoiceSelect";
import { PartDownloads } from "./PartDownloads";
import { PartLyrics } from "./PartLyrics";

export interface PartProps {
    output: OddVoiceJSON;
    splitParams: SplitParams;
    audioOutput?: Uint8Array;
    splitIndex: number;
    lyricsEvents: MusicXmlLyricsEvent[];
    debugInfo?: object;
    customVoiceForPart?: Voice;
    setCustomVoicePerPart: React.Dispatch<React.SetStateAction<Array<Voice | undefined>>>;
    setOddVoiceOutputs: React.Dispatch<
        React.SetStateAction<ReturnType<typeof createSplitOddVoiceJsonInputsFromMusicXml>>
    >;
}

export const Part: React.FC<PartProps> = ({
    customVoiceForPart,
    output,
    splitParams,
    audioOutput,
    splitIndex,
    debugInfo,
    lyricsEvents,
    setCustomVoicePerPart,
    setOddVoiceOutputs,
}) => {
    return (
        <Grid item container direction="column">
            <Grid item container direction="row" justifyContent="flex-start" alignItems="center" gap={2} pb={1}>
                <Grid item>
                    <Typography variant="subtitle1">Part {splitIndex + 1}</Typography>
                </Grid>
                <Grid item>
                    <Typography variant="h6" color="primary">
                        {splitParams.partName}
                        {splitParams.numVoices > 1 ? ` (voice ${splitParams.voice})` : ""}
                        {splitParams.largestChordLvl > 1
                            ? ` - chord level ${splitParams.chordLevel}/${splitParams.largestChordLvl}`
                            : ""}
                    </Typography>
                </Grid>
            </Grid>
            {audioOutput ? (
                <Grid item container direction="row" justifyContent="flex-start" alignItems="center" gap={1}>
                    <Grid item>
                        <PartAudio audioOutput={audioOutput} lyricsEvents={lyricsEvents} />
                    </Grid>
                    <PartDownloads output={output} splitParams={splitParams} audioOutput={audioOutput} />
                    <Grid item>
                        <VoiceSelect
                            customVoiceForPart={customVoiceForPart}
                            splitIndex={splitIndex}
                            setCustomVoicePerPart={setCustomVoicePerPart}
                        />
                    </Grid>
                </Grid>
            ) : (
                <Grid item container direction="row" justifyContent="flex-start" alignItems="center" p={1} gap={3}>
                    <CircularProgress size={20} />
                    <Typography variant="subtitle1">Generating audio output...</Typography>
                </Grid>
            )}
            <PartLyrics output={output} splitIndex={splitIndex} setOddVoiceOutputs={setOddVoiceOutputs} />
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Grid container direction="row" justifyContent="flex-start" alignItems="center" gap={1}>
                        <CopyIconButton text={JSON.stringify(output.events, null, 2)} />
                        <Typography variant="subtitle2">Events</Typography>
                    </Grid>
                </AccordionSummary>
                <AccordionDetails>
                    <Grid item justifyContent="flex-start">
                        <JsonView data={output.events} style={darkStyles} shouldExpandNode={collapseAllNested} />
                    </Grid>
                </AccordionDetails>
            </Accordion>
            {debugInfo && (
                <Accordion>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Grid container direction="row" justifyContent="flex-start" alignItems="center" gap={1}>
                            <CopyIconButton text={JSON.stringify(debugInfo, null, 2)} />
                            <Typography variant="subtitle2">Debug Info</Typography>
                        </Grid>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid item justifyContent="flex-start">
                            <JsonView data={debugInfo} style={darkStyles} shouldExpandNode={collapseAllNested} />
                        </Grid>
                    </AccordionDetails>
                </Accordion>
            )}
        </Grid>
    );
};
