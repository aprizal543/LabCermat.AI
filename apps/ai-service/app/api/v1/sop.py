from fastapi import APIRouter

from app.models.ai_models import SopQuestionRequest, SopQuestionResponse
from app.services import sop_service

router = APIRouter()


@router.post(
    "/sop-question",
    response_model=SopQuestionResponse,
    tags=["AI — SOP Assistant"],
    summary="Tanya jawab SOP laboratorium",
    description=(
        "Menerima pertanyaan teks bebas dan mengembalikan jawaban berbasis "
        "dokumen SOP yang telah diindeks (BM25/keyword). "
        "Tidak menggunakan LLM — jawaban dibangun dari kutipan chunk SOP. "
        "Selalu menyertakan safety_note."
    ),
)
async def ask_sop_question(request: SopQuestionRequest) -> SopQuestionResponse:
    return sop_service.answer_question(request)
