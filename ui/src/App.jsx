import { useState, useEffect, useRef } from 'react'
import './App.css'

// API 베이스 URL (프로덕션에서는 환경변수 사용)
const API_BASE = import.meta.env.VITE_API_URL || '/api'

function App() {
  const [activeTab, setActiveTab] = useState('quiz')
  
  // 사용자 관련 상태
  const [userName, setUserName] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userId, setUserId] = useState(null)
  const [isVerified, setIsVerified] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [verifyError, setVerifyError] = useState('')
  const [authMode, setAuthMode] = useState('login') // 'login' or 'register'
  const [accessToken, setAccessToken] = useState(localStorage.getItem('accessToken') || '')
  const [refreshToken, setRefreshToken] = useState(localStorage.getItem('refreshToken') || '')
  
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
  const [reviewSubTab, setReviewSubTab] = useState('words') // 'words' or 'grammar'
  const [grammarProgressRecords, setGrammarProgressRecords] = useState([])
  const [grammarProgressStats, setGrammarProgressStats] = useState(null)
  const [isLoadingGrammarProgress, setIsLoadingGrammarProgress] = useState(false)

  // 관리자 페이지 관련 상태
  const [adminUsers, setAdminUsers] = useState([])
  const [adminStats, setAdminStats] = useState(null)
  const [newUserName, setNewUserName] = useState('')
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false)
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSubTab, setAdminSubTab] = useState('users') // 'users', 'stats', 'books', or 'grammar'

  // 단어장 관리 관련 상태
  const [adminBooks, setAdminBooks] = useState([])
  const [uploadFile, setUploadFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)

  // 문법 관리 관련 상태
  const [adminGrammar, setAdminGrammar] = useState([])
  const [grammarUploadFile, setGrammarUploadFile] = useState(null)
  const [isGrammarUploading, setIsGrammarUploading] = useState(false)
  const [grammarUploadResult, setGrammarUploadResult] = useState(null)

  // 문법 익히기 관련 상태
  const [grammarCategory1List, setGrammarCategory1List] = useState([])
  const [selectedGrammarCategory1, setSelectedGrammarCategory1] = useState('')
  const [showGrammarCategory1Dropdown, setShowGrammarCategory1Dropdown] = useState(false)
  
  const [grammarCategory2List, setGrammarCategory2List] = useState([])
  const [selectedGrammarCategory2, setSelectedGrammarCategory2] = useState('')
  const [showGrammarCategory2Dropdown, setShowGrammarCategory2Dropdown] = useState(false)
  
  const [grammarLevelList, setGrammarLevelList] = useState([])
  const [selectedGrammarLevel, setSelectedGrammarLevel] = useState('')
  const [showGrammarLevelDropdown, setShowGrammarLevelDropdown] = useState(false)
  
  const [grammarInstructionList, setGrammarInstructionList] = useState([])
  const [selectedGrammarInstruction, setSelectedGrammarInstruction] = useState('')
  const [showGrammarInstructionDropdown, setShowGrammarInstructionDropdown] = useState(false)
  
  const [grammarQuestions, setGrammarQuestions] = useState([])
  const [currentGrammarQuestionIndex, setCurrentGrammarQuestionIndex] = useState(0)
  const [grammarAnswer, setGrammarAnswer] = useState('')
  const [grammarFeedback, setGrammarFeedback] = useState(null)
  const [isGrammarQuizStarted, setIsGrammarQuizStarted] = useState(false)
  const [isGrammarQuizFinished, setIsGrammarQuizFinished] = useState(false)
  const [showGrammarModal, setShowGrammarModal] = useState(false)
  const [grammarModalContent, setGrammarModalContent] = useState({ correctAnswer: '' })
  
  // 문법 라운드 관련 상태
  const [grammarRound, setGrammarRound] = useState(1)
  const [wrongGrammarQuestionsInRound, setWrongGrammarQuestionsInRound] = useState([])
  const [isGrammarRetryMode, setIsGrammarRetryMode] = useState(false)
  const [grammarRetryQuestions, setGrammarRetryQuestions] = useState([])
  const [grammarRetryIndex, setGrammarRetryIndex] = useState(0)

  // 정답 입력창 ref
  const answerInputRef = useRef(null)
  const grammarAnswerInputRef = useRef(null)

  // feedback이 null로 바뀌면 (다음 문제로 넘어가면) 입력창에 자동 focus
  useEffect(() => {
    if (feedback === null && isQuizStarted && !isQuizFinished) {
      answerInputRef.current?.focus()
    }
  }, [feedback, isQuizStarted, isQuizFinished])

  // 오답 피드백 상태에서 Enter 키를 누르면 다음 문제로 이동
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && feedback && feedback.type === 'incorrect') {
        moveToNextWord()
        answerInputRef.current?.focus()
      }
    }

    if (feedback && feedback.type === 'incorrect') {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [feedback])

  // 앱 시작 시 토큰 확인 및 자동 로그인
  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('accessToken')
      if (token) {
        try {
          const response = await fetch(`${API_BASE}/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (response.ok) {
            const data = await response.json()
            setUserId(data.user.id)
            setUserName(data.user.username)
            setUserEmail(data.user.email)
            setIsAdmin(data.user.isAdmin)
            setIsVerified(true)
            // 단어장 목록 가져오기
            const booksResponse = await fetch(`${API_BASE}/books`)
            const booksData = await booksResponse.json()
            setBooks(booksData.books || [])
          } else {
            // 토큰 만료 시 갱신 시도
            const refreshed = await refreshAccessToken()
            if (!refreshed) {
              handleLogout()
            }
          }
        } catch (error) {
          console.error('Auth check error:', error)
        }
      }
    }
    checkAuth()
  }, [])

  // Access Token 갱신
  const refreshAccessToken = async () => {
    const storedRefreshToken = localStorage.getItem('refreshToken')
    if (!storedRefreshToken) return false

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken })
      })

      if (response.ok) {
        const data = await response.json()
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        setAccessToken(data.accessToken)
        setRefreshToken(data.refreshToken)
        return true
      }
      return false
    } catch (error) {
      console.error('Token refresh error:', error)
      return false
    }
  }

  // 현재 표시할 단어
  const currentWords = isRetryMode ? retryWords : words
  const currentIndex = isRetryMode ? retryIndex : currentWordIndex
  const currentWord = currentWords[currentIndex]

  // 로그인
  const handleLogin = async () => {
    if (!userEmail.trim() || !userPassword) {
      setVerifyError('이메일과 비밀번호를 입력해주세요')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: userEmail.trim(), 
          password: userPassword 
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 토큰 저장
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        setAccessToken(data.accessToken)
        setRefreshToken(data.refreshToken)
        
        // 사용자 정보 설정
        setUserId(data.user.id)
        setUserName(data.user.username)
        setIsAdmin(data.user.isAdmin)
        setIsVerified(true)
        setVerifyError('')
        setUserPassword('')
        
        // 단어장 목록 가져오기
        const booksResponse = await fetch(`${API_BASE}/books`)
        const booksData = await booksResponse.json()
        setBooks(booksData.books || [])
      } else {
        setVerifyError(data.error || '로그인에 실패했습니다')
      }
    } catch (error) {
      console.error('Login error:', error)
      setVerifyError('서버 연결에 실패했습니다')
    }
  }

  // 회원가입
  const handleRegister = async () => {
    if (!userName.trim() || !userEmail.trim() || !userPassword) {
      setVerifyError('이름, 이메일, 비밀번호를 모두 입력해주세요')
      return
    }

    if (userPassword.length < 4) {
      setVerifyError('비밀번호는 최소 4자 이상이어야 합니다')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: userName.trim(),
          email: userEmail.trim(), 
          password: userPassword 
        })
      })

      const data = await response.json()

      if (response.ok && data.success) {
        // 토큰 저장
        localStorage.setItem('accessToken', data.accessToken)
        localStorage.setItem('refreshToken', data.refreshToken)
        setAccessToken(data.accessToken)
        setRefreshToken(data.refreshToken)
        
        // 사용자 정보 설정
        setUserId(data.user.id)
        setUserName(data.user.username)
        setIsAdmin(data.user.isAdmin)
        setIsVerified(true)
        setVerifyError('')
        setUserPassword('')
        
        // 단어장 목록 가져오기
        const booksResponse = await fetch(`${API_BASE}/books`)
        const booksData = await booksResponse.json()
        setBooks(booksData.books || [])
      } else {
        setVerifyError(data.error || '회원가입에 실패했습니다')
      }
    } catch (error) {
      console.error('Register error:', error)
      setVerifyError('서버 연결에 실패했습니다')
    }
  }

  // Enter 키로 인증
  const handleAuthKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (authMode === 'login') {
        handleLogin()
      } else {
        handleRegister()
      }
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

      // 정답/오답 상관없이 영어 단어 발음
      speakEnglish(currentWord.english)

      if (data.correct) {
        setFeedback({ type: 'correct', message: '정답입니다! 🎉' })
        // 정답일 경우 즉시 다음 문제로 이동
        setTimeout(() => {
          moveToNextWord()
          answerInputRef.current?.focus()
        }, 0)
      } else {
        setFeedback({ type: 'incorrect', message: `오답입니다. 정답: ${data.correctAnswer}`, hint: 'Enter 키를 눌러 계속하세요' })
        // 현재 라운드의 틀린 단어 목록에 추가
        if (!wrongWordsInRound.find(w => w.id === currentWord.id)) {
          setWrongWordsInRound(prev => [...prev, currentWord])
        }
        // 오답일 경우 사용자가 Enter 키를 누를 때까지 대기 (handleAnswerKeyPress에서 처리)
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

  // Enter 키로 정답 제출 또는 오답 확인 후 다음으로 이동
  const handleAnswerKeyPress = (e) => {
    if (e.key === 'Enter') {
      // 오답 피드백 상태일 때 Enter를 누르면 다음 문제로 이동
      if (feedback && feedback.type === 'incorrect') {
        moveToNextWord()
        answerInputRef.current?.focus()
        return
      }
      // 피드백이 없을 때만 정답 체크
      if (!feedback) {
        checkAnswer()
      }
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

  // 한국어 힌트 생성 (글자 수만큼 별표 표시)
  const getKoreanHint = () => {
    if (!currentWord || practiceMode !== 'english') return ''
    const korean = currentWord.korean
    // 한글만 별표로 변환하고, 나머지 문자(공백, 쉼표 등)는 그대로 유지
    return korean.split('').map(char => /[가-힣ㄱ-ㅎㅏ-ㅣ]/.test(char) ? '*' : char).join('')
  }

  // 미국식 영어 음성 저장
  const [usVoice, setUsVoice] = useState(null)

  // 음성 목록 로드 및 미국식 음성 선택
  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices()
        // 미국식 영어 음성 찾기 (우선순위: en-US > en)
        const usEnglishVoice = voices.find(voice => voice.lang === 'en-US') ||
                               voices.find(voice => voice.lang.startsWith('en-US')) ||
                               voices.find(voice => voice.lang === 'en-GB') ||
                               voices.find(voice => voice.lang.startsWith('en'))
        if (usEnglishVoice) {
          setUsVoice(usEnglishVoice)
        }
      }
      
      // 음성 목록이 비동기로 로드되는 경우를 위해
      window.speechSynthesis.onvoiceschanged = loadVoices
      // 초기 로드
      loadVoices()
    }
  }, [])

  // 영어 단어 미국식 발음으로 읽기 (TTS)
  const speakEnglish = (text) => {
    if ('speechSynthesis' in window) {
      // 이전 발화 중지
      window.speechSynthesis.cancel()
      
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US' // 미국식 영어
      utterance.rate = 0.9 // 약간 느리게
      utterance.pitch = 1
      utterance.volume = 1
      
      // 미리 로드된 미국식 음성 사용
      if (usVoice) {
        utterance.voice = usVoice
      } else {
        // 음성이 아직 로드되지 않은 경우 다시 찾기
        const voices = window.speechSynthesis.getVoices()
        const englishVoice = voices.find(v => v.lang === 'en-US') ||
                            voices.find(v => v.lang.startsWith('en-US')) ||
                            voices.find(v => v.lang.startsWith('en'))
        if (englishVoice) {
          utterance.voice = englishVoice
        }
      }
      
      window.speechSynthesis.speak(utterance)
    }
  }

  // 로그아웃
  const handleLogout = async () => {
    // 서버에 로그아웃 요청 (토큰이 있으면)
    const token = localStorage.getItem('accessToken')
    if (token) {
      try {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${token}` }
        })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }
    
    // 로컬 상태 초기화
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    setAccessToken('')
    setRefreshToken('')
    setIsVerified(false)
    setUserId(null)
    setUserName('')
    setUserEmail('')
    setUserPassword('')
    setIsAdmin(false)
    setBooks([])
    setSelectedBook('')
    setUnits([])
    setSelectedUnit('')
    setWords([])
    setIsQuizStarted(false)
    setIsQuizFinished(false)
    setAuthMode('login')
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
      if (reviewSubTab === 'words') {
        fetchProgress()
      } else {
        fetchGrammarProgress()
      }
    }
  }, [activeTab, selectedUserId, selectedDate, userId, isAdmin, reviewSubTab])

  // 문법 수행 기록 조회
  const fetchGrammarProgress = async () => {
    if (!userId) return
    
    setIsLoadingGrammarProgress(true)
    try {
      const params = new URLSearchParams()
      params.append('requesterId', userId)
      if (isAdmin && selectedUserId) params.append('userId', selectedUserId)
      if (selectedDate) params.append('date', selectedDate)

      const response = await fetch(`${API_BASE}/grammar/progress?${params}`)
      const data = await response.json()
      setGrammarProgressRecords(data.records || [])
      setGrammarProgressStats(data.stats)
    } catch (error) {
      console.error('Fetch grammar progress error:', error)
    } finally {
      setIsLoadingGrammarProgress(false)
    }
  }

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

  // ===== 관리자 페이지 관련 =====

  // 관리자 페이지 데이터 로드
  useEffect(() => {
    if (activeTab === 'admin' && isAdmin && userId) {
      fetchAdminUsers()
      fetchAdminStats()
      fetchAdminBooks()
      fetchAdminGrammar()
    }
  }, [activeTab, isAdmin, userId])

  // 관리자용 사용자 목록 조회
  const fetchAdminUsers = async () => {
    setIsLoadingAdmin(true)
    try {
      const response = await fetch(`${API_BASE}/admin/users?adminId=${userId}`)
      const data = await response.json()
      if (data.users) {
        setAdminUsers(data.users)
      }
    } catch (error) {
      console.error('Fetch admin users error:', error)
    } finally {
      setIsLoadingAdmin(false)
    }
  }

  // 관리자용 통계 조회
  const fetchAdminStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/stats?adminId=${userId}`)
      const data = await response.json()
      setAdminStats(data)
    } catch (error) {
      console.error('Fetch admin stats error:', error)
    }
  }

  // 새 사용자 추가
  const handleAddUser = async () => {
    if (!newUserName.trim()) {
      setAdminError('사용자 이름을 입력해주세요')
      return
    }

    try {
      const response = await fetch(`${API_BASE}/admin/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          adminId: userId,
          username: newUserName.trim(),
          isAdmin: newUserIsAdmin
        })
      })
      const data = await response.json()

      if (data.success) {
        setNewUserName('')
        setNewUserIsAdmin(false)
        setAdminError('')
        fetchAdminUsers()
      } else {
        setAdminError(data.error || '사용자 추가에 실패했습니다')
      }
    } catch (error) {
      console.error('Add user error:', error)
      setAdminError('서버 오류가 발생했습니다')
    }
  }

  // 사용자 삭제
  const handleDeleteUser = async (targetUserId, username) => {
    if (!confirm(`"${username}" 사용자를 삭제하시겠습니까?\n모든 학습 기록도 함께 삭제됩니다.`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/admin/users/${targetUserId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: userId })
      })
      const data = await response.json()

      if (data.success) {
        fetchAdminUsers()
      } else {
        alert(data.error || '삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('Delete user error:', error)
      alert('서버 오류가 발생했습니다')
    }
  }

  // 관리자 권한 토글
  const handleToggleAdmin = async (targetUserId) => {
    try {
      const response = await fetch(`${API_BASE}/admin/users/${targetUserId}/toggle-admin`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: userId })
      })
      const data = await response.json()

      if (data.success) {
        fetchAdminUsers()
      } else {
        alert(data.error || '권한 변경에 실패했습니다')
      }
    } catch (error) {
      console.error('Toggle admin error:', error)
      alert('서버 오류가 발생했습니다')
    }
  }

  // 날짜만 포맷팅
  const formatDateOnly = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  // ===== 문법 익히기 관련 =====

  // 문법 익히기 탭 활성화 시 분류1 목록 조회
  useEffect(() => {
    if (activeTab === 'grammar' && isVerified) {
      fetchGrammarCategory1()
    }
  }, [activeTab, isVerified])

  // 문법 정답 입력창 자동 포커스
  useEffect(() => {
    if (grammarFeedback === null && isGrammarQuizStarted && !isGrammarQuizFinished) {
      grammarAnswerInputRef.current?.focus()
    }
  }, [grammarFeedback, isGrammarQuizStarted, isGrammarQuizFinished])

  // 오답 모달에서 Enter 키 처리
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && showGrammarModal) {
        closeGrammarModal()
      }
    }

    if (showGrammarModal) {
      window.addEventListener('keydown', handleKeyDown)
      return () => window.removeEventListener('keydown', handleKeyDown)
    }
  }, [showGrammarModal])

  // 분류1 목록 조회
  const fetchGrammarCategory1 = async () => {
    try {
      const response = await fetch(`${API_BASE}/grammar/category1`)
      const data = await response.json()
      setGrammarCategory1List(data.category1List || [])
    } catch (error) {
      console.error('Error fetching category1:', error)
    }
  }

  // 분류1 선택 시 분류2 목록 조회
  const handleGrammarCategory1Select = async (category1) => {
    setSelectedGrammarCategory1(category1)
    setShowGrammarCategory1Dropdown(false)
    // 하위 선택 초기화
    setSelectedGrammarCategory2('')
    setGrammarCategory2List([])
    setSelectedGrammarLevel('')
    setGrammarLevelList([])
    setSelectedGrammarInstruction('')
    setGrammarInstructionList([])
    setGrammarQuestions([])
    setIsGrammarQuizStarted(false)

    try {
      const response = await fetch(`${API_BASE}/grammar/category2?category1=${encodeURIComponent(category1)}`)
      const data = await response.json()
      setGrammarCategory2List(data.category2List || [])
    } catch (error) {
      console.error('Error fetching category2:', error)
    }
  }

  // 분류2 선택 시 수준 목록 조회
  const handleGrammarCategory2Select = async (category2) => {
    setSelectedGrammarCategory2(category2)
    setShowGrammarCategory2Dropdown(false)
    // 하위 선택 초기화
    setSelectedGrammarLevel('')
    setGrammarLevelList([])
    setSelectedGrammarInstruction('')
    setGrammarInstructionList([])
    setGrammarQuestions([])
    setIsGrammarQuizStarted(false)

    try {
      const response = await fetch(
        `${API_BASE}/grammar/levels?category1=${encodeURIComponent(selectedGrammarCategory1)}&category2=${encodeURIComponent(category2)}`
      )
      const data = await response.json()
      setGrammarLevelList(data.levelList || [])
    } catch (error) {
      console.error('Error fetching levels:', error)
    }
  }

  // 수준 선택 시 지시사항 목록 조회
  const handleGrammarLevelSelect = async (level) => {
    setSelectedGrammarLevel(level)
    setShowGrammarLevelDropdown(false)
    // 하위 선택 초기화
    setSelectedGrammarInstruction('')
    setGrammarInstructionList([])
    setGrammarQuestions([])
    setIsGrammarQuizStarted(false)

    try {
      const response = await fetch(
        `${API_BASE}/grammar/instructions?category1=${encodeURIComponent(selectedGrammarCategory1)}&category2=${encodeURIComponent(selectedGrammarCategory2)}&level=${encodeURIComponent(level)}`
      )
      const data = await response.json()
      setGrammarInstructionList(data.instructionList || [])
    } catch (error) {
      console.error('Error fetching instructions:', error)
    }
  }

  // 지시사항 선택 시 문제 목록 조회 및 학습 시작
  const handleGrammarInstructionSelect = async (instruction) => {
    setSelectedGrammarInstruction(instruction)
    setShowGrammarInstructionDropdown(false)

    try {
      const response = await fetch(
        `${API_BASE}/grammar/questions?category1=${encodeURIComponent(selectedGrammarCategory1)}&category2=${encodeURIComponent(selectedGrammarCategory2)}&level=${encodeURIComponent(selectedGrammarLevel)}&instruction=${encodeURIComponent(instruction)}`
      )
      const data = await response.json()
      const questions = data.questions || []
      setGrammarQuestions(questions)
      setCurrentGrammarQuestionIndex(0)
      setGrammarAnswer('')
      setGrammarFeedback(null)
      setIsGrammarQuizStarted(questions.length > 0)
      setIsGrammarQuizFinished(false)
      // 라운드 및 틀린 문제 초기화
      setGrammarRound(1)
      setWrongGrammarQuestionsInRound([])
      setIsGrammarRetryMode(false)
      setGrammarRetryQuestions([])
      setGrammarRetryIndex(0)
    } catch (error) {
      console.error('Error fetching questions:', error)
    }
  }

  // 현재 문법 문제 (재시도 모드 지원)
  const currentGrammarQuestions = isGrammarRetryMode ? grammarRetryQuestions : grammarQuestions
  const currentGrammarIndex = isGrammarRetryMode ? grammarRetryIndex : currentGrammarQuestionIndex
  const currentGrammarQuestion = currentGrammarQuestions[currentGrammarIndex]

  // 문법 정답 확인
  const checkGrammarAnswer = async () => {
    if (!grammarAnswer.trim() || !currentGrammarQuestion || grammarFeedback) return

    try {
      const response = await fetch(`${API_BASE}/grammar/check`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          questionId: currentGrammarQuestion.id,
          userAnswer: grammarAnswer.trim(),
          category1: selectedGrammarCategory1,
          category2: selectedGrammarCategory2,
          level: selectedGrammarLevel,
          instruction: selectedGrammarInstruction,
          round: grammarRound
        })
      })
      const data = await response.json()

      // 정답/오답 상관없이 정답을 미국식 발음으로 읽어줌
      speakEnglish(data.correctAnswer)

      if (data.correct) {
        setGrammarFeedback({ type: 'correct', message: '정답입니다!' })
        // 정답일 경우 다음 문제로 이동
        setTimeout(() => {
          moveToNextGrammarQuestion()
          grammarAnswerInputRef.current?.focus()
        }, 0)
      } else {
        // 오답일 경우 모달로 정답 표시
        setGrammarModalContent({ correctAnswer: data.correctAnswer })
        setShowGrammarModal(true)
        setGrammarFeedback({ type: 'incorrect', message: `오답입니다.` })
        // 현재 라운드의 틀린 문제 목록에 추가
        if (!wrongGrammarQuestionsInRound.find(q => q.id === currentGrammarQuestion.id)) {
          setWrongGrammarQuestionsInRound(prev => [...prev, currentGrammarQuestion])
        }
      }
    } catch (error) {
      console.error('Error checking grammar answer:', error)
      setGrammarFeedback({ type: 'incorrect', message: '서버 오류가 발생했습니다' })
    }
  }

  // 다음 문법 문제로 이동
  const moveToNextGrammarQuestion = () => {
    setGrammarAnswer('')
    setGrammarFeedback(null)

    if (isGrammarRetryMode) {
      if (grammarRetryIndex < grammarRetryQuestions.length - 1) {
        setGrammarRetryIndex(prev => prev + 1)
      } else {
        // 재시도 라운드 종료
        if (wrongGrammarQuestionsInRound.length === 0) {
          // 모두 맞춤
          setIsGrammarQuizFinished(true)
          setIsGrammarRetryMode(false)
        } else {
          // 아직 틀린 것이 있음
          setIsGrammarQuizFinished(true)
        }
      }
    } else {
      if (currentGrammarQuestionIndex < grammarQuestions.length - 1) {
        setCurrentGrammarQuestionIndex(prev => prev + 1)
      } else {
        // 첫 라운드 종료
        setIsGrammarQuizFinished(true)
      }
    }
  }

  // 오답 모달 닫기 및 다음 문제로 이동
  const closeGrammarModal = () => {
    setShowGrammarModal(false)
    moveToNextGrammarQuestion()
    grammarAnswerInputRef.current?.focus()
  }

  // Enter 키로 문법 정답 제출
  const handleGrammarAnswerKeyPress = (e) => {
    if (e.key === 'Enter') {
      if (!grammarFeedback) {
        checkGrammarAnswer()
      }
    }
  }

  // 문법 학습 처음부터 다시하기
  const handleGrammarRestart = () => {
    setCurrentGrammarQuestionIndex(0)
    setGrammarAnswer('')
    setGrammarFeedback(null)
    setIsGrammarQuizFinished(false)
    setGrammarRound(1)
    setWrongGrammarQuestionsInRound([])
    setIsGrammarRetryMode(false)
    setGrammarRetryQuestions([])
    setGrammarRetryIndex(0)
  }

  // 문법 틀린 것만 다시하기
  const handleGrammarRetryWrong = async () => {
    if (wrongGrammarQuestionsInRound.length === 0) {
      alert('모든 문제를 맞추셨습니다!')
      return
    }

    // 라운드 증가
    const newRound = grammarRound + 1
    setGrammarRound(newRound)

    // 틀린 문제로 재시도 시작
    setIsGrammarRetryMode(true)
    setGrammarRetryQuestions([...wrongGrammarQuestionsInRound])
    setGrammarRetryIndex(0)
    setWrongGrammarQuestionsInRound([])
    setIsGrammarQuizFinished(false)
    setGrammarAnswer('')
    setGrammarFeedback(null)
  }

  // 관리자용 단어장 목록 조회
  const fetchAdminBooks = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/books?adminId=${userId}`)
      const data = await response.json()
      if (data.books) {
        setAdminBooks(data.books)
      }
    } catch (error) {
      console.error('Fetch admin books error:', error)
    }
  }

  // 엑셀 파일 업로드
  const handleFileUpload = async () => {
    if (!uploadFile) {
      setUploadResult({ error: '파일을 선택해주세요' })
      return
    }

    setIsUploading(true)
    setUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', uploadFile)
      formData.append('adminId', userId)

      const response = await fetch(`${API_BASE}/admin/books/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setUploadResult({
          success: true,
          message: data.message,
          insertedCount: data.insertedCount,
          skippedCount: data.skippedCount,
          errors: data.errors
        })
        setUploadFile(null)
        // 파일 input 초기화
        const fileInput = document.getElementById('excel-file-input')
        if (fileInput) fileInput.value = ''
        // 단어장 목록 새로고침
        fetchAdminBooks()
        // 책 목록도 새로고침 (퀴즈에서 사용)
        const booksResponse = await fetch(`${API_BASE}/books`)
        const booksData = await booksResponse.json()
        setBooks(booksData.books || [])
      } else {
        setUploadResult({ error: data.error || '업로드에 실패했습니다', hint: data.hint })
      }
    } catch (error) {
      console.error('Upload error:', error)
      setUploadResult({ error: '서버 연결에 실패했습니다' })
    } finally {
      setIsUploading(false)
    }
  }

  // 단어장 삭제
  const handleDeleteBook = async (bookName) => {
    if (!confirm(`"${bookName}" 단어장을 삭제하시겠습니까?\n모든 단어가 삭제됩니다.`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/admin/books/${encodeURIComponent(bookName)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: userId })
      })
      const data = await response.json()

      if (data.success) {
        fetchAdminBooks()
        // 책 목록도 새로고침
        const booksResponse = await fetch(`${API_BASE}/books`)
        const booksData = await booksResponse.json()
        setBooks(booksData.books || [])
      } else {
        alert(data.error || '삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('Delete book error:', error)
      alert('서버 오류가 발생했습니다')
    }
  }

  // 관리자용 문법 목록 조회
  const fetchAdminGrammar = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/grammar?adminId=${userId}`)
      const data = await response.json()
      if (data.grammar) {
        setAdminGrammar(data.grammar)
      }
    } catch (error) {
      console.error('Fetch admin grammar error:', error)
    }
  }

  // 문법 엑셀 파일 업로드
  const handleGrammarFileUpload = async () => {
    if (!grammarUploadFile) {
      setGrammarUploadResult({ error: '파일을 선택해주세요' })
      return
    }

    setIsGrammarUploading(true)
    setGrammarUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', grammarUploadFile)
      formData.append('adminId', userId)

      const response = await fetch(`${API_BASE}/admin/grammar/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setGrammarUploadResult({
          success: true,
          message: data.message,
          insertedCount: data.insertedCount,
          skippedCount: data.skippedCount,
          errors: data.errors
        })
        setGrammarUploadFile(null)
        // 파일 input 초기화
        const fileInput = document.getElementById('grammar-excel-file-input')
        if (fileInput) fileInput.value = ''
        // 문법 목록 새로고침
        fetchAdminGrammar()
      } else {
        setGrammarUploadResult({ error: data.error || '업로드에 실패했습니다', hint: data.hint })
      }
    } catch (error) {
      console.error('Grammar upload error:', error)
      setGrammarUploadResult({ error: '서버 연결에 실패했습니다' })
    } finally {
      setIsGrammarUploading(false)
    }
  }

  // 문법 분류 삭제
  const handleDeleteGrammar = async (category1) => {
    if (!confirm(`"${category1}" 분류를 삭제하시겠습니까?\n해당 분류의 모든 문법 문제가 삭제됩니다.`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/admin/grammar/${encodeURIComponent(category1)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: userId })
      })
      const data = await response.json()

      if (data.success) {
        fetchAdminGrammar()
      } else {
        alert(data.error || '삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('Delete grammar error:', error)
      alert('서버 오류가 발생했습니다')
    }
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
            className={`tab-button ${activeTab === 'grammar' ? 'active' : ''}`}
            onClick={() => setActiveTab('grammar')}
          >
            문법 익히기
          </button>
          <button
            className={`tab-button ${activeTab === 'review' ? 'active' : ''}`}
            onClick={() => setActiveTab('review')}
          >
            수행 확인
          </button>
          {isAdmin && (
            <button
              className={`tab-button ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              관리자
            </button>
          )}
        </nav>
      </header>

      {activeTab === 'quiz' && (
        <>
          {/* 설정 바 영역 */}
          <div className="settings-bar">
            {!isVerified ? (
              <div className="auth-form">
                <div className="auth-tabs">
                  <button 
                    className={`auth-tab ${authMode === 'login' ? 'active' : ''}`}
                    onClick={() => { setAuthMode('login'); setVerifyError(''); }}
                  >
                    로그인
                  </button>
                  <button 
                    className={`auth-tab ${authMode === 'register' ? 'active' : ''}`}
                    onClick={() => { setAuthMode('register'); setVerifyError(''); }}
                  >
                    회원가입
                  </button>
                </div>
                <div className="auth-inputs">
                  {authMode === 'register' && (
                    <input
                      type="text"
                      className="auth-input"
                      placeholder="이름"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      onKeyPress={handleAuthKeyPress}
                    />
                  )}
                  <input
                    type="email"
                    className="auth-input"
                    placeholder="이메일"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    onKeyPress={handleAuthKeyPress}
                  />
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="비밀번호"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    onKeyPress={handleAuthKeyPress}
                  />
                  <button 
                    className="select-button primary" 
                    onClick={authMode === 'login' ? handleLogin : handleRegister}
                  >
                    {authMode === 'login' ? '로그인' : '회원가입'}
                  </button>
                </div>
                {verifyError && <span className="error-message">{verifyError}</span>}
              </div>
            ) : (
              <>
                <div className="user-info">
                  <span className="user-name">{userName}</span>
                  <button className="logout-button" onClick={handleLogout}>로그아웃</button>
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

                {/* 힌트 (영어 모드일 때만 - 한국어 글자 수 표시) */}
                {practiceMode === 'english' && currentWord && (
                  <div className="korean-hint">
                    {getKoreanHint()}
                  </div>
                )}

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
                    <div>{feedback.message}</div>
                    {feedback.hint && <div className="feedback-hint">{feedback.hint}</div>}
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
              {/* 수행 확인 서브 탭 */}
              <div className="admin-sub-tabs">
                <button
                  className={`sub-tab-button ${reviewSubTab === 'words' ? 'active' : ''}`}
                  onClick={() => setReviewSubTab('words')}
                >
                  단어 맞추기
                </button>
                <button
                  className={`sub-tab-button ${reviewSubTab === 'grammar' ? 'active' : ''}`}
                  onClick={() => setReviewSubTab('grammar')}
                >
                  문법 익히기
                </button>
              </div>

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

              {/* 단어 맞추기 수행 기록 */}
              {reviewSubTab === 'words' && (
                <>
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

              {/* 문법 익히기 수행 기록 */}
              {reviewSubTab === 'grammar' && (
                <>
                  {/* 통계 영역 */}
                  {grammarProgressStats && grammarProgressStats.totalQuestions > 0 && (
                    <div className="stats-card">
                      <div className="stat-item">
                        <span className="stat-label">총 문제</span>
                        <span className="stat-value">{grammarProgressStats.totalQuestions}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">정답</span>
                        <span className="stat-value correct">{grammarProgressStats.correctCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">오답</span>
                        <span className="stat-value incorrect">{grammarProgressStats.wrongCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">정답률</span>
                        <span className={`stat-value ${grammarProgressStats.accuracy >= 80 ? 'high' : grammarProgressStats.accuracy >= 50 ? 'medium' : 'low'}`}>
                          {grammarProgressStats.accuracy}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 수행 기록 목록 */}
                  <div className="records-container">
                    {isLoadingGrammarProgress ? (
                      <div className="loading">로딩 중...</div>
                    ) : grammarProgressRecords.length === 0 ? (
                      <div className="no-records">수행 기록이 없습니다</div>
                    ) : (
                      <table className="records-table">
                        <thead>
                          <tr>
                            {isAdmin && <th>사용자</th>}
                            <th>분류1</th>
                            <th>분류2</th>
                            <th>수준</th>
                            <th>문제</th>
                            <th>정답</th>
                            <th>오답</th>
                            <th>결과</th>
                            <th>라운드</th>
                            <th>일시</th>
                          </tr>
                        </thead>
                        <tbody>
                          {grammarProgressRecords.map(record => (
                            <tr key={record.id} className={record.is_correct ? 'correct-row' : 'incorrect-row'}>
                              {isAdmin && <td>{record.username}</td>}
                              <td>{record.category1 || '-'}</td>
                              <td>{record.category2 || '-'}</td>
                              <td>{record.level || '-'}</td>
                              <td className="question-cell">{record.question ? (record.question.length > 30 ? record.question.substring(0, 30) + '...' : record.question) : '-'}</td>
                              <td>{record.correct_answer || '-'}</td>
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
            </>
          )}
        </div>
      )}

      {activeTab === 'grammar' && (
        <div className="grammar-container">
          {!isVerified ? (
            <div className="welcome-message">
              <h2>로그인이 필요합니다</h2>
              <p>"단어 맞추기" 탭에서 로그인해주세요.</p>
            </div>
          ) : (
            <>
              {/* 설정 바 영역 */}
              <div className="settings-bar">
                <div className="user-info">
                  <span className="user-name">{userName}</span>
                </div>
                
                {/* 분류1 드롭다운 */}
                <div className="dropdown-container">
                  <button 
                    className="select-button"
                    onClick={() => setShowGrammarCategory1Dropdown(!showGrammarCategory1Dropdown)}
                  >
                    {selectedGrammarCategory1 || '분류1'}
                  </button>
                  {showGrammarCategory1Dropdown && (
                    <div className="dropdown-menu">
                      {grammarCategory1List.map((item, index) => (
                        <div 
                          key={index}
                          className="dropdown-item"
                          onClick={() => handleGrammarCategory1Select(item)}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 분류2 드롭다운 */}
                {selectedGrammarCategory1 && grammarCategory2List.length > 0 && (
                  <div className="dropdown-container">
                    <button 
                      className="select-button"
                      onClick={() => setShowGrammarCategory2Dropdown(!showGrammarCategory2Dropdown)}
                    >
                      {selectedGrammarCategory2 || '분류2'}
                    </button>
                    {showGrammarCategory2Dropdown && (
                      <div className="dropdown-menu">
                        {grammarCategory2List.map((item, index) => (
                          <div 
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleGrammarCategory2Select(item)}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 수준 드롭다운 */}
                {selectedGrammarCategory2 && grammarLevelList.length > 0 && (
                  <div className="dropdown-container">
                    <button 
                      className="select-button"
                      onClick={() => setShowGrammarLevelDropdown(!showGrammarLevelDropdown)}
                    >
                      {selectedGrammarLevel || '수준'}
                    </button>
                    {showGrammarLevelDropdown && (
                      <div className="dropdown-menu">
                        {grammarLevelList.map((item, index) => (
                          <div 
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleGrammarLevelSelect(item)}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 지시사항 드롭다운 */}
                {selectedGrammarLevel && grammarInstructionList.length > 0 && (
                  <div className="dropdown-container">
                    <button 
                      className="select-button instruction-button"
                      onClick={() => setShowGrammarInstructionDropdown(!showGrammarInstructionDropdown)}
                    >
                      {selectedGrammarInstruction ? (selectedGrammarInstruction.length > 20 ? selectedGrammarInstruction.substring(0, 20) + '...' : selectedGrammarInstruction) : '지시사항'}
                    </button>
                    {showGrammarInstructionDropdown && (
                      <div className="dropdown-menu instruction-dropdown">
                        {grammarInstructionList.map((item, index) => (
                          <div 
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleGrammarInstructionSelect(item)}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 문법 문제 영역 */}
              <div className="grammar-area">
                {!isGrammarQuizStarted ? (
                  <div className="welcome-message">
                    <h2>문법 학습을 시작하세요</h2>
                    <p>분류1 → 분류2 → 수준 → 지시사항을 순서대로 선택해주세요.</p>
                  </div>
                ) : isGrammarQuizFinished ? (
                  <div className="quiz-complete">
                    <h2>
                      {wrongGrammarQuestionsInRound.length === 0 
                        ? '모든 문제를 맞추셨습니다!' 
                        : `라운드 ${grammarRound} 완료!`}
                    </h2>
                    {wrongGrammarQuestionsInRound.length > 0 && (
                      <p className="wrong-count">틀린 문제: {wrongGrammarQuestionsInRound.length}개</p>
                    )}
                    <div className="complete-buttons">
                      {wrongGrammarQuestionsInRound.length > 0 && (
                        <button className="action-button primary" onClick={handleGrammarRetryWrong}>
                          틀린 것만 다시하기
                        </button>
                      )}
                      <button className="action-button" onClick={handleGrammarRestart}>
                        처음부터 다시하기
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 분류 내 전체 문항 지시 사항 영역 - instruction 필드만 표시 */}
                    <div className="grammar-instruction">
                      <p>{selectedGrammarInstruction}</p>
                    </div>

                    {/* 단일 문항 내용을 보여주는 영역 - question 필드만 표시 */}
                    <div className="grammar-question">
                      <p className="question-number">
                        {isGrammarRetryMode 
                          ? `복습 라운드 ${grammarRound}: ${grammarRetryIndex + 1} / ${grammarRetryQuestions.length}`
                          : `문제 ${currentGrammarQuestionIndex + 1} / ${grammarQuestions.length}`}
                      </p>
                      <p className="question-text">{currentGrammarQuestion?.question}</p>
                    </div>

                    {/* 정답 입력 영역 */}
                    <div className="grammar-answer-container">
                      <input
                        ref={grammarAnswerInputRef}
                        type="text"
                        className={`answer-input ${grammarFeedback?.type || ''}`}
                        placeholder="정답 입력"
                        value={grammarAnswer}
                        onChange={(e) => setGrammarAnswer(e.target.value)}
                        onKeyPress={handleGrammarAnswerKeyPress}
                        disabled={grammarFeedback !== null}
                        autoFocus
                      />
                      <button 
                        className="check-button"
                        onClick={checkGrammarAnswer}
                        disabled={grammarFeedback !== null || !grammarAnswer.trim()}
                      >
                        확인
                      </button>
                    </div>

                    {/* 피드백 메시지 */}
                    {grammarFeedback && (
                      <div className={`feedback ${grammarFeedback.type}`}>
                        <div>{grammarFeedback.message}</div>
                      </div>
                    )}

                    {/* 진행 상황 표시 */}
                    <div className="progress-info">
                      {isGrammarRetryMode ? (
                        <span>복습 라운드 {grammarRound}: {grammarRetryIndex + 1} / {grammarRetryQuestions.length}</span>
                      ) : (
                        <span>
                          라운드 {grammarRound}: {currentGrammarQuestionIndex + 1} / {grammarQuestions.length}
                          {wrongGrammarQuestionsInRound.length > 0 && ` | 틀린 문제: ${wrongGrammarQuestionsInRound.length}개`}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* 오답 모달 */}
              {showGrammarModal && (
                <div className="modal-overlay" onClick={closeGrammarModal}>
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    <h3>오답입니다</h3>
                    <div className="modal-answer">
                      <p className="label">정답:</p>
                      <p className="correct-answer">{grammarModalContent.correctAnswer}</p>
                    </div>
                    <p className="modal-hint">Enter 키 또는 확인 버튼을 눌러 계속하세요</p>
                    <button className="modal-button" onClick={closeGrammarModal}>
                      확인
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'admin' && isAdmin && (
        <div className="admin-container">
          {/* 관리자 서브 탭 */}
          <div className="admin-sub-tabs">
            <button
              className={`sub-tab-button ${adminSubTab === 'users' ? 'active' : ''}`}
              onClick={() => setAdminSubTab('users')}
            >
              사용자 관리
            </button>
            <button
              className={`sub-tab-button ${adminSubTab === 'books' ? 'active' : ''}`}
              onClick={() => setAdminSubTab('books')}
            >
              단어장 관리
            </button>
            <button
              className={`sub-tab-button ${adminSubTab === 'grammar' ? 'active' : ''}`}
              onClick={() => setAdminSubTab('grammar')}
            >
              문법 관리
            </button>
            <button
              className={`sub-tab-button ${adminSubTab === 'stats' ? 'active' : ''}`}
              onClick={() => setAdminSubTab('stats')}
            >
              통계 대시보드
            </button>
          </div>

          {adminSubTab === 'users' && (
            <div className="admin-users">
              {/* 새 사용자 추가 */}
              <div className="add-user-form">
                <h3>새 사용자 추가</h3>
                <div className="form-row">
                  <input
                    type="text"
                    className="user-input"
                    placeholder="사용자 이름"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddUser()}
                  />
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={newUserIsAdmin}
                      onChange={(e) => setNewUserIsAdmin(e.target.checked)}
                    />
                    관리자 권한
                  </label>
                  <button className="add-button" onClick={handleAddUser}>
                    추가
                  </button>
                </div>
                {adminError && <div className="admin-error">{adminError}</div>}
              </div>

              {/* 사용자 목록 */}
              <div className="users-list">
                <h3>사용자 목록 ({adminUsers.length}명)</h3>
                {isLoadingAdmin ? (
                  <div className="loading">로딩 중...</div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>이름</th>
                        <th>권한</th>
                        <th>가입일</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminUsers.map(user => (
                        <tr key={user.id}>
                          <td>{user.id}</td>
                          <td>{user.username}</td>
                          <td>
                            <span className={`role-badge ${user.is_admin ? 'admin' : 'user'}`}>
                              {user.is_admin ? '관리자' : '사용자'}
                            </span>
                          </td>
                          <td>{formatDateOnly(user.created_at)}</td>
                          <td className="action-buttons">
                            {user.id !== userId && (
                              <>
                                <button 
                                  className="toggle-admin-btn"
                                  onClick={() => handleToggleAdmin(user.id)}
                                >
                                  {user.is_admin ? '권한 해제' : '관리자 지정'}
                                </button>
                                <button 
                                  className="delete-btn"
                                  onClick={() => handleDeleteUser(user.id, user.username)}
                                >
                                  삭제
                                </button>
                              </>
                            )}
                            {user.id === userId && (
                              <span className="current-user">(나)</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {adminSubTab === 'books' && (
            <div className="admin-books">
              {/* 엑셀 파일 업로드 */}
              <div className="upload-section">
                <h3>엑셀 파일로 단어 추가</h3>
                <div className="upload-info">
                  <p>엑셀 파일 형식: 첫 번째 행에 컬럼명이 있어야 합니다.</p>
                  <p><strong>필수 컬럼:</strong> book_name, unit, english, korean</p>
                  <p><strong>선택 컬럼:</strong> example</p>
                </div>
                <div className="upload-form">
                  <input
                    id="excel-file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setUploadFile(e.target.files[0])}
                    className="file-input"
                  />
                  <button 
                    className="upload-button"
                    onClick={handleFileUpload}
                    disabled={isUploading || !uploadFile}
                  >
                    {isUploading ? '업로드 중...' : '업로드'}
                  </button>
                </div>
                {uploadResult && (
                  <div className={`upload-result ${uploadResult.success ? 'success' : 'error'}`}>
                    {uploadResult.success ? (
                      <>
                        <p>{uploadResult.message}</p>
                        {uploadResult.skippedCount > 0 && (
                          <p>건너뛴 항목: {uploadResult.skippedCount}개</p>
                        )}
                        {uploadResult.errors && uploadResult.errors.length > 0 && (
                          <div className="upload-errors">
                            <p>오류 목록:</p>
                            <ul>
                              {uploadResult.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p>{uploadResult.error}</p>
                        {uploadResult.hint && <p className="hint">{uploadResult.hint}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 단어장 목록 */}
              <div className="books-list">
                <h3>단어장 목록 ({adminBooks.length}개)</h3>
                {adminBooks.length === 0 ? (
                  <div className="no-records">등록된 단어장이 없습니다</div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>단어장 이름</th>
                        <th>단원 수</th>
                        <th>단어 수</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminBooks.map((book, index) => (
                        <tr key={index}>
                          <td>{book.book_name}</td>
                          <td>{book.unit_count}</td>
                          <td>{book.word_count}</td>
                          <td>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteBook(book.book_name)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {adminSubTab === 'grammar' && (
            <div className="admin-grammar">
              {/* 엑셀 파일 업로드 */}
              <div className="upload-section">
                <h3>엑셀 파일로 문법 문제 추가</h3>
                <div className="upload-info">
                  <p>엑셀 파일 형식: 첫 번째 행에 컬럼명이 있어야 합니다.</p>
                  <p><strong>컬럼:</strong> 분류1, 분류2, 수준, 이미지파일, 분류 내 전체 문항 지시 사항, 단일 문항, 정답, 문장1, 문장2, 문장3, 해석1, 해석2, 해석3</p>
                </div>
                <div className="upload-form">
                  <input
                    id="grammar-excel-file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setGrammarUploadFile(e.target.files[0])}
                    className="file-input"
                  />
                  <button 
                    className="upload-button"
                    onClick={handleGrammarFileUpload}
                    disabled={isGrammarUploading || !grammarUploadFile}
                  >
                    {isGrammarUploading ? '업로드 중...' : '업로드'}
                  </button>
                </div>
                {grammarUploadResult && (
                  <div className={`upload-result ${grammarUploadResult.success ? 'success' : 'error'}`}>
                    {grammarUploadResult.success ? (
                      <>
                        <p>{grammarUploadResult.message}</p>
                        {grammarUploadResult.skippedCount > 0 && (
                          <p>건너뛴 항목: {grammarUploadResult.skippedCount}개</p>
                        )}
                        {grammarUploadResult.errors && grammarUploadResult.errors.length > 0 && (
                          <div className="upload-errors">
                            <p>오류 목록:</p>
                            <ul>
                              {grammarUploadResult.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p>{grammarUploadResult.error}</p>
                        {grammarUploadResult.hint && <p className="hint">{grammarUploadResult.hint}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* 문법 목록 */}
              <div className="grammar-list">
                <h3>문법 분류 목록 ({adminGrammar.length}개)</h3>
                {adminGrammar.length === 0 ? (
                  <div className="no-records">등록된 문법 문제가 없습니다</div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>분류1</th>
                        <th>분류2 수</th>
                        <th>문제 수</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminGrammar.map((item, index) => (
                        <tr key={index}>
                          <td>{item.category1 || '(없음)'}</td>
                          <td>{item.category2_count}</td>
                          <td>{item.question_count}</td>
                          <td>
                            <button 
                              className="delete-btn"
                              onClick={() => handleDeleteGrammar(item.category1)}
                            >
                              삭제
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {adminSubTab === 'stats' && adminStats && (
            <div className="admin-stats">
              {/* 단어 맞추기 통계 카드 */}
              <h3 className="stats-section-title">단어 맞추기 통계</h3>
              <div className="stats-overview">
                <div className="stat-card">
                  <div className="stat-card-value">{adminStats.userCount}</div>
                  <div className="stat-card-label">전체 사용자</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{adminStats.wordCount}</div>
                  <div className="stat-card-label">등록된 단어</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{adminStats.totalProgress}</div>
                  <div className="stat-card-label">총 학습 기록</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{adminStats.todayProgress}</div>
                  <div className="stat-card-label">오늘 학습</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{adminStats.accuracy}%</div>
                  <div className="stat-card-label">전체 정답률</div>
                </div>
              </div>

              {/* 문법 익히기 통계 카드 */}
              <h3 className="stats-section-title">문법 익히기 통계</h3>
              <div className="stats-overview">
                <div className="stat-card">
                  <div className="stat-card-value">{adminStats.grammarCount || 0}</div>
                  <div className="stat-card-label">등록된 문법 문제</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{adminStats.grammarTotalProgress || 0}</div>
                  <div className="stat-card-label">총 학습 기록</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{adminStats.grammarTodayProgress || 0}</div>
                  <div className="stat-card-label">오늘 학습</div>
                </div>
                <div className="stat-card">
                  <div className="stat-card-value">{adminStats.grammarAccuracy || 0}%</div>
                  <div className="stat-card-label">전체 정답률</div>
                </div>
              </div>

              {/* 최근 7일 단어 학습량 */}
              <div className="weekly-stats">
                <h3>단어 맞추기 - 최근 7일 학습 현황</h3>
                {adminStats.weeklyStats && adminStats.weeklyStats.length > 0 ? (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>날짜</th>
                        <th>학습 수</th>
                        <th>정답 수</th>
                        <th>정답률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.weeklyStats.map((stat, index) => (
                        <tr key={index}>
                          <td>{formatDateOnly(stat.date)}</td>
                          <td>{stat.count}</td>
                          <td>{stat.correct}</td>
                          <td>{Math.round((stat.correct / stat.count) * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-records">최근 7일간 학습 기록이 없습니다</div>
                )}
              </div>

              {/* 사용자별 학습량 */}
              <div className="top-users">
                <h3>사용자별 학습량 (상위 10명)</h3>
                {adminStats.topUsers && adminStats.topUsers.length > 0 ? (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>순위</th>
                        <th>사용자</th>
                        <th>총 학습</th>
                        <th>정답</th>
                        <th>정답률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.topUsers.map((user, index) => (
                        <tr key={index}>
                          <td>{index + 1}</td>
                          <td>{user.username}</td>
                          <td>{user.total_attempts}</td>
                          <td>{user.correct_count}</td>
                          <td>
                            {user.total_attempts > 0 
                              ? Math.round((user.correct_count / user.total_attempts) * 100) 
                              : 0}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-records">학습 기록이 없습니다</div>
                )}
              </div>

              {/* 문법 익히기 최근 7일 학습량 */}
              <div className="weekly-stats">
                <h3>문법 익히기 - 최근 7일 학습 현황</h3>
                {adminStats.grammarWeeklyStats && adminStats.grammarWeeklyStats.length > 0 ? (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>날짜</th>
                        <th>학습 수</th>
                        <th>정답 수</th>
                        <th>정답률</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStats.grammarWeeklyStats.map((stat, index) => (
                        <tr key={index}>
                          <td>{formatDateOnly(stat.date)}</td>
                          <td>{stat.count}</td>
                          <td>{stat.correct}</td>
                          <td>{Math.round((stat.correct / stat.count) * 100)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="no-records">최근 7일간 문법 학습 기록이 없습니다</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default App
