import { useState, useEffect, useRef, useCallback } from "react";
import {
  auth, db, storage, login, logout, uploadFile,
  callCreateUser, callDisableUser, callDeleteUser,
  collection, doc, setDoc, getDoc, getDocs, addDoc, deleteDoc, updateDoc,
  onSnapshot, query, orderBy, where, serverTimestamp, limit
} from "./firebase";

const generateId = () => Math.random().toString(36).substr(2, 9);
const avatarColors = ["#E8927C","#7CB5E8","#7CE8A8","#E8D47C","#C47CE8","#E87CA8","#7CE8D4","#A87CE8","#E8A87C","#7C9EE8"];
const getAvatarColor = (name) => avatarColors[(name||"?").charCodeAt(0) % avatarColors.length];
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;

function RichText({ text }) {
  if (!text) return null;
  const parts = text.split(URL_REGEX);
  return (<span>{parts.map((part, i) => {
    if (URL_REGEX.test(part)) { URL_REGEX.lastIndex = 0;
      return (<a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color:"#8EAAFF", textDecoration:"none", borderBottom:"1px solid rgba(142,170,255,0.3)", wordBreak:"break-all" }}>{part.length > 60 ? part.slice(0,57)+"..." : part}</a>);
    } return <span key={i}>{part}</span>;
  })}</span>);
}

