from fastapi import APIRouter, HTTPException, status

from models.schemas import EventSummaryRequest, EventSummaryResponse
from services.ai_service import generate_event_summary
from core.logging import logger

router = APIRouter(prefix="/events", tags=["Events"])


@router.post(
    "/summarise",
    response_model=EventSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate an AI summary for a raw event text",
    description=(
        "Accepts a raw event text and returns a concise AI-generated summary, "
        "a confidence score, and a list of key actors."
    ),
)
async def summarise_event(request: EventSummaryRequest) -> EventSummaryResponse:
    """Generate an event summary from raw text."""
    try:
        return await generate_event_summary(request)
    except Exception as exc:
        logger.error("Event summarisation failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Summarisation failed. Please try again.",
        ) from exc
