import { useCallback } from 'react'
import type { RefObject } from 'react'
import type { StudentInfo } from '../types'

interface StudentInfoFormProps {
  studentInfo: StudentInfo
  onChange: (info: StudentInfo | ((prev: StudentInfo) => StudentInfo)) => void
  onGenerate: () => void
  isLoading: boolean
  error: string | null
  nameInputRef: RefObject<HTMLInputElement>
  characteristicsInputRef: RefObject<HTMLTextAreaElement>
}

const SUBJECTS = ['국어', '영어', '수학', '과학', '사회', '역사', '체육', '음악', '미술', '기술']
const PERSONALITY_TRAITS = ['침착함', '활발함', '사교적', '내성적', '성실함', '창의적', '리더십', '협동적', '독립적', '호기심 많음']

interface SectionHeaderProps {
  label: string
  count: number
  hint?: string
  onReset: () => void
}

const SectionHeader = ({ label, count, hint, onReset }: SectionHeaderProps) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.55rem' }}>
    <span className="section-label">
      {label}
      {count > 0 && (
        <span style={{ marginLeft: '0.35rem', color: 'var(--amber)', fontWeight: 500 }}>
          ({count})
        </span>
      )}
      {hint && (
        <span style={{ marginLeft: '0.5rem', opacity: 0.45, letterSpacing: 0, textTransform: 'none', fontFamily: 'Noto Sans KR, sans-serif', fontSize: '0.7rem' }}>
          {hint}
        </span>
      )}
    </span>
    {count > 0 && (
      <button
        type="button"
        onClick={onReset}
        style={{
          background: 'none',
          border: 'none',
          padding: '0 0.2rem',
          fontSize: '0.68rem',
          color: 'var(--ink-muted)',
          cursor: 'pointer',
          fontFamily: 'Noto Sans KR, sans-serif',
          transition: 'color 0.15s',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--chalk-dim)' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-muted)' }}
      >
        초기화
      </button>
    )}
  </div>
)

interface ChipSectionProps {
  label: string
  items: string[]
  selected: string[]
  chipClass: string
  onToggle: (item: string) => void
  onReset: () => void
}

const ChipSection = ({ label, items, selected, chipClass, onToggle, onReset }: ChipSectionProps) => (
  <div>
    <SectionHeader label={label} count={selected.length} onReset={onReset} />
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.38rem' }}>
      {items.map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onToggle(item)}
          className={`chip ${chipClass}${selected.includes(item) ? ' active' : ''}`}
          aria-pressed={selected.includes(item)}
        >
          {item}
        </button>
      ))}
    </div>
  </div>
)

