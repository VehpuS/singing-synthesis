import React from 'react';
import { FormControlLabel, Switch, Grid, Typography, Paper, Tooltip } from '@mui/material';

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
  xmlWorkerError
}) => {
  return (
    <Paper elevation={0} sx={{ padding: 1, border: theme => `1px solid ${theme.palette.divider}` }}>
      <Grid container direction="column" gap={1}>
        <Typography variant="subtitle2" fontWeight="bold">Worker Settings</Typography>
        
        <Tooltip title={isXmlWorkerReady ? 
          "Process MusicXML files in a background thread to prevent UI freezing" : 
          "XML worker is initializing or unavailable"}>
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
        
        <Tooltip title={isVoiceWorkerReady ? 
          "Generate voices in a background thread to prevent UI freezing" : 
          "Voice worker is initializing or unavailable"}>
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
      </Grid>
    </Paper>
  );
};