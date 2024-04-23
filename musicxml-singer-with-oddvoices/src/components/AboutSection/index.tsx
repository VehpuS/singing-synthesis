import React from "react";
import { Grid, Typography } from "@mui/material";

import { PhonemeGuide } from "../PhonemeGuide";

export const AboutSection: React.FC = () => {
    return (
        <Grid item container direction="column" mt={2} gap={3} width="80%" alignItems="flex-start">
            <Grid item container gap={3}>
                <Typography textAlign="start" variant="body1">
                    OddVoices is a project to create free and open source singing synthesizers for American English.
                    This app contains a WebAssembly version of OddVoices, so everything happens in your browser and
                    nothing is sent to a server. Please note that this is experimental alpha software and has many bugs.
                </Typography>
                <Typography textAlign="start" variant="body1">
                    See <a href="https://gitlab.com/oddvoices/oddvoices">oddvoices/oddvoices</a> on GitLab for the core
                    DSP code and command-line version of OddVoices, and{" "}
                    <a href="https://gitlab.com/oddvoices/oddvoices-web">oddvoices/oddvoices-web</a> for the source code
                    of it's Web application version for MIDI + lyrics input.
                </Typography>
            </Grid>

            <Grid item>
                <Typography variant="h6">Phonetic entry</Typography>
            </Grid>
            <Grid item container gap={3}>
                <Typography textAlign="start" variant="body1">
                    OddVoices uses the{" "}
                    <a href="http://www.speech.cs.cmu.edu/cgi-bin/cmudict">CMU Pronouncing Dictionary</a> to pronounce
                    most words. OddVoices does not identify parts of speech, so heteronyms like "lead" and "read" are
                    not handled intelligently. For OOV (out-of-vocabulary) words, OddVoices will guess the pronunciation
                    by converting individual letters and pairs of letters to phonemes.
                </Typography>
                <Typography textAlign="start" variant="body1">
                    To supply custom pronunciations to override the defaults,{" "}
                    <a href="https://en.wikipedia.org/wiki/X-SAMPA">X-SAMPA</a> notation is supported. Surround the
                    X-SAMPA pronunciation with forward slashes (like this: /hEloU/ ) and make sure no additional
                    punctuation immediately precedes or follows the slashes. The table of phonemes is:
                </Typography>
            </Grid>
            <Grid item width="100%">
                <PhonemeGuide />
            </Grid>

            <Grid item container gap={3}>
                <Typography textAlign="start" variant="body1">
                    There are some peculiarities worth noting here. First is the{" "}
                    <a href="https://en.wikipedia.org/wiki/Cot%E2%80%93caught_merger">cot-caught merger</a> that equates
                    /ɑ/ and /ɔ/ along with other low back vowels. This admittedly reflects a bias towards the American
                    West Coast and towards a younger demographic of singers. The exception to this merger is that /ɔr/
                    (h<strong>or</strong>de) and /ɑr/ (h<strong>ar</strong>d) are distinct. If you enter /O/ or /A/ they
                    will sound the same in OddVoices, but /Or/ and /Ar/ are different.
                </Typography>
                <Typography textAlign="start" variant="body1">
                    Second is the unification of /ə/ and /ʌ/. When sung, the English schwa is difficult to pin down and
                    really represents a multitude of vowels. In varieties of North American English, /ə/ and /ʌ/ are
                    closely linked and differ primarily by stress, so /ʌ/ is the best candidate for absorbing /ə/.
                    Similarly, OddVoices doesn't distinguish /ɚ/ and /ɝ/. The CMU Pronouncing Dictionary unfortunately
                    uses schwas a lot, so OddVoices enunciates a lot of words weirdly, like "im-uh-tate" for "imitate."
                </Typography>
                <Typography textAlign="start" variant="body1">
                    Finally, X-SAMPA's /&lbrace;/ causes bracket matching issues in some text editors, so /{}/ and
                    /&amp;/ are provided as alternatives. The latter is borrowed from the so-called{" "}
                    <a href="https://www.vulgarlang.com/ipa-x-sampa-cxs-converter/">Conlang X-SAMPA</a> or CXS.
                </Typography>
            </Grid>
        </Grid>
    );
};
