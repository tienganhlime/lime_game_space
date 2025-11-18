import React, { useState, useEffect } from 'react';
import { Play, Users, Award, Clock, Send, Trophy, Zap, Star } from 'lucide-react';
const GROQ_API_KEY = process.env.REACT_APP_GROQ_API_KEY;
// Mock Firebase (thay bằng Firebase thật sau)
const mockFirebase = {
  games: {},
  listeners: {},
  createGame: function(pin) {
    this.games[pin] = {
      pin,
      currentQuestion: null,
      students: {},
      questionIndex: 0,
      isActive: false
    };
    return this.games[pin];
  },
  publishQuestion: function(pin, question) {
    if (this.games[pin]) {
      this.games[pin].currentQuestion = question;
      this.games[pin].questionIndex++;
      this.notifyListeners(pin);
    }
  },
  joinGame: function(pin, studentName) {
    if (this.games[pin]) {
      this.games[pin].students[studentName] = {
        name: studentName,
        answers: [],
        totalScore: 0
      };
      this.notifyListeners(pin);
      return true;
    }
    return false;
  },
  submitAnswer: function(pin, studentName, answer, score) {
    if (this.games[pin]?.students[studentName]) {
      this.games[pin].students[studentName].answers.push({
        text: answer,
        score,
        questionIndex: this.games[pin].questionIndex
      });
      this.games[pin].students[studentName].totalScore += score;
      this.notifyListeners(pin);
    }
  },
  listen: function(pin, callback) {
    if (!this.listeners[pin]) this.listeners[pin] = [];
    this.listeners[pin].push(callback);
  },
  notifyListeners: function(pin) {
    if (this.listeners[pin]) {
      this.listeners[pin].forEach(cb => cb(this.games[pin]));
    }
  }
};

const gradeWithGroqAPI = async (question, teacherPrompt, studentAnswer) => {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `Bạn là AI chấm bài cho trung tâm tiếng Anh LIME.

Nhiệm vụ: Chấm bài của học sinh theo câu hỏi và tiêu chí giáo viên đưa ra.

QUAN TRỌNG: Bạn PHẢI trả về ĐÚNG format JSON sau, KHÔNG thêm text nào khác:

{
  "score": [số điểm],
  "feedback": "[Nhận xét ngắn gọn, động viên]"
}

Lưu ý:
- Feedback vui vẻ, động viên (đây là warm-up)
- Luôn bắt đầu bằng lời khen
- Dùng emoji để tạo năng lượng tích cực`
          },
          {
            role: 'user',
            content: `📋 CÂU HỎI:
${question}

🤖 TIÊU CHÍ CHẤM CỦA GIÁO VIÊN:
${teacherPrompt}

✍️ CÂU TRẢ LỜI CỦA HỌC SINH:
"${studentAnswer}"

Hãy chấm điểm và cho feedback theo format JSON.`
          }
        ],
        temperature: 0.7,
        max_tokens: 300,
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API Error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON Parse Error:', content);
      return {
        score: 0,
        feedback: '❌ Lỗi định dạng. Vui lòng thử lại!'
      };
    }
    
    return {
      score: result.score || 0,
      feedback: result.feedback || 'Không có phản hồi'
    };
    
  } catch (error) {
    console.error('Groq API Error:', error);
    return {
      score: 0,
      feedback: '⚠️ Lỗi kết nối AI. Vui lòng thử lại!'
    };
  }
};

