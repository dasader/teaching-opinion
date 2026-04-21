import { useState, useEffect } from 'react'
import api from '../utils/api'

interface ModelSelectorProps {
  modelName: string
  onChange: (modelName: string) => void
}

interface Model {
  name: string
  full_name: string
  display_name: string
}

const FALLBACK_MODELS: Model[] = [
  { name: 'gemini-3-flash-preview', full_name: 'models/gemini-3-flash-preview', display_name: 'Gemini 3 Flash Preview (빠름 · 권장)' },
  { name: 'gemini-3-flash-lite-preview', full_name: 'models/gemini-3-flash-lite-preview', display_name: 'Gemini 3 Flash Lite Preview (경량)' },
]

const ModelSelector = ({ modelName, onChange }: ModelSelectorProps) => {
  const [models, setModels] = useState<Model[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [usedFallback, setUsedFallback] = useState(false)

  useEffect(() => {
    const fetchModels = async () => {
      try {
        setIsLoading(true)
        const { data } = await api.get<{ models: Model[] }>('/available-models')
        setModels(data.models)
      } catch {
        setModels(FALLBACK_MODELS)
        setUsedFallback(true)
      } finally {
        setIsLoading(false)
      }
    }
    fetchModels()
  }, [])

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: '0.65rem',
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: 'var(--chalk-dim)',
          marginBottom: '0.4rem',
        }}
      >
        AI 모델
      </label>

      {isLoading ? (
        <div
          className="dark-input"
          style={{ color: 'var(--ink-muted)', pointerEvents: 'none' }}
        >
          로딩 중…
        </div>
      ) : (
        <>
          <select
            value={modelName}
            onChange={(e) => onChange(e.target.value)}
            className="dark-input"
            style={{
              cursor: 'pointer',
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b5f52'%3E%3Cpath fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z' clip-rule='evenodd'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 0.5rem center',
              backgroundSize: '1.1rem',
              paddingRight: '2rem',
            }}
            aria-label="Gemini 모델 선택"
          >
            {models.map((model) => (
              <option
                key={model.name}
                value={model.name}
                style={{ background: '#1c1814', color: '#e8dfd4' }}
              >
                {model.display_name || model.name}
              </option>
            ))}
          </select>

          {usedFallback && (
            <p
              style={{
                marginTop: '0.3rem',
                fontSize: '0.65rem',
                color: 'var(--amber)',
                fontFamily: 'Noto Sans KR, sans-serif',
              }}
            >
              기본 모델 목록 사용 중
            </p>
          )}
        </>
      )}
    </div>
  )
}

export default ModelSelector
