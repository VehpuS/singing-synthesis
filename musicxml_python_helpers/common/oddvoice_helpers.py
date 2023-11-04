from dataclasses import dataclass
from enum import Enum
from typing import List


class EventType(Enum):
    SetFrequencyImmediate = "setFrequencyImmediate"
    SetTargetFrequency = "setTargetFrequency"
    NoteOn = "noteOn"
    NoteOff = "noteOff"
    SetFormantShift = "setFormantShift"
    SetPhonemeSpeed = "setPhonemeSpeed"
    Empty = "empty"


@dataclass
class OddVoiceJSONEvent:
    event_type: EventType
    time: float
    # Used in SetTargetFrequency and SetFrequencyImmediate only.
    frequency: float = 0.0
    # Used in SetFormantShift only.
    formantShift: float = 1.0
    # Used in SetPhonemeSpeed only.
    phonemeSpeed: float = 1.0


@dataclass
class OddVoiceJSON:
    lyrics: str
    events: List[OddVoiceJSONEvent]
