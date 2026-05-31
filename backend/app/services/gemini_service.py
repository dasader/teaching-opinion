from google import genai
from pathlib import Path
from typing import List, Optional, Dict
import json
import re
import logging

logger = logging.getLogger(__name__)

# 최신 안정 모델 목록 (업데이트 시 여기만 수정)
CURATED_MODELS = [
    {"name": "gemini-3.5-flash",            "display_name": "Gemini 3.5 Flash (빠름 · 권장)"},
    {"name": "gemini-3.1-flash-lite",       "display_name": "Gemini 3.1 Flash Lite (경량)"},
]
DEFAULT_MODEL = "gemini-3.5-flash"
_VALID_MODEL_NAMES = {m["name"] for m in CURATED_MODELS}

# 파싱 실패 시 채워 넣는 자리표시자 (항상 5개를 반환하기 위함)
PLACEHOLDER_OPINION = "의견을 생성할 수 없습니다."
# backend/prompts/opinion_prompt.txt — 프롬프트의 유일한 출처
PROMPT_FILE = Path(__file__).resolve().parents[2] / "prompts" / "opinion_prompt.txt"


class GeminiService:
    _cached_prompt_template: Optional[str] = None

    def __init__(self, api_key: str):
        if not api_key:
            raise ValueError("GEMINI_API_KEY가 설정되지 않았습니다.")

        self._client = genai.Client(api_key=api_key)
        self._load_prompt_template()

    def _load_prompt_template(self) -> None:
        if GeminiService._cached_prompt_template is not None:
            return

        try:
            GeminiService._cached_prompt_template = PROMPT_FILE.read_text(encoding="utf-8")
        except OSError as e:
            # 프롬프트는 단일 출처이므로 누락 시 조용히 품질을 떨어뜨리지 않고 즉시 실패
            raise RuntimeError(f"프롬프트 파일을 읽을 수 없습니다: {PROMPT_FILE}") from e
        logger.info("프롬프트 템플릿을 성공적으로 로드했습니다.")

    @staticmethod
    def get_available_models() -> List[Dict[str, str]]:
        return [
            {"name": m["name"], "full_name": f"models/{m['name']}", "display_name": m["display_name"]}
            for m in CURATED_MODELS
        ]

    @classmethod
    def clear_cache(cls) -> None:
        cls._cached_prompt_template = None

    def generate_opinions(
        self,
        model_name: str,
        name: Optional[str],
        good_subjects: List[str],
        weak_subjects: List[str],
        personality: List[str],
        characteristics: Optional[str],
        target_length: int,
    ) -> List[str]:
        model_id = self._resolve_model_id(model_name)
        prompt = self._build_prompt(
            name, good_subjects, weak_subjects, personality, characteristics, target_length
        )

        try:
            response = self._client.models.generate_content(
                model=model_id,
                contents=prompt,
            )
            response_text = self._extract_response_text(response)

            if not response_text:
                raise ValueError("Gemini API 응답에서 텍스트를 찾을 수 없습니다.")

            return self._parse_response(response_text)
        except Exception as e:
            error_class = e.__class__.__name__
            error_msg = str(e)
            logger.error(f"Gemini API 오류 [{error_class}]: {error_msg}", exc_info=True)
            raise Exception(f"의견 생성 중 오류가 발생했습니다: {error_msg}") from e

    def _resolve_model_id(self, model_name: str) -> str:
        model_id = model_name.replace('models/', '') if model_name else DEFAULT_MODEL
        if model_id not in _VALID_MODEL_NAMES:
            logger.warning(f"알 수 없는 모델 '{model_id}', 기본 모델 '{DEFAULT_MODEL}'로 대체합니다.")
            return DEFAULT_MODEL
        return model_id

    def _extract_response_text(self, response) -> Optional[str]:
        if hasattr(response, 'text') and response.text:
            return response.text

        if hasattr(response, 'candidates') and response.candidates:
            candidate = response.candidates[0]
            if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                if candidate.content.parts:
                    return candidate.content.parts[0].text

        return None

    def _build_prompt(
        self,
        name: Optional[str],
        good_subjects: List[str],
        weak_subjects: List[str],
        personality: List[str],
        characteristics: Optional[str],
        target_length: int,
    ) -> str:
        # name/characteristics는 호출부(routes)에서 이미 strip된 값이 전달됨
        labeled_values = [
            ("이름", name or ""),
            ("잘하는 과목", ", ".join(good_subjects)),
            ("못하는 과목", ", ".join(weak_subjects)),
            ("성격", ", ".join(personality)),
            ("특징", characteristics or ""),
        ]
        student_info_text = "\n".join(
            f"{label}: {value}" for label, value in labeled_values if value
        )

        prompt_template = GeminiService._cached_prompt_template or ""
        return prompt_template.format(
            student_info=student_info_text,
            target_length=target_length
        )

    @staticmethod
    def _pad_to_five(opinions: List[str]) -> List[str]:
        return (list(opinions) + [PLACEHOLDER_OPINION] * 5)[:5]

    @staticmethod
    def _normalize_opinions(raw: list) -> Optional[List[str]]:
        if not isinstance(raw, list) or len(raw) == 0:
            return None
        return GeminiService._pad_to_five(raw)

    def _parse_response(self, response_text: str) -> List[str]:
        if not response_text or not response_text.strip():
            return self._pad_to_five([])

        cleaned_text = response_text.strip()

        # 1차: 직접 JSON 파싱
        try:
            parsed = self._normalize_opinions(json.loads(cleaned_text))
            if parsed:
                return parsed
        except json.JSONDecodeError:
            pass

        # 2차: JSON 배열 패턴 추출
        json_match = re.search(r'\[[\s\S]*?\]', cleaned_text, re.DOTALL)
        if json_match:
            try:
                parsed = self._normalize_opinions(json.loads(json_match.group()))
                if parsed:
                    return parsed
            except json.JSONDecodeError:
                pass

        # 3차: 따옴표로 감싸진 문자열 추출
        quoted_pattern = re.findall(r'["\']([^"\']+)["\']', cleaned_text)
        if len(quoted_pattern) >= 5:
            return quoted_pattern[:5]

        # 4차: 줄 단위 파싱
        opinions = []
        lines = [line.strip() for line in cleaned_text.split('\n') if line.strip()]

        for line in lines:
            if (line.startswith('"') and line.endswith('"')) or \
               (line.startswith("'") and line.endswith("'")):
                opinion = line[1:-1].strip()
                if opinion and len(opinions) < 5:
                    opinions.append(opinion)
            elif line.startswith(('-', '•', '*', '1.', '2.', '3.', '4.', '5.')):
                opinion = re.sub(r'^[-•*]\s*|\d+\.\s*', '', line).strip().strip('"\'')
                if opinion and len(opinions) < 5:
                    opinions.append(opinion)

        return self._pad_to_five(opinions)
