from fastapi import APIRouter, HTTPException, status

from models.schemas import CausalAnalysisRequest, CausalAnalysisResponse
from services.ai_service import analyse_causal_chain
from core.logging import logger

router = APIRouter(prefix="/causal-analysis", tags=["Causal Analysis"])


@router.post(
    "/",
    response_model=CausalAnalysisResponse,
    status_code=status.HTTP_200_OK,
    summary="Analyse a causal chain for an event",
    description=(
        "Submits an event description to the AI service and receives a suggested "
        "causal graph consisting of event nodes and directed causal edges."
    ),
)
async def analyse_causal_chain_endpoint(
    request: CausalAnalysisRequest,
) -> CausalAnalysisResponse:
    """Analyse a causal chain for the given event description."""
    try:
        return await analyse_causal_chain(request)
    except Exception as exc:
        logger.error("Causal analysis failed", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="AI analysis failed. Please try again.",
        ) from exc
