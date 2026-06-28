from fastapi import APIRouter, HTTPException, status

from models.schemas import CasualAnalysisRequest, CasualAnalysisResponse
from services.ai_service import analyse_casual_chain
from core.logging import logger

router = APIRouter(prefix="/casual-analysis", tags=["Casual Analysis"])


@router.post(
    "/",
    response_model=CasualAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyse a casual chain for an event",
    description=(
        "Submits an event description to the AI service and receives a suggested "
        "casual graph consisting of event nodes and directed casual edges."
    ),
)
async def analyse_casual_chain_endpoint(
    request: CasualAnalysisRequest,
) -> CasualAnalysisResponse:
    """Analyse a casual chain for the given event description."""
    try:
        return await analyse_casual_chain(request)
    except Exception as exc:
        logger.error("Casual analysis failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI analysis failed. Please try again.",
        ) from exc
