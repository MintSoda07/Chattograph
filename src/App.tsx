import React, { useEffect, useState } from 'react';
import {
  auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  browserLocalPersistence,
  setPersistence,
} from './firebase';
import type { FirebaseUser } from './firebase';
import './App.css';
import { useNavigate } from 'react-router-dom';  // 추가

const App = () => {
  const [user, setUser] = useState<FirebaseUser>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'signup'>('login');

  const navigate = useNavigate();  // 네비게이트 훅

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleAuth = async () => {
    try {
      await setPersistence(auth, browserLocalPersistence);
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (error) {
      console.error(`${mode === 'login' ? '로그인' : '회원가입'} 실패:`, error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('로그아웃 실패:', error);
    }
  };

  // chatting.tsx로 이동 함수
  const goToChatting = () => {
    navigate('/chatting');
  };

  return (
    <div className="relative min-h-screen w-full bg-black overflow-hidden text-green-400 font-mono">
      {/* 배경 네온 그리드 + 스캔 라인 */}
      <div className="absolute inset-0 bg-grid pointer-events-none z-0" />
      <div className="absolute top-0 left-0 w-full h-full animate-scan bg-gradient-to-b from-transparent via-green-400/10 to-transparent z-10" />

      {/* 본문 */}
      <div className="relative z-20 flex flex-col justify-center items-center w-screen h-screen px-6">
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-extrabold mb-10 tracking-widest animate-flicker animate-typewriter text-center w-full">
          Chattograph
        </h1>

        {user ? (
          <>
            <div className="mb-8 text-center animate-glow">
              <p className="mb-2 text-xl animate-flicker">
                안녕하세요, <span className="text-green-300">{user.email}</span>님
              </p>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleLogout}
                className="px-8 py-3 bg-green-700 hover:bg-green-600 rounded-lg shadow-glow animate-glow transition duration-300"
              >
                로그아웃
              </button>
              <button
                onClick={goToChatting}
                className="px-8 py-3 bg-green-700 hover:bg-green-600 rounded-lg shadow-glow animate-glow transition duration-300"
              >
                채팅 시작
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="w-full max-w-md space-y-4 mb-6">
              <input
                type="email"
                placeholder="이메일"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded-md input-hacker"
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded-md input-hacker"
              />
              <button
                onClick={handleAuth}
                className="w-full px-8 py-3 bg-green-700 hover:bg-green-600 rounded-lg shadow-glow animate-glow transition duration-300"
              >
                {mode === 'login' ? '로그인' : '회원가입'}
              </button>
              <p className="text-center text-sm text-green-500 animate-flicker">
                {mode === 'login' ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}{' '}
                <button
                  onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                  className="underline text-green-300 hover:text-green-200"
                >
                  {mode === 'login' ? '회원가입' : '로그인'}
                </button>
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default App;
