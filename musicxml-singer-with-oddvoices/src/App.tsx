import React from "react";
import { map } from "lodash";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Button,
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
// @ts-ignore
import createOddVoicesModule from "./oddvoices/js/oddvoices_wasm.mjs";

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

// https://stackoverflow.com/questions/60363032/proper-way-to-load-wasm-module-in-react-for-big-files-more-than-4kb
// https://github.com/bobbiec/react-wasm-demo

function App() {
    const [rawFile, setRawFile] = React.useState<string>("");
    const [oddVoiceOutputs, setOddVoiceOutputs] = React.useState<
        Array<{
            output: OddVoiceJSON;
            splitParams: SplitParams;
        }>
    >([]);
    if (oddVoiceOutputs.length > 0) {
        console.log({ oddVoiceOutputs });
    }

    const [oddVoiceApp, setOddVoiceApp] = React.useState<any>(null);
    React.useEffect(() => {
        const initialize = async () => {
            console.log({ createOddVoicesModule });
            setOddVoiceApp(await createOddVoicesModule());
        };
        initialize();
    }, []);

    console.log({ oddVoiceApp, createOddVoicesModule });

    return (
        <Paper>
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
                                    setOddVoiceOutputs(
                                        createSplitOddVoiceJsonInputsFromMusicXml(
                                            parseXmlText(e.target.result as string)
                                        )
                                    );
                                    setRawFile(e.target.result as string);
                                }
                            };
                            reader.readAsText(file);
                        }}
                    />
                </Button>
                {oddVoiceOutputs.length > 0 && (
                    <Button
                        onClick={() => {
                            const allAnchors = document.querySelectorAll("a.part-downloads");
                            allAnchors.forEach((anchor) => {
                                (anchor as HTMLAnchorElement).click();
                            });
                        }}
                    >
                        Download All
                    </Button>
                )}
            </Grid>
            <Divider />
            {Boolean(rawFile) && (
                <Accordion variant="outlined">
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="body1" textAlign="center" width="100%">
                            Preview
                        </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <OpenSheetMusicDisplay autoResize file={rawFile} />
                    </AccordionDetails>
                </Accordion>
            )}
            <Divider />
            <Grid container direction="column" gap={3} alignItems="center" paddingBlock={2}>
                <Grid item container direction="column" gap={3} alignItems="center" alignSelf="center">
                    {map(oddVoiceOutputs, (oddVoiceOutput, i) => {
                        const fileName = `${oddVoiceOutput.splitParams.partName}_(voice_${
                            oddVoiceOutput.splitParams.voice
                        })${
                            oddVoiceOutput.splitParams.largestChordLvl > 1
                                ? `_chord-level_${oddVoiceOutput.splitParams.chordLvl}-${oddVoiceOutput.splitParams.largestChordLvl}`
                                : ``
                        }.json`;
                        return (
                            <Grid item key={i}>
                                <Typography variant="h6">Part {i + 1}</Typography>
                                <a
                                    className="part-downloads"
                                    href={`data:text/json;charset=utf-8,${encodeURIComponent(
                                        JSON.stringify(oddVoiceOutput.output, null, 2)
                                    )}`}
                                    download={fileName}
                                >
                                    Download JSON - {oddVoiceOutput.splitParams.partName} (voice{" "}
                                    {oddVoiceOutput.splitParams.voice})
                                    {oddVoiceOutput.splitParams.largestChordLvl > 1
                                        ? ` - chord level ${oddVoiceOutput.splitParams.chordLvl}/${oddVoiceOutput.splitParams.largestChordLvl}`
                                        : ``}
                                </a>
                            </Grid>
                        );
                    })}
                    <Divider />
                </Grid>
            </Grid>
            <Grid container direction="column" gap={3} alignItems="center" paddingBlock={2}>
                <PhonemeGuide />
            </Grid>
        </Paper>
    );
}

export default App;
