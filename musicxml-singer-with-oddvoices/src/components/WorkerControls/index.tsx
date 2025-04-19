import React from "react";
import {
  FormControlLabel,
  Switch,
  Typography,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

interface WorkerControlsProps {
  useXmlWorker: boolean;
  useVoiceWorker: boolean;
  toggleXmlWorkerMode: () => void;
  toggleVoiceWorkerMode: () => void;
  isXmlWorkerReady: boolean;
  isVoiceWorkerReady: boolean;
  xmlWorkerError?: string | null;
}

export const WorkerControls: React.FC<WorkerControlsProps> = ({
  useXmlWorker,
  useVoiceWorker,
  toggleXmlWorkerMode,
  toggleVoiceWorkerMode,
  isXmlWorkerReady,
  isVoiceWorkerReady,
  xmlWorkerError,
}) => {
  return (
    <Accordion disableGutters>
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        <Typography variant="subtitle2" fontWeight="bold">
          Worker Settings (Experimental)
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <Tooltip
          title={
            isXmlWorkerReady
              ? "Process MusicXML files in a background thread to prevent UI freezing"
              : "XML worker is initializing or unavailable"
          }
        >
          <FormControlLabel
            control={
              <Switch
                checked={useXmlWorker}
                onChange={toggleXmlWorkerMode}
                disabled={!isXmlWorkerReady}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Use XML Worker {!isXmlWorkerReady && "(initializing...)"}
              </Typography>
            }
          />
        </Tooltip>

        <Tooltip
          title={
            isVoiceWorkerReady
              ? "Generate voices in a background thread to prevent UI freezing"
              : "Voice worker is initializing or unavailable"
          }
        >
          <FormControlLabel
            control={
              <Switch
                checked={useVoiceWorker}
                onChange={toggleVoiceWorkerMode}
                disabled={!isVoiceWorkerReady}
                color="primary"
                size="small"
              />
            }
            label={
              <Typography variant="body2">
                Use Voice Worker {!isVoiceWorkerReady && "(initializing...)"}
              </Typography>
            }
          />
        </Tooltip>

        {xmlWorkerError && (
          <Typography variant="caption" color="error">
            Error: {xmlWorkerError}
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
