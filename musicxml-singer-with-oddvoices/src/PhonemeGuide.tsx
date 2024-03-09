import React from "react";
import { keys, map, split } from "lodash";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";

const XSAMPA_TO_IPA_AND_GUIDE = {
    ["{} { &"]: ["æ", "hAt"],
    "A O": ["ɑ ɔ", "cAUGHt, cOt"],
    I: ["ɪ", "bIt"],
    E: ["ɛ", "lEt"],
    "@ V": ["ə ʌ", "cUb"],
    U: ["ʊ", "lOOk"],
    "@` 3`": ["ɚ ɝ", "bIRd"],
    i: ["i", "sEEd"],
    N: ["ŋ", "haNG"],
    tS: ["tʃ", "CHild"],
    dZ: ["dʒ", "Jet"],
    T: ["θ", "THing"],
    D: ["ð", "wiTHer"],
    S: ["ʃ", "SHock"],
    Z: ["ʒ", "meaSure"],
    oU: ["oʊ", "dOE"],
    eI: ["eɪ", "hAY"],
    aI: ["aɪ", "lIE"],
    OI: ["ɔɪ", "OIl"],
    aU: ["aʊ", "OWl"],
    l: ["l", "Long"],
    r: ["r", "Red"],
    w: ["w", "Wonder"],
    j: ["j", "Yard"],
    m: ["m", "Mat"],
    n: ["n", "No"],
    h: ["h", "Hay"],
    k: ["k", "Cut"],
    g: ["g", "God"],
    p: ["p", "Pile"],
    b: ["b", "Bay"],
    t: ["t", "Toad"],
    d: ["d", "Dine"],
    f: ["f", "Fast"],
    v: ["v", "Vase"],
    s: ["s", "Sad"],
    z: ["z", "Zany"],
    u: ["u", "nEW"],
} as const;

export const PhonemeGuide: React.FC = () => {
    return (
        <Accordion>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography variant="subtitle1">Phoneme Guide</Typography>
            </AccordionSummary>
            <AccordionDetails>
                <Table
                    id="phoneme-guide"
                    stickyHeader
                    sx={{
                        "& td": { fontSize: 18 },
                        "& th": { fontSize: 24 },
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell>X-SAMPA</TableCell>
                            <TableCell>IPA</TableCell>
                            <TableCell>Pronunciation</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {map(keys(XSAMPA_TO_IPA_AND_GUIDE), (key: keyof typeof XSAMPA_TO_IPA_AND_GUIDE) => (
                            <TableRow key={key}>
                                {/* const xsampaCell =  */}
                                <TableCell>{map(split(key, " "), (phoneme) => `/${phoneme}/`).join(", ")}</TableCell>
                                {/* const ipaCell =  */}
                                <TableCell>
                                    {map(split(XSAMPA_TO_IPA_AND_GUIDE[key][0], " "), (phoneme) => `/${phoneme}/`).join(
                                        ", "
                                    )}
                                </TableCell>
                                {/* const guideCell =  */}
                                <TableCell>
                                    {map(XSAMPA_TO_IPA_AND_GUIDE[key][1], (character, index) =>
                                        character !== character.toLowerCase() ? (
                                            <strong key={`${character}-${index}`}>{character.toLowerCase()}</strong>
                                        ) : (
                                            <span key={`${character}-${index}`}>{character}</span>
                                        )
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </AccordionDetails>
        </Accordion>
    );
};