function App() {
  const [mode, setMode] = useState(null);
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {!mode ? (
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-green-400">
            <div className="text-center mb-8">
              <div className="w-32 h-32 mx-auto mb-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-5xl font-bold text-white">LIME</span>
              </div>
              <h1 className="text-3xl font-bold text-green-700 mb-2">
                Trung Tâm Tiếng Anh LIME
              </h1>
              <p className="text-green-600 text-lg mb-2">FCE Writing Game</p>
              <p className="text-green-600">📞 Hotline: 0976222792</p>
              <div className="mt-4 h-1 w-32 bg-green-500 mx-auto rounded-full"></div>
            </div>
            
            <div className="space-y-4">
              <button
                onClick={() => setMode('teacher')}
                className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Users size={24} />
                Teacher Panel
              </button>
              <button
                onClick={() => setMode('student')}
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-4 rounded-xl font-bold hover:from-teal-600 hover:to-cyan-600 transition shadow-lg flex items-center justify-center gap-2"
              >
                <Play size={24} />
                Join Game
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-yellow-50 border-2 border-yellow-300 rounded-xl">
              <p className="text-yellow-800 text-sm">
                <strong>⚠️ Lưu ý:</strong> Hệ thống sẽ ghi nhận số lần paste và chỉnh sửa. Làm bài trung thực để có kết quả tốt nhất!
              </p>
            </div>
          </div>
        </div>
      ) : mode === 'teacher' ? (
        <TeacherPanel onBack={() => setMode(null)} />
      ) : (
        <StudentPanel onBack={() => setMode(null)} />
      )}
    </div>
  );
}

function TeacherPanel({ onBack }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('setup');
  const [pin, setPin] = useState('');
  const [question, setQuestion] = useState('');
  const [criteria, setCriteria] = useState(`Chấm điểm từ 0-3:
- 0 điểm: Sai hoàn toàn
- 1 điểm: Synonym đơn giản đúng
- 2 điểm: Collocation tốt/academic word
- 3 điểm: Paraphrase xuất sắc + formal`);
  const [timeLimit, setTimeLimit] = useState(5);
  const [testAnswers, setTestAnswers] = useState([]);
  const [testInput, setTestInput] = useState('');
  const [isTestingAI, setIsTestingAI] = useState(false);
  const [gameData, setGameData] = useState(null);
  const [templates] = useState([
    {
      name: 'Synonym Hunt',
      question: 'Tìm synonym hoặc paraphrase cho: "have effect on teenagers"',
      criteria: `Chấm điểm từ 0-3:
- 0 điểm: Sai hoàn toàn
- 1 điểm: Synonym đơn giản đúng
- 2 điểm: Collocation tốt/academic word
- 3 điểm: Paraphrase xuất sắc + formal`
    }
  ]);

  const generatePIN = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };

  const handleTestAI = async () => {
    if (!testInput.trim()) return;
    
    setIsTestingAI(true);
    const result = await gradeWithGroqAPI(question, criteria, testInput);
    
    setTestAnswers([...testAnswers, {
      input: testInput,
      score: result.score,
      feedback: result.feedback
    }]);
    
    setTestInput('');
    setIsTestingAI(false);
  };

  const handlePublishGame = () => {
    const newPin = generatePIN();
    setPin(newPin);
    mockFirebase.createGame(newPin);
    mockFirebase.listen(newPin, (data) => {
      setGameData(data);
    });
    setStep('live');
    publishQuestion();
  };

  const publishQuestion = () => {
    mockFirebase.publishQuestion(pin, {
      text: question,
      criteria,
      timeLimit
    });
  };

  const handleNextQuestion = () => {
    setQuestion('');
    setCriteria('');
    setStep('setup');
  };

  const loadTemplate = (template) => {
    setQuestion(template.question);
    setCriteria(template.criteria);
  };
   const handlePasswordSubmit = (e) => {
    e.preventDefault();
    const correctPassword = 'lime2024'; // Đổi password tại đây
    
    if (password === correctPassword) {
      setIsAuthenticated(true);
    } else {
      alert('❌ Sai mật khẩu!');
      setPassword('');
    }
  };
