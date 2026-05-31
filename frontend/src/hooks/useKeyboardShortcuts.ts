import { useEffect, useRef } from 'react'

interface UseKeyboardShortcutsProps {
  onGenerate: () => void
  onRefresh: () => void
  onReset: () => void
  onCopyOpinion: (index: number) => void
  onFocusName: () => void
  onFocusCharacteristics: () => void
}

export const useKeyboardShortcuts = ({
  onGenerate,
  onRefresh,
  onReset,
  onCopyOpinion,
  onFocusName,
  onFocusCharacteristics,
}: UseKeyboardShortcutsProps) => {
  // ref를 사용하여 최신 콜백 참조 유지 (의존성 배열 제거)
  const callbacksRef = useRef({ onGenerate, onRefresh, onReset, onCopyOpinion, onFocusName, onFocusCharacteristics })

  // 콜백이 변경될 때마다 ref 업데이트
  useEffect(() => {
    callbacksRef.current = { onGenerate, onRefresh, onReset, onCopyOpinion, onFocusName, onFocusCharacteristics }
  }, [onGenerate, onRefresh, onReset, onCopyOpinion, onFocusName, onFocusCharacteristics])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const { onGenerate, onRefresh, onReset, onCopyOpinion, onFocusName, onFocusCharacteristics } = callbacksRef.current

      // Ctrl/Cmd + Enter: 의견 생성
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        onGenerate()
        return
      }

      // Ctrl/Cmd + R: 새로고침
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && !e.shiftKey) {
        e.preventDefault()
        onRefresh()
        return
      }

      // Esc: 입력 초기화
      if (e.key === 'Escape') {
        e.preventDefault()
        onReset()
        return
      }

      // Ctrl + 1 / Ctrl + 2: 이름 / 특징 입력 포커스
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault()
        onFocusName()
        return
      }
      if (e.ctrlKey && e.key === '2') {
        e.preventDefault()
        onFocusCharacteristics()
        return
      }

      // 1-5: 해당 번호 의견 복사 (입력 필드 포커스 중에는 비활성)
      if (e.key >= '1' && e.key <= '5' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (document.activeElement as HTMLElement)?.tagName.toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return
        const index = parseInt(e.key) - 1
        onCopyOpinion(index)
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, []) // 의존성 배열 비워서 이벤트 리스너는 한 번만 등록
}

