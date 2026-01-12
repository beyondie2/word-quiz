import { useState } from 'react'
import './App.css'

// 임시 단어 데이터
const wordData = [
  { english: 'apple', korean: '사과' },
  { english: 'book', korean: '책' },
  { english: 'computer', korean: '컴퓨터' },
  { english: 'happiness', korean: '행복' },
  { english: 'beautiful', korean: '아름다운' },
  { english: 'knowledge', korean: '지식' },
  { english: 'adventure', korean: '모험' },
  { english: 'friendship', korean: '우정' },
  { english: 'mountain', korean: '산' },
  { english: 'ocean', korean: '바다' },
]

function App() {
  const [activeTab, setActiveTab] = useState('quiz')
  const [userName, setUserName] = useState('')
  const [practiceMethod, setPracticeMethod] = useState('영어')
  const [koreanAnswerType, setKoreanAnswerType] = useState('하나만')
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [wrongWords, setWrongWords] = useState([])
  const [isRetryMode, setIsRetryMode] = useState(false)
  const [retryWords, setRetryWords] = useState([])
  const [retryIndex, setRetryIndex] = useState(0)

  const currentWords = isRetryMode ? retryWords : wordData
  const currentIndex = isRetryMode ? retryIndex : currentWordIndex
  const currentWord = currentWords[currentIndex]

  // 현재 문제 단어 가져오기
  const getQuestionWord = () => {
    if (!currentWord) return ''
    return practiceMethod === '영어' ? currentWord.english : currentWord.korean
  }

  // 정답 확인
  const checkAnswer = () => {
    if (!userAnswer.trim() || !currentWord) return

    const correctAnswer = practiceMethod === '영어' ? currentWord.korean : currentWord.english
    const isCorrect = userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase()

    if (isCorrect) {
      setFeedback({ type: 'correct', message: '정답입니다! 🎉' })
    } else {
      setFeedback({ type: 'incorrect', message: `오답입니다. 정답: ${correctAnswer}` })
      if (!isRetryMode) {
        setWrongWords(prev => [...prev, currentWord])
      }
    }

    // 1.5초 후 다음 문제로 이동
    setTimeout(() => {
      moveToNextWord()
    }, 1500)
  }

  // 다음 단어로 이동
  const moveToNextWord = () => {
    setUserAnswer('')
    setFeedback(null)

    if (isRetryMode) {
      if (retryIndex < retryWords.length - 1) {
        setRetryIndex(prev => prev + 1)
      } else {
        // 재시도 모드 종료
        setIsRetryMode(false)
        setRetryWords([])
        setRetryIndex(0)
        alert('틀린 단어 복습을 완료했습니다!')
      }
    } else {
      if (currentWordIndex < wordData.length - 1) {
        setCurrentWordIndex(prev => prev + 1)
      } else {
        alert('모든 단어를 완료했습니다!')
        setCurrentWordIndex(0)
      }
    }
  }

  // Enter 키 처리
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      checkAnswer()
    }
  }

  // 틀린 것만 다시하기
  const handleRetryWrong = () => {
    if (wrongWords.length === 0) {
      alert('틀린 단어가 없습니다!')
      return
    }
    setIsRetryMode(true)
    setRetryWords([...wrongWords])
    setRetryIndex(0)
    setWrongWords([])
    setUserAnswer('')
    setFeedback(null)
  }

  // 플레이스홀더 텍스트
  const getPlaceholder = () => {
    return practiceMethod === '영어' ? '한국어_의미' : '영어_의미'
  }

  return (
    <div className="app-container">
      {/* 헤더 영역 */}
      <header className="header">
        <div className="logo">
          <svg 
            className="logo-icon" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
          >
            <path 
              d="M4 19.5C4 18.837 4.26339 18.2011 4.73223 17.7322C5.20107 17.2634 5.83696 17 6.5 17H20" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M6.5 2H20V22H6.5C5.83696 22 5.20107 21.7366 4.73223 21.2678C4.26339 20.7989 4 20.163 4 19.5V4.5C4 3.83696 4.26339 3.20107 4.73223 2.73223C5.20107 2.26339 5.83696 2 6.5 2Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M8 6H16" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
            <path 
              d="M8 10H14" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
          WORD TEST
        </div>
        <nav className="tab-menu">
          <button
            className={`tab-button ${activeTab === 'quiz' ? 'active' : ''}`}
            onClick={() => setActiveTab('quiz')}
          >
            단어 맞추기
          </button>
          <button
            className={`tab-button ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            수행 확인
          </button>
        </nav>
      </header>

      {activeTab === 'quiz' && (
        <>
          {/* 설정 바 영역 */}
          <div className="settings-bar">
            <input
              type="text"
              className="name-input"
              placeholder="이름"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />
            
            <button className="select-button">단어장선택</button>
            
            <div className="radio-group">
              <span className="radio-group-label">연습방법</span>
              <div className="radio-option">
                <input
                  type="radio"
                  id="korean"
                  name="practiceMethod"
                  value="한국어"
                  checked={practiceMethod === '한국어'}
                  onChange={(e) => setPracticeMethod(e.target.value)}
                />
                <label htmlFor="korean">한국어</label>
              </div>
              <div className="radio-option">
                <input
                  type="radio"
                  id="english"
                  name="practiceMethod"
                  value="영어"
                  checked={practiceMethod === '영어'}
                  onChange={(e) => setPracticeMethod(e.target.value)}
                />
                <label htmlFor="english">영어</label>
              </div>
            </div>

            <div className="radio-group">
              <span className="radio-group-label">한국어답</span>
              <div className="radio-option">
                <input
                  type="radio"
                  id="oneOnly"
                  name="koreanAnswerType"
                  value="하나만"
                  checked={koreanAnswerType === '하나만'}
                  onChange={(e) => setKoreanAnswerType(e.target.value)}
                />
                <label htmlFor="oneOnly">하나만</label>
              </div>
              <div className="radio-option">
                <input
                  type="radio"
                  id="all"
                  name="koreanAnswerType"
                  value="전부다"
                  checked={koreanAnswerType === '전부다'}
                  onChange={(e) => setKoreanAnswerType(e.target.value)}
                />
                <label htmlFor="all">전부다</label>
              </div>
            </div>

            <button className="select-button">부분단원</button>
          </div>

          {/* 퀴즈 영역 */}
          <div className="quiz-area">
            {/* 문제 단어 */}
            <div className="question-word">
              {getQuestionWord()}
            </div>

            {/* 정답 입력 */}
            <div className="answer-input-container">
              <input
                type="text"
                className={`answer-input ${feedback?.type || ''}`}
                placeholder={getPlaceholder()}
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={feedback !== null}
              />
            </div>

            {/* 피드백 메시지 */}
            {feedback && (
              <div className={`feedback ${feedback.type}`}>
                {feedback.message}
              </div>
            )}

            {/* 틀린 것만 다시하기 버튼 */}
            <div className="action-buttons">
              <button className="action-button" onClick={handleRetryWrong}>
                틀린 것만 다시하기
              </button>
            </div>

            {/* 진행 상황 */}
            <div className="progress-info">
              {isRetryMode ? (
                <span>복습 모드: {retryIndex + 1} / {retryWords.length}</span>
              ) : (
                <span>진행: {currentWordIndex + 1} / {wordData.length} | 틀린 단어: {wrongWords.length}개</span>
              )}
            </div>
          </div>
        </>
      )}

      {activeTab === 'review' && (
        <div className="quiz-area">
          <p>수행 확인 화면은 추후 구현 예정입니다.</p>
        </div>
      )}
    </div>
  )
}

export default App
