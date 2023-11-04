export enum EventType {
    SetFrequencyImmediate = "setFrequencyImmediate",
    SetTargetFrequency = "setTargetFrequency",
    NoteOn = "noteOn",
    NoteOff = "noteOff",
    SetFormantShift = "setFormantShift",
    SetPhonemeSpeed = "setPhonemeSpeed",
    Empty = "empty"
}

export interface OddVoiceJSONEvent {
    type: EventType;
    time: number;
    // Used in SetTargetFrequency and SetFrequencyImmediate only.
    frequency: number;
    // Used in SetFormantShift only.
    formantShift: number;
    // Used in SetPhonemeSpeed only.
    phonemeSpeed: number;
}

export const createdOddVoiceJSONEvent = ({
    eventType,
    time,
    frequency = 0.0,
    // Used in SetFormantShift only.
    formantShift = 1.0,
    // Used in SetPhonemeSpeed only.
    phonemeSpeed = 1.0,
}: Partial<Omit<OddVoiceJSONEvent, "type" | "time">> & {
    time: number;
    eventType: EventType;
}): OddVoiceJSONEvent => ({
    type: eventType,
    time,
    frequency,
    formantShift,
    phonemeSpeed,
})


export interface OddVoiceJSON {
    lyrics: string
    events: OddVoiceJSONEvent[];
}
