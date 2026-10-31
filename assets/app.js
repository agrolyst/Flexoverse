import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const supabase = createClient('https://gkgjfbusdyiohiztwuec.supabase.co', 'sb_publishable_Kmm1YLrnBwDKV_1xO2DjNw_e4SzSZly')
const page = document.body.dataset.page
let session = null
let profile = null
let liked = new Set()
let acceptedFriends = []
let friendRequests = []
let profileRecord = null
let toastTimer = null

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const initials = s => String(s || 'You').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase()
const myName = () => profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Your profile'
const myUsername = () => profile?.username || session?.user?.user_metadata?.username || 'yourname'
const avatar = (name, color = 'blue', url = '') => url ? `<img class="avatar ${color}" src="${esc(url)}" alt="">` : `<span class="avatar avatar-${color}">${esc(name)}</span>`
const pageUrl = () => '/' + myUsername()
const toast = (message,type='info') => {
  const el=document.querySelector('#toast')
  if(!el)return
  const icons={
    success:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
    error:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m9 9 6 6m0-6-6 6"/></svg>',
    info:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg>'
  }
  const tone=['success','error','info'].includes(type)?type:'info'
  el.dataset.type=tone
  el.setAttribute('role',tone==='error'?'alert':'status')
  el.setAttribute('aria-live',tone==='error'?'assertive':'polite')
  el.setAttribute('aria-atomic','true')
  el.innerHTML=`<span class="toast-icon">${icons[tone]}</span><span class="toast-message">${esc(message)}</span>`
  el.classList.add('show')
  clearTimeout(toastTimer)
  toastTimer=setTimeout(()=>el.classList.remove('show'),tone==='error'?5000:3500)
}
const relationCount = value => { const raw=Array.isArray(value)?value[0]?.count:value?.count??value; const count=Number(raw??0); return Number.isFinite(count)?count:0 }

function mountShell() {
  const navItems = [['home','⌂','Home','/'],['friends','♙','Friends','/friends/'],['reels','▶','Reels','/reels/'],['chats','▤','Chats','/chats/'],['notifications','♧','Notifications','/notifications/'],['settings','⚙','Settings','/settings/']]
  const sidebarIcons = {
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>',
    friends:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    reels:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></svg>',
    chats:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-.95L3 21l1.95-5.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>',
    notifications:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.8-.7a8 8 0 0 1-1.7 1l-.3 1.9h-2.8l-.3-1.9a8 8 0 0 1-1.7-1l-1.8.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.8.7a8 8 0 0 1 1.7-1l.3-1.9h2.8l.3 1.9a8 8 0 0 1 1.7 1l1.8-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1)"/></svg>'
  }
  const shellLinks = navItems.map(([key,_glyph,label,url]) => `<a class="${page===key?'active':''}" aria-current="${page===key?'page':'false'}" href="${url}"><span class="side-glyph">${sidebarIcons[key]}</span><span class="side-link-label">${label}</span>${key==='friends'?'<span class="side-count" id="friend-count">0</span>':''}</a>`).join('')
  document.querySelector('#site-header').innerHTML = `<header class="site-header"><a class="wordmark" href="/"><span class="logo-mark">f</span><span>flexoverse</span></a><label class="header-search"><span>⌕</span><input id="global-search" placeholder="Search people" aria-label="Search people"></label><nav class="top-navigation">${navItems.slice(0,4).map(([key,glyph,label,url])=>`<a class="${page===key?'active':''}" href="${url}"><span class="nav-glyph">${glyph}</span>${label}</a>`).join('')}</nav><div class="header-actions"><a class="header-icon" href="/notifications/" aria-label="Notifications">♧<i class="ping"></i></a>${session?`<a class="user-control" href="${esc(pageUrl())}">${avatar(initials(myName()),'blue',profile?.avatar_url)}<span>${esc(myName())}</span></a><button class="header-icon" id="signout" aria-label="Sign out">↪</button>`:'<a class="login-link" href="/login/">Sign in</a>'}</div></header>`
  const sidebarName=session?myName():'Your space'
  const sidebarHandle=session?'@'+myUsername():'Sign in to set up your profile'
  const sidebarAvatar=avatar(session?initials(myName()):'FX','blue',profile?.avatar_url)
  document.querySelector('#left-sidebar').innerHTML = `<section class="mini-profile"><a href="${session?esc(pageUrl()):'/login/'}" class="mini-profile-link"><span class="mini-cover" aria-hidden="true"></span><span class="mini-profile-body">${sidebarAvatar}<span class="mini-profile-copy"><strong>${esc(sidebarName)}</strong><small>${esc(sidebarHandle)}</small></span></span><span class="mini-profile-action">${session?'View your profile':'Sign in to personalize'}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a></section><nav class="side-menu" aria-label="Primary navigation"><span class="side-label">YOUR SPACE</span>${shellLinks}</nav><footer class="side-footer"><span>About · Privacy · Terms</span><small>© 2026 Flexoverse</small></footer>`
  document.querySelector('#right-sidebar').innerHTML = `<section class="right-card card community-rail-card"><span class="rail-kicker">COMMUNITY</span><h3>Find your people</h3><p>Connect with friends and keep up with what they share.</p><a class="button button-soft" href="/friends/">Explore friends <span>→</span></a></section><section class="right-card card community-rail-card"><span class="rail-kicker">MESSAGES</span><h3>Keep in touch</h3><p>Private conversations are here for your accepted friends.</p><a class="text-link" href="/chats/">Open chats <span>→</span></a></section>`
  document.querySelector('#mobile-nav').className = 'mobile-nav'
  document.querySelector('#mobile-nav').innerHTML = navItems.filter(([key])=>key!=='notifications').map(([key,glyph,label,url])=>`<a class="${page===key?'active':''}" href="${url}"><span>${glyph}</span><small>${label}</small></a>`).join('')
  document.querySelector('#modal-root').innerHTML = ''
}

