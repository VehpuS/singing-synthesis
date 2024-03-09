import React from "react";
import { MenuItem, Select } from "@mui/material";
import { map } from "lodash";

import { Voice, allVoices } from "../oddvoices/oddvoicesUtils";

export interface VoiceSelectProps {
    partIndex: number;
    customVoiceForPart?: Voice;
    setCustomVoicePerPart: React.Dispatch<React.SetStateAction<Array<Voice | undefined>>>;
}

export const VoiceSelect: React.FC<VoiceSelectProps> = ({ customVoiceForPart, partIndex, setCustomVoicePerPart }) => {
    const setCustomVoiceForPart = React.useCallback(
        (voice: Voice) =>
            setCustomVoicePerPart((prev) => {
                prev[partIndex] = voice;
                return [...prev];
            }),
        [setCustomVoicePerPart, partIndex]
    );

    return (
        <Select
            value={customVoiceForPart ?? Voice.air}
            onChange={(e) => setCustomVoiceForPart?.(e.target.value as Voice)}
        >
            {map(allVoices, (voice) => (
                <MenuItem key={voice} value={voice}>
                    {voice}
                </MenuItem>
            ))}
        </Select>
    );
};
