import { IconButton, Tooltip } from "@mui/material";
import useClipboard from "react-use-clipboard";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";

export const CopyIconButton: React.FC<{
    text: string;
    successDuration?: number;
}> = ({ text, successDuration = 1000 }) => {
    const [isCopied, copy] = useClipboard(text, {
        successDuration,
    });

    return (
        <Tooltip title={isCopied ? "Copied!" : "Copy"} placement="top">
            <IconButton
                size="small"
                onClick={(e) => {
                    e.stopPropagation();
                    copy();
                }}
                color="primary"
            >
                {isCopied ? <CheckIcon /> : <ContentCopyIcon />}
            </IconButton>
        </Tooltip>
    );
};