function postCard(p) {
  const user = Array.isArray(p.profiles) ? p.profiles[0] || {} : p.profiles || {}
  const name = p.name || user.full_name || 'Flexoverse member'
  const handle = p.username || user.username || 'member'
  const image = p.image || p.image_path || ''
  const id = String(p.id)
  const safeId = esc(id)
  const likeCount = relationCount(p.likes)
  const commentCount = relationCount(p.comments)
  const isLiked = liked.has(id)
  const timestamp = timeAgo(p.created_at)
  return `<article class="post card" id="post-${safeId}" data-post="${safeId}"><div class="post-top">${avatar(p.initials||initials(name),p.color||'blue',p.avatar_url||user.avatar_url)}<div class="post-user"><a href="/${encodeURIComponent(handle)}"><strong>${esc(name)}</strong></a><small>@${esc(handle)} · ${esc(timestamp)}</small></div><button class="more-button" data-toast="More post options" aria-label="Post options">···</button></div><p class="post-text">${esc(p.content)}</p>${image?`<img class="post-photo" src="${esc(image)}" alt="Post image">`:''}<div class="post-meta"><span data-like-count="${safeId}" data-count="${likeCount}">♡ ${likeCount} ${likeCount===1?'person':'people'}</span><span data-comment-count="${safeId}">${commentCount} ${commentCount===1?'comment':'comments'}</span></div><div class="post-actions"><button data-like="${safeId}" class="${isLiked?'liked':''}" aria-pressed="${isLiked}">${isLiked?'♥':'♡'} <span>${isLiked?'Liked':'Like'}</span></button><button data-comment="${safeId}" aria-expanded="false">▱ <span>Comment</span></button><button data-share>↗ <span>Share</span></button></div><section class="post-comments" data-comments-panel hidden><div class="comment-list" data-comment-list>Open comments to load them.</div>${session?`<form class="comment-form" data-comment-form="${safeId}"><input name="content" maxlength="1000" required placeholder="Write a comment…" aria-label="Write a comment"><button class="button button-primary" type="submit">Send</button></form>`:`<p class="comment-signin"><a href="/login/">Sign in</a> to join the conversation.</p>`}</section></article>`
}

