# TeacherOpinion — 학생 생활통지표 의견 생성기

초등학교 교사용 학기말 평가의견 자동 생성 도구입니다.
학생 정보를 입력하면 Google Gemini AI가 5개의 다양한 스타일의 평어를 생성합니다.

## 주요 기능

- 학생 이름, 잘하는 과목, 부족한 과목, 성격, 특징 입력
- 의견 글자 수 조절 (50~100자)
- Gemini 모델 선택 (gemini-2.5-flash / gemini-2.5-pro / gemini-2.0-flash)
- 5개의 서로 다른 스타일 평어 동시 생성
- 클립보드 복사 (개별 복사 또는 단축키)
- 키보드 단축키 지원

## 키보드 단축키

| 단축키 | 동작 |
|--------|------|
| `Ctrl/Cmd + Enter` | 의견 생성 |
| `Ctrl/Cmd + R` | 재생성 |
| `Esc` | 폼 초기화 |
| `1` ~ `5` | 해당 번호 의견 복사 |
| `Ctrl + 1` | 이름 입력 포커스 |
| `Ctrl + 2` | 특징 입력 포커스 |

## 기술 스택

| 구분 | 기술 |
|------|------|
| Frontend | React + TypeScript + Vite + Tailwind CSS |
| Backend | FastAPI + Python |
| AI | Google Gemini API |
| 인프라 | Docker + Nginx |

## 시작하기

### 사전 준비

- Docker & Docker Compose
- Google Gemini API 키 ([발급](https://aistudio.google.com/app/apikey))

### 환경 설정

```bash
cp .env.example .env
# .env 파일에 GEMINI_API_KEY 입력
```

### 실행 (Docker)

```bash
docker-compose up --build -d
```

- 프론트엔드: http://localhost:8087
- 백엔드 API: http://localhost:8005/api

### 종료

```bash
docker-compose down
```

## 로컬 개발

### Backend

```bash
cd backend
pip install -r requirements.txt
GEMINI_API_KEY=<your_key> uvicorn app.main:app --reload
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
```

## API

### `POST /api/generate-opinions`

```json
// Request
{
  "name": "김철수",
  "good_subjects": ["수학", "과학"],
  "weak_subjects": ["영어"],
  "personality": ["성실함", "친절함"],
  "characteristics": "분석력이 뛰어남",
  "target_length": 75,
  "model_name": "gemini-2.5-flash"
}

// Response
{
  "opinions": ["의견1", "의견2", "의견3", "의견4", "의견5"]
}
```

### `GET /api/available-models`

사용 가능한 Gemini 모델 목록을 반환합니다.

## 프로젝트 구조

```
05_TeacherOpinion/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI 앱
│   │   ├── config.py        # 환경변수 설정
│   │   ├── api/routes.py    # API 라우터
│   │   └── services/
│   │       └── gemini_service.py  # Gemini API 연동
│   ├── prompts/
│   │   └── opinion_prompt.txt    # 프롬프트 템플릿
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── StudentInfoForm.tsx
│   │   │   ├── OpinionResults.tsx
│   │   │   └── ModelSelector.tsx
│   │   ├── hooks/
│   │   │   └── useKeyboardShortcuts.ts
│   │   └── utils/
│   │       ├── api.ts
│   │       └── clipboard.ts
│   └── package.json
├── docker-compose.yml
└── .env.example
```

## 라이선스

MIT
