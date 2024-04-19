import React from "react";
import { Chip, Grid } from "@mui/material";
import DataObjectIcon from "@mui/icons-material/DataObject";
import GraphicEqIcon from "@mui/icons-material/GraphicEq";

import { SplitParams } from "../oddVoiceJSON";
import { OddVoiceJSON } from "../oddVoiceJSON/oddVoiceHelpers";
export interface PartDownloadsProps {
    output: OddVoiceJSON;
    splitParams: SplitParams;
    audioOutput?: Uint8Array;
}

export const PartDownloads: React.FC<PartDownloadsProps> = ({ output, splitParams, audioOutput }) => {
    const fileNamePrefix = `${splitParams.partName}${splitParams.numVoices > 1 ? `_(voice_${splitParams.voice})` : ""}${
        splitParams.largestChordLvl > 1 ? `_chord-level_${splitParams.chordLevel}-${splitParams.largestChordLvl}` : ""
    }`;

    return (
        <>
            <Grid item>
                <Chip
                    clickable
                    color="primary"
                    label="Download Audio (.wav)"
                    component="a"
                    href={audioOutput ? URL.createObjectURL(new Blob([audioOutput], { type: "audio/wav" })) : undefined}
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
        </>
    );
};
