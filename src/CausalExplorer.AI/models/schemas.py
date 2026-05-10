from __future__ import annotations

from datetime import datetime
from enum import Enum
from uuid import UUID

from pydantic import BaseModel, Field


class EventDomain(str, Enum):
    geopolitics = "Geopolitics"
    economics = "Economics"
    technology = "Technology"
    social = "Social"
    environmental = "Environmental"
    military = "Military"
    cultural = "Cultural"


class CausalRelationshipType(str, Enum):
    directly_caused = "DirectlyCaused"
    enabled_conditions_for = "EnabledConditionsFor"
    contributed_to = "ContributedTo"
    contested = "Contested"
    correlated = "Correlated"


class Perspective(str, Enum):
    mainstream = "Mainstream"
    geopolitical = "Geopolitical"
    structural = "Structural"
    economic = "Economic"
    revisionist = "Revisionist"


# ── Request / Response models ─────────────────────────────────────────────────


class CausalAnalysisRequest(BaseModel):
    """Request payload for causal chain analysis."""

    event_description: str = Field(
        ...,
        min_length=20,
        max_length=5000,
        description="A description of the event to analyse.",
    )
    domain: EventDomain = Field(
        default=EventDomain.geopolitics,
        description="The primary domain of the event.",
    )
    perspective: Perspective = Field(
        default=Perspective.mainstream,
        description="The analytical perspective to use.",
    )
    depth: int = Field(
        default=3,
        ge=1,
        le=6,
        description="Number of causal hops to explore.",
    )


class CausalNodeSuggestion(BaseModel):
    """A suggested causal event node."""

    title: str
    summary: str
    event_date_estimate: str
    domain: EventDomain
    confidence_score: float = Field(ge=0.0, le=1.0)


class CausalEdgeSuggestion(BaseModel):
    """A suggested causal edge between two events."""

    from_event_title: str
    to_event_title: str
    relationship_type: CausalRelationshipType
    strength: float = Field(ge=0.0, le=1.0)
    perspective: Perspective
    explanation: str
    is_contested: bool = False


class CausalAnalysisResponse(BaseModel):
    """Response containing suggested nodes and edges for a causal chain."""

    root_event: CausalNodeSuggestion
    related_nodes: list[CausalNodeSuggestion]
    suggested_edges: list[CausalEdgeSuggestion]
    analysis_perspective: Perspective
    model_used: str
    generated_at: datetime


class EventSummaryRequest(BaseModel):
    """Request payload for generating an event summary."""

    title: str = Field(..., min_length=3, max_length=300)
    raw_text: str = Field(..., min_length=50, max_length=10000)
    domain: EventDomain


class EventSummaryResponse(BaseModel):
    """Response containing a generated event summary."""

    summary: str
    confidence_score: float = Field(ge=0.0, le=1.0)
    key_actors: list[str]
    model_used: str
    generated_at: datetime