function timeAgo(value) {
  if (!value) return 'just now'
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000))
  if (!Number.isFinite(seconds)) return 'just now'
  if (seconds < 60) return 'just now'
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`
  return new Date(value).toLocaleDateString()
}

async function loadHome() {
  const feed = document.querySelector('#feed-list')
  if (!feed) return
  feed.innerHTML = '<div class="feed-state card">Loading posts from the community…</div>'
  const {data,error}=await supabase.from('posts').select('id,user_id,content,image_path,created_at,profiles(full_name,username,avatar_url),likes(count),comments(count)').order('created_at',{ascending:false}).limit(30)
  if (error) {
    console.error('Could not load public posts:', error)
    feed.innerHTML = '<div class="feed-state card"><strong>Posts could not load</strong><span>Check your connection and try again.</span><button class="button button-outline" data-retry-feed>Try again</button></div>'
    return
  }
  const posts = data || []
  liked = new Set()
  if (session && posts.length) {
    const {data:myLikes,error:likesError}=await supabase.from('likes').select('post_id').eq('user_id',session.user.id).in('post_id',posts.map(post=>post.id))
    if (!likesError) liked = new Set((myLikes || []).map(row=>String(row.post_id)))
  }
  feed.innerHTML = posts.length ? posts.map(postCard).join('') : '<section class="empty-feed card"><span class="empty-feed-icon">✦</span><h3>No posts yet</h3><p>There are no public posts in the community yet. Share the first one.</p><a class="button button-primary" href="/create/">Create a post</a></section>'
}

async function loadComments(postId, article) {
  const list = article.querySelector('[data-comment-list]')
  if (!list) return
  list.innerHTML = '<p class="comment-state">Loading comments…</p>'
  const {data,error}=await supabase.from('comments').select('id,content,created_at,profiles(full_name,username)').eq('post_id',postId).order('created_at',{ascending:true}).limit(30)
  if (error) {
    console.error('Could not load comments:', error)
    list.innerHTML = '<p class="comment-state">Comments could not load. Please try again.</p>'
    return
  }
  const comments = data || []
  const profile = row => Array.isArray(row.profiles) ? row.profiles[0] || {} : row.profiles || {}
  list.innerHTML = comments.length ? comments.map(row=>{const author=profile(row);return `<article class="comment-item"><strong>${esc(author.full_name||author.username||'Flexoverse member')}</strong><p>${esc(row.content)}</p><small>${esc(timeAgo(row.created_at))}</small></article>`}).join('') : '<p class="comment-state">No comments yet. Start the conversation.</p>'
  const count = article.querySelector('[data-comment-count]')
  if (count) count.textContent = `${comments.length} ${comments.length===1?'comment':'comments'}`
}

async function loadFriends() {
  if(!session)return
  const {data,error}=await supabase.from('friend_requests').select('id,from_user_id,to_user_id,status,created_at').or(`from_user_id.eq.${session.user.id},to_user_id.eq.${session.user.id}`).order('created_at',{ascending:false})
  if(error)return toast(error.message,'error')
  friendRequests=(data||[]).filter(r=>r.status==='pending'&&r.to_user_id===session.user.id)
  acceptedFriends=(data||[]).filter(r=>r.status==='accepted').map(r=>r.from_user_id===session.user.id?r.to_user_id:r.from_user_id)
  const ids=[...new Set([...friendRequests.map(r=>r.from_user_id),...acceptedFriends])]
  const {data:people}=ids.length?await supabase.from('profiles').select('id,username,full_name,avatar_url').in('id',ids):{data:[]}
  const byId=Object.fromEntries((people||[]).map(p=>[p.id,p]))
  document.querySelector('#request-count').textContent=friendRequests.length
  document.querySelector('#friends-count').textContent=acceptedFriends.length
  document.querySelector('#requests-list').innerHTML=friendRequests.length?friendRequests.map(r=>{const p=byId[r.from_user_id]||{};return `<div class="friend-request-row">${avatar(initials(p.full_name), 'peach',p.avatar_url)}<div class="request-user"><strong>${esc(p.full_name||'Flexoverse member')}</strong><small>@${esc(p.username||'member')}</small></div><div class="request-actions"><button class="button button-primary" data-accept="${r.id}">Accept</button><button class="quiet-button" data-ignore="${r.id}">Ignore</button></div></div>`}).join(''):'<div class="empty-inline">Your new friend requests will appear here.</div>'
  document.querySelector('#friends-list').innerHTML=acceptedFriends.length?acceptedFriends.map(id=>{const p=byId[id]||{};return `<div class="friend-list-row">${avatar(initials(p.full_name),'mint',p.avatar_url)}<div><strong>${esc(p.full_name||'Flexoverse member')}</strong><small>@${esc(p.username||'member')}</small></div><a class="button button-outline" href="/chats/">Message</a></div>`}).join(''):'<div class="empty-inline">Your friends will appear here once you connect.</div>'
  const {data:suggestions}=await supabase.from('profiles').select('id,username,full_name,avatar_url').neq('id',session.user.id).limit(9)
  const exclude=new Set([...ids,session.user.id])
  const filtered=(suggestions||[]).filter(p=>!exclude.has(p.id))
  if(filtered.length)document.querySelector('#suggestions-list').innerHTML=filtered.map((p,i)=>`<article class="person-card card"><div class="person-cover ${['cover-mint','cover-peach','cover-violet'][i%3]}"></div><div class="person-content">${avatar(initials(p.full_name),'blue',p.avatar_url)}<strong>${esc(p.full_name||'Flexoverse member')}</strong><small>@${esc(p.username)}</small><button class="button button-outline" data-request="${p.id}">＋ Add friend</button></div></article>`).join('')
  const count=document.querySelector('#friend-count');if(count)count.textContent=friendRequests.length||''
}

async function loadProfilePage() {
  const fromPath=decodeURIComponent(location.pathname.split('/').filter(Boolean).pop()||'').toLowerCase()
  const handle=fromPath==='profile'?new URLSearchParams(location.search).get('username')||profile?.username:fromPath
  if(!handle){document.querySelector('#profile-name').textContent='Your profile';document.querySelector('#profile-username').textContent='Sign in to view your profile';return}
  const {data,error}=await supabase.from('profiles').select('id,username,full_name,bio,avatar_url,is_public,search_index_enabled').eq('username',handle).maybeSingle()
  if(error||!data){document.querySelector('#profile-name').textContent='Profile not found';document.querySelector('#profile-username').textContent=`@${handle}`;return}
  profileRecord=data
  document.title=`${data.full_name||data.username} · Flexoverse`
  document.querySelector('#profile-name').textContent=data.full_name||data.username
  document.querySelector('#profile-username').textContent=`@${data.username}`
  document.querySelector('#profile-bio').textContent=data.bio||''
  const action=document.querySelector('#profile-action');const mine=session?.user?.id===data.id
  if(mine){action.textContent='Edit profile';action.onclick=()=>location.href='/settings/'}else{action.textContent='Add friend';action.onclick=()=>sendFriendRequest(data.id)}
  const {data:posts}=await supabase.from('posts').select('id,user_id,content,image_path,created_at,profiles(full_name,username,avatar_url),likes(count)').eq('user_id',data.id).order('created_at',{ascending:false}).limit(20)
  document.querySelector('#profile-posts').innerHTML=(posts||[]).map(postCard).join()||'<div class="empty-inline card">No public posts yet.</div>'
  const robots=document.querySelector('meta[name="robots"]');if(robots)robots.content=data.is_public&&data.search_index_enabled?'index,follow':'noindex,nofollow'
}

function authReturnPath() {
  const requested=new URLSearchParams(location.search).get('next')
  const target=requested||(page==='login'||page==='signup'?'/':location.pathname+location.search)
  return target.startsWith('/')&&!target.startsWith('//')&&!/^\/(login|signup)(\/|$)/.test(target)?target:'/'
}
function authPageHref(targetPage) { return `/${targetPage}/?next=${encodeURIComponent(authReturnPath())}` }
function openAuth() { location.href=authPageHref('login') }
async function sendFriendRequest(id) {
  if(!session)return openAuth()
  const {error}=await supabase.from('friend_requests').insert({from_user_id:session.user.id,to_user_id:id})
  if(error){toast(error.code==='23505'?'A request already exists.':error.message,error.code==='23505'?'info':'error');return}
  toast('Friend request sent.','success')
}

async function initialize() {
  mountShell()
  const {data}=await supabase.auth.getSession();session=data.session
  if(session){const {data:row}=await supabase.from('profiles').select('id,username,full_name,bio,avatar_url,is_public').eq('id',session.user.id).maybeSingle();profile=row}
  if(session&&(page==='login'||page==='signup')){location.replace(authReturnPath());return}
  const signupLink=document.querySelector('#switch-to-signup');if(signupLink)signupLink.href=authPageHref('signup')
  const loginLink=document.querySelector('#switch-to-login');if(loginLink)loginLink.href=authPageHref('login')
  mountShell()
  const composerAvatar=document.querySelector('[data-user-avatar]');if(composerAvatar)composerAvatar.outerHTML=avatar(session?initials(myName()):'FX','blue',profile?.avatar_url)
  if(page==='home')await loadHome()
  if(page==='friends')await loadFriends()
  if(page==='profile')await loadProfilePage()
  if(page==='create'){const name=document.querySelector('#post-author-name');if(name)name.textContent=myName();const handle=document.querySelector('#post-author-handle');if(handle)handle.textContent='@'+myUsername();const photo=document.querySelector('#post-author-avatar');if(photo)photo.outerHTML=avatar(initials(myName()),'blue',profile?.avatar_url)}
  if(page==='settings'&&profile){document.querySelector('#full-name').value=profile.full_name||'';document.querySelector('#username-field').value=profile.username||'';document.querySelector('#bio-field').value=profile.bio||'';document.querySelector('#public-profile').checked=profile.is_public;document.querySelector('#profile-link').textContent=`/${profile.username}`}
  bindEvents()
  supabase.auth.onAuthStateChange((event,next)=>{session=next;if(event==='SIGNED_OUT')location.reload()})
}

function bindEvents() {
  document.querySelector('#signup-username')?.addEventListener('input',async e=>{const value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'');e.target.value=value;const hint=document.querySelector('#username-hint');if(!/^[a-z0-9]{3,30}$/.test(value)){hint.textContent='Use 3–30 letters or numbers.';return}hint.textContent='Checking availability…';const {data,error}=await supabase.from('profiles').select('username').eq('username',value).maybeSingle();hint.textContent=error?'Could not check yet.':data?'Taken — try adding a number.':'Available ✓'})
  document.querySelector('#login-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {error}=await supabase.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)return toast(error.message,'error');location.replace(authReturnPath())})
  document.querySelector('#signup-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const username=String(f.get('username')||'').toLowerCase();if(!/^[a-z0-9]{3,30}$/.test(username))return toast('Use 3–30 letters or numbers for your username.','error');const {data,error}=await supabase.auth.signUp({email:f.get('email'),password:f.get('password'),options:{data:{full_name:f.get('name'),username}}});if(error)return toast(error.message,'error');if(data.session){location.replace(authReturnPath());return}const message=document.querySelector('#signup-message');if(message)message.textContent='Account created. Check your email to confirm it, then sign in.'})
  document.querySelector('#signout')?.addEventListener('click',()=>supabase.auth.signOut())
  document.querySelector('#post-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!session){openAuth();return}const content=String(new FormData(e.currentTarget).get('content')||'').trim();if(!content)return;const submit=e.currentTarget.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Sharing…';const {error}=await supabase.from('posts').insert({user_id:session.user.id,content});if(error){submit.disabled=false;submit.textContent='Share post';return toast(error.message,'error')}toast('Your post was shared.','success');e.currentTarget.reset();if(page==='create'){setTimeout(()=>location.href='/',700)}else{submit.disabled=false;submit.textContent='Share post';await loadHome()}})
  document.querySelector('#post-content')?.addEventListener('input',e=>{const count=document.querySelector('#post-count');if(count)count.textContent=`${e.target.value.length} / 2000`})
  document.querySelector('#feed-list')?.addEventListener('click',async e=>{
    if(e.target.closest('[data-retry-feed]'))return loadHome()
    const likeButton=e.target.closest('[data-like]')
    if(likeButton){
      if(!session)return openAuth()
      const postId=likeButton.dataset.like
      const wasLiked=liked.has(postId)
      likeButton.disabled=true
      const result=wasLiked
        ?await supabase.from('likes').delete().eq('post_id',postId).eq('user_id',session.user.id)
        :await supabase.from('likes').insert({post_id:postId,user_id:session.user.id})
      likeButton.disabled=false
      if(result.error){
        if(result.error.code==='23505'&&!wasLiked){liked.add(postId);likeButton.classList.add('liked');likeButton.setAttribute('aria-pressed','true');likeButton.innerHTML='♥ <span>Liked</span>';return}
        toast(result.error.message,'error');return
      }
      if(wasLiked)liked.delete(postId);else liked.add(postId)
      likeButton.classList.toggle('liked',!wasLiked)
      likeButton.setAttribute('aria-pressed',String(!wasLiked))
      likeButton.innerHTML=`${wasLiked?'♡':'♥'} <span>${wasLiked?'Like':'Liked'}</span>`
      const total=likeButton.closest('.post')?.querySelector('[data-like-count]')
      if(total){const count=Math.max(0,Number(total.dataset.count||0)+(wasLiked?-1:1));total.dataset.count=String(count);total.textContent=`♡ ${count} ${count===1?'person':'people'}`}
      toast(wasLiked?'Like removed.':'You liked this post.','success')
      return
    }
    const commentButton=e.target.closest('[data-comment]')
    if(commentButton){
      const article=commentButton.closest('.post')
      const panel=article?.querySelector('[data-comments-panel]')
      if(!panel)return
      panel.hidden=!panel.hidden
      commentButton.setAttribute('aria-expanded',String(!panel.hidden))
      if(!panel.hidden)await loadComments(commentButton.dataset.comment,article)
      return
    }
    const shareButton=e.target.closest('[data-share]')
    if(shareButton){
      const post=shareButton.closest('.post')
      const postUrl=`${location.origin}/#${post?.id||''}`
      try{await navigator.clipboard.writeText(postUrl);toast('Post link copied.','success')}catch{toast('Copy this post link from your browser address bar.')}
    }
  })
  document.querySelector('#feed-list')?.addEventListener('submit',async e=>{
    const form=e.target.closest('[data-comment-form]')
    if(!form)return
    e.preventDefault()
    if(!session)return openAuth()
    const content=String(new FormData(form).get('content')||'').trim()
    if(!content)return
    const postId=form.dataset.commentForm
    const article=form.closest('.post')
    const submit=form.querySelector('[type="submit"]')
    submit.disabled=true
    const {error}=await supabase.from('comments').insert({post_id:postId,user_id:session.user.id,content})
    submit.disabled=false
    if(error){toast(error.message,'error');return}
    form.reset()
    await loadComments(postId,article)
    toast('Comment added.','success')
  })
  document.querySelector('#suggestions-list')?.addEventListener('click',e=>{const b=e.target.closest('[data-request]');if(b)sendFriendRequest(b.dataset.request)})
  document.querySelector('#requests-list')?.addEventListener('click',async e=>{const accept=e.target.closest('[data-accept]');const ignore=e.target.closest('[data-ignore]');if(accept){const {error}=await supabase.from('friend_requests').update({status:'accepted'}).eq('id',accept.dataset.accept);if(error)toast(error.message,'error');else{await loadFriends();toast('You’re friends now.','success')}}if(ignore){const {error}=await supabase.from('friend_requests').delete().eq('id',ignore.dataset.ignore);if(error)toast(error.message,'error');else await loadFriends()}})
  document.querySelector('#profile-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!session)return openAuth();const f=new FormData(e.currentTarget);const username=String(f.get('username')).trim().toLowerCase();if(!/^[a-z0-9]{3,30}$/.test(username))return toast('Use 3–30 letters or numbers for your username.','error');const {error}=await supabase.from('profiles').update({username,full_name:f.get('full_name'),bio:f.get('bio'),is_public:document.querySelector('#public-profile').checked}).eq('id',session.user.id);if(error)return toast(error.code==='23505'?'That username is taken. Try adding a number.':error.message,'error');await supabase.auth.updateUser({data:{username}});toast('Profile saved.','success');document.querySelector('#profile-link').textContent=`/${username}`})
  document.querySelector('#username-field')?.addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'');document.querySelector('#profile-link').textContent=`/${e.target.value}`})
  document.querySelector('#message-form')?.addEventListener('submit',e=>{e.preventDefault();toast('Chat messages are being connected next.')})
  document.querySelector('#global-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){const value=e.target.value.trim().replace(/^@/,'').toLowerCase();if(value)location.href=`/${encodeURIComponent(value)}`}})
  document.querySelectorAll('[data-toast]').forEach(b=>b.addEventListener('click',()=>toast(b.dataset.toast)))
  document.querySelectorAll('[data-friend-request]').forEach(b=>b.addEventListener('click',()=>session?toast('Find a person in search to send a friend request.'):openAuth()))
  document.querySelector('#notification-action')?.addEventListener('click',openAuth)
  window.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();document.querySelector('#global-search')?.focus()}if(e.key==='Escape')document.querySelectorAll('.modal-backdrop').forEach(m=>m.hidden=true)})
}

function showAppLoader() {
  const loader=document.createElement('div')
  loader.className='app-loader'
  loader.setAttribute('role','status')
  loader.setAttribute('aria-live','polite')
  loader.innerHTML='<div class="app-loader-content"><span class="app-loader-symbol" aria-hidden="true"><span class="logo-mark">f</span></span><span class="app-loader-label">Getting your circle ready</span></div>'
  document.body.append(loader)
  return loader
}

const loaderStartedAt=performance.now()
const appLoader=showAppLoader()
initialize()
  .catch(error=>{console.error(error);const feed=document.querySelector('#feed-list');if(feed)feed.innerHTML='<div class="feed-state card"><strong>The feed is unavailable</strong><span>Check your connection and refresh the page.</span></div>';toast('Could not connect. Refresh and try again.','error')})
  .finally(()=>{
    const minimumTime=320
    const remaining=Math.max(0,minimumTime-(performance.now()-loaderStartedAt))
    setTimeout(()=>{appLoader.classList.add('is-hidden');setTimeout(()=>appLoader.remove(),240)},remaining)
  })
