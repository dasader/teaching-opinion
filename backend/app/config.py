from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator
from typing import List


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

    gemini_api_key: str
    cors_origins: List[str] = ["http://localhost:3000", "http://localhost:80"]

    @field_validator("gemini_api_key")
    @classmethod
    def _require_api_key(cls, value: str) -> str:
        if not value or not value.strip():
            raise ValueError(
                "GEMINI_API_KEY 환경 변수가 설정되지 않았습니다. "
                ".env 파일에 GEMINI_API_KEY를 설정해주세요."
            )
        return value


settings = Settings()  # type: ignore[call-arg]  # pydantic-settings가 .env/환경변수에서 주입

