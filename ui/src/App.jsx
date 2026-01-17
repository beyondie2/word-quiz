import { useState, useEffect, useRef } from 'react'
import './App.css'

// API 베이스 URL (프로덕션에서는 환경변수 사용)
const API_BASE = import.meta.env.VITE_API_URL || '/api'

// 디버깅용 (배포 후 삭제)
console.log('VITE_API_URL:', import.meta.env.VITE_API_URL)
console.log('API_BASE:', API_BASE)

function App() {
  const [activeTab, setActiveTab] = useState('quiz')
  
  // 사용자 관련 상태
  const [userName, setUserName] = useState('')
  const [userId, setUserId] = useState(null)
  const [isVerified, setIsVerified] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  
  // 단어장/단원 관련 상태
  const [books, setBooks] = useState([])
  const [selectedBook, setSelectedBook] = useState('')
  const [units, setUnits] = useState([])
  const [selectedUnit, setSelectedUnit] = useState('')
  const [showBookDropdown, setShowBookDropdown] = useState(false)
  const [showUnitDropdown, setShowUnitDropdown] = useState(false)
  
  // 퀴즈 설정 상태
  const [practiceMode, setPracticeMode] = useState('english') // 'english' or 'korean'
  const [koreanAnswerType, setKoreanAnswerType] = useState('one') // 'one' or 'all'
  
  // 퀴즈 진행 상태
  const [words, setWords] = useState([])
  const [currentWordIndex, setCurrentWordIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [isQuizStarted, setIsQuizStarted] = useState(false)
  const [isQuizFinished, setIsQuizFinished] = useState(false)
  
  // 라운드 관련 상태
  const [round, setRound] = useState(1)
  const [wrongWordsInRound, setWrongWordsInRound] = useState([])
  const [isRetryMode, setIsRetryMode] = useState(false)
  const [retryWords, setRetryWords] = useState([])
  const [retryIndex, setRetryIndex] = useState(0)
  
  // 수행 확인 관련 상태
  const [allUsers, setAllUsers] = useState([])
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [progressRecords, setProgressRecords] = useState([])
  const [progressStats, setProgressStats] = useState(null)
  const [isLoadingProgress, setIsLoadingProgress] = useState(false)

  // 정답 입력창 ref
  const answerInputRef = useRef(null)

  // feedback이 null로 바뀌면 (다음 문제로 넘어가면) 입력창에 자동 focus
  useEffect(() => {
    if (feedback === null && isQuizStarted && !isQuizFinished) {
      answerInputRef.current?.focus()
    }
  }, [feedback, isQuizStarted, isQuizFinished])

  // 현재 표시할 단어
  const currentWords = isRetryMode ? retryWords : words
  const currentIndex = isRetryMode ? retryIndex : currentWordIndex
  const currentWord = currentWords[currentIndex]

  // 사용자 인증
  const handleVerifyUser = async () => {
    if (!userName.trim()) {
      setVerifyError('이름을 입력해주세요')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/users/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userName.trim() })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('Server error:', response.status, errorText)
        setVerifyError(`서버 오류 (${response.status})`)
        return
      }

      const data = await response.json()

      if (data.success) {
        setUserId(data.userId)
        setBooks(data.books)
        setIsVerified(true)
        setIsAdmin(data.isAdmin || false)
        setVerifyError('')
      } else {
        setVerifyError(data.message)
        setIsVerified(false)
      }
    } catch (error) {
      console.error('Verify error:', error)
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setVerifyError('서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.')
      } else {
        setVerifyError('서버 연결에 실패했습니다')
      }
    }
  }

  // Enter 키로 사용자 인증
  const handleNameKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleVerifyUser()
    }
  }

  // 단어장 선택 시 단원 목록 조회
  const handleBookSelect = async (bookName) => {
    setSelectedBook(bookName)
    setShowBookDropdown(false)
    setSelectedUnit('')
    setIsQuizStarted(false)
    setWords([])

    try {
      const response = await fetch(`${API_BASE}/books/${encodeURIComponent(bookName)}/units`)
      const data = await response.json()
      setUnits(data.units)
    } catch (error) {
      console.error('Fetch units error:', error)
    }
  }

  // 단원 선택 시 단어 목록 조회 및 퀴즈 시작
  const handleUnitSelect = async (unit) => {
    setSelectedUnit(unit)
    setShowUnitDropdown(false)

    try {
      const response = await fetch(
        `${API_BASE}/books/${encodeURIComponent(selectedBook)}/units/${encodeURIComponent(unit)}/words`
      )
      const data = await response.json()
      setWords(data.words)
      setCurrentWordIndex(0)
      setIsQuizStarted(true)
      setIsQuizFinished(false)
      setRound(1)
      setWrongWordsInRound([])
      setIsRetryMode(false)
      setRetryWords([])
      setRetryIndex(0)
      setFeedback(null)
      setUserAnswer('')
    } catch (error) {
      console.error('Fetch words error:', error)
    }
  }

  // 문제 단어 가져오기
  const getQuestionWord = () => {
    if (!currentWord) return ''
    return practiceMode === 'english' ? currentWord.english : currentWord.korean
  }

  // 정답 확인
  const checkAnswer = async () => {
    if (!userAnswer.trim() || !currentWord || feedback) return

    try {
      const response = await fetch(`${API_BASE}/quiz/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          wordId: currentWord.id,
          userAnswer: userAnswer.trim(),
          practiceMode,
          koreanAnswerType,
          bookName: selectedBook,
          unit: selectedUnit,
          round,
          unitReviewCount: 0
        })
      })
      const data = await response.json()

      if (data.correct) {
        setFeedback({ type: 'correct', message: '정답입니다! 🎉' })
        // 정답일 경우 1.5초 후 다음 문제로 이동하고 입력창에 focus
        setTimeout(() => {
          moveToNextWord()
          answerInputRef.current?.focus()
        }, 1500)
      } else {
        setFeedback({ type: 'incorrect', message: `오답입니다. 정답: ${data.correctAnswer}` })
        // 현재 라운드의 틀린 단어 목록에 추가
        if (!wrongWordsInRound.find(w => w.id === currentWord.id)) {
          setWrongWordsInRound(prev => [...prev, currentWord])
        }
        // 오답일 경우 1.5초 후 다음 문제로 이동
        setTimeout(() => {
          moveToNextWord()
        }, 1500)
      }
    } catch (error) {
      console.error('Check answer error:', error)
      setFeedback({ type: 'incorrect', message: '서버 오류가 발생했습니다' })
    }
  }

  // 다음 단어로 이동
  const moveToNextWord = () => {
    setUserAnswer('')
    setFeedback(null)

    if (isRetryMode) {
      if (retryIndex < retryWords.length - 1) {
        setRetryIndex(prev => prev + 1)
      } else {
        // 재시도 라운드 종료
        if (wrongWordsInRound.length === 0) {
          // 모두 맞춤
          setIsQuizFinished(true)
          setIsRetryMode(false)
        } else {
          // 아직 틀린 것이 있음 - 버튼으로 다시 시작
          setIsQuizFinished(true)
        }
      }
    } else {
      if (currentWordIndex < words.length - 1) {
        setCurrentWordIndex(prev => prev + 1)
      } else {
        // 첫 라운드 종료
        setIsQuizFinished(true)
      }
    }
  }

  // Enter 키로 정답 제출
  const handleAnswerKeyPress = (e) => {
    if (e.key === 'Enter') {
      checkAnswer()
    }
  }

  // 틀린 것만 다시하기
  const handleRetryWrong = async () => {
    if (wrongWordsInRound.length === 0) {
      alert('🎉 모든 단어를 맞추셨습니다!')
      return
    }

    // 라운드 증가
    try {
      const response = await fetch(`${API_BASE}/progress/${userId}/next-round`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookName: selectedBook,
          unit: selectedUnit
        })
      })
      const data = await response.json()
      setRound(data.newRound)
    } catch (error) {
      console.error('Next round error:', error)
    }

    // 틀린 단어로 재시도 시작
    setIsRetryMode(true)
    setRetryWords([...wrongWordsInRound])
    setRetryIndex(0)
    setWrongWordsInRound([])
    setIsQuizFinished(false)
    setUserAnswer('')
    setFeedback(null)
  }

  // 처음부터 다시하기
  const handleRestart = () => {
    setCurrentWordIndex(0)
    setIsQuizFinished(false)
    setRound(1)
    setWrongWordsInRound([])
    setIsRetryMode(false)
    setRetryWords([])
    setRetryIndex(0)
    setFeedback(null)
    setUserAnswer('')
  }

  // 플레이스홀더 텍스트
  const getPlaceholder = () => {
    return practiceMode === 'english' ? '한국어_의미' : '영어_의미'
  }

  // 로그아웃 (이름 재입력)
  const handleLogout = () => {
    setIsVerified(false)
    setUserId(null)
    setUserName('')
    setIsAdmin(false)
    setBooks([])
    setSelectedBook('')
    setUnits([])
    setSelectedUnit('')
    setWords([])
    setIsQuizStarted(false)
    setIsQuizFinished(false)
  }

  // ===== 수행 확인 관련 =====
  
  // 사용자 목록 조회 (관리자만)
  useEffect(() => {
    if (activeTab === 'review' && isAdmin) {
      fetchAllUsers()
    }
  }, [activeTab, isAdmin])

  const fetchAllUsers = async () => {
    try {
      const response = await fetch(`${API_BASE}/users`)
      const data = await response.json()
      setAllUsers(data.users)
    } catch (error) {
      console.error('Fetch users error:', error)
    }
  }

  // 수행 기록 조회
  const fetchProgress = async () => {
    if (!userId) return // 로그인하지 않은 경우 조회하지 않음
    
    setIsLoadingProgress(true)
    try {
      const params = new URLSearchParams()
      params.append('requesterId', userId) // 요청자 ID (권한 체크용)
      if (isAdmin && selectedUserId) params.append('userId', selectedUserId) // 관리자만 다른 사용자 조회 가능
      if (selectedDate) params.append('date', selectedDate)

      const response = await fetch(`${API_BASE}/progress?${params}`)
      const data = await response.json()
      setProgressRecords(data.records)
      setProgressStats(data.stats)
    } catch (error) {
      console.error('Fetch progress error:', error)
    } finally {
      setIsLoadingProgress(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'review' && userId) {
      fetchProgress()
    }
  }, [activeTab, selectedUserId, selectedDate, userId, isAdmin])

  // 날짜 포맷팅
  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
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
            {!isVerified ? (
              <>
                <input
                  type="text"
                  className="name-input"
                  placeholder="이름"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  onKeyPress={handleNameKeyPress}
                />
                <button className="select-button primary" onClick={handleVerifyUser}>
                  확인
                </button>
                {verifyError && <span className="error-message">{verifyError}</span>}
              </>
            ) : (
              <>
                <div className="user-info">
                  <span className="user-name">{userName}</span>
                  <button className="logout-button" onClick={handleLogout}>변경</button>
                </div>
                
                <div className="dropdown-container">
                  <button 
                    className="select-button"
                    onClick={() => setShowBookDropdown(!showBookDropdown)}
                  >
                    {selectedBook || '단어장선택'}
                  </button>
                  {showBookDropdown && (
                    <div className="dropdown-menu">
                      {books.map((book, index) => (
                        <div 
                          key={index}
                          className="dropdown-item"
                          onClick={() => handleBookSelect(book)}
                        >
                          {book}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="radio-group">
                  <span className="radio-group-label">연습방법</span>
                  <div className="radio-option">
                    <input
                      type="radio"
                      id="korean"
                      name="practiceMethod"
                      value="korean"
                      checked={practiceMode === 'korean'}
                      onChange={(e) => setPracticeMode(e.target.value)}
                    />
                    <label htmlFor="korean">한국어</label>
                  </div>
                  <div className="radio-option">
                    <input
                      type="radio"
                      id="english"
                      name="practiceMethod"
                      value="english"
                      checked={practiceMode === 'english'}
                      onChange={(e) => setPracticeMode(e.target.value)}
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
                      value="one"
                      checked={koreanAnswerType === 'one'}
                      onChange={(e) => setKoreanAnswerType(e.target.value)}
                    />
                    <label htmlFor="oneOnly">하나만</label>
                  </div>
                  <div className="radio-option">
                    <input
                      type="radio"
                      id="all"
                      name="koreanAnswerType"
                      value="all"
                      checked={koreanAnswerType === 'all'}
                      onChange={(e) => setKoreanAnswerType(e.target.value)}
                    />
                    <label htmlFor="all">전부다</label>
                  </div>
                </div>

                {selectedBook && units.length > 0 && (
                  <div className="dropdown-container">
                    <button 
                      className="select-button"
                      onClick={() => setShowUnitDropdown(!showUnitDropdown)}
                    >
                      {selectedUnit || '부분단원'}
                    </button>
                    {showUnitDropdown && (
                      <div className="dropdown-menu">
                        {units.map((unit, index) => (
                          <div 
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleUnitSelect(unit)}
                          >
                            {unit}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>

          {/* 퀴즈 영역 */}
          <div className="quiz-area">
            {!isVerified ? (
              <div className="welcome-message">
                <h2>환영합니다!</h2>
                <p>이름을 입력하고 확인 버튼을 눌러주세요.</p>
              </div>
            ) : !isQuizStarted ? (
              <div className="welcome-message">
                <h2>단어장을 선택해주세요</h2>
                <p>단어장과 단원을 선택하면 학습이 시작됩니다.</p>
              </div>
            ) : isQuizFinished ? (
              <div className="quiz-complete">
                <h2>
                  {wrongWordsInRound.length === 0 
                    ? '🎉 모든 단어를 맞추셨습니다!' 
                    : `라운드 ${round} 완료!`}
                </h2>
                {wrongWordsInRound.length > 0 && (
                  <p className="wrong-count">틀린 단어: {wrongWordsInRound.length}개</p>
                )}
                <div className="complete-buttons">
                  {wrongWordsInRound.length > 0 && (
                    <button className="action-button primary" onClick={handleRetryWrong}>
                      틀린 것만 다시하기
                    </button>
                  )}
                  <button className="action-button" onClick={handleRestart}>
                    처음부터 다시하기
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* 문제 단어 */}
                <div className="question-word">
                  {getQuestionWord()}
                </div>

                {/* 정답 입력 */}
                <div className="answer-input-container">
                  <input
                    ref={answerInputRef}
                    type="text"
                    className={`answer-input ${feedback?.type || ''}`}
                    placeholder={getPlaceholder()}
                    value={userAnswer}
                    onChange={(e) => setUserAnswer(e.target.value)}
                    onKeyPress={handleAnswerKeyPress}
                    disabled={feedback !== null}
                    autoFocus
                  />
                </div>

                {/* 피드백 메시지 */}
                {feedback && (
                  <div className={`feedback ${feedback.type}`}>
                    {feedback.message}
                  </div>
                )}

                {/* 진행 상황 */}
                <div className="progress-info">
                  {isRetryMode ? (
                    <span>복습 라운드 {round}: {retryIndex + 1} / {retryWords.length}</span>
                  ) : (
                    <span>
                      라운드 {round}: {currentWordIndex + 1} / {words.length} 
                      {wrongWordsInRound.length > 0 && ` | 틀린 단어: ${wrongWordsInRound.length}개`}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'review' && (
        <div className="review-container">
          {!isVerified ? (
            <div className="welcome-message">
              <h2>로그인이 필요합니다</h2>
              <p>"단어 맞추기" 탭에서 이름을 입력하고 로그인해주세요.</p>
            </div>
          ) : (
            <>
              {/* 필터 영역 */}
              <div className="filter-bar">
                {isAdmin ? (
                  <select 
                    className="filter-select"
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                  >
                    <option value="">전체 사용자</option>
                    {allUsers.map(user => (
                      <option key={user.id} value={user.id}>{user.username}</option>
                    ))}
                  </select>
                ) : (
                  <span className="user-filter-label">내 학습 기록</span>
                )}
                
                <input
                  type="date"
                  className="filter-date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>

              {/* 통계 영역 */}
              {progressStats && progressStats.totalWords > 0 && (
                <div className="stats-card">
                  <div className="stat-item">
                    <span className="stat-label">총 문제</span>
                    <span className="stat-value">{progressStats.totalWords}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">정답</span>
                    <span className="stat-value correct">{progressStats.correctCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">오답</span>
                    <span className="stat-value incorrect">{progressStats.wrongCount}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">정답률</span>
                    <span className={`stat-value ${progressStats.accuracy >= 80 ? 'high' : progressStats.accuracy >= 50 ? 'medium' : 'low'}`}>
                      {progressStats.accuracy}%
                    </span>
                  </div>
                </div>
              )}

              {/* 수행 기록 목록 */}
              <div className="records-container">
                {isLoadingProgress ? (
                  <div className="loading">로딩 중...</div>
                ) : progressRecords.length === 0 ? (
                  <div className="no-records">수행 기록이 없습니다</div>
                ) : (
                  <table className="records-table">
                    <thead>
                      <tr>
                        {isAdmin && <th>사용자</th>}
                        <th>단어장</th>
                        <th>단원</th>
                        <th>영어</th>
                        <th>한국어</th>
                        <th>오답</th>
                        <th>결과</th>
                        <th>라운드</th>
                        <th>일시</th>
                      </tr>
                    </thead>
                    <tbody>
                      {progressRecords.map(record => (
                        <tr key={record.id} className={record.is_correct ? 'correct-row' : 'incorrect-row'}>
                          {isAdmin && <td>{record.username}</td>}
                          <td>{record.book_name}</td>
                          <td>{record.unit}</td>
                          <td>{record.english}</td>
                          <td>{record.korean}</td>
                          <td>{record.wrong_answer || '-'}</td>
                          <td>
                            <span className={`result-badge ${record.is_correct ? 'correct' : 'incorrect'}`}>
                              {record.is_correct ? '정답' : '오답'}
                            </span>
                          </td>
                          <td>{record.round}</td>
                          <td>{formatDate(record.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default App