if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-md mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-green-300">
          <button onClick={onBack} className="mb-4 text-green-700 hover:text-green-900 font-semibold">
            ← Back
          </button>
          
          <div className="text-center mb-6">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">🔒</span>
            </div>
            <h2 className="text-2xl font-bold text-green-700">Teacher Login</h2>
            <p className="text-green-600">Enter password to access</p>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Password:</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border-2 border-green-300 rounded-lg p-3 focus:border-green-500 focus:outline-none text-lg"
                placeholder="Enter password"
                autoFocus
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
            >
              🔓 Login
            </button>
          </form>
        </div>
      </div>
    );
  }
  if (step === 'setup') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={onBack} className="mb-4 text-green-700 hover:text-green-900 font-semibold">
          ← Back
        </button>
        
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-green-300">
          <div className="flex items-center gap-4 mb-6 pb-6 border-b-2 border-green-200">
            <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-2xl font-bold text-white">LIME</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-green-700">📝 Tạo câu hỏi mới</h2>
              <p className="text-green-600 text-sm">Trung Tâm Tiếng Anh LIME - FCE Writing</p>
            </div>
          </div>
          
          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-700">📚 Quick Templates:</label>
            <div className="flex gap-2 flex-wrap">
              {templates.map((t, i) => (
                <button
                  key={i}
                  onClick={() => loadTemplate(t)}
                  className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition text-sm font-semibold border-2 border-green-300"
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-700">📋 Câu hỏi cho học sinh:</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="w-full border-2 border-green-300 rounded-lg p-4 focus:border-green-500 focus:outline-none text-lg"
              rows={3}
              placeholder='VD: Tìm synonym cho: "have effect on"'
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-700">🤖 Prompt cho AI (tiêu chí chấm):</label>
            <textarea
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              className="w-full border-2 border-green-300 rounded-lg p-4 focus:border-green-500 focus:outline-none font-mono text-sm"
              rows={6}
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-700">⏱️ Thời gian (phút):</label>
            <input
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value))}
              className="border-2 border-green-300 rounded-lg p-3 w-24 focus:border-green-500 focus:outline-none text-lg font-semibold"
              min="1"
              max="10"
            />
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => setStep('test')}
              className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 text-white py-4 rounded-xl font-bold hover:from-yellow-600 hover:to-orange-600 transition shadow-lg"
              disabled={!question || !criteria}
            >
              🧪 Test AI trước
            </button>
            <button
              onClick={handlePublishGame}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
              disabled={!question || !criteria}
            >
              🚀 Publish luôn
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'test') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => setStep('setup')} className="mb-4 text-green-700 hover:text-green-900 font-semibold">
          ← Back to Edit
        </button>
        
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-yellow-300">
          <h2 className="text-2xl font-bold mb-6 text-yellow-700">🧪 Test Zone</h2>
          
          <div className="mb-6 p-4 bg-yellow-50 rounded-xl border-2 border-yellow-200">
            <p className="font-bold mb-2 text-gray-700">Câu hỏi:</p>
            <p className="text-gray-800 text-lg">{question}</p>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-bold mb-2 text-gray-700">Nhập câu trả lời test:</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleTestAI()}
                className="flex-1 border-2 border-yellow-300 rounded-lg p-3 focus:border-yellow-500 focus:outline-none text-lg"
                placeholder="VD: influence young people"
                disabled={isTestingAI}
              />
              <button
                onClick={handleTestAI}
                disabled={isTestingAI || !testInput.trim()}
                className="bg-yellow-500 text-white px-8 rounded-lg hover:bg-yellow-600 transition disabled:bg-gray-300 font-bold"
              >
                {isTestingAI ? '⏳' : 'Test'}
              </button>
            </div>
          </div>

          {testAnswers.length > 0 && (
            <div className="mb-6">
              <p className="font-bold mb-3 text-gray-700">📊 Test Results:</p>
              <div className="space-y-3">
                {testAnswers.map((test, i) => (
                  <div key={i} className="border-2 border-gray-300 rounded-xl p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono text-sm">{test.input}</span>
                      <span className={`font-bold text-xl ${
                        test.score === 3 ? 'text-green-600' :
                        test.score === 2 ? 'text-blue-600' :
                        test.score === 1 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {test.score} điểm
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">{test.feedback}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            <button
              onClick={() => setStep('setup')}
              className="flex-1 bg-gray-500 text-white py-4 rounded-xl font-bold hover:bg-gray-600 transition shadow-lg"
            >
              ← Sửa Prompt
            </button>
            <button
              onClick={handlePublishGame}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition shadow-lg"
              disabled={testAnswers.length === 0}
            >
              ✅ OK, Publish Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'live') {
    const students = gameData?.students ? Object.values(gameData.students) : [];
    const sortedStudents = [...students].sort((a, b) => b.totalScore - a.totalScore);

    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-green-300">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-white">LIME</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-green-700">🎮 Game Live</h2>
                <p className="text-green-600 text-sm">FCE Writing Game</p>
              </div>
            </div>
            <div className="text-4xl font-bold text-white bg-gradient-to-r from-green-500 to-emerald-500 px-8 py-4 rounded-2xl shadow-lg">
              PIN: {pin}
            </div>
          </div>

          <div className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl border-2 border-blue-300">
            <p className="font-bold mb-2 text-blue-800">📋 Current Question:</p>
            <p className="text-xl text-gray-800">{question}</p>
            <p className="text-sm text-gray-600 mt-2">⏱️ {timeLimit} minutes</p>
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-gray-800">👥 Students ({students.length})</h3>
            </div>
            
            {sortedStudents.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-2xl">
                <Clock size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500 text-lg">Waiting for students to join...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedStudents.map((student, i) => (
                  <div key={student.name} className={`flex items-center justify-between p-5 rounded-2xl border-2 ${
                    i === 0 ? 'bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-400' :
                    i === 1 ? 'bg-gradient-to-r from-gray-100 to-gray-50 border-gray-400' :
                    i === 2 ? 'bg-gradient-to-r from-orange-100 to-orange-50 border-orange-400' :
                    'bg-gray-50 border-gray-300'
                  }`}>
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">
                        {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤'}
                      </span>
                      <div>
                        <span className="font-bold text-lg">{student.name}</span>
                        <p className="text-sm text-gray-600">
                          {student.answers.filter(a => a.questionIndex === gameData.questionIndex).length} answers submitted
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-2xl font-bold text-green-700">
                        {student.totalScore}
                      </span>
                      <p className="text-sm text-gray-600">points</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button
              onClick={handleNextQuestion}
              className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white py-5 rounded-xl font-bold hover:from-green-700 hover:to-emerald-700 transition shadow-lg text-lg"
            >
              ⏭️ Next Question
            </button>
            <button
              onClick={onBack}
              className="flex-1 bg-gradient-to-r from-red-600 to-pink-600 text-white py-5 rounded-xl font-bold hover:from-red-700 hover:to-pink-700 transition shadow-lg text-lg"
            >
              🏁 End Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function StudentPanel({ onBack }) {
  const [step, setStep] = useState('join');
  const [pin, setPin] = useState('');
  const [name, setName] = useState('');
  const [gameData, setGameData] = useState(null);
  const [answer, setAnswer] = useState('');
  const [myAnswers, setMyAnswers] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleJoinGame = () => {
    const success = mockFirebase.joinGame(pin, name);
    if (success) {
      mockFirebase.listen(pin, (data) => {
        setGameData(data);
      });
      setStep('playing');
    } else {
      alert('Game not found!');
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    const result = await gradeWithGroqAPI(
  gameData.currentQuestion.text,
  gameData.currentQuestion.criteria,
  answer
);
    
    mockFirebase.submitAnswer(pin, name, answer, result.score);
    
    setMyAnswers([...myAnswers, {
      text: answer,
      score: result.score,
      feedback: result.feedback
    }]);
    
    setAnswer('');
    setIsSubmitting(false);
  };

  const myTotalScore = gameData?.students?.[name]?.totalScore || 0;
  const questionNumber = gameData?.questionIndex || 1;

  if (step === 'join') {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full border-4 border-teal-300">
          <button onClick={onBack} className="mb-4 text-teal-700 hover:text-teal-900 font-semibold">
            ← Back
          </button>
          
          <div className="text-center mb-6">
            <div className="w-24 h-24 mx-auto mb-4 bg-gradient-to-br from-teal-400 to-cyan-500 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-white">LIME</span>
            </div>
            <h2 className="text-2xl font-bold text-teal-700">🎮 Join Game</h2>
            <p className="text-teal-600">Trung Tâm Tiếng Anh LIME</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Your Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border-2 border-teal-300 rounded-lg p-3 focus:border-teal-500 focus:outline-none text-lg"
                placeholder="Enter your name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-bold mb-2 text-gray-700">Game PIN:</label>
              <input
                type="text"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full border-2 border-teal-300 rounded-lg p-4 focus:border-teal-500 focus:outline-none text-3xl text-center font-bold"
                placeholder="1234"
                maxLength={4}
              />
            </div>
            
            <button
              onClick={handleJoinGame}
              disabled={!name || !pin}
              className="w-full bg-gradient-to-r from-teal-500 to-cyan-500 text-white py-4 rounded-xl font-bold hover:from-teal-600 hover:to-cyan-600 transition shadow-lg disabled:from-gray-300 disabled:to-gray-400"
            >
              Join Game
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameData?.currentQuestion) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-3xl shadow-2xl p-8 text-center border-4 border-green-300">
          <div className="animate-pulse">
            <Clock size={64} className="mx-auto mb-4 text-green-600" />
            <p className="text-xl font-bold text-gray-700">Waiting for teacher to start...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-green-300">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h2 className="text-3xl font-bold text-green-700">Hello, {name}! 👋</h2>
            <p className="text-green-600">Question {questionNumber} | Trung Tâm Tiếng Anh LIME</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Your Score</p>
            <div className="text-4xl font-bold text-green-700 bg-gradient-to-r from-green-100 to-emerald-100 px-6 py-3 rounded-2xl border-2 border-green-400">
              {myTotalScore}
            </div>
          </div>
        </div>

        <div className="mb-6 p-6 bg-gradient-to-r from-green-50 to-teal-50 rounded-2xl border-2 border-green-300">
          <p className="text-lg font-bold mb-2 text-green-800">🎯 Question:</p>
          <p className="text-xl text-gray-800">{gameData.currentQuestion.text}</p>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-bold mb-2 text-gray-700">📝 Your Answer:</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
              className="flex-1 border-2 border-green-300 rounded-lg p-4 focus:border-green-500 focus:outline-none text-lg"
              placeholder="Type your answer..."
              disabled={isSubmitting}
            />
            <button
              onClick={handleSubmitAnswer}
              disabled={isSubmitting || !answer.trim()}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 rounded-lg hover:from-green-700 hover:to-emerald-700 transition disabled:from-gray-300 disabled:to-gray-400 flex items-center gap-2 font-bold shadow-lg"
            >
              {isSubmitting ? '⏳' : <><Send size={20} /> Submit</>}
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-2">✅ Submitted: {myAnswers.length} answers</p>
        </div>

        {myAnswers.length > 0 && (
          <div>
            <p className="font-bold mb-3 text-gray-700">📊 Your Submissions:</p>
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {myAnswers.map((ans, i) => (
                <div key={i} className={`p-4 rounded-xl border-2 ${
                  ans.score === 3 ? 'bg-green-50 border-green-400' :
                  ans.score === 2 ? 'bg-blue-50 border-blue-400' :
                  ans.score === 1 ? 'bg-yellow-50 border-yellow-400' : 'bg-red-50 border-red-400'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-sm font-semibold">{ans.text}</span>
                    <span className="text-3xl">
                      {ans.score === 3 ? '🌟' : ans.score === 2 ? '✨' : ans.score === 1 ? '⭐' : '❌'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">{ans.feedback}</p>
                    <span className="font-bold text-xl text-green-700">+{ans.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;