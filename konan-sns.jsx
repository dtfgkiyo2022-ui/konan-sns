import { useState, useRef, useCallback } from "react";

const ADMIN_CREDENTIALS = { id: "admin", password: "konan2022" };
const generateId = () => Math.random().toString(36).substr(2, 9);
const formatTime = (ts) => {
  const d = new Date(ts), now = new Date(), diff = now - d;
  if (diff < 60000) return "たった今";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分前`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}時間前`;
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const avatarColors = ["#E8927C","#7CB5E8","#7CE8A8","#E8D47C","#C47CE8","#E87CA8","#7CE8D4","#A87CE8","#E8A87C","#7C9EE8"];
const getAvatarColor = (name) => avatarColors[name.charCodeAt(0) % avatarColors.length];
const URL_REGEX = /(https?:\/\/[^\s<>"{}|\\^`\[\]]+)/g;

function RichText({ text }) {
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
    <button onClick={onClose} style={{ position:"absolute",top:16,right:20,background:"rgba(255,255,255,0.15)",border:"none",color:"#fff",fontSize:22,width:40,height:40,borderRadius:12,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(10px)" }}>✕</button>
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
              <div style={{ width:48,height:48,borderRadius:"50%",background:"rgba(255,255,255,0.2)",backdropFilter:"blur(8px)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20 }}>▶</div>
            </div></div>}
        {count>4 && i===3 && <div style={{ position:"absolute",inset:0,background:"rgba(0,0,0,0.55)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:22,fontWeight:600,color:"#fff" }}>+{count-4}</div>}
      </div>);
    })}
  </div>);
}

const IB = { padding:"12px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:14,outline:"none" };
const gradBtn = { padding:"10px 24px",borderRadius:10,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"#fff",fontSize:14,fontWeight:600 };
const focusBorder = (e) => e.target.style.borderColor = "rgba(102,126,234,0.4)";
const blurBorder = (e) => e.target.style.borderColor = "rgba(255,255,255,0.08)";

export default function ClosedSNS() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loginId, setLoginId] = useState("");
  const [loginPw, setLoginPw] = useState("");
  const [loginError, setLoginError] = useState("");
  const [users, setUsers] = useState([
    { id:"user001",userId:"tanaka",password:"pass1234",displayName:"田中太郎",active:true,createdAt:Date.now()-86400000*3 },
    { id:"user002",userId:"suzuki",password:"pass5678",displayName:"鈴木花子",active:true,createdAt:Date.now()-86400000*2 },
  ]);
  const [posts, setPosts] = useState([
    { id:"p1",authorId:"tanaka",authorName:"田中太郎",content:"はじめまして！よろしくお願いします🙌",media:[],timestamp:Date.now()-86400000*2,likes:["suzuki"] },
    { id:"p2",authorId:"suzuki",authorName:"鈴木花子",content:"田中さん、こちらこそよろしくお願いします！\nこのSNS、使いやすいですね✨\nhttps://example.com もチェックしてみてください",media:[],timestamp:Date.now()-86400000,likes:["tanaka"] },
  ]);
  const [newPost, setNewPost] = useState("");
  const [pendingMedia, setPendingMedia] = useState([]);
  const [view, setView] = useState("timeline");
  const [newUserId, setNewUserId] = useState("");
  const [newUserPw, setNewUserPw] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [adminMsg, setAdminMsg] = useState("");
  const [editingUser, setEditingUser] = useState(null);
  const [editPw, setEditPw] = useState("");
  const [editName, setEditName] = useState("");
  const [lightbox, setLightbox] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const isAdmin = currentUser === "admin";

  const handleLogin = () => {
    setLoginError("");
    if (loginId===ADMIN_CREDENTIALS.id && loginPw===ADMIN_CREDENTIALS.password) { setCurrentUser("admin"); setLoginId(""); setLoginPw(""); return; }
    const user = users.find(u=>u.userId===loginId && u.password===loginPw && u.active);
    if (user) { setCurrentUser(user.userId); setLoginId(""); setLoginPw(""); }
    else setLoginError("IDまたはパスワードが正しくありません");
  };

  const processFiles = useCallback((files) => {
    Array.from(files).filter(f=>f.type.startsWith("image/")||f.type.startsWith("video/")).forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => setPendingMedia(prev=>[...prev,{ id:generateId(), type:file.type.startsWith("image/")?"image":"video", url:e.target.result, name:file.name }]);
      reader.readAsDataURL(file);
    });
  }, []);

  const handlePost = () => {
    if (!newPost.trim() && pendingMedia.length===0) return;
    const author = isAdmin ? {id:"admin",name:"管理者"} : (()=>{ const u=users.find(u=>u.userId===currentUser); return {id:u.userId,name:u.displayName}; })();
    setPosts(prev=>[{ id:generateId(),authorId:author.id,authorName:author.name,content:newPost.trim(),media:[...pendingMedia],timestamp:Date.now(),likes:[] },...prev]);
    setNewPost(""); setPendingMedia([]);
  };

  const handleLike = (postId) => setPosts(prev=>prev.map(p=>p.id!==postId?p:{...p,likes:p.likes.includes(currentUser)?p.likes.filter(l=>l!==currentUser):[...p.likes,currentUser]}));
  const handleDeletePost = (postId) => setPosts(prev=>prev.filter(p=>p.id!==postId));

  const handleAddUser = () => {
    if (!newUserId.trim()||!newUserPw.trim()||!newUserName.trim()) { setAdminMsg("全ての項目を入力してください"); return; }
    if (users.find(u=>u.userId===newUserId)||newUserId==="admin") { setAdminMsg("このIDは既に使用されています"); return; }
    setUsers(prev=>[...prev,{id:generateId(),userId:newUserId,password:newUserPw,displayName:newUserName,active:true,createdAt:Date.now()}]);
    setNewUserId(""); setNewUserPw(""); setNewUserName(""); setAdminMsg("ユーザーを追加しました ✓"); setTimeout(()=>setAdminMsg(""),2000);
  };

  const handleToggleActive = (userId) => setUsers(prev=>prev.map(u=>u.userId===userId?{...u,active:!u.active}:u));
  const handleDeleteUser = (userId) => { setUsers(prev=>prev.filter(u=>u.userId!==userId)); setPosts(prev=>prev.filter(p=>p.authorId!==userId)); };
  const startEdit = (user) => { setEditingUser(user.userId); setEditPw(user.password); setEditName(user.displayName); };
  const saveEdit = (userId) => { setUsers(prev=>prev.map(u=>u.userId===userId?{...u,password:editPw,displayName:editName}:u)); setEditingUser(null); };

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); if(e.dataTransfer.files) processFiles(e.dataTransfer.files); }, [processFiles]);

  // ===== LOGIN =====
  if (!currentUser) {
    return (
      <div style={{ minHeight:"100vh",background:"linear-gradient(160deg,#0a0a0f 0%,#1a1a2e 40%,#16213e 100%)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Noto Sans JP','Segoe UI',sans-serif" }}>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
        <div style={{ width:380,padding:"48px 40px",borderRadius:20,background:"rgba(255,255,255,0.04)",backdropFilter:"blur(20px)",border:"1px solid rgba(255,255,255,0.08)",boxShadow:"0 24px 80px rgba(0,0,0,0.5)" }}>
          <div style={{ textAlign:"center",marginBottom:36 }}>
            <div style={{ width:56,height:56,borderRadius:16,margin:"0 auto 16px",background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,color:"#fff",fontFamily:"Outfit",fontWeight:700 }}>S</div>
            <h1 style={{ color:"#fff",fontSize:22,fontWeight:600,fontFamily:"Outfit",margin:0 }}>Social Network</h1>
            <p style={{ color:"rgba(255,255,255,0.4)",fontSize:13,marginTop:6 }}>クローズドSNS — 招待制</p>
          </div>
          <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
            <input value={loginId} onChange={e=>setLoginId(e.target.value)} placeholder="ユーザーID" onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              style={{ padding:"14px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:15,outline:"none" }}
              onFocus={e=>e.target.style.borderColor="rgba(102,126,234,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
            <input type="password" value={loginPw} onChange={e=>setLoginPw(e.target.value)} placeholder="パスワード" onKeyDown={e=>e.key==="Enter"&&handleLogin()}
              style={{ padding:"14px 16px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:15,outline:"none" }}
              onFocus={e=>e.target.style.borderColor="rgba(102,126,234,0.5)"} onBlur={e=>e.target.style.borderColor="rgba(255,255,255,0.1)"} />
            {loginError && <p style={{ color:"#E8927C",fontSize:13,margin:0,paddingLeft:4 }}>{loginError}</p>}
            <button onClick={handleLogin} style={{ padding:"14px",borderRadius:12,border:"none",cursor:"pointer",background:"linear-gradient(135deg,#667eea,#764ba2)",color:"#fff",fontSize:15,fontWeight:600,marginTop:4 }}>ログイン</button>
          </div>
        </div>
      </div>
    );
  }

  const currentDisplayName = isAdmin ? "管理者" : users.find(u=>u.userId===currentUser)?.displayName || currentUser;
  const canPost = newPost.trim() || pendingMedia.length > 0;

  // ===== MAIN =====
  return (
    <div style={{ minHeight:"100vh",background:"linear-gradient(160deg,#0a0a0f 0%,#1a1a2e 40%,#16213e 100%)",fontFamily:"'Noto Sans JP','Segoe UI',sans-serif",color:"#fff" }}>
      <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;400;500;700&family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet" />
      {lightbox && <Lightbox src={lightbox.url} type={lightbox.type} onClose={()=>setLightbox(null)} />}

      {/* Header */}
      <header style={{ position:"sticky",top:0,zIndex:100,background:"rgba(10,10,15,0.85)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"0 24px",height:60,display:"flex",alignItems:"center",justifyContent:"space-between" }}>
        <div style={{ display:"flex",alignItems:"center",gap:12 }}>
          <div style={{ width:34,height:34,borderRadius:10,background:"linear-gradient(135deg,#667eea,#764ba2)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontFamily:"Outfit",fontWeight:700 }}>S</div>
          <span style={{ fontFamily:"Outfit",fontWeight:600,fontSize:17 }}>Social Network</span>
        </div>
        <div style={{ display:"flex",alignItems:"center",gap:16 }}>
          {isAdmin && <div style={{ display:"flex",gap:4 }}>
            {["timeline","admin"].map(v=><button key={v} onClick={()=>setView(v)} style={{ padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",background:view===v?"rgba(102,126,234,0.25)":"transparent",color:view===v?"#a8b8ff":"rgba(255,255,255,0.5)",fontSize:13,fontWeight:500 }}>{v==="timeline"?"タイムライン":"管理パネル"}</button>)}
          </div>}
          <div style={{ display:"flex",alignItems:"center",gap:10 }}>
            <div style={{ width:32,height:32,borderRadius:10,background:isAdmin?"linear-gradient(135deg,#667eea,#764ba2)":getAvatarColor(currentDisplayName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:600 }}>{currentDisplayName[0]}</div>
            <span style={{ fontSize:13,color:"rgba(255,255,255,0.7)" }}>{currentDisplayName}</span>
            <button onClick={()=>{setCurrentUser(null);setView("timeline");setPendingMedia([]);}} style={{ padding:"6px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"rgba(255,255,255,0.5)",fontSize:12,cursor:"pointer" }}>ログアウト</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth:640,margin:"0 auto",padding:"24px 16px" }}>
        {/* ===== TIMELINE ===== */}
        {view === "timeline" && <>
          {/* Composer */}
          <div onDrop={handleDrop} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)}
            style={{ padding:20,borderRadius:16,background:dragOver?"rgba(102,126,234,0.08)":"rgba(255,255,255,0.04)",border:dragOver?"2px dashed rgba(102,126,234,0.4)":"1px solid rgba(255,255,255,0.06)",marginBottom:24,transition:"all 0.2s" }}>
            <div style={{ display:"flex",gap:12 }}>
              <div style={{ width:40,height:40,borderRadius:12,flexShrink:0,background:isAdmin?"linear-gradient(135deg,#667eea,#764ba2)":getAvatarColor(currentDisplayName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:600 }}>{currentDisplayName[0]}</div>
              <div style={{ flex:1,display:"flex",flexDirection:"column",gap:10 }}>
                <textarea value={newPost} onChange={e=>setNewPost(e.target.value)} placeholder="いま何を考えていますか？（URLは自動でリンクになります）" rows={3}
                  style={{ width:"100%",resize:"none",padding:"10px 14px",borderRadius:12,border:"1px solid rgba(255,255,255,0.08)",background:"rgba(255,255,255,0.04)",color:"#fff",fontSize:14,lineHeight:1.6,outline:"none",fontFamily:"inherit",boxSizing:"border-box" }}
                  onFocus={focusBorder} onBlur={blurBorder} />
                {pendingMedia.length > 0 && <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  {pendingMedia.map(m=><div key={m.id} style={{ position:"relative",borderRadius:10,overflow:"hidden" }}>
                    {m.type==="image" ? <img src={m.url} alt="" style={{ width:80,height:80,objectFit:"cover",display:"block",borderRadius:10 }} />
                    : <div style={{ width:80,height:80,background:"#111",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center" }}><span style={{ fontSize:11,color:"rgba(255,255,255,0.5)" }}>🎬 動画</span></div>}
                    <button onClick={()=>setPendingMedia(prev=>prev.filter(x=>x.id!==m.id))} style={{ position:"absolute",top:2,right:2,width:20,height:20,borderRadius:6,background:"rgba(0,0,0,0.7)",border:"none",color:"#fff",fontSize:11,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center" }}>✕</button>
                  </div>)}
                </div>}
                {dragOver && <div style={{ textAlign:"center",padding:12,color:"#8EAAFF",fontSize:13,fontWeight:500 }}>📎 ここにドロップして添付</div>}
              </div>
            </div>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:12,paddingLeft:52 }}>
              <div style={{ display:"flex",gap:4 }}>
                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple style={{ display:"none" }} onChange={e=>{if(e.target.files)processFiles(e.target.files);e.target.value="";}} />
                <button onClick={()=>fileInputRef.current?.click()} style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.55)",fontSize:13 }}>🖼 写真</button>
                <button onClick={()=>{const i=document.createElement("input");i.type="file";i.accept="video/*";i.multiple=true;i.onchange=e=>{if(e.target.files)processFiles(e.target.files);};i.click();}} style={{ display:"flex",alignItems:"center",gap:5,padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.55)",fontSize:13 }}>🎬 動画</button>
              </div>
              <button onClick={handlePost} disabled={!canPost} style={{ padding:"8px 20px",borderRadius:10,border:"none",cursor:canPost?"pointer":"default",background:canPost?"linear-gradient(135deg,#667eea,#764ba2)":"rgba(255,255,255,0.06)",color:canPost?"#fff":"rgba(255,255,255,0.3)",fontSize:13,fontWeight:600 }}>投稿する</button>
            </div>
          </div>

          {/* Posts */}
          {posts.length===0 && <div style={{ textAlign:"center",padding:60,color:"rgba(255,255,255,0.3)" }}><p style={{ fontSize:32,marginBottom:8 }}>💬</p><p style={{ fontSize:14 }}>まだ投稿がありません</p></div>}
          {posts.map(post=><div key={post.id} style={{ padding:20,borderRadius:16,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.05)",marginBottom:12 }}>
            <div style={{ display:"flex",alignItems:"flex-start",gap:12 }}>
              <div style={{ width:40,height:40,borderRadius:12,flexShrink:0,background:post.authorId==="admin"?"linear-gradient(135deg,#667eea,#764ba2)":getAvatarColor(post.authorName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,fontWeight:600 }}>{post.authorName[0]}</div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ display:"flex",alignItems:"center",gap:8,marginBottom:6,flexWrap:"wrap" }}>
                  <span style={{ fontWeight:600,fontSize:14 }}>{post.authorName}</span>
                  {post.authorId==="admin" && <span style={{ padding:"1px 7px",borderRadius:6,fontSize:10,fontWeight:600,background:"rgba(102,126,234,0.2)",color:"#a8b8ff" }}>管理者</span>}
                  <span style={{ color:"rgba(255,255,255,0.3)",fontSize:12 }}>@{post.authorId}</span>
                  <span style={{ color:"rgba(255,255,255,0.2)",fontSize:12 }}>{formatTime(post.timestamp)}</span>
                </div>
                {post.content && <p style={{ margin:0,fontSize:14,lineHeight:1.7,color:"rgba(255,255,255,0.85)",whiteSpace:"pre-wrap",wordBreak:"break-word" }}><RichText text={post.content} /></p>}
                <MediaGrid media={post.media} onClickMedia={m=>setLightbox(m)} />
                <div style={{ display:"flex",alignItems:"center",gap:16,marginTop:12 }}>
                  <button onClick={()=>handleLike(post.id)} style={{ display:"flex",alignItems:"center",gap:5,padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",background:post.likes.includes(currentUser)?"rgba(232,146,124,0.15)":"transparent",color:post.likes.includes(currentUser)?"#E8927C":"rgba(255,255,255,0.3)",fontSize:13 }}>
                    {post.likes.includes(currentUser)?"❤️":"🤍"} {post.likes.length>0&&post.likes.length}
                  </button>
                  {(isAdmin||post.authorId===currentUser) && <button onClick={()=>handleDeletePost(post.id)} style={{ padding:"4px 10px",borderRadius:8,border:"none",cursor:"pointer",background:"transparent",color:"rgba(255,255,255,0.2)",fontSize:12 }}>削除</button>}
                </div>
              </div>
            </div>
          </div>)}
        </>}

        {/* ===== ADMIN ===== */}
        {view==="admin" && isAdmin && <>
          <div style={{ padding:24,borderRadius:16,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)",marginBottom:24 }}>
            <h3 style={{ margin:"0 0 18px",fontSize:16,fontWeight:600,fontFamily:"Outfit" }}>ユーザー追加</h3>
            <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
              <div style={{ display:"flex",gap:10 }}>
                <input value={newUserId} onChange={e=>setNewUserId(e.target.value)} placeholder="ユーザーID" style={{...IB,flex:1}} onFocus={focusBorder} onBlur={blurBorder} />
                <input value={newUserPw} onChange={e=>setNewUserPw(e.target.value)} placeholder="パスワード" style={{...IB,flex:1}} onFocus={focusBorder} onBlur={blurBorder} />
              </div>
              <input value={newUserName} onChange={e=>setNewUserName(e.target.value)} placeholder="表示名" style={IB} onFocus={focusBorder} onBlur={blurBorder} />
              <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                <button onClick={handleAddUser} style={gradBtn}>追加</button>
                {adminMsg && <span style={{ fontSize:13,color:adminMsg.includes("✓")?"#7CE8A8":"#E8927C" }}>{adminMsg}</span>}
              </div>
            </div>
          </div>

          <div style={{ padding:24,borderRadius:16,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.06)" }}>
            <h3 style={{ margin:"0 0 18px",fontSize:16,fontWeight:600,fontFamily:"Outfit" }}>ユーザー一覧 <span style={{ fontWeight:400,color:"rgba(255,255,255,0.4)",fontSize:13 }}>({users.length}人)</span></h3>
            {users.length===0 && <p style={{ color:"rgba(255,255,255,0.3)",fontSize:14 }}>ユーザーがいません</p>}
            <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
              {users.map(user=><div key={user.id} style={{ padding:16,borderRadius:12,background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.04)",opacity:user.active?1:0.5 }}>
                {editingUser===user.userId ? <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <span style={{ fontSize:13,color:"rgba(255,255,255,0.4)",width:60 }}>表示名:</span>
                    <input value={editName} onChange={e=>setEditName(e.target.value)} style={{ flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:13,outline:"none" }} />
                  </div>
                  <div style={{ display:"flex",gap:8,alignItems:"center" }}>
                    <span style={{ fontSize:13,color:"rgba(255,255,255,0.4)",width:60 }}>PW:</span>
                    <input value={editPw} onChange={e=>setEditPw(e.target.value)} style={{ flex:1,padding:"8px 12px",borderRadius:8,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.06)",color:"#fff",fontSize:13,outline:"none" }} />
                  </div>
                  <div style={{ display:"flex",gap:6,marginTop:4 }}>
                    <button onClick={()=>saveEdit(user.userId)} style={{ padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",background:"rgba(124,232,168,0.2)",color:"#7CE8A8",fontSize:12,fontWeight:600 }}>保存</button>
                    <button onClick={()=>setEditingUser(null)} style={{ padding:"6px 14px",borderRadius:8,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",fontSize:12 }}>キャンセル</button>
                  </div>
                </div>
                : <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <div style={{ display:"flex",alignItems:"center",gap:12 }}>
                    <div style={{ width:36,height:36,borderRadius:10,background:getAvatarColor(user.displayName),display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:600 }}>{user.displayName[0]}</div>
                    <div>
                      <div style={{ fontWeight:600,fontSize:14 }}>{user.displayName}{!user.active && <span style={{ marginLeft:8,fontSize:11,color:"#E8927C" }}>無効</span>}</div>
                      <div style={{ fontSize:12,color:"rgba(255,255,255,0.35)" }}>ID: {user.userId} ・ PW: {user.password}</div>
                    </div>
                  </div>
                  <div style={{ display:"flex",gap:4 }}>
                    <button onClick={()=>startEdit(user)} style={{ padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",background:"rgba(255,255,255,0.06)",color:"rgba(255,255,255,0.5)",fontSize:11 }}>編集</button>
                    <button onClick={()=>handleToggleActive(user.userId)} style={{ padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",background:user.active?"rgba(232,212,124,0.15)":"rgba(124,232,168,0.15)",color:user.active?"#E8D47C":"#7CE8A8",fontSize:11 }}>{user.active?"無効化":"有効化"}</button>
                    <button onClick={()=>handleDeleteUser(user.userId)} style={{ padding:"5px 10px",borderRadius:7,border:"none",cursor:"pointer",background:"rgba(232,146,124,0.15)",color:"#E8927C",fontSize:11 }}>削除</button>
                  </div>
                </div>}
              </div>)}
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}
