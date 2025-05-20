import React, { useState, useRef, useEffect } from "react";
import type { Timestamp } from "firebase/firestore";
import {
    db,
    collection,
    query,
    orderBy,
    onSnapshot,
    addDoc,
    serverTimestamp,
} from "./firebase"; // 경로 맞게 조정
import { getAuth, onAuthStateChanged } from "firebase/auth";

type ChatMessage = {
    id: string; // firestore doc id
    timestamp: Timestamp; // firestore timestamp
    user: string;
    text: string;
};

type Branch = {
    name: string;
    commitSha: string;
};

type CommitFile = {
    filename: string;
    status: string; // modified, added, removed 등
    patch?: string; // 변경된 코드의 diff (일부)
};

type CommitDetail = {
    message: string;
    author: string;
    date: string;
    body: string;
    files?: CommitFile[];
};

type Repo = {
    id: number;
    name: string;
};

function formatDate(date: Date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hours24 = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours24 >= 12 ? "오후" : "오전";
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    return `${year}-${month}-${day} ${ampm} ${hours12.toString().padStart(2, "0")}:${minutes}`;
}

const Chatting = () => {
    // 채팅 관련
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [userEmail, setUserEmail] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // GitHub 관련
    const [owner, setOwner] = useState("MintSoda07");
    const [repos, setRepos] = useState<Repo[]>([]);
    const [selectedRepo, setSelectedRepo] = useState<string | null>("foodtable");
    const [branches, setBranches] = useState<Branch[]>([]);
    const [selectedBranch, setSelectedBranch] = useState<string | null>(null);

    const [commits, setCommits] = useState<
        { sha: string; message: string; author: string; date: string }[]
    >([]);
    const [commitDetail, setCommitDetail] = useState<CommitDetail | null>(null);

    // Firebase Auth 상태 감지
    useEffect(() => {
        const auth = getAuth();
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user?.email) setUserEmail(user.email);
            else setUserEmail(null);
        });
        return () => unsubscribeAuth();
    }, []);

    // Firestore 메시지 실시간 구독
    useEffect(() => {
        const messagesRef = collection(db, "messages");
        const q = query(messagesRef, orderBy("timestamp", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs: ChatMessage[] = [];
            snapshot.forEach((doc) => {
                const data = doc.data();
                msgs.push({
                    id: doc.id,
                    timestamp: data.timestamp,
                    user: data.user,
                    text: data.text,
                });
            });
            setMessages(msgs);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // owner 변경시 repos 불러오기
    useEffect(() => {
        if (!owner) {
            setRepos([]);
            setSelectedRepo(null);
            setBranches([]);
            setSelectedBranch(null);
            setCommits([]);
            setCommitDetail(null);
            return;
        }

        async function fetchRepos() {
            try {
                const res = await fetch(`https://api.github.com/users/${owner}/repos?per_page=100`);
                if (!res.ok) throw new Error("GitHub API error");
                const data = await res.json();
                const repoList: Repo[] = data.map((r: any) => ({
                    id: r.id,
                    name: r.name,
                }));
                setRepos(repoList);
                setSelectedRepo(null);
                setBranches([]);
                setSelectedBranch(null);
                setCommits([]);
                setCommitDetail(null);
            } catch (e) {
                console.error("Failed to fetch repos:", e);
                setRepos([]);
                setSelectedRepo(null);
            }
        }
        fetchRepos();
    }, [owner]);

    // 리포지토리 선택시 브랜치 불러오기
    useEffect(() => {
        if (!selectedRepo) {
            setBranches([]);
            setSelectedBranch(null);
            setCommits([]);
            setCommitDetail(null);
            return;
        }

        async function fetchBranches() {
            try {
                const res = await fetch(
                    `https://api.github.com/repos/${owner}/${selectedRepo}/branches`
                );
                if (!res.ok) throw new Error("GitHub API error");
                const data = await res.json();
                const branchesData: Branch[] = data.map((b: any) => ({
                    name: b.name,
                    commitSha: b.commit.sha,
                }));
                setBranches(branchesData);
                setSelectedBranch(null);
                setCommits([]);
                setCommitDetail(null);
            } catch (e) {
                console.error("Failed to fetch branches:", e);
                setBranches([]);
                setSelectedBranch(null);
            }
        }
        fetchBranches();
    }, [selectedRepo, owner]);

    // 브랜치 클릭 시 커밋 목록 불러오기
    const handleBranchClick = async (branchName: string) => {
        setSelectedBranch(branchName);
        setCommitDetail(null);
        setCommits([]);

        try {
            const res = await fetch(
                `https://api.github.com/repos/${owner}/${selectedRepo}/commits?sha=${branchName}&per_page=30`
            );
            if (!res.ok) throw new Error("GitHub Commits API error");
            const commitsData = await res.json();

            const commitList = commitsData.map((c: any) => ({
                sha: c.sha,
                message: c.commit.message.split("\n")[0],
                author: c.commit.author.name,
                date: new Date(c.commit.author.date).toLocaleString(),
            }));
            setCommits(commitList);
        } catch (e) {
            console.error("Failed to fetch commits:", e);
        }
    };

    // 커밋 클릭 시 상세 정보 불러오기
    const handleCommitClick = async (sha: string) => {
        try {
            const res = await fetch(
                `https://api.github.com/repos/${owner}/${selectedRepo}/commits/${sha}`
            );
            if (!res.ok) throw new Error("GitHub Commit Detail API error");
            const commitData = await res.json();
            const commit = commitData.commit;

            setCommitDetail({
                message: commit.message.split("\n")[0],
                body: commit.message,
                author: commit.author.name,
                date: new Date(commit.author.date).toLocaleString(),
                files: commitData.files?.map((f: any) => ({
                    filename: f.filename,
                    status: f.status,
                    patch: f.patch,
                })),
            });
        } catch (e) {
            console.error("Failed to fetch commit detail:", e);
            setCommitDetail(null);
        }
    };
    const [buttonClicked, setButtonClicked] = useState(false);
    // 메시지 전송
    const sendMessage = async () => {
        if (!input.trim() || !userEmail) return;
        try {
            await addDoc(collection(db, "messages"), {
                user: userEmail,
                text: input.trim(),
                timestamp: serverTimestamp(),
            });
            setInput("");

            // 버튼 클릭 시 반짝임 효과 트리거
            setButtonClicked(true);
            setTimeout(() => setButtonClicked(false), 400); // 애니메이션 길이와 일치
        } catch (e) {
            console.error("Error sending message:", e);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-black text-green-400 font-mono overflow-hidden">
            {/* GitHub Owner 입력 및 Repo 선택 */}
            <div className="p-4 border-b border-green-600 flex items-center space-x-3">
                <input
                    type="text"
                    value={owner}
                    onChange={(e) => setOwner(e.target.value.trim())}
                    placeholder="GitHub Owner 입력"
                    className="bg-transparent border-b-2 border-green-600 text-green-400 placeholder-green-600 focus:outline-none focus:border-green-400 flex-1"
                    spellCheck={false}
                />
                <select
                    disabled={repos.length === 0}
                    value={selectedRepo ?? ""}
                    onChange={(e) => setSelectedRepo(e.target.value)}
                    className="bg-black border border-green-600 text-green-400 p-1 rounded"
                >
                    <option value="" disabled>
                        리포지토리 선택
                    </option>
                    {repos.map((repo) => (
                        <option key={repo.id} value={repo.name}>
                            {repo.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* 채팅창 - 좌측 3/4 */}
                <div className="flex flex-col flex-1 p-4 overflow-y-auto bg-black bg-terminal-flow border-t border-green-600">
                    {messages.length === 0 && (
                        <p className="text-green-500 opacity-60 text-center mt-10">
                            아직 대화가 없습니다.
                        </p>
                    )}
                    {messages.map(({ id, timestamp, user, text }) => (
                        <div key={id} className="chat-message mb-2 whitespace-pre-wrap">
                            <span className="text-green-600">
                                [
                                {timestamp?.toDate
                                    ? formatDate(timestamp.toDate())
                                    : formatDate(new Date())}{" "}
                                {user} :
                            </span>{" "}
                            <span className="text-green-400">{text}]</span>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>

                {/* 오른쪽 GitHub 영역 - 1/4 */}
                <div className="w-1/4 p-4 bg-black border-l border-green-600 flex flex-col">
                    {/* 브랜치 리스트 */}
                    <div>
                        <h2 className="text-green-600 mb-3 font-semibold text-lg border-b border-green-600 pb-2">
                            최신 GitHub 브랜치
                        </h2>
                        {branches.length === 0 && (
                            <p className="text-green-500 opacity-60">브랜치 정보를 불러오는 중...</p>
                        )}
                        <ul className="overflow-auto max-h-32 mb-4">
                            {branches.map((branch) => (
                                <li
                                    key={branch.name}
                                    className={`cursor-pointer py-1 px-2 rounded hover:bg-green-900 ${selectedBranch === branch.name
                                            ? "bg-green-700 font-bold"
                                            : ""
                                        }`}
                                    onClick={() => handleBranchClick(branch.name)}
                                >
                                    {branch.name}
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 커밋 리스트 */}
                    <div className="flex-1 overflow-auto">
                        <h2 className="text-green-600 mb-3 font-semibold text-lg border-b border-green-600 pb-2">
                            커밋 목록
                        </h2>
                        {commits.length === 0 && (
                            <p className="text-green-500 opacity-60">커밋이 없습니다.</p>
                        )}
                        <ul className="overflow-auto max-h-48">
                            {commits.map((commit) => (
                                <li
                                    key={commit.sha}
                                    className="cursor-pointer py-1 px-2 rounded hover:bg-green-900"
                                    onClick={() => handleCommitClick(commit.sha)}
                                >
                                    <div className="truncate font-semibold">{commit.message}</div>
                                    <div className="text-green-500 text-xs">
                                        {commit.author} | {commit.date}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>

                    {/* 커밋 상세 */}
                    {commitDetail && (
                        <div className="mt-4 p-2 border border-green-600 rounded overflow-auto max-h-64 bg-black text-green-300 text-xs whitespace-pre-wrap">
                            <div className="font-bold mb-1">{commitDetail.message}</div>
                            <div className="mb-1 text-green-500">
                                작성자: {commitDetail.author} | 날짜: {commitDetail.date}
                            </div>
                            <div>{commitDetail.body}</div>
                            {commitDetail.files && commitDetail.files.length > 0 && (
                                <>
                                    <div className="mt-2 font-semibold text-green-600">변경 파일:</div>
                                    <ul className="list-disc list-inside text-green-500 text-xs max-h-32 overflow-auto">
                                        {commitDetail.files.map((file, i) => (
                                            <li key={i}>
                                                {file.filename} ({file.status})
                                                {file.patch && (
                                                    <pre className="bg-black p-1 rounded text-green-700 mt-1 overflow-auto whitespace-pre-wrap max-h-24">
                                                        {file.patch.length > 300
                                                            ? file.patch.slice(0, 300) + "..."
                                                            : file.patch}
                                                    </pre>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* 메시지 입력 및 전송 */}
            <div className="p-4 border-t border-green-600 flex items-center space-x-2 bg-black">
                <input
                    className="input-hacker flex-1 bg-transparent border border-green-600 rounded px-3 py-2 text-green-400 placeholder-green-600 focus:outline-none focus:border-green-400"
                    placeholder="메시지를 입력하세요"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    spellCheck={false}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                        }
                    }}
                />
                <button
                    onClick={sendMessage}
                    className={`px-4 py-2 border border-green-600 rounded hover:bg-green-700 ${buttonClicked ? "button-glow-click" : ""}`}
                    disabled={!input.trim()}
                >
                    전송
                </button>

            </div>
        </div>
    );
};

export default Chatting;