const StudentInfoForm = ({ studentInfo, onChange, onGenerate, isLoading, error, nameInputRef, characteristicsInputRef }: StudentInfoFormProps) => {
  const toggleArrayItem = useCallback((array: string[], item: string) => {
    return array.includes(item) ? array.filter((i) => i !== item) : [...array, item]
  }, [])

  // 'good'/'weak'는 서로 배타적 — 토글하는 쪽에 넣고 반대쪽에서는 제거
  const handleSubjectToggle = useCallback((subject: string, type: 'good' | 'weak') => {
    const toggleKey = type === 'good' ? 'goodSubjects' : 'weakSubjects'
    const clearKey = type === 'good' ? 'weakSubjects' : 'goodSubjects'
    onChange((prev) => ({
      ...prev,
      [toggleKey]: toggleArrayItem(prev[toggleKey], subject),
      [clearKey]: prev[clearKey].filter((s) => s !== subject),
    }))
  }, [onChange, toggleArrayItem])

  const handlePersonalityToggle = useCallback((trait: string) => {
    onChange((prev) => ({ ...prev, personality: toggleArrayItem(prev.personality, trait) }))
  }, [onChange, toggleArrayItem])

  const divider = (
    <div style={{ height: '1px', background: 'var(--ink-border)', margin: '0 -1.5rem' }} />
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>

      {/* ── Name + Length ── */}
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label
            htmlFor="name-input"
            className="section-label"
            style={{ display: 'block', marginBottom: '0.4rem' }}
          >
            이름 <span style={{ opacity: 0.4, letterSpacing: 0, textTransform: 'none', fontFamily: 'Noto Sans KR, sans-serif', fontSize: '0.68rem' }}>/ Ctrl+1</span>
          </label>
          <input
            id="name-input"
            ref={nameInputRef}
            type="text"
            value={studentInfo.name}
            onChange={(e) => {
              const value = e.target.value.slice(0, 5)
              onChange((prev) => ({ ...prev, name: value }))
            }}
            className="dark-input"
            placeholder="홍길동"
            maxLength={5}
            aria-label="학생 이름 입력"
          />
        </div>
        <div style={{ width: '70px' }}>
          <label
            htmlFor="target-length-input"
            className="section-label"
            style={{ display: 'block', marginBottom: '0.4rem' }}
          >
            길이
          </label>
          <input
            id="target-length-input"
            type="number"
            min={50}
            max={100}
            value={studentInfo.targetLength}
            onChange={(e) => {
              const value = parseInt(e.target.value) || 75
              const clamped = Math.min(Math.max(value, 50), 100)
              onChange((prev) => ({ ...prev, targetLength: clamped }))
            }}
            className="dark-input"
            style={{ textAlign: 'center', fontFamily: 'IBM Plex Mono, monospace' }}
            aria-label="답변 길이"
          />
        </div>
      </div>

      {divider}

      {/* ── Good subjects ── */}
      <ChipSection
        label="잘하는 과목"
        items={SUBJECTS}
        selected={studentInfo.goodSubjects}
        chipClass="chip-good"
        onToggle={(subject) => handleSubjectToggle(subject, 'good')}
        onReset={() => onChange((prev) => ({ ...prev, goodSubjects: [] }))}
      />

      {divider}

      {/* ── Weak subjects ── */}
      <ChipSection
        label="보완 과목"
        items={SUBJECTS}
        selected={studentInfo.weakSubjects}
        chipClass="chip-weak"
        onToggle={(subject) => handleSubjectToggle(subject, 'weak')}
        onReset={() => onChange((prev) => ({ ...prev, weakSubjects: [] }))}
      />

      {divider}

      {/* ── Personality ── */}
      <ChipSection
        label="성격"
        items={PERSONALITY_TRAITS}
        selected={studentInfo.personality}
        chipClass="chip-trait"
        onToggle={handlePersonalityToggle}
        onReset={() => onChange((prev) => ({ ...prev, personality: [] }))}
      />

      {divider}

      {/* ── Characteristics ── */}
      <div>
        <label
          htmlFor="characteristics-input"
          className="section-label"
          style={{ display: 'block', marginBottom: '0.4rem' }}
        >
          특징 <span style={{ opacity: 0.4, letterSpacing: 0, textTransform: 'none', fontFamily: 'Noto Sans KR, sans-serif', fontSize: '0.68rem' }}>/ Ctrl+2 · 최대 40자</span>
        </label>
        <textarea
          id="characteristics-input"
          ref={characteristicsInputRef}
          value={studentInfo.characteristics}
          onChange={(e) => {
            const value = e.target.value.slice(0, 40)
            onChange((prev) => ({ ...prev, characteristics: value }))
          }}
          className="dark-input"
          placeholder="분석력이 뛰어나고 수업 참여도가 높음"
          rows={2}
          maxLength={40}
          style={{ resize: 'none' }}
          aria-label="학생 특징 입력"
        />
        <div
          style={{
            textAlign: 'right',
            fontSize: '0.65rem',
            color: 'var(--ink-muted)',
            marginTop: '0.2rem',
            fontFamily: 'IBM Plex Mono, monospace',
          }}
          aria-live="polite"
        >
          {studentInfo.characteristics.length}/40
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div
          style={{
            padding: '0.55rem 0.8rem',
            borderRadius: '6px',
            background: 'rgba(185, 28, 28, 0.1)',
            border: '1px solid rgba(185, 28, 28, 0.3)',
            color: '#fca5a5',
            fontSize: '0.8rem',
            fontFamily: 'Noto Sans KR, sans-serif',
          }}
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ── Generate button ── */}
      <button
        onClick={onGenerate}
        disabled={isLoading}
        className="btn-generate"
        aria-label="의견 생성"
      >
        {isLoading && <span className="sweep-bar" aria-hidden="true" />}
        <span style={{ position: 'relative', zIndex: 1 }}>
          {isLoading ? '생성 중…' : '의견 생성  ⌘↵'}
        </span>
      </button>

      <div
        style={{
          textAlign: 'center',
          fontSize: '0.62rem',
          color: 'var(--ink-muted)',
          fontFamily: "'IBM Plex Mono', 'Noto Sans KR', monospace",
          letterSpacing: '0.05em',
        }}
      >
        Esc 초기화 · 1–5 복사 · ⌘R 재생성
      </div>
    </div>
  )
}

export default StudentInfoForm
