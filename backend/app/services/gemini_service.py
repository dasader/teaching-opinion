from google import genai
from typing import List, Optional, Dict
import json
import re
import os
import logging

logger = logging.getLogger(__name__)

# 최신 안정 모델 목록 (업데이트 시 여기만 수정)
CURATED_MODELS = [
    {"name": "gemini-3-flash-preview",      "display_name": "Gemini 3 Flash Preview (빠름 · 권장)"},
    {"name": "gemini-3.1-flash-lite-preview","display_name": "Gemini 3.1 Flash Lite Preview (경량)"},
]
DEFAULT_MODEL = "gemini-3-flash-preview"


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

        current_dir = os.path.dirname(os.path.abspath(__file__))
        prompt_file_path = os.path.join(current_dir, '..', '..', 'prompts', 'opinion_prompt.txt')

        try:
            with open(prompt_file_path, 'r', encoding='utf-8') as f:
                GeminiService._cached_prompt_template = f.read()
            logger.info("프롬프트 템플릿을 성공적으로 로드했습니다.")
        except (FileNotFoundError, IOError) as e:
            logger.warning(f"프롬프트 파일을 읽을 수 없습니다: {str(e)}. 기본 프롬프트를 사용합니다.")
            GeminiService._cached_prompt_template = """당신은 경험이 풍부한 선생님입니다. 다음 학생에 대한 평가의견을 작성해주세요.

학생 정보:
{student_info}

요구사항:
1. 정확히 {target_length}자로 작성해주세요. {target_length}자를 초과하거나 미만이 되지 않도록 주의해주세요.
2. 5개의 서로 다른 스타일의 평가의견을 작성해주세요.
3. 각 의견은 JSON 배열 형식으로 반환해주세요:
["의견1", "의견2", "의견3", "의견4", "의견5"]

JSON 형식으로만 응답해주세요. 다른 설명 없이 배열만 반환해주세요."""

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
            raise Exception(f"의견 생성 중 오류가 발생했습니다: {error_msg}")

    def _resolve_model_id(self, model_name: str) -> str:
        model_id = model_name.replace('models/', '') if model_name else DEFAULT_MODEL
        valid_names = {m["name"] for m in CURATED_MODELS}
        if model_id not in valid_names:
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
        student_info_parts = []

        if name and name.strip():
            student_info_parts.append(f"이름: {name.strip()}")
        if good_subjects:
            student_info_parts.append(f"잘하는 과목: {', '.join(good_subjects)}")
        if weak_subjects:
            student_info_parts.append(f"못하는 과목: {', '.join(weak_subjects)}")
        if personality:
            student_info_parts.append(f"성격: {', '.join(personality)}")
        if characteristics and characteristics.strip():
            student_info_parts.append(f"특징: {characteristics.strip()}")

        student_info_text = "\n".join(student_info_parts)

        prompt_template = GeminiService._cached_prompt_template or ""
        return prompt_template.format(
            student_info=student_info_text,
            target_length=target_length
        )

    def _parse_response(self, response_text: str) -> List[str]:
        if not response_text or not response_text.strip():
            return ["의견을 생성할 수 없습니다."] * 5

        cleaned_text = response_text.strip()

        # 1차: 직접 JSON 파싱
        try:
            opinions = json.loads(cleaned_text)
            if isinstance(opinions, list) and len(opinions) >= 5:
                return opinions[:5]
            elif isinstance(opinions, list) and len(opinions) > 0:
                while len(opinions) < 5:
                    opinions.append("의견을 생성할 수 없습니다.")
                return opinions[:5]
        except json.JSONDecodeError:
            pass

        # 2차: JSON 배열 패턴 추출
        json_match = re.search(r'\[[\s\S]*?\]', cleaned_text, re.DOTALL)
        if json_match:
            try:
                opinions = json.loads(json_match.group())
                if isinstance(opinions, list) and len(opinions) >= 5:
                    return opinions[:5]
                elif isinstance(opinions, list) and len(opinions) > 0:
                    while len(opinions) < 5:
                        opinions.append("의견을 생성할 수 없습니다.")
                    return opinions[:5]
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

        while len(opinions) < 5:
            opinions.append("의견을 생성할 수 없습니다.")

        return opinions[:5]
