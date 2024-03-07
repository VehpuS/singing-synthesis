import React from "react";
import { forEach } from "lodash";
import { TextField, ToggleButton, ToggleButtonGroup } from "@mui/material";
import PlayIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import StopIcon from "@mui/icons-material/Stop";

export const MediaControls = () => {
    const [jumpToTime, setJumpToTime] = React.useState(0);
    return (
        <ToggleButtonGroup
            size="small"
            exclusive
            onChange={(_event, action) => {
                const allAudios = document.querySelectorAll("audio");
                forEach(allAudios, (audio) => {
                    if (action === "play") {
                        audio.play();
                    } else if (action === "pause") {
                        audio.pause();
                    } else if (action === "stop") {
                        audio.pause();
                        audio.currentTime = 0;
                    } else if (action === "jump") {
                        forEach(allAudios, (audio) => {
                            audio.currentTime = jumpToTime;
                        });
                    }
                });
            }}
            aria-label="text formatting"
        >
            <ToggleButton value="play" aria-label="italic">
                <PlayIcon />
            </ToggleButton>
            <ToggleButton value="pause" aria-label="underlined">
                <PauseIcon />
            </ToggleButton>
            <ToggleButton value="stop" aria-label="color">
                <StopIcon />
            </ToggleButton>
            {/* Jump to */}
            <ToggleButton value="jump" aria-label="color">
                Jump to
            </ToggleButton>
            <TextField
                type="number"
                value={jumpToTime}
                placeholder="Enter time in seconds"
                onChange={(e) => {
                    setJumpToTime(Number(e.target.value));
                }}
                inputProps={{ min: 0, step: 1 }}
            />
        </ToggleButtonGroup>
    );
};
