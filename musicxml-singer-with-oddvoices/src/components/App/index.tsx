import React from "react";
import { forEach, isEmpty, isEqual, map, size } from "lodash";
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

import { AboutSection } from "../AboutSection";
import { OpenSheetMusicDisplay } from "../OpenSheetMusicDisplay";
import { MediaControls } from "../MediaControls";
import { UploadButton } from "../UploadButton";
import { LicenseFooter } from "../LicenseFooter";
import { Part } from "../Part";
import { createSplitOddVoiceJsonInputsFromMusicXml } from "../../oddVoiceJSON";
import { useGenerateAudio } from "./useGenerateAudio";
import { Voice } from "../../oddvoices/oddvoicesUtils";

import "./App.css";
import { parseXmlText } from "../../musicXmlParsing/xmlHelpers";
import { useXmlProcessingWorker } from "../../workers/useXmlProcessingWorker";
import { WorkerControls } from "../WorkerControls";

function App() {
  const [rawFile, setRawFile] = React.useState<string>("");
  const [oddVoiceOutputs, setOddVoiceOutputs] = React.useState<
    ReturnType<typeof createSplitOddVoiceJsonInputsFromMusicXml>
  >([]);
  const previousOddVoiceOutputs = React.useRef(oddVoiceOutputs);

  const {
    audioOutputs,
    isLoadingApp,
    isLoadingVoice,
    voiceLoadingFailed,
    resetAudioOutputs,
    generateAudioForPart,
    generateAudioForAllParts,
    isGeneratingAudio,
    useWorker: useVoiceWorker,
    toggleWorkerMode: toggleVoiceWorkerMode,
    isWorkerReady: isVoiceWorkerReady,
  } = useGenerateAudio();

  const {
    processXml,
    isReady: isXmlWorkerReady,
    error: xmlWorkerError,
  } = useXmlProcessingWorker();

  const [useXmlWorker, setUseXmlWorker] = React.useState(false);
  const [isProcessingXml, setIsProcessingXml] = React.useState(false);

  const toggleXmlWorkerMode = React.useCallback(() => {
    setUseXmlWorker((prev) => !prev);
  }, []);

  const [customVoicePerPart, setCustomVoicePerPart] = React.useState<
    Array<Voice | undefined>
  >([]);
  const previousCustomVoicePerPart = React.useRef(customVoicePerPart);

  const [, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!rawFile) {
      return;
    }

    resetAudioOutputs();

    const processXmlData = async () => {
      setIsProcessingXml(true);
      try {
        let outputs;

        if (useXmlWorker && isXmlWorkerReady) {
          try {
            outputs = await processXml(rawFile);
          } catch (error) {
            console.error(
              "XML worker failed, falling back to main thread:",
              error
            );
            const parsedXml = parseXmlText(rawFile);
            outputs = createSplitOddVoiceJsonInputsFromMusicXml(parsedXml);
          }
        } else {
          const parsedXml = parseXmlText(rawFile);
          outputs = createSplitOddVoiceJsonInputsFromMusicXml(parsedXml);
        }

        setOddVoiceOutputs(outputs);
      } catch (error) {
        console.error("Error processing XML:", error);
      } finally {
        setIsProcessingXml(false);
      }
    };

    processXmlData();
  }, [rawFile, resetAudioOutputs, useXmlWorker, isXmlWorkerReady, processXml]);

  React.useEffect(() => {
    const partsToGenerate: number[] = [];

    forEach(oddVoiceOutputs, (oddVoiceOutput, i) => {
      const oddVoiceJson = oddVoiceOutput?.output;
      const partVoice = customVoicePerPart?.[i] ?? Voice.air;
      const isNewPart = !audioOutputs?.[i];
      const isNewJson = !isEqual(
        previousOddVoiceOutputs.current?.[i]?.output,
        oddVoiceJson
      );
      const isNewVoice =
        (previousCustomVoicePerPart.current?.[i] ?? Voice.air) !== partVoice;
      if (oddVoiceJson && (isNewPart || isNewJson || isNewVoice)) {
        partsToGenerate.push(i);
      }
    });

    if (!isEmpty(partsToGenerate)) {
      if (size(partsToGenerate) === size(oddVoiceOutputs)) {
        startTransition(() => {
          generateAudioForAllParts(
            map(partsToGenerate, (i) => ({
              oddVoiceJson: oddVoiceOutputs[i]?.output,
              voice: customVoicePerPart?.[i] ?? Voice.air,
            }))
          );
        });
      } else {
        map(partsToGenerate, (i) => {
          startTransition(() => {
            generateAudioForPart(
              oddVoiceOutputs[i]?.output,
              i,
              customVoicePerPart?.[i] ?? Voice.air
            );
          });
        });
      }
    }

    previousOddVoiceOutputs.current = { ...oddVoiceOutputs };
    previousCustomVoicePerPart.current = [...customVoicePerPart];
  }, [
    startTransition,
    generateAudioForPart,
    generateAudioForAllParts,
    audioOutputs,
    customVoicePerPart,
    oddVoiceOutputs,
  ]);

  return (
    <Paper
      elevation={1}
      sx={{ maxWidth: 800, paddingInline: 3, marginInline: 1 }}
    >
      <Accordion
        variant="outlined"
        sx={{
          top: 0,
          position: "sticky",
          zIndex: 1,
          backgroundColor: (theme) => theme.palette.background.paper,
        }}
      >
        <AccordionSummary
          disabled={!rawFile}
          expandIcon={rawFile ? <ExpandMoreIcon /> : null}
        >
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
                <CircularProgress size={16} /> Loading voices...
              </>
            ) : isProcessingXml || !isXmlWorkerReady ? (
              <>
                <CircularProgress size={16} /> Processing XML...
              </>
            ) : xmlWorkerError ? (
              <>
                <ErrorIcon />
                Error processing XML!
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
                setRawFile={setRawFile}
              />
              {size(audioOutputs) > 0 && <MediaControls />}
            </Paper>
          </Grid>

          <Divider />
          <Grid
            container
            direction="column"
            gap={3}
            alignItems="center"
            paddingBlock={2}
          >
            <Grid
              item
              container
              direction="column"
              gap={3}
              alignItems="center"
              alignSelf="center"
            >
              {map(oddVoiceOutputs, (oddVoiceOutput, i) => (
                <Part
                  key={i}
                  splitIndex={i}
                  output={oddVoiceOutput.output}
                  splitParams={oddVoiceOutput.splitParams}
                  debugInfo={oddVoiceOutput?.unparsedPartEvents}
                  lyricsEvents={
                    oddVoiceOutput?.unparsedPartEvents?.lyricsEvents
                  }
                  audioOutput={audioOutputs[i]}
                  customVoiceForPart={customVoicePerPart?.[i] ?? Voice.air}
                  setCustomVoicePerPart={setCustomVoicePerPart}
                  setOddVoiceOutputs={setOddVoiceOutputs}
                />
              ))}
            </Grid>
          </Grid>
        </>
      )}

      <Grid container direction="column" gap={3} alignItems="center">
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="h6">About Oddvoices</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <AboutSection />
          </AccordionDetails>
        </Accordion>
      </Grid>
      <Divider />
      <LicenseFooter />
      <Divider />

      {import.meta.env.MODE === "development" && (
        <Grid item mt={2}>
          <WorkerControls
            useXmlWorker={useXmlWorker}
            useVoiceWorker={useVoiceWorker}
            toggleXmlWorkerMode={toggleXmlWorkerMode}
            toggleVoiceWorkerMode={toggleVoiceWorkerMode}
            isXmlWorkerReady={isXmlWorkerReady}
            isVoiceWorkerReady={isVoiceWorkerReady}
            xmlWorkerError={xmlWorkerError}
          />
        </Grid>
      )}
    </Paper>
  );
}

export default App;
