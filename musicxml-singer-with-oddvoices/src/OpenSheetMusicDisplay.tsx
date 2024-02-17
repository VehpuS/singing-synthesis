import React, { Component } from "react";
import { OpenSheetMusicDisplay as OSMD } from "opensheetmusicdisplay";

export interface OpenSheetMusicDisplayProps {
    file: string;
    autoResize?: boolean;
    drawTitle?: boolean;
}

export class OpenSheetMusicDisplay extends Component<OpenSheetMusicDisplayProps> {
    osmd: OSMD | undefined;
    divRef: React.RefObject<HTMLDivElement>;

    constructor(props: OpenSheetMusicDisplayProps) {
        super(props);
        this.state = { dataReady: false };
        this.osmd = undefined;
        this.divRef = React.createRef();
    }

    async setupOsmd() {
        await this.osmd?.load(this.props.file);
        if (this.osmd?.IsReadyToRender()) {
            this.osmd?.render();
        } else {
            console.error("OSMD not ready to render");
        }
    }

    resize() {
        this.forceUpdate();
    }

    componentWillUnmount() {
        window.removeEventListener("resize", this.resize);
    }

    componentDidUpdate(prevProps: OpenSheetMusicDisplayProps) {
        if (this.props.drawTitle !== prevProps.drawTitle) {
            this.initOsmd();
        }
        if (this.props.file) {
            this.osmd?.load(this.props.file).then(() => this.osmd?.render());
        }
    }

    initOsmd() {
        if (!this.divRef.current) {
            return;
        }
        this.osmd = new OSMD(this.divRef.current, {
            drawFromMeasureNumber: 0,
            autoResize: this.props.autoResize !== undefined ? this.props.autoResize : true,
            drawTitle: this.props.drawTitle !== undefined ? this.props.drawTitle : true,
            drawingParameters: "compacttight",
        });
    }

    // Called after render
    componentDidMount() {
        this.initOsmd();
        if (this.props.file) {
            this.osmd?.load(this.props.file).then(() => this.osmd?.render());
        }
        window.addEventListener("resize", this.resize);
    }

    render() {
        return <div ref={this.divRef} />;
    }
}

export default OpenSheetMusicDisplay;
