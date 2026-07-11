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
  const [reviewSubTab, setReviewSubTab] = useState('words') // 'words' | 'grammar' | 'blocks' | 'webbook'
  const [grammarProgressRecords, setGrammarProgressRecords] = useState([])
  const [grammarProgressStats, setGrammarProgressStats] = useState(null)
  const [isLoadingGrammarProgress, setIsLoadingGrammarProgress] = useState(false)
  const [blocksProgressRecords, setBlocksProgressRecords] = useState([])
  const [blocksProgressStats, setBlocksProgressStats] = useState(null)
  const [isLoadingBlocksProgress, setIsLoadingBlocksProgress] = useState(false)
  const [webbookProgressRecords, setWebbookProgressRecords] = useState([])
  const [webbookProgressStats, setWebbookProgressStats] = useState(null)
  const [isLoadingWebbookProgress, setIsLoadingWebbookProgress] = useState(false)

  // 관리자 페이지 관련 상태
  const [adminUsers, setAdminUsers] = useState([])
  const [adminStats, setAdminStats] = useState(null)
  const [newUserName, setNewUserName] = useState('')
  const [newUserIsAdmin, setNewUserIsAdmin] = useState(false)
  const [isLoadingAdmin, setIsLoadingAdmin] = useState(false)
  const [adminError, setAdminError] = useState('')
  const [adminSubTab, setAdminSubTab] = useState('users') // 'users', 'stats', 'books', 'grammar', 'blockwriting', 'webbook'

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

  // 블럭영작 관리 관련 상태
  const [adminBlockwriting, setAdminBlockwriting] = useState([])
  const [blockwritingUploadFile, setBlockwritingUploadFile] = useState(null)
  const [isBlockwritingUploading, setIsBlockwritingUploading] = useState(false)
  const [blockwritingUploadResult, setBlockwritingUploadResult] = useState(null)

  // webbook 관리 (spoken_sentence) 관련 상태
  const [adminWebbooks, setAdminWebbooks] = useState([])
  const [webbookUploadFile, setWebbookUploadFile] = useState(null)
  const [isWebbookUploading, setIsWebbookUploading] = useState(false)
  const [webbookUploadResult, setWebbookUploadResult] = useState(null)

  // 블럭 영작 학습 관련 상태
  const [blockwritingBooks, setBlockwritingBooks] = useState([])
  const [selectedBlockwritingBook, setSelectedBlockwritingBook] = useState('')
  const [showBlockwritingBookDropdown, setShowBlockwritingBookDropdown] = useState(false)
  const [blockwritingLessons, setBlockwritingLessons] = useState([])
  const [selectedBlockwritingLesson, setSelectedBlockwritingLesson] = useState('')
  const [showBlockwritingLessonDropdown, setShowBlockwritingLessonDropdown] = useState(false)
  const [blockwritingSentenceNumbers, setBlockwritingSentenceNumbers] = useState([])
  const [selectedBlockwritingSentenceNumber, setSelectedBlockwritingSentenceNumber] = useState('')
  const [showBlockwritingSentenceNumberDropdown, setShowBlockwritingSentenceNumberDropdown] = useState(false)
  const [blockwritingQuestions, setBlockwritingQuestions] = useState([])
  const [currentBlockwritingIndex, setCurrentBlockwritingIndex] = useState(0)
  const [blockwritingAnswer, setBlockwritingAnswer] = useState('')
  const [isBlockwritingStarted, setIsBlockwritingStarted] = useState(false)
  
  // 블럭 영작 단위 블럭 관련 상태
  const [koreanBlocks, setKoreanBlocks] = useState([]) // 한글 단위 블럭 배열
  const [englishBlocks, setEnglishBlocks] = useState([]) // 영어 단위 블럭 배열
  const [currentUnitBlockIndex, setCurrentUnitBlockIndex] = useState(0) // 현재 단위 블럭 인덱스
  const [completedBlocks, setCompletedBlocks] = useState([]) // 완료된 블럭 인덱스 배열
  const [blockwritingPhase, setBlockwritingPhase] = useState('block') // 'block' | 'full' - 단위블럭 모드 또는 전체문장 모드
  const [showKoreanBlocks, setShowKoreanBlocks] = useState(true) // 한글 블럭 표시 여부
  
  // 블럭 영작 모달 관련 상태
  const [showBlockwritingModal, setShowBlockwritingModal] = useState(false)
  const [blockwritingModalType, setBlockwritingModalType] = useState('') // 'incorrect' | 'success' | 'lessonComplete'
  const [blockwritingModalContent, setBlockwritingModalContent] = useState({ correctAnswer: '' })

  // web book 학습 관련 상태
  const [webbookBooks, setWebbookBooks] = useState([])
  const [selectedWebbookBook, setSelectedWebbookBook] = useState('')
  const [showWebbookBookDropdown, setShowWebbookBookDropdown] = useState(false)
  const [webbookSections, setWebbookSections] = useState([])
  const [selectedWebbookSection, setSelectedWebbookSection] = useState('')
  const [showWebbookSectionDropdown, setShowWebbookSectionDropdown] = useState(false)
  const [webbookUnits, setWebbookUnits] = useState([])
  const [selectedWebbookUnit, setSelectedWebbookUnit] = useState('')
  const [showWebbookUnitDropdown, setShowWebbookUnitDropdown] = useState(false)
  const [webbookSentences, setWebbookSentences] = useState([])
  const [currentWebbookIndex, setCurrentWebbookIndex] = useState(0)
  const [isWebbookStarted, setIsWebbookStarted] = useState(false)
  const [isWebbookListening, setIsWebbookListening] = useState(false)
  const [webbookSpeechSupported, setWebbookSpeechSupported] = useState(true)
  const [showWebbookModal, setShowWebbookModal] = useState(false)
  const [webbookModalType, setWebbookModalType] = useState('') // 'incorrect' | 'success' | 'unitComplete'
  const [webbookModalContent, setWebbookModalContent] = useState({
    correctAnswer: '',
    userAnswer: '',
    attemptNumber: 1,
    wordMatchRatio: 0,
    countsAsMicAttempt: false
  })

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
      } else if (reviewSubTab === 'grammar') {
        fetchGrammarProgress()
      } else if (reviewSubTab === 'blocks') {
        fetchBlocksProgress()
      } else if (reviewSubTab === 'webbook') {
        fetchWebbookProgress()
      }
    }
  }, [activeTab, selectedUserId, selectedDate, userId, isAdmin, reviewSubTab])

  // 블럭영작 수행 기록 조회
  const fetchBlocksProgress = async () => {
    if (!userId) return

    setIsLoadingBlocksProgress(true)
    try {
      const params = new URLSearchParams()
      params.append('requesterId', userId)
      if (isAdmin && selectedUserId) params.append('userId', selectedUserId)
      if (selectedDate) params.append('date', selectedDate)

      const response = await fetch(`${API_BASE}/blocks/progress?${params}`)
      const data = await response.json()
      setBlocksProgressRecords(data.records || [])
      setBlocksProgressStats(data.stats)
    } catch (error) {
      console.error('Fetch blocks progress error:', error)
    } finally {
      setIsLoadingBlocksProgress(false)
    }
  }

  // web book 수행 기록 조회
  const fetchWebbookProgress = async () => {
    if (!userId) return

    setIsLoadingWebbookProgress(true)
    try {
      const params = new URLSearchParams()
      params.append('requesterId', userId)
      if (isAdmin && selectedUserId) params.append('userId', selectedUserId)
      if (selectedDate) params.append('date', selectedDate)

      const response = await fetch(`${API_BASE}/spoken/progress?${params}`)
      const data = await response.json()
      setWebbookProgressRecords(data.records || [])
      setWebbookProgressStats(data.stats)
    } catch (error) {
      console.error('Fetch webbook progress error:', error)
    } finally {
      setIsLoadingWebbookProgress(false)
    }
  }

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
      fetchAdminBlockwriting()
      fetchAdminWebbooks()
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

  // 관리자용 블럭영작 목록 조회
  const fetchAdminBlockwriting = async () => {
    try {
      const response = await fetch(`${API_BASE}/blocks`)
      const data = await response.json()
      if (data.blocks) {
        setAdminBlockwriting(data.blocks)
      }
    } catch (error) {
      console.error('Fetch admin blockwriting error:', error)
    }
  }

  // 블럭영작 엑셀 파일 업로드
  const handleBlockwritingFileUpload = async () => {
    if (!blockwritingUploadFile) {
      setBlockwritingUploadResult({ error: '파일을 선택해주세요' })
      return
    }

    setIsBlockwritingUploading(true)
    setBlockwritingUploadResult(null)

    try {
      // 엑셀 파일 읽기
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const XLSX = await import('xlsx')
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)

          // 컬럼명 매핑
          const mappedData = jsonData.map(row => ({
            book: row.book || row.Book || row['교재'] || '',
            lesson: row.lesson || row.Lesson || row['레슨'] || '',
            sentence_number: row.sentence_number || row['sentence_number'] || row['문장번호'] || null,
            english: row.english || row.English || row['영어'] || '',
            korean_blocks: row.korean_blocks || row['korean_blocks'] || row['한글블럭'] || '',
            korean_full: row.korean_full || row['korean_full'] || row['한글전체'] || ''
          }))

          // 서버로 전송
          const response = await fetch(`${API_BASE}/blocks/upload`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: mappedData })
          })

          const result = await response.json()

          if (response.ok) {
            setBlockwritingUploadResult({
              success: true,
              message: result.message
            })
            setBlockwritingUploadFile(null)
            const fileInput = document.querySelector('.admin-blockwriting .file-input')
            if (fileInput) fileInput.value = ''
            fetchAdminBlockwriting()
          } else {
            setBlockwritingUploadResult({ error: result.error || '업로드에 실패했습니다' })
          }
        } catch (parseError) {
          console.error('Excel parse error:', parseError)
          setBlockwritingUploadResult({ error: '엑셀 파일 파싱에 실패했습니다' })
        }
        setIsBlockwritingUploading(false)
      }
      reader.readAsArrayBuffer(blockwritingUploadFile)
    } catch (error) {
      console.error('Blockwriting upload error:', error)
      setBlockwritingUploadResult({ error: '서버 연결에 실패했습니다' })
      setIsBlockwritingUploading(false)
    }
  }

  // 블럭영작 문제 삭제
  const handleDeleteBlockwriting = async (id) => {
    if (!confirm('이 블럭영작 문제를 삭제하시겠습니까?')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/blocks/${id}`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        fetchAdminBlockwriting()
      } else {
        alert(data.error || '삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('Delete blockwriting error:', error)
      alert('서버 오류가 발생했습니다')
    }
  }

  // 블럭영작 전체 삭제
  const handleDeleteAllBlockwriting = async () => {
    if (!confirm('모든 블럭영작 문제를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/blocks`, {
        method: 'DELETE'
      })
      const data = await response.json()

      if (data.success) {
        fetchAdminBlockwriting()
      } else {
        alert(data.error || '삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('Delete all blockwriting error:', error)
      alert('서버 오류가 발생했습니다')
    }
  }

  // 관리자용 webbook(spoken_sentence) 목록
  const fetchAdminWebbooks = async () => {
    try {
      const response = await fetch(`${API_BASE}/admin/spoken-sentences?adminId=${userId}`)
      const data = await response.json()
      if (data.webbooks) {
        setAdminWebbooks(data.webbooks)
      }
    } catch (error) {
      console.error('Fetch admin webbooks error:', error)
    }
  }

  // webbook 엑셀 업로드
  const handleWebbookFileUpload = async () => {
    if (!webbookUploadFile) {
      setWebbookUploadResult({ error: '파일을 선택해주세요' })
      return
    }

    setIsWebbookUploading(true)
    setWebbookUploadResult(null)

    try {
      const formData = new FormData()
      formData.append('file', webbookUploadFile)
      formData.append('adminId', userId)

      const response = await fetch(`${API_BASE}/admin/spoken-sentences/upload`, {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (response.ok) {
        setWebbookUploadResult({
          success: true,
          message: data.message,
          insertedCount: data.insertedCount,
          skippedCount: data.skippedCount,
          errors: data.errors
        })
        setWebbookUploadFile(null)
        const fileInput = document.getElementById('webbook-excel-file-input')
        if (fileInput) fileInput.value = ''
        fetchAdminWebbooks()
      } else {
        setWebbookUploadResult({ error: data.error || '업로드에 실패했습니다', hint: data.hint })
      }
    } catch (error) {
      console.error('Webbook upload error:', error)
      setWebbookUploadResult({ error: '서버 연결에 실패했습니다' })
    } finally {
      setIsWebbookUploading(false)
    }
  }

  // webbook(교재) 삭제
  const handleDeleteWebbook = async (bookName) => {
    if (!confirm(`"${bookName}" 웹북 데이터를 삭제하시겠습니까?\n해당 교재의 모든 문장이 삭제됩니다.`)) {
      return
    }

    try {
      const response = await fetch(`${API_BASE}/admin/spoken-sentences/${encodeURIComponent(bookName)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId: userId })
      })
      const data = await response.json()

      if (data.success) {
        fetchAdminWebbooks()
      } else {
        alert(data.error || '삭제에 실패했습니다')
      }
    } catch (error) {
      console.error('Delete webbook error:', error)
      alert('서버 오류가 발생했습니다')
    }
  }

  // ===== 블럭 영작 학습 관련 =====

  // 블럭영작 정답 입력창 ref
  const blockwritingAnswerInputRef = useRef(null)
  const webbookRecognitionRef = useRef(null)
  const webbookWrongAttemptsRef = useRef([])
  const webbookAttemptNumberRef = useRef(1)
  const webbookSentenceStartedAtRef = useRef(null)

  // 블럭 영작 탭 활성화 시 책 목록 조회
  useEffect(() => {
    if (activeTab === 'blockwriting' && isVerified) {
      fetchBlockwritingBooks()
    }
  }, [activeTab, isVerified])

  // 블럭영작 책 목록 조회
  const fetchBlockwritingBooks = async () => {
    try {
      const response = await fetch(`${API_BASE}/blocks/books`)
      const data = await response.json()
      setBlockwritingBooks(data.books || [])
    } catch (error) {
      console.error('Error fetching blockwriting books:', error)
    }
  }

  // 블럭영작 책 선택 시 레슨 목록 조회
  const handleBlockwritingBookSelect = async (book) => {
    setSelectedBlockwritingBook(book)
    setShowBlockwritingBookDropdown(false)
    // 하위 선택 초기화
    setSelectedBlockwritingLesson('')
    setBlockwritingLessons([])
    setSelectedBlockwritingSentenceNumber('')
    setBlockwritingSentenceNumbers([])
    setBlockwritingQuestions([])
    setIsBlockwritingStarted(false)
    resetBlockwritingState()

    try {
      const response = await fetch(`${API_BASE}/blocks/lessons?book=${encodeURIComponent(book)}`)
      const data = await response.json()
      setBlockwritingLessons(data.lessons || [])
    } catch (error) {
      console.error('Error fetching blockwriting lessons:', error)
    }
  }

  // 블럭영작 레슨 선택 시 문장번호 목록 조회
  const handleBlockwritingLessonSelect = async (lesson) => {
    setSelectedBlockwritingLesson(lesson)
    setShowBlockwritingLessonDropdown(false)
    // 하위 선택 초기화
    setSelectedBlockwritingSentenceNumber('')
    setBlockwritingSentenceNumbers([])
    setBlockwritingQuestions([])
    setIsBlockwritingStarted(false)
    resetBlockwritingState()

    try {
      const response = await fetch(
        `${API_BASE}/blocks/sentence-numbers?book=${encodeURIComponent(selectedBlockwritingBook)}&lesson=${encodeURIComponent(lesson)}`
      )
      const data = await response.json()
      setBlockwritingSentenceNumbers(data.sentenceNumbers || [])
    } catch (error) {
      console.error('Error fetching sentence numbers:', error)
    }
  }

  // 블럭영작 문장번호 선택 시 문제 목록 조회 및 학습 시작
  const handleBlockwritingSentenceNumberSelect = async (sentenceNumber) => {
    setSelectedBlockwritingSentenceNumber(sentenceNumber)
    setShowBlockwritingSentenceNumberDropdown(false)

    try {
      const response = await fetch(
        `${API_BASE}/blocks/questions?book=${encodeURIComponent(selectedBlockwritingBook)}&lesson=${encodeURIComponent(selectedBlockwritingLesson)}&sentenceNumber=${encodeURIComponent(sentenceNumber)}`
      )
      const data = await response.json()
      const questions = data.questions || []
      initializeBlockwritingQuestion(questions, 0)
    } catch (error) {
      console.error('Error fetching blockwriting questions:', error)
    }
  }

  // 전체 레슨 문제 불러오기 (문장번호 선택 없이)
  const handleBlockwritingStartAll = async () => {
    if (!selectedBlockwritingBook || !selectedBlockwritingLesson) return

    setShowBlockwritingSentenceNumberDropdown(false)

    try {
      const response = await fetch(
        `${API_BASE}/blocks/questions?book=${encodeURIComponent(selectedBlockwritingBook)}&lesson=${encodeURIComponent(selectedBlockwritingLesson)}`
      )
      const data = await response.json()
      const questions = data.questions || []
      setSelectedBlockwritingSentenceNumber('')
      initializeBlockwritingQuestion(questions, 0)
    } catch (error) {
      console.error('Error fetching all blockwriting questions:', error)
    }
  }

  // 블럭영작 상태 초기화
  const resetBlockwritingState = () => {
    setKoreanBlocks([])
    setEnglishBlocks([])
    setCurrentUnitBlockIndex(0)
    setCompletedBlocks([])
    setBlockwritingPhase('block')
    setShowKoreanBlocks(true)
    setBlockwritingAnswer('')
    setShowBlockwritingModal(false)
    setBlockwritingModalType('')
    setBlockwritingModalContent({ correctAnswer: '' })
  }

  // 블럭영작 문제 초기화 (⑨ 과정)
  const initializeBlockwritingQuestion = (questions, index) => {
    setBlockwritingQuestions(questions)
    setCurrentBlockwritingIndex(index)
    
    if (questions.length > 0 && questions[index]) {
      const question = questions[index]
      // ⑨-3: korean_blocks를 "/" 기준으로 분리하여 배열로 저장
      const kBlocks = question.korean_blocks ? question.korean_blocks.split('/').map(b => b.trim()) : []
      // ⑨-4: english를 "/" 기준으로 분리하여 배열로 저장
      const eBlocks = question.english ? question.english.split('/').map(b => b.trim()) : []
      
      setKoreanBlocks(kBlocks)
      setEnglishBlocks(eBlocks)
      setCurrentUnitBlockIndex(0)
      setCompletedBlocks([])
      setBlockwritingPhase('block')
      setShowKoreanBlocks(true)
      setBlockwritingAnswer('')
      setIsBlockwritingStarted(true)
      setShowBlockwritingModal(false)
      
      // 입력창에 포커스
      setTimeout(() => {
        blockwritingAnswerInputRef.current?.focus()
      }, 100)
    }
  }

  // 현재 블럭영작 문제
  const currentBlockwritingQuestion = blockwritingQuestions[currentBlockwritingIndex]

  // 정답 비교용 정규화: 앞뒤 공백 제거 + 연속 공백을 하나로
  const normalizeBlockwritingAnswer = (str) => (str || '').trim().replace(/\s+/g, ' ')

  // 블럭영작 정답 확인 (⑩, ⑪ 과정)
  const checkBlockwritingAnswer = () => {
    if (!blockwritingAnswer.trim()) return

    const userAnswer = normalizeBlockwritingAnswer(blockwritingAnswer)
    
    if (blockwritingPhase === 'block') {
      // 단위 블럭 모드 (⑪ 과정)
      const correctAnswer = normalizeBlockwritingAnswer(englishBlocks[currentUnitBlockIndex] || '')
      
      // 정답 비교 (대소문자 무시, 공백 정규화)
      const normalizedUserAnswer = userAnswer.toLowerCase()
      const normalizedCorrectAnswer = correctAnswer.toLowerCase()
      
      if (normalizedUserAnswer === normalizedCorrectAnswer) {
        // ⑪-1: 정답인 경우
        speakEnglish(correctAnswer)
        
        // 현재 블럭을 완료 처리
        const newCompletedBlocks = [...completedBlocks, currentUnitBlockIndex]
        setCompletedBlocks(newCompletedBlocks)
        setBlockwritingAnswer('')
        
        // 마지막 단위 블럭인지 확인
        if (currentUnitBlockIndex >= koreanBlocks.length - 1) {
          // ⑫: 모든 단위 블럭 완료 - 한글 블럭 숨기고 전체 문장 모드로 전환
          setShowKoreanBlocks(false)
          setBlockwritingPhase('full')
        } else {
          // 다음 단위 블럭으로 이동
          setCurrentUnitBlockIndex(prev => prev + 1)
        }
        
        // 입력창에 포커스
        setTimeout(() => {
          blockwritingAnswerInputRef.current?.focus()
        }, 100)
      } else {
        // ⑪-2: 오답인 경우 - 모달로 정답 표시
        speakEnglish(correctAnswer)
        setBlockwritingModalType('incorrect')
        setBlockwritingModalContent({ correctAnswer })
        setShowBlockwritingModal(true)
        // 다음 블럭으로 넘어가지 않음 - 사용자가 수정 후 다시 시도
      }
    } else {
      // 전체 문장 모드 (⑬, ⑭ 과정)
      const fullEnglish = normalizeBlockwritingAnswer((currentBlockwritingQuestion?.english || '').replace(/\//g, ''))
      
      // 정답 비교 (대소문자 무시, 공백 정규화)
      const normalizedUserAnswer = userAnswer.toLowerCase()
      const normalizedCorrectAnswer = fullEnglish.toLowerCase()
      const isCorrect = normalizedUserAnswer === normalizedCorrectAnswer

      // blocks_progress에 수행 기록 저장 (로그인 사용자만)
      if (userId) {
        fetch(`${API_BASE}/blocks/progress`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            blocksId: currentBlockwritingQuestion?.id,
            book: currentBlockwritingQuestion?.book,
            lesson: currentBlockwritingQuestion?.lesson,
            sentenceNumber: currentBlockwritingQuestion?.sentence_number,
            english: currentBlockwritingQuestion?.english,
            correctAnswer: fullEnglish,
            wrongAnswer: blockwritingAnswer.trim(),
            isCorrect
          })
        }).catch(err => console.error('blocks_progress save error:', err))
      }
      
      if (isCorrect) {
        // ⑭-1: 정답인 경우
        speakEnglish(fullEnglish)
        setBlockwritingModalType('success')
        setBlockwritingModalContent({ correctAnswer: fullEnglish })
        setShowBlockwritingModal(true)
      } else {
        // ⑭-2: 오답인 경우
        speakEnglish(fullEnglish)
        setBlockwritingModalType('incorrect')
        setBlockwritingModalContent({ correctAnswer: fullEnglish })
        setShowBlockwritingModal(true)
      }
    }
  }

  // 블럭영작 모달 닫기
  const closeBlockwritingModal = () => {
    setShowBlockwritingModal(false)
    
    if (blockwritingModalType === 'incorrect') {
      // 오답 모달 닫은 후 입력창에 포커스
      setTimeout(() => {
        blockwritingAnswerInputRef.current?.focus()
      }, 100)
    }
  }

  // 정답 모달에서 확인 클릭 시 - lesson 내 다음 sentence_number로 이동 또는 과 완료 모달 표시
  const handleBlockwritingSuccessConfirm = async () => {
    setShowBlockwritingModal(false)
    setBlockwritingModalType('')
    
    const currentSentenceNumber = currentBlockwritingQuestion?.sentence_number
    const currentIdx = blockwritingSentenceNumbers.findIndex(
      sn => String(sn) === String(currentSentenceNumber)
    )
    const nextSentenceNumber = currentIdx >= 0 && currentIdx < blockwritingSentenceNumbers.length - 1
      ? blockwritingSentenceNumbers[currentIdx + 1]
      : null

    if (nextSentenceNumber != null) {
      // 다음 sentence_number의 문제 조회 후 이동
      try {
        const response = await fetch(
          `${API_BASE}/blocks/questions?book=${encodeURIComponent(selectedBlockwritingBook)}&lesson=${encodeURIComponent(selectedBlockwritingLesson)}&sentenceNumber=${encodeURIComponent(nextSentenceNumber)}`
        )
        const data = await response.json()
        const questions = data.questions || []
        if (questions.length > 0) {
          setSelectedBlockwritingSentenceNumber(nextSentenceNumber)
          initializeBlockwritingQuestion(questions, 0)
        } else {
          // 다음 문장 데이터 없음 - 과 완료로 처리
          setBlockwritingModalType('lessonComplete')
          setShowBlockwritingModal(true)
        }
      } catch (error) {
        console.error('Error fetching next blockwriting question:', error)
        setBlockwritingModalType('lessonComplete')
        setShowBlockwritingModal(true)
      }
    } else {
      // 과의 마지막 문장 완료 - 완료 모달 표시
      setBlockwritingModalType('lessonComplete')
      setShowBlockwritingModal(true)
    }
  }

  // 과 완료 모달에서 확인 클릭 시 - 선택 화면으로 돌아가기
  const returnToBlockwritingSelection = () => {
    setShowBlockwritingModal(false)
    setBlockwritingModalType('')
    setIsBlockwritingStarted(false)
    resetBlockwritingState()
  }

  // 블럭영작 Enter 키 처리
  const handleBlockwritingAnswerKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!showBlockwritingModal) {
        checkBlockwritingAnswer()
      }
    }
  }

  // 블럭영작 학습 다시하기
  const handleBlockwritingRestart = () => {
    if (blockwritingQuestions.length > 0) {
      initializeBlockwritingQuestion(blockwritingQuestions, currentBlockwritingIndex)
    }
  }

  // ===== web book 학습 관련 =====

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    setWebbookSpeechSupported(!!SpeechRecognition)
  }, [])

  useEffect(() => {
    if (activeTab === 'webbook' && isVerified) {
      fetchWebbookBooks()
    }
  }, [activeTab, isVerified])

  const fetchWebbookBooks = async () => {
    try {
      const response = await fetch(`${API_BASE}/spoken/books`)
      const data = await response.json()
      setWebbookBooks(data.books || [])
    } catch (error) {
      console.error('Error fetching webbook books:', error)
    }
  }

  const resetWebbookPracticeState = () => {
    setWebbookSentences([])
    setCurrentWebbookIndex(0)
    setIsWebbookStarted(false)
    setIsWebbookListening(false)
    setShowWebbookModal(false)
    setWebbookModalType('')
    setWebbookModalContent({ correctAnswer: '', userAnswer: '', attemptNumber: 1, wordMatchRatio: 0, countsAsMicAttempt: false })
    resetWebbookWrongAttempts()
    if (webbookRecognitionRef.current) {
      try {
        webbookRecognitionRef.current.stop()
      } catch {
        // ignore
      }
    }
  }

  const handleWebbookBookSelect = async (book) => {
    setSelectedWebbookBook(book)
    setShowWebbookBookDropdown(false)
    setSelectedWebbookSection('')
    setWebbookSections([])
    setSelectedWebbookUnit('')
    setWebbookUnits([])
    resetWebbookPracticeState()

    try {
      const response = await fetch(`${API_BASE}/spoken/sections?book=${encodeURIComponent(book)}`)
      const data = await response.json()
      setWebbookSections(data.sections || [])
    } catch (error) {
      console.error('Error fetching webbook sections:', error)
    }
  }

  const handleWebbookSectionSelect = async (section) => {
    setSelectedWebbookSection(section)
    setShowWebbookSectionDropdown(false)
    setSelectedWebbookUnit('')
    setWebbookUnits([])
    resetWebbookPracticeState()

    try {
      const response = await fetch(
        `${API_BASE}/spoken/units?book=${encodeURIComponent(selectedWebbookBook)}&section=${encodeURIComponent(section)}`
      )
      const data = await response.json()
      setWebbookUnits(data.units || [])
    } catch (error) {
      console.error('Error fetching webbook units:', error)
    }
  }

  const resetWebbookWrongAttempts = () => {
    webbookWrongAttemptsRef.current = []
    webbookAttemptNumberRef.current = 1
    webbookSentenceStartedAtRef.current = Date.now()
  }

  const initializeWebbookSentences = (sentences, index = 0) => {
    setWebbookSentences(sentences)
    setCurrentWebbookIndex(index)
    setIsWebbookStarted(sentences.length > 0)
    setShowWebbookModal(false)
    setWebbookModalType('')
    setWebbookModalContent({ correctAnswer: '', userAnswer: '', attemptNumber: 1, wordMatchRatio: 0, countsAsMicAttempt: false })
    resetWebbookWrongAttempts()
  }

  const handleWebbookUnitSelect = async (unit) => {
    setSelectedWebbookUnit(unit)
    setShowWebbookUnitDropdown(false)

    try {
      const response = await fetch(
        `${API_BASE}/spoken/sentences?book=${encodeURIComponent(selectedWebbookBook)}&section=${encodeURIComponent(selectedWebbookSection)}&unit=${encodeURIComponent(unit)}`
      )
      const data = await response.json()
      initializeWebbookSentences(data.sentences || [], 0)
    } catch (error) {
      console.error('Error fetching webbook sentences:', error)
    }
  }

  const currentWebbookSentence = webbookSentences[currentWebbookIndex]

  const normalizeSpokenEnglish = (str) =>
    (str || '').trim().replace(/\s+/g, ' ').replace(/[^\w\s']/g, '').toLowerCase()

  const tokenizeSpokenEnglish = (str) => {
    const normalized = normalizeSpokenEnglish(str)
    return normalized ? normalized.split(' ').filter(Boolean) : []
  }

  // 정답 단어 중 사용자가 말한 동일 단어 비율 (0~1)
  const calcSpokenWordMatchRatio = (userText, correctText) => {
    const correctWords = tokenizeSpokenEnglish(correctText)
    if (correctWords.length === 0) return 0

    const remainingUserWords = [...tokenizeSpokenEnglish(userText)]
    let matched = 0
    for (const word of correctWords) {
      const idx = remainingUserWords.indexOf(word)
      if (idx !== -1) {
        matched += 1
        remainingUserWords.splice(idx, 1)
      }
    }
    return matched / correctWords.length
  }

  const compareSpokenAnswer = (userText, correctText) =>
    normalizeSpokenEnglish(userText) === normalizeSpokenEnglish(correctText)

  const saveWebbookProgress = async (sentence, spokenText, isCorrect, { countsAsMicAttempt = true } = {}) => {
    if (!userId) {
      console.warn('webbook progress: 로그인(userId)이 없어 저장하지 않습니다')
      return false
    }
    if (!sentence) return false

    const book = sentence.book || selectedWebbookBook
    const section = sentence.section || selectedWebbookSection
    const unit = sentence.unit || selectedWebbookUnit
    const engSen = (sentence.eng_sen || '').trim()
    const korSen = (sentence.kor_sen || '').trim()

    if (!book || !unit || !engSen || !korSen) {
      console.warn('webbook progress: 필수 필드 누락', { book, unit, engSen, korSen })
      return false
    }

    const trimmedAnswer = (spokenText || '').trim()
    if (!isCorrect && trimmedAnswer) {
      webbookWrongAttemptsRef.current.push(trimmedAnswer)
    }

    const startedAt = webbookSentenceStartedAtRef.current
    const elapsedSeconds =
      startedAt != null ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : null
    const priorWrongAttempts = [...webbookWrongAttemptsRef.current]
    const wrongAttemptsSummary =
      isCorrect && priorWrongAttempts.length > 0 ? priorWrongAttempts.join(' | ') : null
    const attemptNumber = webbookAttemptNumberRef.current

    try {
      const response = await fetch(`${API_BASE}/spoken/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          spokenSentenceId: sentence.id ?? null,
          book,
          section: section || null,
          unit,
          engSen,
          korSen,
          userAnswer: trimmedAnswer || null,
          wrongAnswer: isCorrect ? null : trimmedAnswer || null,
          wrongAttempts: wrongAttemptsSummary,
          isCorrect: !!isCorrect,
          sentenceIndex: currentWebbookIndex,
          totalSentences: webbookSentences.length,
          attemptNumber,
          round: 1,
          elapsedSeconds
        })
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        console.error('webbook progress 저장 실패:', data.error || response.status)
        return false
      }
      // 동일 단어 비율 50% 미만(X)은 구두 연습으로 보지 않아 횟수에 가산하지 않음
      if (countsAsMicAttempt) {
        webbookAttemptNumberRef.current += 1
      }
      return true
    } catch (error) {
      console.error('webbook progress save error:', error)
      return false
    }
  }

  const handleWebbookSpeak = () => {
    if (currentWebbookSentence?.eng_sen) {
      speakEnglish(currentWebbookSentence.eng_sen)
    }
  }

  const processWebbookSpeechResult = async (spokenText) => {
    if (!currentWebbookSentence || showWebbookModal) return

    const correctAnswer = (currentWebbookSentence.eng_sen || '').trim()
    const userAnswer = spokenText.trim()
    const isCorrect = compareSpokenAnswer(spokenText, correctAnswer)
    const wordMatchRatio = calcSpokenWordMatchRatio(userAnswer, correctAnswer)
    // 정답이거나 동일 단어 비율 50% 이상일 때만 마이크 시도 횟수로 인정
    const countsAsMicAttempt = isCorrect || wordMatchRatio >= 0.5
    const attemptNumber = webbookAttemptNumberRef.current

    await saveWebbookProgress(currentWebbookSentence, userAnswer, isCorrect, { countsAsMicAttempt })
    speakEnglish(correctAnswer)

    if (isCorrect) {
      setWebbookModalType('success')
      setWebbookModalContent({ correctAnswer, userAnswer, attemptNumber, wordMatchRatio, countsAsMicAttempt })
    } else {
      setWebbookModalType('incorrect')
      setWebbookModalContent({ correctAnswer, userAnswer, attemptNumber, wordMatchRatio, countsAsMicAttempt })
    }
    setShowWebbookModal(true)
  }

  const handleWebbookMicClick = () => {
    if (!currentWebbookSentence || showWebbookModal || isWebbookListening) return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('이 브라우저에서는 음성 인식을 지원하지 않습니다. Chrome을 사용해주세요.')
      return
    }

    if (webbookRecognitionRef.current) {
      try {
        webbookRecognitionRef.current.stop()
      } catch {
        // ignore
      }
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    webbookRecognitionRef.current = recognition

    recognition.onstart = () => setIsWebbookListening(true)

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      setIsWebbookListening(false)
      processWebbookSpeechResult(transcript)
    }

    recognition.onerror = (event) => {
      setIsWebbookListening(false)
      if (event.error !== 'aborted' && event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error)
        alert('음성 인식에 실패했습니다. 마이크 권한을 확인하고 다시 시도해주세요.')
      }
    }

    recognition.onend = () => {
      setIsWebbookListening(false)
    }

    try {
      recognition.start()
    } catch (error) {
      setIsWebbookListening(false)
      console.error('Speech recognition start error:', error)
    }
  }

  const closeWebbookModal = () => {
    setShowWebbookModal(false)
    setWebbookModalType('')
    setWebbookModalContent({ correctAnswer: '', userAnswer: '', attemptNumber: 1, wordMatchRatio: 0, countsAsMicAttempt: false })
  }

  const handleWebbookSuccessConfirm = () => {
    setShowWebbookModal(false)
    setWebbookModalType('')
    setWebbookModalContent({ correctAnswer: '', userAnswer: '', attemptNumber: 1, wordMatchRatio: 0, countsAsMicAttempt: false })
    resetWebbookWrongAttempts()

    if (currentWebbookIndex < webbookSentences.length - 1) {
      setCurrentWebbookIndex((prev) => prev + 1)
      resetWebbookWrongAttempts()
    } else {
      setWebbookModalType('unitComplete')
      setShowWebbookModal(true)
    }
  }

  const returnToWebbookSelection = () => {
    setShowWebbookModal(false)
    setWebbookModalType('')
    resetWebbookPracticeState()
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
          미닝블럭스
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
            className={`tab-button ${activeTab === 'blockwriting' ? 'active' : ''}`}
            onClick={() => setActiveTab('blockwriting')}
          >
            블럭 영작
          </button>
          <button
            className={`tab-button ${activeTab === 'webbook' ? 'active' : ''}`}
            onClick={() => setActiveTab('webbook')}
          >
            web book
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
                    onPaste={(e) => e.preventDefault()}
                    disabled={feedback !== null}
                    autoFocus
                  />
                </div>

                {/* 피드백 메시지 */}
                {feedback && (
                  <div className={`feedback ${feedback.type}`}>
                    <div>{feedback.message}</div>
                    {feedback.hint && feedback.type === 'incorrect' ? (
                      <div className="feedback-actions">
                        <div className="feedback-hint">{feedback.hint}</div>
                        <button
                          type="button"
                          className="feedback-next-button"
                          onClick={() => {
                            moveToNextWord()
                            answerInputRef.current?.focus()
                          }}
                        >
                          다음
                        </button>
                      </div>
                    ) : (
                      feedback.hint && <div className="feedback-hint">{feedback.hint}</div>
                    )}
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
                <button
                  className={`sub-tab-button ${reviewSubTab === 'blocks' ? 'active' : ''}`}
                  onClick={() => setReviewSubTab('blocks')}
                >
                  블럭 영작
                </button>
                <button
                  className={`sub-tab-button ${reviewSubTab === 'webbook' ? 'active' : ''}`}
                  onClick={() => setReviewSubTab('webbook')}
                >
                  web book
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

              {/* 블럭 영작 수행 기록 */}
              {reviewSubTab === 'blocks' && (
                <>
                  {/* 통계 영역 */}
                  {blocksProgressStats && blocksProgressStats.totalQuestions > 0 && (
                    <div className="stats-card">
                      <div className="stat-item">
                        <span className="stat-label">총 문제</span>
                        <span className="stat-value">{blocksProgressStats.totalQuestions}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">정답</span>
                        <span className="stat-value correct">{blocksProgressStats.correctCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">오답</span>
                        <span className="stat-value incorrect">{blocksProgressStats.wrongCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">정답률</span>
                        <span className={`stat-value ${blocksProgressStats.accuracy >= 80 ? 'high' : blocksProgressStats.accuracy >= 50 ? 'medium' : 'low'}`}>
                          {blocksProgressStats.accuracy}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 수행 기록 목록 */}
                  <div className="records-container">
                    {isLoadingBlocksProgress ? (
                      <div className="loading">로딩 중...</div>
                    ) : blocksProgressRecords.length === 0 ? (
                      <div className="no-records">수행 기록이 없습니다</div>
                    ) : (
                      <table className="records-table">
                        <thead>
                          <tr>
                            {isAdmin && <th>사용자</th>}
                            <th>책</th>
                            <th>과</th>
                            <th>영어문장</th>
                            <th>문장번호</th>
                            <th>오답</th>
                            <th>결과</th>
                            <th>일시</th>
                          </tr>
                        </thead>
                        <tbody>
                          {blocksProgressRecords.map(record => (
                            <tr key={record.id} className={record.is_correct ? 'correct-row' : 'incorrect-row'}>
                              {isAdmin && <td>{record.username}</td>}
                              <td>{record.book || '-'}</td>
                              <td>{record.lesson || '-'}</td>
                              <td className="question-cell">{record.english ? (record.english.length > 50 ? record.english.substring(0, 50) + '...' : record.english) : '-'}</td>
                              <td>{record.sentence_number ?? '-'}</td>
                              <td>{record.wrong_answer || '-'}</td>
                              <td>
                                <span className={`result-badge ${record.is_correct ? 'correct' : 'incorrect'}`}>
                                  {record.is_correct ? '정답' : '오답'}
                                </span>
                              </td>
                              <td>{formatDate(record.created_at)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </>
              )}

              {/* web book 수행 기록 */}
              {reviewSubTab === 'webbook' && (
                <>
                  {webbookProgressStats && webbookProgressStats.totalQuestions > 0 && (
                    <div className="stats-card">
                      <div className="stat-item">
                        <span className="stat-label">총 문제</span>
                        <span className="stat-value">{webbookProgressStats.totalQuestions}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">정답</span>
                        <span className="stat-value correct">{webbookProgressStats.correctCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">오답</span>
                        <span className="stat-value incorrect">{webbookProgressStats.wrongCount}</span>
                      </div>
                      <div className="stat-item">
                        <span className="stat-label">정답률</span>
                        <span className={`stat-value ${webbookProgressStats.accuracy >= 80 ? 'high' : webbookProgressStats.accuracy >= 50 ? 'medium' : 'low'}`}>
                          {webbookProgressStats.accuracy}%
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="records-container">
                    {isLoadingWebbookProgress ? (
                      <div className="loading">로딩 중...</div>
                    ) : webbookProgressRecords.length === 0 ? (
                      <div className="no-records">수행 기록이 없습니다</div>
                    ) : (
                      <table className="records-table">
                        <thead>
                          <tr>
                            {isAdmin && <th>사용자</th>}
                            <th>책</th>
                            <th>장</th>
                            <th>단원</th>
                            <th>한국어</th>
                            <th>영어</th>
                            <th>오답</th>
                            <th>결과</th>
                            <th>시도</th>
                            <th>일시</th>
                          </tr>
                        </thead>
                        <tbody>
                          {webbookProgressRecords.map(record => (
                            <tr key={record.id} className={record.is_correct ? 'correct-row' : 'incorrect-row'}>
                              {isAdmin && <td>{record.username}</td>}
                              <td>{record.book || '-'}</td>
                              <td>{record.section || '-'}</td>
                              <td>{record.unit || '-'}</td>
                              <td className="question-cell">{record.kor_sen ? (record.kor_sen.length > 30 ? record.kor_sen.substring(0, 30) + '...' : record.kor_sen) : '-'}</td>
                              <td className="question-cell">{record.eng_sen ? (record.eng_sen.length > 40 ? record.eng_sen.substring(0, 40) + '...' : record.eng_sen) : '-'}</td>
                              <td>{record.wrong_answer || '-'}</td>
                              <td>
                                <span className={`result-badge ${record.is_correct ? 'correct' : 'incorrect'}`}>
                                  {record.is_correct ? '정답' : '오답'}
                                </span>
                              </td>
                              <td>{record.attempt_number ?? '-'}</td>
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
                      <p style={{ whiteSpace: 'pre-line' }}>
                        {selectedGrammarInstruction?.replace(/\\n/g, '\n')}
                      </p>
                    </div>

                    {/* 단일 문항 내용을 보여주는 영역 - question 필드만 표시 */}
                    <div className="grammar-question">
                      <p className="question-number">
                        {isGrammarRetryMode 
                          ? `복습 라운드 ${grammarRound}: ${grammarRetryIndex + 1} / ${grammarRetryQuestions.length}`
                          : `문제 ${currentGrammarQuestionIndex + 1} / ${grammarQuestions.length}`}
                      </p>
                      <p className="question-text" style={{ whiteSpace: 'pre-line' }}>
                        {currentGrammarQuestion?.question?.replace(/\\n/g, '\n')}
                      </p>
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
                        onPaste={(e) => e.preventDefault()}
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

      {activeTab === 'blockwriting' && (
        <div className="blockwriting-container">
          {!isVerified ? (
            <div className="welcome-message">
              <h2>로그인이 필요합니다</h2>
              <p>"단어 맞추기" 탭에서 로그인해주세요.</p>
            </div>
          ) : (
            <>
              {/* 설정 바 영역 */}
              <div className="settings-bar blockwriting-settings">
                <div className="user-info">
                  <span className="user-name">{userName}</span>
                </div>
                
                {/* 책 드롭다운 */}
                <div className="dropdown-container">
                  <button 
                    className="select-button"
                    onClick={() => setShowBlockwritingBookDropdown(!showBlockwritingBookDropdown)}
                  >
                    {selectedBlockwritingBook || '책'}
                  </button>
                  {showBlockwritingBookDropdown && (
                    <div className="dropdown-menu">
                      {blockwritingBooks.map((item, index) => (
                        <div 
                          key={index}
                          className="dropdown-item"
                          onClick={() => handleBlockwritingBookSelect(item)}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 과 드롭다운 */}
                {selectedBlockwritingBook && blockwritingLessons.length > 0 && (
                  <div className="dropdown-container">
                    <button 
                      className="select-button"
                      onClick={() => setShowBlockwritingLessonDropdown(!showBlockwritingLessonDropdown)}
                    >
                      {selectedBlockwritingLesson || '과'}
                    </button>
                    {showBlockwritingLessonDropdown && (
                      <div className="dropdown-menu">
                        {blockwritingLessons.map((item, index) => (
                          <div 
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleBlockwritingLessonSelect(item)}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 문장번호 드롭다운 */}
                {selectedBlockwritingLesson && blockwritingSentenceNumbers.length > 0 && (
                  <div className="dropdown-container">
                    <button 
                      className="select-button"
                      onClick={() => setShowBlockwritingSentenceNumberDropdown(!showBlockwritingSentenceNumberDropdown)}
                    >
                      {selectedBlockwritingSentenceNumber || '문장번호'}
                    </button>
                    {showBlockwritingSentenceNumberDropdown && (
                      <div className="dropdown-menu">
                        <div 
                          className="dropdown-item"
                          onClick={() => handleBlockwritingStartAll()}
                        >
                          전체
                        </div>
                        {blockwritingSentenceNumbers.map((item, index) => (
                          <div 
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleBlockwritingSentenceNumberSelect(item)}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 블럭 영작 문제 영역 */}
              <div className="blockwriting-area">
                {!isBlockwritingStarted ? (
                  <div className="welcome-message">
                    <h2>블럭 영작을 시작하세요</h2>
                    <p>책 → 과 → 문장번호를 순서대로 선택해주세요.</p>
                  </div>
                ) : (
                  <>
                    {/* ⑨-1, ⑨-5: 한글 블럭 표시 - 현재 블럭은 빨간색, 완료된 블럭은 파란색 */}
                    {showKoreanBlocks && (
                      <div className="blockwriting-korean-blocks">
                        {koreanBlocks.map((block, index) => (
                          <span 
                            key={index}
                            className={`unit-block ${
                              completedBlocks.includes(index) 
                                ? 'completed' 
                                : index === currentUnitBlockIndex 
                                  ? 'current' 
                                  : ''
                            }`}
                          >
                            {block}
                            {index < koreanBlocks.length - 1 && ' / '}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* ⑨-2: 한글 전체 문장 표시 (볼드) */}
                    <div className="blockwriting-korean-full">
                      {currentBlockwritingQuestion?.korean_full}
                    </div>

                    {/* 진행 상황 */}
                    <div className="blockwriting-progress">
                      {blockwritingPhase === 'block' ? (
                        <span>단위 블럭: {currentUnitBlockIndex + 1} / {koreanBlocks.length}</span>
                      ) : (
                        <span>전체 문장 영작</span>
                      )}
                      <span className="sentence-progress"> | 문장: {currentBlockwritingIndex + 1} / {blockwritingQuestions.length}</span>
                    </div>

                    {/* 정답 입력 영역 */}
                    <div className="blockwriting-answer-container">
                      <input
                        ref={blockwritingAnswerInputRef}
                        type="text"
                        className="blockwriting-answer-input"
                        placeholder={blockwritingPhase === 'block' 
                          ? `"${koreanBlocks[currentUnitBlockIndex] || ''}" 에 해당하는 영어를 입력하세요`
                          : '전체 영어 문장을 입력하세요'
                        }
                        value={blockwritingAnswer}
                        onChange={(e) => setBlockwritingAnswer(e.target.value)}
                        onKeyPress={handleBlockwritingAnswerKeyPress}
                        disabled={showBlockwritingModal}
                        autoFocus
                      />
                    </div>

                    {/* 확인 버튼 */}
                    <div className="blockwriting-button-container">
                      <button 
                        className="check-button"
                        onClick={checkBlockwritingAnswer}
                        disabled={!blockwritingAnswer.trim() || showBlockwritingModal}
                      >
                        확인
                      </button>
                      <button 
                        className="action-button"
                        onClick={handleBlockwritingRestart}
                      >
                        다시하기
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* 블럭영작 모달 */}
              {showBlockwritingModal && (
                <div className="modal-overlay">
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    {/* 오답 모달 */}
                    {blockwritingModalType === 'incorrect' && (
                      <>
                        <h3>오답입니다</h3>
                        <div className="modal-answer">
                          <p className="label">정답:</p>
                          <p className="correct-answer">{blockwritingModalContent.correctAnswer}</p>
                        </div>
                        <p className="modal-hint">정답을 확인하고 다시 입력해주세요</p>
                        <button className="modal-button" onClick={closeBlockwritingModal}>
                          확인
                        </button>
                      </>
                    )}

                    {/* 성공 모달 */}
                    {blockwritingModalType === 'success' && (
                      <>
                        <h3 className="success-title">정답입니다!</h3>
                        <div className="modal-answer success">
                          <p className="label">완성된 문장:</p>
                          <p className="correct-answer">{blockwritingModalContent.correctAnswer}</p>
                        </div>
                        <button className="modal-button success" onClick={handleBlockwritingSuccessConfirm}>
                          확인
                        </button>
                      </>
                    )}

                    {/* 과 완료 모달 */}
                    {blockwritingModalType === 'lessonComplete' && (
                      <>
                        <h3>{selectedBlockwritingLesson ? `${selectedBlockwritingLesson}의 마지막 문장을 끝냈습니다.` : '과의 마지막 문장을 끝냈습니다.'}</h3>
                        <button className="modal-button success" onClick={returnToBlockwritingSelection}>
                          확인
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'webbook' && (
        <div className="webbook-container">
          {!isVerified ? (
            <div className="welcome-message">
              <h2>로그인이 필요합니다</h2>
              <p>"단어 맞추기" 탭에서 로그인해주세요.</p>
            </div>
          ) : (
            <>
              <div className="settings-bar webbook-settings">
                <div className="user-info">
                  <span className="user-name">{userName}</span>
                </div>

                <div className="dropdown-container">
                  <button
                    className="select-button"
                    onClick={() => setShowWebbookBookDropdown(!showWebbookBookDropdown)}
                  >
                    {selectedWebbookBook || '책'}
                  </button>
                  {showWebbookBookDropdown && (
                    <div className="dropdown-menu">
                      {webbookBooks.map((item, index) => (
                        <div
                          key={index}
                          className="dropdown-item"
                          onClick={() => handleWebbookBookSelect(item)}
                        >
                          {item}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {selectedWebbookBook && webbookSections.length > 0 && (
                  <div className="dropdown-container">
                    <button
                      className="select-button"
                      onClick={() => setShowWebbookSectionDropdown(!showWebbookSectionDropdown)}
                    >
                      {selectedWebbookSection || '장'}
                    </button>
                    {showWebbookSectionDropdown && (
                      <div className="dropdown-menu">
                        {webbookSections.map((item, index) => (
                          <div
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleWebbookSectionSelect(item)}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {selectedWebbookSection && webbookUnits.length > 0 && (
                  <div className="dropdown-container">
                    <button
                      className="select-button"
                      onClick={() => setShowWebbookUnitDropdown(!showWebbookUnitDropdown)}
                    >
                      {selectedWebbookUnit || '단원'}
                    </button>
                    {showWebbookUnitDropdown && (
                      <div className="dropdown-menu">
                        {webbookUnits.map((item, index) => (
                          <div
                            key={index}
                            className="dropdown-item"
                            onClick={() => handleWebbookUnitSelect(item)}
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="webbook-area">
                {!isWebbookStarted ? (
                  <div className="welcome-message">
                    <h2>web book을 시작하세요</h2>
                    <p>책 → 장 → 단원을 순서대로 선택해주세요.</p>
                  </div>
                ) : (
                  <>
                    <div className="webbook-card">
                      <p className="webbook-korean">{currentWebbookSentence?.kor_sen}</p>
                    </div>

                    <div className="webbook-progress">
                      문장: {currentWebbookIndex + 1} / {webbookSentences.length}
                    </div>

                    <div className="webbook-controls">
                      <button
                        type="button"
                        className="webbook-control-button speaker"
                        onClick={handleWebbookSpeak}
                        disabled={showWebbookModal}
                        title="영어 문장 듣기"
                      >
                        🔊
                      </button>
                      <button
                        type="button"
                        className={`webbook-control-button mic ${isWebbookListening ? 'listening' : ''}`}
                        onClick={handleWebbookMicClick}
                        disabled={showWebbookModal || !webbookSpeechSupported}
                        title={webbookSpeechSupported ? '영어로 따라 말하기' : '음성 인식 미지원'}
                      >
                        {isWebbookListening ? '...' : '🎤'}
                      </button>
                    </div>

                    {!webbookSpeechSupported && (
                      <p className="webbook-hint">음성 인식은 Chrome 브라우저에서 사용할 수 있습니다.</p>
                    )}
                    {isWebbookListening && (
                      <p className="webbook-hint listening">듣고 있습니다. 영어로 말해주세요...</p>
                    )}
                  </>
                )}
              </div>

              {showWebbookModal && (
                <div className="modal-overlay">
                  <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                    {webbookModalType === 'incorrect' && (
                      <>
                        <h3>오답입니다</h3>
                        <div className="modal-answer">
                          <p className="label">내가 말한 내용:</p>
                          <p className="incorrect-answer">{webbookModalContent.userAnswer || '(인식되지 않음)'}</p>
                          <p className="label">정답:</p>
                          <p className="correct-answer">{webbookModalContent.correctAnswer}</p>
                        </div>
                        <p className="modal-hint">스피커로 다시 듣고 마이크로 다시 시도해주세요</p>
                        <div className="webbook-incorrect-actions">
                          <div className="webbook-retry-row">
                            <button className="modal-button" onClick={closeWebbookModal}>
                              다시 시도
                            </button>
                            {(webbookModalContent.wordMatchRatio ?? 0) < 0.5 ? (
                              <span className="webbook-match-indicator low" title="정답과 동일 단어 비율 50% 미만" aria-label="동일 단어 비율 부족">
                                X
                              </span>
                            ) : (
                              <span className="webbook-match-indicator attempts" title="마이크 시도 횟수">
                                {webbookModalContent.attemptNumber}회
                              </span>
                            )}
                          </div>
                          {webbookModalContent.countsAsMicAttempt && webbookModalContent.attemptNumber >= 10 && (
                            <button
                              className="modal-button webbook-skip-button"
                              onClick={handleWebbookSuccessConfirm}
                            >
                              다음 문장으로
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {webbookModalType === 'success' && (
                      <>
                        <h3 className="success-title">정답입니다!</h3>
                        <div className="modal-answer success">
                          <p className="label">완성된 문장:</p>
                          <p className="correct-answer">{webbookModalContent.correctAnswer}</p>
                        </div>
                        <button className="modal-button success" onClick={handleWebbookSuccessConfirm}>
                          다음
                        </button>
                      </>
                    )}

                    {webbookModalType === 'unitComplete' && (
                      <>
                        <h3>{selectedWebbookUnit ? `${selectedWebbookUnit}의 마지막 문장을 끝냈습니다.` : '단원의 마지막 문장을 끝냈습니다.'}</h3>
                        <button className="modal-button success" onClick={returnToWebbookSelection}>
                          확인
                        </button>
                      </>
                    )}
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
              className={`sub-tab-button ${adminSubTab === 'blockwriting' ? 'active' : ''}`}
              onClick={() => setAdminSubTab('blockwriting')}
            >
              블럭영작 관리
            </button>
            <button
              className={`sub-tab-button ${adminSubTab === 'webbook' ? 'active' : ''}`}
              onClick={() => setAdminSubTab('webbook')}
            >
              webbook 관리
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

          {adminSubTab === 'blockwriting' && (
            <div className="admin-blockwriting">
              {/* 엑셀 파일 업로드 */}
              <div className="upload-section">
                <h3>엑셀 파일로 블럭영작 문제 추가</h3>
                <div className="upload-info">
                  <p>엑셀 파일 형식: book, lesson, sentence_number, english, korean_blocks, korean_full 컬럼 필요</p>
                </div>
                <div className="upload-controls">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={(e) => setBlockwritingUploadFile(e.target.files[0])}
                    className="file-input"
                  />
                  <button
                    className="upload-button"
                    onClick={handleBlockwritingFileUpload}
                    disabled={!blockwritingUploadFile || isBlockwritingUploading}
                  >
                    {isBlockwritingUploading ? '업로드 중...' : '업로드'}
                  </button>
                  {adminBlockwriting.length > 0 && (
                    <button
                      className="delete-all-button"
                      onClick={handleDeleteAllBlockwriting}
                    >
                      전체 삭제
                    </button>
                  )}
                </div>
                {blockwritingUploadResult && (
                  <div className={`upload-result ${blockwritingUploadResult.success ? 'success' : 'error'}`}>
                    {blockwritingUploadResult.message || blockwritingUploadResult.error}
                  </div>
                )}
              </div>

              {/* 블럭영작 문제 목록 */}
              <div className="blockwriting-list">
                <h3>블럭영작 문제 목록 ({adminBlockwriting.length}개)</h3>
                {adminBlockwriting.length === 0 ? (
                  <div className="empty-message">등록된 블럭영작 문제가 없습니다.</div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>교재</th>
                        <th>레슨</th>
                        <th>번호</th>
                        <th>영어</th>
                        <th>한글 블럭</th>
                        <th>한글 전체</th>
                        <th>관리</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminBlockwriting.map(item => (
                        <tr key={item.id}>
                          <td>{item.id}</td>
                          <td>{item.book}</td>
                          <td>{item.lesson}</td>
                          <td>{item.sentence_number}</td>
                          <td className="english-cell">{item.english}</td>
                          <td className="korean-blocks-cell">{item.korean_blocks}</td>
                          <td className="korean-full-cell">{item.korean_full}</td>
                          <td>
                            <button
                              className="delete-button"
                              onClick={() => handleDeleteBlockwriting(item.id)}
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

          {adminSubTab === 'webbook' && (
            <div className="admin-books">
              <div className="upload-section">
                <h3>엑셀 파일로 webbook 문장 추가</h3>
                <div className="upload-info">
                  <p>엑셀 파일 형식: 첫 번째 행에 컬럼명이 있어야 합니다.</p>
                  <p><strong>필수 컬럼:</strong> book, section, unit, kor_sen, eng_sen</p>
                  <p>각 행에서 <strong>book</strong>, <strong>kor_sen</strong>, <strong>eng_sen</strong>은 반드시 값이 있어야 합니다. section, unit은 비워 둘 수 있습니다.</p>
                </div>
                <div className="upload-form">
                  <input
                    id="webbook-excel-file-input"
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={(e) => setWebbookUploadFile(e.target.files[0])}
                    className="file-input"
                  />
                  <button
                    className="upload-button"
                    onClick={handleWebbookFileUpload}
                    disabled={isWebbookUploading || !webbookUploadFile}
                  >
                    {isWebbookUploading ? '업로드 중...' : '업로드'}
                  </button>
                </div>
                {webbookUploadResult && (
                  <div className={`upload-result ${webbookUploadResult.success ? 'success' : 'error'}`}>
                    {webbookUploadResult.success ? (
                      <>
                        <p>{webbookUploadResult.message}</p>
                        {webbookUploadResult.skippedCount > 0 && (
                          <p>건너뛴 항목: {webbookUploadResult.skippedCount}개</p>
                        )}
                        {webbookUploadResult.errors && webbookUploadResult.errors.length > 0 && (
                          <div className="upload-errors">
                            <p>오류 목록:</p>
                            <ul>
                              {webbookUploadResult.errors.map((err, idx) => (
                                <li key={idx}>{err}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <p>{webbookUploadResult.error}</p>
                        {webbookUploadResult.hint && <p className="hint">{webbookUploadResult.hint}</p>}
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="books-list">
                <h3>webbook 목록 ({adminWebbooks.length}개)</h3>
                {adminWebbooks.length === 0 ? (
                  <div className="no-records">등록된 webbook 데이터가 없습니다</div>
                ) : (
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>교재(book)</th>
                        <th>섹션 수</th>
                        <th>단원 수</th>
                        <th>문장 수</th>
                        <th>작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminWebbooks.map((item, index) => (
                        <tr key={index}>
                          <td>{item.book}</td>
                          <td>{item.section_count}</td>
                          <td>{item.unit_count}</td>
                          <td>{item.sentence_count}</td>
                          <td>
                            <button
                              className="delete-btn"
                              onClick={() => handleDeleteWebbook(item.book)}
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