function Lightbox({ src, type, onClose }) {
  return (<div onClick={onClose} style={{ position:"fixed",top:0,left:0,right:0,bottom:0,background:"rgba(0,0,0,0.92)",zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",cursor:"zoom-out" }}>
    {type === "image" ? <img src={src} alt="" style={{ maxWidth:"92vw",maxHeight:"92vh",borderRadius:8,objectFit:"contain" }} />
      : <video src={src} controls autoPlay style={{ maxWidth:"92vw",maxHeight:"92vh",borderRadius:8 }} onClick={e=>e.stopPropagation()} />}
    <button onClick={onClose} style={{ position:"absolute",top:16,right:20,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:22,width:40,height:40,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
  </div>);
}

function MediaGrid({ media, onClickMedia }) {
  if (!media || media.length === 0) return null;
  const count = media.length;
  const gridStyle = count === 1 ? {} : { display:"grid", gridTemplateColumns:"1fr 1fr", gap:4 };
  return (<div style={{ marginTop:10, borderRadius:14, overflow:"hidden", ...gridStyle }}>
    {media.slice(0,4).map((m,i) => {
      const span = count===3 && i===0 ? {gridRow:"1/3"} : {};
      return (<div key={i} style={{ position:"relative",cursor:"pointer",overflow:"hidden",minHeight:count===1?0:140,...span }} onClick={()=>onClickMedia(m)}>
        {m.type==="image" ? <img src={m.url} alt="" style={{ width:"100%",height:count===1?"auto":"100%",maxHeight:count===1?400:undefined,objectFit:"cover",display:"block",borderRadius:count===1?14:0 }} />
        : <div style={{ position:"relative",width:"100%",height:count===1?"auto":"100%",minHeight:count===1?200:140,background:"#000",borderRadius:count===1?14:0,overflow:"hidden" }}>
            <video src={m.url} style={{ width:"100%",height:"100%",objectFit:"cover",display:"block" }} />
            <div style={{ position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.3)" }}>
              <div style={{ width:48,height:48,borderRadius:"50%",background:"rgba(255,255,255,0.2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>▶</div>
            </div></div>}
      </div>);
    })}
  </div>);
}

const IB = { padding:"12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:14,outline:"none",width:"100%",boxSizing:"border-box" };
const focusBorder = e => e.target.style.borderColor = "rgba(102,126,234,0.4)";
const blurBorder = e => e.target.style.borderColor = "rgba(255,255,255,0.08)";
const gradBtn = { padding:"10px 24px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"#fff",fontSize:14,fontWeight:600 };
const formatTime = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date(), diff = now - d;
  if (diff < 60000) return "たった今";
  if (diff < 3600000) return `${Math.floor(diff/60000)}分前`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}時間前`;
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,"0")}`;
};

export default function App() {
  const [authUser, setAuthUser] = useState(undefined); // undefined=loading, null=not logged in
  const [userProfile, setUserProfile] = useState(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [view, setView] = useState("timeline");
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  // Admin
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPw, setNewUserPw] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  // Chat
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupMembers, setNewGroupMembers] = useState([]);
  const fileInputRef = useRef(null);
  const chatFileRef = useRef(null);
  const chatEndRef = useRef(null);

  const isAdmin = userProfile?.role === "admin";

  // Auth state listener
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setAuthUser(user);
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) setUserProfile(snap.data());
      } else {
        setAuthUser(null);
        setUserProfile(null);
      }
    });
    return unsub;
  }, []);

  // Listen to posts
  useEffect(() => {
    if (!authUser) return;
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(100));
    const unsub = onSnapshot(q, (snap) => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [authUser]);

  // Listen to users
  useEffect(() => {
    if (!authUser) return;
    const unsub = onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map(d => ({ uid: d.id, ...d.data() })));
    });
    return unsub;
  }, [authUser]);

  // Listen to groups
  useEffect(() => {
    if (!authUser || !userProfile) return;
    const q = query(collection(db, "groups"), where("memberIds", "array-contains", authUser.uid));
    const unsub = onSnapshot(q, (snap) => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [authUser, userProfile]);

  // Listen to chat messages
  useEffect(() => {
    if (!activeGroup) { setChatMessages([]); return; }
    const q = query(collection(db, "groups", activeGroup, "messages"), orderBy("createdAt", "asc"), limit(200));
    const unsub = onSnapshot(q, (snap) => {
      setChatMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    });
    return unsub;
  }, [activeGroup]);

  // Login
  const handleLogin = async () => {
    setLoginError("");
    try {
      await login(loginEmail, loginPw);
    } catch (e) {
      setLoginError("メールアドレスまたはパスワードが正しくありません");
    }
  };

  // Upload files to Storage（サイズ・種類チェック付き）
  const uploadMedia = async (files) => {
    const urls = [];
    for (const f of files) {
      try {
        const path = `media/${Date.now()}_${f.name}`;
        const url = await uploadFile(path, f);
        urls.push({ url, type: f.type.startsWith("image/") ? "image" : "video" });
      } catch (e) {
        alert(e.message);
        return [];
      }
    }
    return urls;
  };

  // Post
  const handlePost = async () => {
    if (!newPost.trim() && pendingFiles.length === 0) return;
    setUploading(true);
    try {
      let media = [];
      if (pendingFiles.length > 0) media = await uploadMedia(pendingFiles);
      await addDoc(collection(db, "posts"), {
        authorUid: authUser.uid,
        authorName: userProfile.displayName,
        authorId: userProfile.userId,
        content: newPost.trim(),
        media,
        likes: [],
        createdAt: serverTimestamp(),
      });
      setNewPost("");
      setPendingFiles([]);
    } catch (e) { console.error(e); }
    setUploading(false);
  };

  // Like
  const handleLike = async (post) => {
    const uid = authUser.uid;
    const newLikes = post.likes.includes(uid) ? post.likes.filter(l => l !== uid) : [...post.likes, uid];
    await updateDoc(doc(db, "posts", post.id), { likes: newLikes });
  };

  // Delete post
  const handleDeletePost = async (postId) => {
    await deleteDoc(doc(db, "posts", postId));
  };

  // Admin: Add user（Cloud Functions経由 — 安全）
  const handleAddUser = async () => {
    if (!newUserEmail || !newUserPw || !newUserName || !newUserId) {
      setAdminMsg("全ての項目を入力してください"); return;
    }
    if (newUserPw.length < 6) {
      setAdminMsg("パスワードは6文字以上にしてください"); return;
    }
    try {
      await callCreateUser({ email: newUserEmail, password: newUserPw, displayName: newUserName, userId: newUserId });
      setNewUserEmail(""); setNewUserPw(""); setNewUserName(""); setNewUserId("");
      setAdminMsg("ユーザーを追加しました ✓");
      setTimeout(() => setAdminMsg(""), 2000);
    } catch (e) {
      setAdminMsg("エラー: " + (e.message || "作成に失敗しました"));
    }
  };

  // Admin: Toggle active（Cloud Functions経由 — Auth側も無効化）
  const handleToggleActive = async (uid, current) => {
    try {
      await callDisableUser({ uid, disable: current });
    } catch (e) {
      console.error("Toggle error:", e);
    }
  };

  // Chat: Send message
  const handleSendChat = async () => {
    if (!chatInput.trim() && !chatFileRef.current?.files?.length) return;
    let media = [];
    if (chatFileRef.current?.files?.length) {
      setUploading(true);
      media = await uploadMedia(Array.from(chatFileRef.current.files));
      chatFileRef.current.value = "";
      setUploading(false);
    }
    await addDoc(collection(db, "groups", activeGroup, "messages"), {
      senderUid: authUser.uid,
      senderName: userProfile.displayName,
      text: chatInput.trim(),
      media,
      createdAt: serverTimestamp(),
    });
    setChatInput("");
  };

  // Chat: Create group
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || newGroupMembers.length === 0) return;
    const memberIds = [...newGroupMembers, authUser.uid];
    const memberNames = users.filter(u => memberIds.includes(u.uid)).map(u => u.displayName);
    await addDoc(collection(db, "groups"), {
      name: newGroupName.trim(),
      memberIds,
      memberNames,
      createdAt: serverTimestamp(),
    });
    setNewGroupName("");
    setNewGroupMembers([]);
    setShowNewGroup(false);
  };

  // File handling
  const processFiles = (files) => setPendingFiles(prev => [...prev, ...Array.from(files).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"))]);

  // Loading
  if (authUser === undefined || (authUser && !userProfile)) {
    return (<div style={{ minHeight:"100vh",background:"linear-gradient(160deg,#0a0a0f,#1a1a2e,#16213e)",display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontFamily:"'Noto Sans JP',sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      <p style={{ opacity:0.5 }}>読み込み中...</p>
    </div>);
  }

  // Login screen
  if (!authUser) {
    return (
      <div style={{ minHeight:"100vh",background:"linear-gradient(160deg,#0a0a0f,#1a1a2e,#16213e)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans JP',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
        <div style={{ width:380,padding:"48px 40px",borderRadius:20,background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign:"center",marginBottom:36 }}>
            <div style={{ width:56,height:56,borderRadius:16,margin:"0 auto 16px",background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#fff",fontFamily:"Outfit",fontWeight:700 }}>S</div>
            <h1 style={{ color:"#fff",fontSize:22,fontWeight:600,fontFamily:"Outfit",margin:0 }}>Social Network</h1>
            <p style={{ color:"rgba(255,255,255,0.4)",fontSize:13,marginTop:6 }}>クローズドSNS — 招待制</p>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <input value={loginEmail} onChange={e=>setLoginEmail(e.target.value)} placeholder="メールアドレス" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{ ...IB }} onFocus={focusBorder} onBlur={blurBorder} />
            <input type="password" value={loginPw} onChange={e=>setLoginPw(e.target.value)} placeholder="パスワード" onKeyDown={e=>e.key==="Enter"&&handleLogin()} style={{ ...IB }} onFocus={focusBorder} onBlur={blurBorder} />
            {loginError && <p style={{ color:"#E8927C",fontSize:13,margin:0 }}>{loginError}</p>}
            <button onClick={handleLogin} style={{ ...gradBtn,padding:"14px",fontSize:15,marginTop:4 }}>ログイン</button>
          </div>
        </div>
      </div>
    );
  }

  const displayName = userProfile?.displayName || "ユーザー";
  const canPost = newPost.trim() || pendingFiles.length > 0;
  const activeGroupData = groups.find(g => g.id === activeGroup);

  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(160deg,#0a0a0f,#1a1a2e,#16213e)",fontFamily:"'Noto Sans JP',sans-serif",color:"#fff" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      {lightbox && <Lightbox src={lightbox.url} type={lightbox.type} onClose={()=>setLightbox(null)} />}

      {/* Header */}
      <header style={{ position:"sticky",top:0,zIndex:100,background:"rgba(10,10,15,0.85)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontFamily:"Outfit",fontWeight:700 }}>S</div>
          <span style={{ fontFamily:"Outfit",fontWeight:600,fontSize:17 }}>Social Network</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          {["timeline","chat",isAdmin&&"admin"].filter(Boolean).map(v=>(
            <button key={v} onClick={()=>{setView(v);if(v!=="chat")setActiveGroup(null);}} style={{ padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",background:view===v?"rgba(102,126,234,0.25)":"transparent",color:view===v?"#a8b8ff":"rgba(255,255,255,0.5)",fontSize:13,fontWeight:500 }}>
              {v==="timeline"?"タイムライン":v==="chat"?"チャット":"管理"}
            </button>
          ))}
          <div style={{ width:1,height:24,background:"rgba(255,255,255,0.1)",margin:"0 4px" }} />
          <div style={{ width:30,height:30,borderRadius:8,background:isAdmin?"linear-gradient(135deg,#667eea,#764ba2)":getAvatarColor(displayName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:600 }}>{displayName[0]}</div>
          <button onClick={()=>logout()} style={{ padding:"5px 10px",borderRadius:7,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",fontSize:11,cursor:"pointer" }}>ログアウト</button>
        </div>
      </header>

      <div style={{ maxWidth:640,margin:"0 auto",padding:"24px 16px" }}>

        {/* ===== TIMELINE ===== */}
        {view === "timeline" && <>
          <div onDrop={e=>{e.preventDefault();processFiles(e.dataTransfer.files);}} onDragOver={e=>e.preventDefault()} style={{ padding:20,borderRadius:16,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:24 }}>
            <div style={{ display:"flex",gap:12 }}>
              <div style={{ width:40,height:40,borderRadius:12,flexShrink:0,background:isAdmin?"linear-gradient(135deg,#667eea,#764ba2)":getAvatarColor(displayName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:600 }}>{displayName[0]}</div>
              <div style={{ flex:1,display:"flex",flexDirection:"column",gap:10 }}>
                <textarea value={newPost} onChange={e=>setNewPost(e.target.value)} placeholder="いま何を考えていますか？" rows={3} style={{ ...IB,resize:"none",lineHeight:1.6,fontFamily:"inherit" }} onFocus={focusBorder} onBlur={blurBorder} />
                {pendingFiles.length > 0 && <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  {pendingFiles.map((f,i) => <div key={i} style={{ position:"relative",width:70,height:70,borderRadius:10,overflow:"hidden",background:"#111",display:"flex",alignItems:"center",justifyContent:"center" }}>
                    {f.type.startsWith("image/") ? <img src={URL.createObjectURL(f)} alt="" style={{ width:"100%",height:"100%",objectFit:"cover" }} /> : <span style={{ fontSize:10,color:"rgba(255,255,255,0.5)" }}>🎬</span>}
                    <button onClick={()=>setPendingFiles(p=>p.filter((_,j)=>j!==i))} style={{ position:"absolute",top:2,right:2,width:18,height:18,borderRadius:5,background:"rgba(0,0,0,0.7)",border:"none",color:"#fff",fontSize:10,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
                  </div>)}
                </div>}
              </div>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,paddingLeft:52 }}>
              <div style={{ display:"flex",gap:4 }}>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display:"none" }} onChange={e=>{if(e.target.files)processFiles(e.target.files);e.target.value="";}} />
                <button onClick={()=>fileInputRef.current?.click()} style={{ padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.55)",fontSize:13 }}>🖼 写真</button>
                <button onClick={()=>{const i=document.createElement("input");i.type="file";i.accept="video/*";i.multiple=true;i.onchange=e=>{if(e.target.files)processFiles(e.target.files);};i.click();}} style={{ padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.55)",fontSize:13 }}>🎬 動画</button>
              </div>
              <button onClick={handlePost} disabled={!canPost||uploading} style={{ padding:"8px 20px",borderRadius:10,border:"none",cursor:canPost&&!uploading?"pointer":"default",background:canPost&&!uploading?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.06)",color:canPost&&!uploading?"#fff":"rgba(255,255,255,0.3)",fontSize:13,fontWeight:600 }}>{uploading?"アップロード中...":"投稿する"}</button>
            </div>
          </div>

          {posts.length===0 && <div style={{ textAlign:"center",padding:60,color:"rgba(255,255,255,0.3)" }}><p style={{ fontSize:32 }}>💬</p><p style={{ fontSize:14 }}>まだ投稿がありません</p></div>}
          {posts.map(post=><div key={post.id} style={{ padding:20,borderRadius:16,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",marginBottom:12 }}>
            <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
              <div style={{ width:40,height:40,borderRadius:12,flexShrink:0,background:post.authorId==="admin"?"linear-gradient(135deg,#667eea,#764ba2)":getAvatarColor(post.authorName||"?"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:600 }}>{(post.authorName||"?")[0]}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap" }}>
                  <span style={{ fontWeight:600,fontSize:14 }}>{post.authorName}</span>
                  {post.authorId==="admin" && <span style={{ padding:"1px 7px",borderRadius:6,fontSize:10,fontWeight:600,background:"rgba(102,126,234,0.2)",color:"#a8b8ff" }}>管理者</span>}
                  <span style={{ color:"rgba(255,255,255,0.2)",fontSize:12 }}>{formatTime(post.createdAt)}</span>
                </div>
                {post.content && <p style={{ margin:0,fontSize:14,lineHeight:1.7,color:"rgba(255,255,255,0.85)",whiteSpace:"pre-wrap",wordBreak:"break-word" }}><RichText text={post.content} /></p>}
                <MediaGrid media={post.media} onClickMedia={m=>setLightbox(m)} />
                <div style={{ display:"flex",alignItems:"center",gap:16,marginTop:12 }}>
                  <button onClick={()=>handleLike(post)} style={{ display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",background:post.likes?.includes(authUser.uid)?"rgba(232,146,124,0.15)":"transparent",color:post.likes?.includes(authUser.uid)?"#E8927C":"rgba(255,255,255,0.3)",fontSize:13 }}>
                    {post.likes?.includes(authUser.uid)?"❤️":"🤍"} {post.likes?.length>0&&post.likes.length}
                  </button>
                  {(isAdmin||post.authorUid===authUser.uid) && <button onClick={()=>handleDeletePost(post.id)} style={{ padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",background:"transparent",color:"rgba(255,255,255,0.2)",fontSize:12 }}>削除</button>}
                </div>
              </div>
            </div>
          </div>)}
        </>}

        {/* ===== CHAT ===== */}
        {view === "chat" && <>
          {!activeGroup ? (
            <div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16 }}>
                <h3 style={{ margin:0,fontSize:16,fontFamily:"Outfit",fontWeight:600 }}>グループチャット</h3>
                <button onClick={()=>setShowNewGroup(!showNewGroup)} style={{ ...gradBtn,padding:"8px 16px",fontSize:12 }}>{showNewGroup?"キャンセル":"＋ 新規グループ"}</button>
              </div>
              {showNewGroup && <div style={{ padding:20,borderRadius:16,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:16 }}>
                <input value={newGroupName} onChange={e=>setNewGroupName(e.target.value)} placeholder="グループ名" style={{ ...IB,marginBottom:10 }} onFocus={focusBorder} onBlur={blurBorder} />
                <p style={{ fontSize:12,color:"rgba(255,255,255,0.4)",margin:"0 0 8px" }}>メンバーを選択：</p>
                <div style={{ display:"flex",flexWrap:"wrap",gap:6,marginBottom:12 }}>
                  {users.filter(u=>u.uid!==authUser.uid).map(u=>(
                    <button key={u.uid} onClick={()=>setNewGroupMembers(prev=>prev.includes(u.uid)?prev.filter(id=>id!==u.uid):[...prev,u.uid])} style={{ padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",background:newGroupMembers.includes(u.uid)?"rgba(102,126,234,0.3)":"rgba(255,255,255,0.06)",color:newGroupMembers.includes(u.uid)?"#a8b8ff":"rgba(255,255,255,0.5)",fontSize:12 }}>{u.displayName}</button>
                  ))}
                </div>
                <button onClick={handleCreateGroup} disabled={!newGroupName.trim()||newGroupMembers.length===0} style={{ ...gradBtn,padding:"8px 18px",fontSize:13,opacity:newGroupName.trim()&&newGroupMembers.length>0?1:0.4 }}>作成</button>
              </div>}
              {groups.length===0 && !showNewGroup && <div style={{ textAlign:"center",padding:60,color:"rgba(255,255,255,0.3)" }}><p style={{ fontSize:32 }}>💬</p><p style={{ fontSize:14 }}>グループがありません</p></div>}
              {groups.map(g=>(
                <div key={g.id} onClick={()=>setActiveGroup(g.id)} style={{ padding:16,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",marginBottom:8,cursor:"pointer",transition:"background 0.2s" }} onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.06)"} onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}>
                  <div style={{ fontWeight:600,fontSize:14,marginBottom:4 }}>{g.name}</div>
                  <div style={{ fontSize:12,color:"rgba(255,255,255,0.35)" }}>{g.memberNames?.join("、")}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display:"flex",flexDirection:"column",height:"calc(100vh - 120px)" }}>
              <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:16 }}>
                <button onClick={()=>setActiveGroup(null)} style={{ padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.55)",fontSize:13 }}>← 戻る</button>
                <h3 style={{ margin:0,fontSize:16,fontFamily:"Outfit",fontWeight:600 }}>{activeGroupData?.name}</h3>
              </div>
              <div style={{ flex:1,overflowY:"auto",paddingBottom:12 }}>
                {chatMessages.map(msg=>{
                  const isMe = msg.senderUid === authUser.uid;
                  return (<div key={msg.id} style={{ display:"flex",justifyContent:isMe?"flex-end":"flex-start",marginBottom:8 }}>
                    <div style={{ maxWidth:"75%" }}>
                      {!isMe && <div style={{ fontSize:11,color:"rgba(255,255,255,0.35)",marginBottom:2,paddingLeft:4 }}>{msg.senderName}</div>}
                      <div style={{ padding:"10px 14px",borderRadius:isMe?"14px 14px 4px 14px":"14px 14px 14px 4px",background:isMe?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.08)",fontSize:14,lineHeight:1.6,wordBreak:"break-word",whiteSpace:"pre-wrap" }}>
                        {msg.text && <RichText text={msg.text} />}
                        {msg.media?.map((m,i)=>(
                          <div key={i} style={{ marginTop:msg.text?8:0,cursor:"pointer" }} onClick={()=>setLightbox(m)}>
                            {m.type==="image" ? <img src={m.url} alt="" style={{ maxWidth:"100%",borderRadius:8,display:"block" }} /> : <video src={m.url} style={{ maxWidth:"100%",borderRadius:8 }} controls />}
                          </div>
                        ))}
                      </div>
                      <div style={{ fontSize:10,color:"rgba(255,255,255,0.2)",marginTop:2,textAlign:isMe?"right":"left",paddingLeft:4,paddingRight:4 }}>{formatTime(msg.createdAt)}</div>
                    </div>
                  </div>);
                })}
                <div ref={chatEndRef} />
              </div>
              <div style={{ display:"flex",gap:8,paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.06)" }}>
                <input ref={chatFileRef} type="file" accept="image/*,video/*" style={{ display:"none" }} onChange={()=>handleSendChat()} />
                <button onClick={()=>chatFileRef.current?.click()} style={{ padding:"10px",borderRadius:10,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.55)",fontSize:16,flexShrink:0 }}>📎</button>
                <input value={chatInput} onChange={e=>setChatInput(e.target.value)} placeholder="メッセージを入力..." onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSendChat();}}} style={{ ...IB,flex:1 }} onFocus={focusBorder} onBlur={blurBorder} />
                <button onClick={handleSendChat} disabled={!chatInput.trim()&&!chatFileRef.current?.files?.length} style={{ ...gradBtn,padding:"10px 18px",fontSize:13,flexShrink:0,opacity:chatInput.trim()?1:0.5 }}>送信</button>
              </div>
            </div>
          )}
        </>}

        {/* ===== ADMIN ===== */}
        {view === "admin" && isAdmin && <>
          <div style={{ padding:24,borderRadius:16,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:24 }}>
            <h3 style={{ margin:"0 0 18px",fontSize:16,fontWeight:600,fontFamily:"Outfit" }}>ユーザー追加</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <div style={{ display:"flex",gap:10 }}>
                <input value={newUserId} onChange={e=>setNewUserId(e.target.value)} placeholder="ユーザーID" style={{ ...IB,flex:1 }} onFocus={focusBorder} onBlur={blurBorder} />
                <input value={newUserName} onChange={e=>setNewUserName(e.target.value)} placeholder="表示名" style={{ ...IB,flex:1 }} onFocus={focusBorder} onBlur={blurBorder} />
              </div>
              <div style={{ display:"flex",gap:10 }}>
                <input value={newUserEmail} onChange={e=>setNewUserEmail(e.target.value)} placeholder="メールアドレス" style={{ ...IB,flex:1 }} onFocus={focusBorder} onBlur={blurBorder} />
                <input value={newUserPw} onChange={e=>setNewUserPw(e.target.value)} placeholder="パスワード" style={{ ...IB,flex:1 }} onFocus={focusBorder} onBlur={blurBorder} />
              </div>
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <button onClick={handleAddUser} style={gradBtn}>追加</button>
                {adminMsg && <span style={{ fontSize:13,color:adminMsg.includes("✓")?"#7CE8A8":"#E8927C" }}>{adminMsg}</span>}
              </div>
            </div>
          </div>
          <div style={{ padding:24,borderRadius:16,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)" }}>
            <h3 style={{ margin:"0 0 18px",fontSize:16,fontWeight:600,fontFamily:"Outfit" }}>ユーザー一覧 <span style={{ fontWeight:400,color:"rgba(255,255,255,0.4)",fontSize:13 }}>({users.length}人)</span></h3>
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {users.map(user=><div key={user.uid} style={{ padding:14,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.04)",opacity:user.active?1:0.5,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                  <div style={{ width:36,height:36,borderRadius:10,background:user.role==="admin"?"linear-gradient(135deg,#667eea,#764ba2)":getAvatarColor(user.displayName||"?"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:600 }}>{(user.displayName||"?")[0]}</div>
                  <div>
                    <div style={{ fontWeight:600,fontSize:14 }}>{user.displayName} {user.role==="admin"&&<span style={{ fontSize:10,color:"#a8b8ff" }}>管理者</span>} {!user.active&&<span style={{ fontSize:10,color:"#E8927C" }}>無効</span>}</div>
                    <div style={{ fontSize:12,color:"rgba(255,255,255,0.35)" }}>@{user.userId} ・ {user.email}</div>
                  </div>
                </div>
                {user.role!=="admin" && <div style={{ display:"flex",gap:4 }}>
                  <button onClick={()=>handleToggleActive(user.uid,user.active)} style={{ padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",background:user.active?"rgba(232,212,124,0.15)":"rgba(124,232,168,0.15)",color:user.active?"#E8D47C":"#7CE8A8",fontSize:11 }}>{user.active?"無効化":"有効化"}</button>
                </div>}
              </div>)}
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
