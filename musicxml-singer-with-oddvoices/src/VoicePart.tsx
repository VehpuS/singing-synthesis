import React from "react";
import { Accordion, AccordionDetails, AccordionSummary, Chip, Grid, Typography } from "@mui/material";
import { JsonView, collapseAllNested, darkStyles } from "react-json-view-lite";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DataObjectIcon from "@mui/icons-material/DataObject";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";

import { SplitParams } from "./oddVoiceJSON";
import { OddVoiceJSON } from "./oddVoiceJSON/oddVoiceHelpers";
import { base64EncArr } from "./oddvoices/oddvoicesUtils";
import { CopyIconButton } from "./CopyIconButton";

import "react-json-view-lite/dist/index.css";

export interface VoicePartProps {
    output: OddVoiceJSON;
    splitParams: SplitParams;
    audioOutput?: Uint8Array;
    partIndex: number;
    debugInfo?: object;
}

export const VoicePart: React.FC<VoicePartProps> = ({ output, splitParams, audioOutput, partIndex, debugInfo }) => {
    const fileNamePrefix = `${splitParams.partName}${splitParams.numVoices > 1 ? `_(voice_${splitParams.voice})` : ""}${
        splitParams.largestChordLvl > 1 ? `_chord-level_${splitParams.chordLvl}-${splitParams.largestChordLvl}` : ""
    }`;

    return (
        <Grid item container direction="column">
            <Grid item container direction="row" justifyContent="flex-start" alignItems="center" gap={2} pb={1}>
                <Grid item>
                    <Typography variant="subtitle1">
                        Part {partIndex + 1}
                    </Typography>
                </Grid>
                <Grid item>
                    <Typography variant="h6" color="primary">
                        {splitParams.partName}
                        {splitParams.numVoices > 1 ? ` (voice ${splitParams.voice})` : ""}
                        {splitParams.largestChordLvl > 1
                            ? ` - chord level ${splitParams.chordLvl}/${splitParams.largestChordLvl}`
                            : ""}
                    </Typography>
                </Grid>
            </Grid>
            <Grid item container direction="row" justifyContent="flex-start" alignItems="center" gap={1}>
                <Grid item>
                    <audio
                        controls
                        src={audioOutput ? "data:audio/wav;base64," + base64EncArr(audioOutput) : undefined}
                    />
                </Grid>
                <Grid item>
                    <Chip
                        clickable
                        color="primary"
                        label="Download Audio (.wav)"
                        component="a"
                        href={
                            audioOutput
                                ? URL.createObjectURL(new Blob([audioOutput], { type: "audio/wav" }))
                                : undefined
                        }
                        download={fileNamePrefix + ".wav"}
                        icon={<GraphicEqIcon />}
                        sx={{ "&:hover": { color: "grey.50" } }}
                    />
                </Grid>
                <Grid item>
                    <Chip
                        color="secondary"
                        label="Download JSON"
                        component="a"
                        href={`data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(output, null, 2))}`}
                        download={fileNamePrefix + ".json"}
                        clickable
                        icon={<DataObjectIcon />}
                        sx={{ "&:hover": { color: "grey.50" } }}
                    />
                </Grid>
            </Grid>
            <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Grid container direction="row" justifyContent="flex-start" alignItems="center" gap={1}>
                        <CopyIconButton text={output.lyrics} />
                        <Typography variant="subtitle2">Lyrics</Typography>
                    </Grid>
                </AccordionSummary>
                <AccordionDetails>
                    <Typography variant="body2">{output.lyrics}</Typography>
                </AccordionDetails>
            </Accordion>
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
