import React, { useState, FormEvent } from 'react';
import { auth, db } from '../firebaseConfig';
import firebase from 'firebase/compat/app';
import AppIcon from './AppIcon';
import { UserProfile, UserRole, Requester, MasterData } from '../types';

interface LoginPageProps {
    addToast: (toast: { message: string, type: 'success' | 'error' | 'info' }) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ addToast }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [department, setDepartment] = useState('');
    const [contact, setContact] = useState('');
    const [isLogin, setIsLogin] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    
    const handleSubmit = async (e: FormEvent, targetCenter?: 'jig' | 'quality' | 'order' | 'notification') => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        if (targetCenter) {
            sessionStorage.setItem('targetCenter', targetCenter);
        } else {
            sessionStorage.removeItem('targetCenter');
        }

        try {
            if (isLogin) {
                await auth.signInWithEmailAndPassword(email, password);
                addToast({ message: '로그인 성공!', type: 'success' });
            } else {
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                const user = userCredential.user;

                if (user) {
                    const usersQuery = await db.collection('users').limit(1).get();
                    const role: UserRole = usersQuery.empty ? 'Admin' : 'Member';

                    const profileUpdatePromise = user.updateProfile({ displayName: displayName });

                    const batch = db.batch();

                    const userProfileRef = db.collection('users').doc(user.uid);
                    batch.set(userProfileRef, {
                        uid: user.uid,
                        email: user.email!,
                        role: role,
                        displayName: displayName,
                    });

                    const newRequester: Requester = {
                        name: displayName,
                        department: department,
                        contact: contact,
                        email: user.email!
                    };
                    const masterDataRef = db.collection('master-data').doc('singleton');
                    batch.set(masterDataRef, {
                        requesters: firebase.firestore.FieldValue.arrayUnion(newRequester)
                    }, { merge: true });
                    
                    await Promise.all([profileUpdatePromise, batch.commit()]);
                }
                addToast({ message: '회원가입 성공! 자동으로 로그인됩니다.', type: 'success' });
            }
        } catch (error: any) {
            let errorMessage = '인증 중 오류가 발생했습니다.';
            switch(error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-credential':
                    errorMessage = '이메일 또는 비밀번호가 올바르지 않습니다.';
                    break;
                case 'auth/email-already-in-use':
                    errorMessage = '이미 사용 중인 이메일입니다.';
                    break;
                case 'auth/weak-password':
                    errorMessage = '비밀번호는 6자리 이상이어야 합니다.';
                    break;
                case 'auth/invalid-email':
                    errorMessage = '유효하지 않은 이메일 형식입니다.';
                    break;
                default:
                    console.error("Authentication error:", error);
                    break;
            }
            setError(errorMessage);
            setTimeout(() => setError(null), 5000);
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email.trim()) {
            addToast({ message: '비밀번호를 재설정할 이메일 주소를 입력해주세요.', type: 'error' });
            return;
        }
        setIsLoading(true);
        try {
            await auth.sendPasswordResetEmail(email);
            addToast({ message: `${email}으로 비밀번호 재설정 링크를 보냈습니다. 이메일을 확인해주세요.`, type: 'success' });
        } catch (error: any) {
            let errorMessage = '비밀번호 재설정 이메일 발송에 실패했습니다.';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
                errorMessage = '해당 이메일로 가입된 계정이 없거나, 유효하지 않은 이메일 형식입니다.';
            }
            addToast({ message: errorMessage, type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFindId = () => {
        addToast({
            message: '아이디(이메일)는 가입 시 사용하신 이메일 주소입니다. 자주 사용하시는 이메일로 로그인을 시도해보세요.',
            type: 'info'
        });
    };
    
    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-900 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full mx-auto bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 space-y-6">
                <div className="flex flex-col items-center space-y-4">
                    <AppIcon className="w-20 h-20" />
                    <h1 className="text-3xl font-bold text-gray-800 dark:text-white text-center">화성공장 통합관리시스템</h1>
                    <p className="text-slate-600 dark:text-slate-400">
                        {isLogin ? '로그인하여 관리 시스템을 시작하세요.' : '새 계정을 생성하세요.'}
                    </p>
                </div>

                <form onSubmit={(e) => handleSubmit(e)} className="space-y-6">
                    {!isLogin && (
                        <>
                            <div>
                                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 dark:text-slate-300">요청자명</label>
                                <input id="displayName" name="displayName" type="text" required value={displayName} onChange={e => setDisplayName(e.target.value)}
                                    placeholder="이름+직급을 넣으세요. 예) 홍길동직장"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700" lang="ko" />
                            </div>
                            <div>
                                <label htmlFor="department" className="block text-sm font-medium text-gray-700 dark:text-slate-300">부서</label>
                                <input id="department" name="department" type="text" required value={department} onChange={e => setDepartment(e.target.value)}
                                    placeholder="근무처+부서명. 예)군포공장 샘플팀"
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700" list="departments-list" lang="ko" autoComplete="off" />
                                <datalist id="departments-list">
                                    <option value="화성공장 증착팀" />
                                </datalist>
                            </div>
                            <div>
                                <label htmlFor="contact" className="block text-sm font-medium text-gray-700 dark:text-slate-300">연락처</label>
                                <input id="contact" name="contact" type="tel" required value={contact} onChange={e => setContact(e.target.value)}
                                    placeholder="010-1004-1004 입력방식 확인."
                                    className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700" lang="ko" />
                            </div>
                        </>
                    )}
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                            이메일 주소
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            autoComplete="email"
                            required
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder={!isLogin ? "실제 사용하고 있는 이메일 주소를 입력." : "이메일을 입력하세요"}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700"
                            lang="ko"
                        />
                    </div>
                    <div>
                        <label htmlFor="password"className="block text-sm font-medium text-gray-700 dark:text-slate-300">
                            비밀번호
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            autoComplete={isLogin ? "current-password" : "new-password"}
                            required
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder={!isLogin ? "6자리 이상 입력해야 합니다." : ""}
                            className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm bg-white dark:bg-slate-700"
                            lang="ko"
                        />
                    </div>
                    
                    {error && (
                        <div className="my-2 text-center p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm animate-shake">
                            {error}
                        </div>
                    )}

                    {isLogin && (
                        <div className="flex items-center justify-end text-sm space-x-4">
                            <a href="#" onClick={(e) => { e.preventDefault(); handleFindId(); }} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                                아이디 찾기
                            </a>
                            <a href="#" onClick={(e) => { e.preventDefault(); handlePasswordReset(); }} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300">
                                비밀번호 찾기
                            </a>
                        </div>
                    )}
                    
                    {isLogin ? (
                        <div className="space-y-4 pt-2">
                             <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? '로그인 중...' : '로그인'}
                            </button>
                        </div>
                    ) : (
                         <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                             {isLoading ? (
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : '회원가입'}
                        </button>
                    )}
                </form>
                
                <p className="text-center text-sm text-slate-500 dark:text-slate-400">
                    {isLogin ? '계정이 없으신가요?' : '이미 계정이 있으신가요?'}
                    <button onClick={() => setIsLogin(!isLogin)} className="font-medium text-primary-600 hover:text-primary-500 dark:text-primary-400 dark:hover:text-primary-300 ml-2">
                        {isLogin ? '회원가입' : '로그인'}
                    </button>
                </p>
            </div>
             <style>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
                .animate-shake {
                    animation: shake 0.5s ease-in-out;
                }
            `}</style>
        </div>
    );
};

export default LoginPage;