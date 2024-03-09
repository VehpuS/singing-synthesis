import React from "react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
    Grid,
    TextareaAutosize,
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { cloneDeep } from "lodash";

import { createSplitOddVoiceJsonInputsFromMusicXml } from "../oddVoiceJSON";
import { OddVoiceJSON } from "../oddVoiceJSON/oddVoiceHelpers";
import { CopyIconButton } from "../CopyIconButton";

export interface PartLyricsProps {
    output: OddVoiceJSON;
    partIndex: number;
    setOddVoiceOutputs: React.Dispatch<
        React.SetStateAction<ReturnType<typeof createSplitOddVoiceJsonInputsFromMusicXml>>
    >;
}

export const PartLyrics: React.FC<PartLyricsProps> = ({ output, partIndex, setOddVoiceOutputs }) => {
    const generatedLyrics = React.useRef<string | undefined>(output?.lyrics);
    React.useEffect(() => {
        if (!generatedLyrics.current && output.lyrics) {
            generatedLyrics.current = output.lyrics;
        }
    }, [output.lyrics]);

    const [isEditingLyrics, setIsEditingLyrics] = React.useState<boolean>(false);
    const [newDraftLyrics, setDraftLyrics] = React.useState<string | null>(null);

    const draftLyrics = newDraftLyrics ?? output?.lyrics ?? generatedLyrics.current ?? "";

    const saveNewLyrics = React.useCallback(
        (newLyrics: string) => {
            if (newLyrics && newLyrics !== output.lyrics) {
                setOddVoiceOutputs((prev) => {
                    const newOutputs = [...prev];
                    newOutputs[partIndex] = cloneDeep(newOutputs[partIndex]);
                    newOutputs[partIndex].output.lyrics = newLyrics;
                    return newOutputs;
                });
            }
            setDraftLyrics(null);
            setIsEditingLyrics(false);
        },
        [setOddVoiceOutputs, partIndex, output.lyrics]
    );
    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Grid container direction="row" justifyContent="flex-start" alignItems="center" gap={1}>
                    <CopyIconButton text={output.lyrics} />
                    <Typography variant="subtitle2">Lyrics</Typography>
                </Grid>
            </AccordionSummary>
            <AccordionDetails>
                {
                    <Grid container direction="column" gap={1}>
                        {isEditingLyrics ? (
                            <>
                                <Grid
                                    item
                                    container
                                    direction="row"
                                    justifyContent="flex-start"
                                    alignItems="center"
                                    gap={1}
                                >
                                    <Button
                                        variant="contained"
                                        onClick={() => saveNewLyrics(draftLyrics)}
                                        disabled={draftLyrics === output.lyrics}
                                    >
                                        Save
                                    </Button>
                                    <Button variant="contained" onClick={() => setIsEditingLyrics(false)}>
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => {
                                            setDraftLyrics(output.lyrics);
                                        }}
                                    >
                                        Reset
                                    </Button>
                                </Grid>
                                <Grid item>
                                    <TextareaAutosize
                                        value={draftLyrics}
                                        onChange={(e) => setDraftLyrics(e.target.value)}
                                        style={{ width: "100%" }}
                                    />
                                </Grid>
                            </>
                        ) : (
                            <>
                                <Grid
                                    item
                                    container
                                    direction="row"
                                    justifyContent="flex-start"
                                    alignItems="center"
                                    gap={1}
                                >
                                    <Button variant="contained" onClick={() => setIsEditingLyrics(true)}>
                                        Edit
                                    </Button>
                                    <Button
                                        variant="contained"
                                        onClick={() => {
                                            if (generatedLyrics.current && generatedLyrics.current !== output.lyrics) {
                                                saveNewLyrics(generatedLyrics.current);
                                            }
                                        }}
                                        disabled={generatedLyrics.current === output.lyrics || !generatedLyrics.current}
                                    >
                                        Restore from generated
                                    </Button>
                                </Grid>
                                <Grid item>
                                    <Typography variant="body2">{output.lyrics}</Typography>
                                </Grid>
                            </>
                        )}
                    </Grid>
                }
            </AccordionDetails>
        </Accordion>
    );
};
