import React from "react";
import { Grid, Typography } from "@mui/material";

export const LicenseFooter: React.FC = () => {
    return (
        <Grid item container direction="column" p={2} gap={3} alignItems="flex-start">
            <Grid item>
                <Typography variant="h6" textAlign="start">
                    Copyrights
                </Typography>
            </Grid>

            <Grid item container gap={3}>
                <Typography textAlign="start" variant="caption">
                    The source code for this project is released under the{" "}
                    <a href="https://github.com/VehpuS/singing-synthesis/blob/main/LICENSE">GNU GPL v3.0</a> license.
                </Typography>

                <Typography textAlign="start" variant="caption">
                    OddVoices is copyright &copy; 2021-2022 <a href="https://nathan.ho.name/">Nathan Ho</a> and is
                    available under the{" "}
                    <a href="https://github.com/oddvoices/oddvoices/blob/develop/LICENSE">Apache License</a>. Its voice
                    files are in the Public Domain.
                </Typography>

                <Typography textAlign="start" variant="caption">
                    Midifile is copyright &copy; 1999-2018 Craig Stuart Sapp and is available under the{" "}
                    <a href="https://github.com/craigsapp/midifile">BSD 2-Clause License</a>.
                </Typography>

                <Typography textAlign="start" variant="caption">
                    The CMU Pronouncing Dictionary is copyright &copy; 1993-2015 Carnegie Mellon University and
                    available under the{" "}
                    <a href="http://svn.code.sf.net/p/cmusphinx/code/trunk/cmudict/">BSD 2-Clause License</a>.
                </Typography>
            </Grid>
        </Grid>
    );
};
