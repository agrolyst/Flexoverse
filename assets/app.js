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
let reelItems = []
let reelViewerIndex = -1
let reelPreviewObserver = null
let chatItems = []
let activeConversationId = null
let activeChatMessages = []
let chatRealtimeChannel = null
let notificationItems = []
let notificationFilter = 'all'
let notificationRealtimeChannel = null

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
  const navItems = [['home','Home','/'],['friends','Friends','/friends/'],['reels','Reels','/reels/'],['chats','Chats','/chats/'],['notifications','Notifications','/notifications/'],['settings','Settings','/settings/']]
  const activePage=key=>page===key||(key==='reels'&&page==='reel-create')
  const brandIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 19a5.2 5.2 0 0 1 10.4 0v1H2.8zM14 15.3a4.4 4.4 0 0 1 7.2 3.4v1h-6"/></svg>'
  const searchIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.3 4.3"/></svg>'
  const signoutIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>'
  const sidebarIcons = {
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>',
    friends:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    reels:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></svg>',
    chats:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-.95L3 21l1.95-5.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>',
    notifications:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.8-.7a8 8 0 0 1-1.7 1l-.3 1.9h-2.8l-.3-1.9a8 8 0 0 1-1.7-1l-1.8.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.8.7a8 8 0 0 1 1.7-1l.3-1.9h2.8l.3 1.9a8 8 0 0 1 1.7 1l1.8-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1)"/></svg>'
  }
  const shellLinks = navItems.map(([key,label,url]) => `<a class="${activePage(key)?'active':''}" aria-current="${activePage(key)?'page':'false'}" href="${url}"><span class="side-glyph">${sidebarIcons[key]}</span><span class="side-link-label">${label}</span>${key==='friends'?'<span class="side-count" id="friend-count">0</span>':''}</a>`).join('')
  document.querySelector('#site-header').innerHTML = `<header class="site-header"><a class="wordmark" href="/" aria-label="Flexoverse home"><span class="logo-mark">${brandIcon}</span><span>Flexoverse</span></a><label class="header-search"><span class="search-icon">${searchIcon}</span><input id="global-search" placeholder="Search people" aria-label="Search people"><kbd class="search-shortcut">/</kbd></label><nav class="top-navigation" aria-label="Main navigation">${navItems.slice(0,4).map(([key,label,url])=>`<a class="${activePage(key)?'active':''}" aria-current="${activePage(key)?'page':'false'}" aria-label="${label}" href="${url}"><span class="nav-glyph">${sidebarIcons[key]}</span><span class="nav-label">${label}</span></a>`).join('')}</nav><div class="header-actions"><a class="header-icon" id="notifications-link" href="/notifications/" aria-label="Notifications">${sidebarIcons.notifications}<span class="notification-count" id="header-notification-count" hidden>0</span></a>${session?`<a class="user-control" href="${esc(pageUrl())}">${avatar(initials(myName()),'blue',profile?.avatar_url)}<span>${esc(myName())}</span></a><button class="header-icon" id="signout" aria-label="Sign out">${signoutIcon}</button>`:'<a class="login-link" href="/login/">Sign in</a>'}</div></header>`
  const sidebarName=session?myName():'Your space'
  const sidebarHandle=session?'@'+myUsername():'Sign in to set up your profile'
  const sidebarAvatar=avatar(session?initials(myName()):'FX','blue',profile?.avatar_url)
  document.querySelector('#left-sidebar').innerHTML = `<section class="mini-profile"><a href="${session?esc(pageUrl()):'/login/'}" class="mini-profile-link"><span class="mini-cover" aria-hidden="true"></span><span class="mini-profile-body">${sidebarAvatar}<span class="mini-profile-copy"><strong>${esc(sidebarName)}</strong><small>${esc(sidebarHandle)}</small></span></span><span class="mini-profile-action">${session?'View your profile':'Sign in to personalize'}<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a></section><nav class="side-menu" aria-label="Primary navigation"><span class="side-label">YOUR SPACE</span>${shellLinks}</nav><footer class="side-footer"><span>About · Privacy · Terms</span><small>© 2026 Flexoverse</small></footer>`
  document.querySelector('#right-sidebar').innerHTML = `<section class="right-card card community-rail-card"><span class="rail-kicker">COMMUNITY</span><h3>Find your people</h3><p>Connect with friends and keep up with what they share.</p><a class="button button-soft" href="/friends/">Explore friends <span>→</span></a></section><section class="right-card card community-rail-card"><span class="rail-kicker">MESSAGES</span><h3>Keep in touch</h3><p>Private conversations are here for your accepted friends.</p><a class="text-link" href="/chats/">Open chats <span>→</span></a></section>`
  document.querySelector('#mobile-nav').className = 'mobile-nav'
  document.querySelector('#mobile-nav').innerHTML = navItems.filter(([key])=>key!=='notifications').map(([key,label,url])=>`<a class="${activePage(key)?'active':''}" aria-label="${label}" aria-current="${activePage(key)?'page':'false'}" href="${url}"><span class="mobile-nav-icon">${sidebarIcons[key]}</span><small>${label}</small></a>`).join('')
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
  if(location.hash.startsWith('#post-'))requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:'smooth',block:'start'}))
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

function friendEmptyState(title,description,action='') {
  return `<div class="friends-empty-state"><span class="friends-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 19a5.2 5.2 0 0 1 10.4 0v1H2.8zM14 15.3a4.4 4.4 0 0 1 7.2 3.4v1h-6"/></svg></span><strong>${esc(title)}</strong><p>${esc(description)}</p>${action}</div>`
}

async function loadFriends() {
  const requests=document.querySelector('#requests-list')
  const connections=document.querySelector('#friends-list')
  const suggestionsList=document.querySelector('#suggestions-list')
  if(!session){
    document.querySelector('#request-count').textContent='0'
    document.querySelector('#request-section-count').textContent='0'
    document.querySelector('#friends-count').textContent='0'
    requests.innerHTML=friendEmptyState('Sign in to check requests','Friend requests from your community will be waiting here.','<a class="button button-outline" href="/login/">Sign in</a>')
    suggestionsList.innerHTML=friendEmptyState('Find your people','Sign in to discover members and send friend requests.','<a class="button button-outline" href="/login/">Sign in</a>')
    connections.innerHTML=friendEmptyState('Your circle starts here','Sign in to see your friends and keep in touch.','<a class="button button-outline" href="/login/">Sign in</a>')
    return
  }
  const {data,error}=await supabase.from('friend_requests').select('id,from_user_id,to_user_id,status,created_at').or(`from_user_id.eq.${session.user.id},to_user_id.eq.${session.user.id}`).order('created_at',{ascending:false})
  if(error){
    toast(error.message,'error')
    const retry='<button class="button button-outline" data-retry-friends>Try again</button>'
    requests.innerHTML=friendEmptyState('Could not load requests','Check your connection and try again.',retry)
    connections.innerHTML=friendEmptyState('Could not load your friends','Check your connection and try again.',retry)
    suggestionsList.innerHTML=friendEmptyState('Could not find people','Check your connection and try again.',retry)
    return
  }
  friendRequests=(data||[]).filter(r=>r.status==='pending'&&r.to_user_id===session.user.id)
  const sentRequests=(data||[]).filter(r=>r.status==='pending'&&r.from_user_id===session.user.id)
  acceptedFriends=(data||[]).filter(r=>r.status==='accepted').map(r=>r.from_user_id===session.user.id?r.to_user_id:r.from_user_id)
  const acceptedIds=[...new Set(acceptedFriends)]
  const sentIds=new Set(sentRequests.map(r=>r.to_user_id))
  const ids=[...new Set([...friendRequests.map(r=>r.from_user_id),...acceptedIds,...sentIds])]
  const {data:people,error:peopleError}=ids.length?await supabase.from('profiles').select('id,username,full_name,avatar_url').in('id',ids):{data:[],error:null}
  if(peopleError){toast(peopleError.message,'error')}
  const byId=Object.fromEntries((people||[]).map(p=>[p.id,p]))
  document.querySelector('#request-count').textContent=friendRequests.length
  document.querySelector('#request-section-count').textContent=friendRequests.length
  document.querySelector('#friends-count').textContent=acceptedIds.length
  const sidebarCount=document.querySelector('#friend-count');if(sidebarCount)sidebarCount.textContent=friendRequests.length||''

  requests.innerHTML=friendRequests.length?friendRequests.map(r=>{const p=byId[r.from_user_id]||{};const name=p.full_name||'Flexoverse member';return `<article class="friend-request-item"><div class="friend-request-person">${avatar(initials(name),'peach',p.avatar_url)}<div class="friend-contact-copy"><strong>${esc(name)}</strong><small>@${esc(p.username||'member')} <span>·</span> ${esc(timeAgo(r.created_at))}</small></div></div><div class="friend-request-actions"><button class="button button-primary" data-accept="${esc(r.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg><span>Accept</span></button><button class="button button-muted" data-ignore="${esc(r.id)}">Ignore</button></div></article>`}).join(''):friendEmptyState('No requests right now','When someone asks to connect, you can review it here.')

  connections.innerHTML=acceptedIds.length?acceptedIds.map(id=>{const p=byId[id]||{};const name=p.full_name||'Flexoverse member';return `<article class="friend-contact" data-search-text="${esc(`${name} ${p.username||''}`.toLowerCase())}">${avatar(initials(name),'mint',p.avatar_url)}<div class="friend-contact-copy"><strong>${esc(name)}</strong><small>@${esc(p.username||'member')}</small></div><a class="button button-outline" href="/chats/"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-.95L3 21l1.95-5.5A8.5 8.5 0 1 1 21 11.5Z"/></svg><span>Message</span></a></article>`}).join('')+'<div class="friends-filter-empty" data-empty-results hidden>No friends match that search.</div>':friendEmptyState('Your circle starts here','Discover people in the community and connect with them.')

  const {data:suggestions,error:suggestionError}=await supabase.from('profiles').select('id,username,full_name,avatar_url').eq('is_public',true).neq('id',session.user.id).limit(24)
  if(suggestionError){toast(suggestionError.message,'error');suggestionsList.innerHTML=friendEmptyState('Could not find people','Check your connection and try again.','<button class="button button-outline" data-retry-friends>Try again</button>');return}
  const exclude=new Set([...friendRequests.map(r=>r.from_user_id),...acceptedIds,session.user.id])
  const filtered=(suggestions||[]).filter(p=>!exclude.has(p.id))
  const requestIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>'
  const sentIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>'
  suggestionsList.innerHTML=filtered.length?filtered.map((p,i)=>{const name=p.full_name||'Flexoverse member';const pending=sentIds.has(p.id);return `<article class="friend-person-card card" data-search-text="${esc(`${name} ${p.username||''}`.toLowerCase())}"><div class="friend-person-cover friend-cover-${i%3}"></div><div class="friend-person-content">${avatar(initials(name),'blue',p.avatar_url)}<strong>${esc(name)}</strong><small>@${esc(p.username||'member')}</small><button class="button ${pending?'button-request-sent':'button-outline'}" data-request="${esc(p.id)}" ${pending?'disabled':''}>${pending?sentIcon:requestIcon}<span>${pending?'Request sent':'Add friend'}</span></button></div></article>`}).join('')+'<div class="friends-filter-empty" data-empty-results hidden>No people match that search.</div>':friendEmptyState('No new people to show','You’re up to date. Check back as more people join the community.')
}

async function loadReels() {
  const list=document.querySelector('#reels-list')
  if(!list)return
  const {data,error}=await supabase.from('reels').select('id,user_id,caption,video_path,created_at,profiles(full_name,username,avatar_url)').order('created_at',{ascending:false}).limit(30)
  if(error){toast(error.message,'error');list.innerHTML=`<div class="reels-empty-state card"><span class="reels-empty-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 8v4m0 4h.01"/><circle cx="12" cy="12" r="9"/></svg></span><strong>Reels are unavailable</strong><p>Check your connection and try again.</p><button class="button button-outline" data-retry-reels>Try again</button></div>`;return}
  const rows=data||[]
  let urlByPath={}
  if(rows.length){
    const {data:urls,error:urlError}=await supabase.storage.from('reels').createSignedUrls(rows.map(r=>r.video_path),3600)
    if(urlError){toast(urlError.message,'error');list.innerHTML=`<div class="reels-empty-state card"><strong>Videos could not be loaded</strong><p>Refresh the page and try again.</p></div>`;return}
    urlByPath=Object.fromEntries((urls||[]).filter(u=>u.signedUrl).map(u=>[u.path,u.signedUrl]))
  }
  reelItems=rows.map(row=>{const user=Array.isArray(row.profiles)?row.profiles[0]||{}:row.profiles||{};return{id:row.id,user_id:row.user_id,caption:row.caption||'',video_path:row.video_path,video_url:urlByPath[row.video_path],created_at:row.created_at,user}}).filter(reel=>reel.video_url)
  if(!reelItems.length){
    list.innerHTML=`<div class="reels-empty-state card"><span class="reels-empty-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></svg></span><strong>The reel feed is ready for its first video</strong><p>When community members share reels, they’ll appear here. You can start the feed with a short video of your own.</p><a class="button button-primary" href="/reels/create/">Create a reel</a></div>`
    return
  }
  const playIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 6 10 6-10 6z"/></svg>'
  const shareIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4"/></svg>'
  list.innerHTML=reelItems.map((reel,index)=>{const name=reel.user.full_name||reel.user.username||'Flexoverse member';const username=reel.user.username||'member';return `<article class="reel-card" data-reel-card="${index}"><video class="reel-preview" src="${esc(reel.video_url)}" muted playsinline loop preload="metadata" aria-label="Video reel by ${esc(name)}"></video><div class="reel-card-shade"></div><button class="reel-open" type="button" data-open-reel="${index}" aria-label="Watch reel by ${esc(name)}">${playIcon}<span>Watch</span></button><div class="reel-card-details"><a class="reel-author" href="/${encodeURIComponent(username)}">${avatar(initials(name),'white',reel.user.avatar_url)}<span><strong>${esc(name)}</strong><small>@${esc(username)} · ${esc(timeAgo(reel.created_at))}</small></span></a>${reel.caption?`<p>${esc(reel.caption)}</p>`:''}<button class="reel-share" type="button" data-share-reel="${esc(reel.id)}" aria-label="Share reel">${shareIcon}<span>Share</span></button></div></article>`}).join('')
  observeReelPreviews()
  const sharedId=new URLSearchParams(location.search).get('id')
  if(sharedId){const index=reelItems.findIndex(reel=>reel.id===sharedId);if(index>=0)openReelViewer(index)}
}

function observeReelPreviews() {
  const list=document.querySelector('#reels-list')
  if(!list||!('IntersectionObserver'in window))return
  reelPreviewObserver?.disconnect()
  reelPreviewObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{const video=entry.target;if(reelViewerIndex>=0||window.matchMedia('(prefers-reduced-motion: reduce)').matches){video.pause();return}if(entry.isIntersecting&&entry.intersectionRatio>=.65)video.play().catch(()=>{});else video.pause()}),{root:null,threshold:[0,.35,.65,1]})
  list.querySelectorAll('.reel-preview').forEach(video=>reelPreviewObserver.observe(video))
}

function openReelViewer(index) {
  if(index<0||index>=reelItems.length)return
  reelViewerIndex=index
  reelPreviewObserver?.disconnect()
  document.querySelectorAll('.reel-preview').forEach(video=>video.pause())
  const root=document.querySelector('#reel-viewer-root')
  if(!root)return
  const reel=reelItems[index]
  const name=reel.user.full_name||reel.user.username||'Flexoverse member'
  const username=reel.user.username||'member'
  root.innerHTML=`<div class="reel-viewer" role="dialog" aria-modal="true" aria-label="Reel by ${esc(name)}"><button class="reel-viewer-backdrop" type="button" data-close-reel aria-label="Close reel"></button><section class="reel-viewer-shell"><button class="reel-viewer-close" type="button" data-close-reel aria-label="Close reel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><button class="reel-viewer-step reel-viewer-previous" type="button" data-reel-step="-1" aria-label="Previous reel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg></button><div class="reel-viewer-frame"><video id="active-reel-video" src="${esc(reel.video_url)}" controls playsinline autoplay preload="auto" aria-label="Reel by ${esc(name)}"></video><div class="reel-viewer-info"><a class="reel-author" href="/${encodeURIComponent(username)}">${avatar(initials(name),'white',reel.user.avatar_url)}<span><strong>${esc(name)}</strong><small>@${esc(username)} · ${esc(timeAgo(reel.created_at))}</small></span></a>${reel.caption?`<p>${esc(reel.caption)}</p>`:''}<button class="reel-share" type="button" data-share-reel="${esc(reel.id)}"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 7 6.6 4.4"/></svg><span>Share reel</span></button></div></div><button class="reel-viewer-step reel-viewer-next" type="button" data-reel-step="1" aria-label="Next reel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button></section><span class="reel-viewer-position">${index+1} / ${reelItems.length}</span></div>`
  document.body.classList.add('reel-viewer-open')
  const video=root.querySelector('video')
  video.muted=false
  video.play().catch(()=>{video.muted=true;video.play().catch(()=>{})})
  root.querySelector('.reel-viewer-close')?.focus()
}

function closeReelViewer() {
  const root=document.querySelector('#reel-viewer-root')
  root?.querySelector('video')?.pause()
  if(root)root.innerHTML=''
  reelViewerIndex=-1
  document.body.classList.remove('reel-viewer-open')
  observeReelPreviews()
}

function stepReelViewer(step) {
  if(!reelItems.length)return
  const next=(reelViewerIndex+step+reelItems.length)%reelItems.length
  openReelViewer(next)
}

async function shareReel(id) {
  const url=`${location.origin}/reels/?id=${encodeURIComponent(id)}`
  try{await navigator.clipboard.writeText(url);toast('Reel link copied.','success')}catch{toast('Open the reel and copy its link from the address bar.')}
}

function prepareReelComposer() {
  const form=document.querySelector('#reel-form')
  if(!form)return
  if(!session){form.innerHTML=`<div class="reel-auth-state"><span class="friends-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg></span><strong>Sign in to share a reel</strong><p>Connect with the community before you upload a video.</p><a class="button button-primary" href="${authPageHref('login')}">Sign in</a></div>`;return}
  const fileInput=document.querySelector('#reel-video-file')
  const preview=document.querySelector('#reel-video-preview')
  const prompt=document.querySelector('#reel-upload-prompt')
  const caption=document.querySelector('#reel-caption')
  const submit=document.querySelector('#reel-submit')
  let previewUrl=''
  fileInput?.addEventListener('change',()=>{
    const file=fileInput.files?.[0]
    if(!file){submit.disabled=true;preview.hidden=true;prompt.hidden=false;return}
    if(!['video/mp4','video/webm','video/quicktime'].includes(file.type)){toast('Choose an MP4, WebM or MOV video.','error');fileInput.value='';preview.hidden=true;prompt.hidden=false;submit.disabled=true;return}
    if(file.size>50*1024*1024){toast('This video is larger than 50 MB.','error');fileInput.value='';preview.hidden=true;prompt.hidden=false;submit.disabled=true;return}
    if(previewUrl)URL.revokeObjectURL(previewUrl)
    previewUrl=URL.createObjectURL(file);preview.src=previewUrl;preview.hidden=false;prompt.hidden=true;submit.disabled=false
  })
  caption?.addEventListener('input',()=>{const count=document.querySelector('#reel-caption-count');if(count)count.textContent=`${caption.value.length} / 500`})
  form.addEventListener('submit',async e=>{
    e.preventDefault()
    const file=fileInput?.files?.[0]
    if(!file||!session)return
    submit.disabled=true
    const uploadProgress=document.querySelector('#reel-upload-progress')
    const progressBar=document.querySelector('#reel-progress-bar')
    const progressLabel=document.querySelector('#reel-progress-label')
    uploadProgress.hidden=false
    submit.querySelector('span').textContent='Uploading…'
    const extension=({ 'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov' })[file.type]
    const path=`${session.user.id}/${crypto.randomUUID()}.${extension}`
    let uploaded=false
    try{
      const {Upload}=await import('https://esm.sh/tus-js-client@4.3.1')
      const {data:{session:authSession}}=await supabase.auth.getSession()
      if(!authSession?.access_token)throw new Error('Your sign-in session expired. Sign in again to upload.')
      await new Promise((resolve,reject)=>{
        const upload=new Upload(file,{endpoint:'https://gkgjfbusdyiohiztwuec.storage.supabase.co/storage/v1/upload/resumable',retryDelays:[0,3000,5000,10000,20000],headers:{authorization:`Bearer ${authSession.access_token}`,'x-upsert':'false'},uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,chunkSize:6*1024*1024,metadata:{bucketName:'reels',objectName:path,contentType:file.type,cacheControl:'3600'},onError:reject,onProgress(bytesUploaded,bytesTotal){const percent=Math.round(bytesUploaded/bytesTotal*100);progressBar.style.width=`${percent}%`;progressLabel.textContent=`Uploading video · ${percent}%`},onSuccess:resolve})
        upload.start()
      })
      uploaded=true
      progressLabel.textContent='Saving your reel…'
      const captionValue=String(new FormData(form).get('caption')||'').trim()
      const {error}=await supabase.from('reels').insert({user_id:session.user.id,caption:captionValue,video_path:path,is_public:true})
      if(error){await supabase.storage.from('reels').remove([path]);uploaded=false;throw error}
      toast('Your reel was shared.','success')
      location.replace('/reels/')
    }catch(error){console.error(error);if(uploaded)await supabase.storage.from('reels').remove([path]);toast(error.message||'The video could not be uploaded. Try again.','error');submit.disabled=false;submit.querySelector('span').textContent='Share reel'}
  })
}

async function loadProfilePage() {
  const fromPath=decodeURIComponent(location.pathname.split('/').filter(Boolean).pop()||'').toLowerCase()
  const handle=fromPath==='profile'?new URLSearchParams(location.search).get('username')||profile?.username:fromPath
  const content=document.querySelector('#profile-content')
  const state=document.querySelector('#profile-state')
  const showState=(title,message,action='')=>{content.hidden=true;state.hidden=false;state.innerHTML=`<span class="friends-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg></span><strong>${esc(title)}</strong><p>${esc(message)}</p>${action}`}
  if(!handle){showState('Your profile is ready when you are','Sign in to create and share your Flexoverse profile.','<a class="button button-primary" href="/login/">Sign in</a>');return}
  const {data,error}=await supabase.from('profiles').select('id,username,full_name,bio,avatar_url,is_public,search_index_enabled,created_at').eq('username',handle).maybeSingle()
  if(error||!data){showState('This profile is unavailable','It may be private or the username may have changed.','<a class="button button-outline" href="/">Back to home</a>');return}
  profileRecord=data
  const name=data.full_name||data.username
  document.title=`${name} · Flexoverse`
  document.querySelector('meta[name="description"]')?.setAttribute('content',`${name} on Flexoverse. View their public posts and profile.`)
  let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical)}canonical.href=new URL(`/${encodeURIComponent(data.username)}`,location.origin).href
  document.querySelector('#profile-name').textContent=name
  document.querySelector('#profile-username').textContent=`@${data.username}`
  document.querySelector('#profile-bio').textContent=data.bio||''
  const profileAvatar=document.querySelector('#profile-avatar');if(profileAvatar)profileAvatar.outerHTML=avatar(initials(name),'blue',data.avatar_url).replace('class="avatar','class="avatar avatar-large')
  const joined=data.created_at?new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(new Date(data.created_at)):'A Flexoverse member'
  document.querySelector('#profile-joined').textContent=joined
  document.querySelector('#profile-joined-detail').textContent=`Joined Flexoverse in ${joined}`
  document.querySelector('#profile-about-bio').textContent=data.bio||'No bio has been added yet.'
  const action=document.querySelector('#profile-action');const mine=session?.user?.id===data.id
  if(mine){action.textContent='Edit profile';action.onclick=()=>location.href='/settings/'}
  else if(!session){action.textContent='Sign in to connect';action.onclick=openAuth}
  else{
    const {data:relations}=await supabase.from('friend_requests').select('id,from_user_id,to_user_id,status').or(`from_user_id.eq.${session.user.id},to_user_id.eq.${session.user.id}`)
    const relation=(relations||[]).find(row=>(row.from_user_id===data.id&&row.to_user_id===session.user.id)||(row.from_user_id===session.user.id&&row.to_user_id===data.id))
    if(relation?.status==='accepted'){action.textContent='Message';action.onclick=()=>location.href='/chats/'}
    else if(relation?.status==='pending'&&relation.from_user_id===session.user.id){action.textContent='Request sent';action.classList.add('button-request-sent');action.disabled=true}
    else if(relation?.status==='pending'){action.textContent='Accept request';action.onclick=async()=>{action.disabled=true;const {error}=await supabase.from('friend_requests').update({status:'accepted'}).eq('id',relation.id);if(error){action.disabled=false;toast(error.message,'error')}else{action.textContent='Message';action.classList.remove('button-primary','button-request-sent');action.onclick=()=>location.href='/chats/';toast('You’re friends now.','success')}}}
    else action.onclick=async()=>{action.disabled=true;const sent=await sendFriendRequest(data.id);if(sent){action.textContent='Request sent';action.classList.remove('button-primary');action.classList.add('button-request-sent')}else action.disabled=false}
  }
  const {data:posts,error:postsError}=await supabase.from('posts').select('id,user_id,content,image_path,created_at,profiles(full_name,username,avatar_url),likes(count),comments(count)').eq('user_id',data.id).order('created_at',{ascending:false}).limit(20)
  if(postsError)toast(postsError.message,'error')
  const profilePosts=posts||[]
  if(session&&profilePosts.length){const {data:mineLikes}=await supabase.from('likes').select('post_id').eq('user_id',session.user.id).in('post_id',profilePosts.map(post=>post.id));liked=new Set((mineLikes||[]).map(row=>row.post_id))}else liked=new Set()
  document.querySelector('#profile-post-count').textContent=profilePosts.length
  document.querySelector('#profile-posts').innerHTML=profilePosts.map(postCard).join('')||'<div class="empty-inline card">No public posts yet. Their posts will appear here when they share something.</div>'
  const photos=profilePosts.filter(post=>post.image_path)
  document.querySelector('#profile-photos').innerHTML=photos.length?photos.map(post=>`<a class="profile-photo" href="${esc(post.image_path)}" target="_blank" rel="noopener noreferrer"><img src="${esc(post.image_path)}" alt="Photo shared by ${esc(name)}" loading="lazy"></a>`).join(''):'<div class="empty-inline card">No photos shared yet.</div>'
  document.querySelector('#profile-share')?.addEventListener('click',async()=>{const url=`${location.origin}/${encodeURIComponent(data.username)}`;try{if(navigator.share)await navigator.share({title:`${name} on Flexoverse`,url});else{await navigator.clipboard.writeText(url);toast('Profile link copied.','success')}}catch(error){if(error.name!=='AbortError')toast('Copy this profile link from your browser address bar.')}})
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
  if(!session){openAuth();return false}
  const {error}=await supabase.from('friend_requests').insert({from_user_id:session.user.id,to_user_id:id})
  if(error){toast(error.code==='23505'?'A request already exists.':error.message,error.code==='23505'?'info':'error');return false}
  toast('Friend request sent.','success')
  return true
}

function chatTime(value) {
  if(!value)return ''
  const date=new Date(value)
  const now=new Date()
  if(date.toDateString()===now.toDateString())return new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(date)
  const yesterday=new Date(now);yesterday.setDate(now.getDate()-1)
  if(date.toDateString()===yesterday.toDateString())return 'Yesterday'
  if((now-date)<6*86400000)return new Intl.DateTimeFormat(undefined,{weekday:'short'}).format(date)
  return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric'}).format(date)
}

function chatDay(value) {
  if(!value)return ''
  const date=new Date(value),now=new Date(),yesterday=new Date(now)
  if(date.toDateString()===now.toDateString())return 'TODAY'
  yesterday.setDate(now.getDate()-1)
  if(date.toDateString()===yesterday.toDateString())return 'YESTERDAY'
  return new Intl.DateTimeFormat(undefined,{weekday:'long',month:'long',day:'numeric'}).format(date).toUpperCase()
}

function renderChatList() {
  const list=document.querySelector('#conversation-list')
  if(!list)return
  const search=document.querySelector('#conversation-search')?.value.trim().toLowerCase()||''
  const visible=chatItems.filter(item=>`${item.peer_name} ${item.peer_username}`.toLowerCase().includes(search))
  const total=document.querySelector('#chat-total');if(total)total.textContent=String(chatItems.length)
  if(!visible.length){
    list.innerHTML=chatItems.length?'<div class="conversation-empty"><strong>No chats found</strong><p>Try searching with another name.</p></div>':'<div class="conversation-empty"><strong>Your inbox is quiet</strong><p>Start a private conversation with one of your friends.</p><button class="button button-soft" type="button" data-chat-new>Start a chat</button></div>'
    return
  }
  list.innerHTML=visible.map(item=>{const active=item.conversation_id===activeConversationId;const unread=item.unread_count>0;const preview=item.last_message?(item.last_sender_id===session?.user?.id?`You: ${item.last_message}`:item.last_message):'Start the conversation';return `<button class="conversation ${active?'active':''} ${unread?'unread-conversation':''}" type="button" data-conversation-id="${esc(item.conversation_id)}" aria-current="${active?'true':'false'}">${avatar(initials(item.peer_name),'blue',item.peer_avatar_url)}<span class="conversation-text"><strong>${esc(item.peer_name)}</strong><small>${esc(preview)}</small></span><time>${esc(chatTime(item.last_message_at||item.created_at))}</time>${unread?'<i class="unread" aria-label="Unread messages"></i>':''}</button>`}).join('')
}

function renderChatWelcome(message='Choose a chat to catch up or start a new conversation with a friend.') {
  const room=document.querySelector('#chat-room')
  if(!room)return
  document.querySelector('#chat-layout')?.classList.remove('has-active-conversation')
  room.innerHTML=`<div class="chat-welcome"><span class="chat-welcome-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-.95L3 21l1.95-5.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg></span><strong>${session?'Your conversations, all in one place':'Sign in to see your messages'}</strong><p>${esc(message)}</p>${session?'<button class="button button-soft" type="button" data-chat-new>Start a conversation</button>':'<a class="button button-primary" href="/login/">Sign in</a>'}</div>`
}

function renderChatRoom(item,messages=activeChatMessages) {
  const room=document.querySelector('#chat-room')
  if(!room||!item)return
  document.querySelector('#chat-layout')?.classList.add('has-active-conversation')
  const groups=[]
  let priorDay=''
  for(const message of messages){const day=chatDay(message.created_at);if(day!==priorDay){groups.push(`<p class="chat-day-divider">${esc(day)}</p>`);priorDay=day}const own=message.sender_id===session?.user?.id;groups.push(`<div class="message ${own?'sent':'received'}" data-message-id="${esc(message.id)}">${esc(message.content)}<small>${esc(new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(message.created_at)))}</small></div>`)}
  room.innerHTML=`<header class="chat-room-head"><button class="chat-room-back" type="button" data-chat-back aria-label="Back to conversations"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6M9 12h12"/></svg></button>${avatar(initials(item.peer_name),'blue',item.peer_avatar_url)}<div class="chat-room-person"><strong>${esc(item.peer_name)}</strong><small><span class="status-dot"></span> Your friend</small></div><a class="chat-room-profile" href="/${encodeURIComponent(item.peer_username||'') }" aria-label="View ${esc(item.peer_name)}’s profile"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></a></header><div class="chat-history" id="chat-history" role="log" aria-live="polite" aria-label="Conversation with ${esc(item.peer_name)}">${groups.join('')||'<p class="chat-history-empty">Say hello and start the conversation.</p>'}</div><form class="message-composer" id="message-form"><input name="message" maxlength="4000" required autocomplete="off" placeholder="Write a message…" aria-label="Write a message"><button class="send-button" aria-label="Send message" type="submit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 8-16 8 3-8-3-8Z"/><path d="M7 12h13"/></svg></button></form>`
  const history=document.querySelector('#chat-history');if(history)history.scrollTop=history.scrollHeight
}

async function markConversationRead(conversationId) {
  if(!session||!conversationId)return
  const readAt=new Date().toISOString()
  const {error}=await supabase.from('conversation_members').update({last_read_at:readAt}).eq('conversation_id',conversationId).eq('user_id',session.user.id)
  if(error){console.warn('Could not update message read state:',error.message);return}
  const item=chatItems.find(chat=>chat.conversation_id===conversationId)
  if(item){item.last_read_at=readAt;item.unread_count=0}
  renderChatList()
}

async function selectConversation(conversationId,updateUrl=true) {
  const item=chatItems.find(chat=>chat.conversation_id===conversationId)
  if(!item)return
  activeConversationId=conversationId
  activeChatMessages=[]
  renderChatList()
  const room=document.querySelector('#chat-room')
  if(room)room.innerHTML=`<header class="chat-room-head"><button class="chat-room-back" type="button" data-chat-back aria-label="Back to conversations"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6M9 12h12"/></svg></button>${avatar(initials(item.peer_name),'blue',item.peer_avatar_url)}<div class="chat-room-person"><strong>${esc(item.peer_name)}</strong><small><span class="status-dot"></span> Your friend</small></div></header><div class="chat-history" id="chat-history"><div class="chat-loading"><span class="friends-loading-dot"></span>Loading messages</div></div>`
  document.querySelector('#chat-layout')?.classList.add('has-active-conversation')
  if(updateUrl)history.replaceState(null,'',`/chats/?id=${encodeURIComponent(conversationId)}`)
  const {data,error}=await supabase.from('messages').select('id,conversation_id,sender_id,content,created_at').eq('conversation_id',conversationId).order('created_at',{ascending:false}).limit(100)
  if(activeConversationId!==conversationId)return
  if(error){toast('Messages could not load. Try selecting this chat again.','error');renderChatRoom(item,[]);return}
  activeChatMessages=(data||[]).reverse()
  renderChatRoom(item)
  await markConversationRead(conversationId)
}

function handleChatMessage(message) {
  const item=chatItems.find(chat=>chat.conversation_id===message.conversation_id)
  if(!item||item.last_message_id===message.id)return
  item.last_message=message.content
  item.last_message_id=message.id
  item.last_message_at=message.created_at
  item.last_sender_id=message.sender_id
  if(message.sender_id!==session?.user?.id&&activeConversationId!==message.conversation_id)item.unread_count=Number(item.unread_count||0)+1
  renderChatList()
  if(activeConversationId===message.conversation_id){
    if(!activeChatMessages.some(row=>row.id===message.id))activeChatMessages.push(message)
    const history=document.querySelector('#chat-history')
    const wasNearBottom=history&&history.scrollHeight-history.scrollTop-history.clientHeight<100
    renderChatRoom(item)
    if(message.sender_id!==session?.user?.id)markConversationRead(message.conversation_id)
    else if(wasNearBottom){const updatedHistory=document.querySelector('#chat-history');if(updatedHistory)updatedHistory.scrollTop=updatedHistory.scrollHeight}
  }
}

function subscribeToChatInbox() {
  if(!session)return
  if(chatRealtimeChannel)supabase.removeChannel(chatRealtimeChannel)
  chatRealtimeChannel=supabase.channel(`chat-inbox-${session.user.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'messages'},payload=>handleChatMessage(payload.new)).subscribe()
}

async function loadChats(preferredConversation='') {
  const list=document.querySelector('#conversation-list')
  if(!list)return
  if(!session){list.innerHTML='<div class="conversation-empty"><strong>Sign in to see your chats</strong><p>Your conversations will be waiting for you here.</p><a class="button button-primary" href="/login/">Sign in</a></div>';renderChatWelcome('Sign in to catch up with friends and continue your conversations.');return}
  list.innerHTML='<div class="chat-loading"><span class="friends-loading-dot"></span>Loading conversations</div>'
  const {data,error}=await supabase.rpc('list_my_conversations')
  if(error){console.error('Could not load conversations:',error);list.innerHTML='<div class="conversation-empty"><strong>Your chats could not load</strong><p>Check your connection and try again.</p><button class="button button-outline" type="button" data-retry-chats>Try again</button></div>';return}
  chatItems=(data||[]).map(row=>({...row,peer_name:row.peer_name||row.peer_username||'Flexoverse friend',peer_username:row.peer_username||'member',unread_count:Number(row.unread_count||0)}))
  renderChatList()
  subscribeToChatInbox()
  const requested=preferredConversation||new URLSearchParams(location.search).get('id')
  if(requested&&chatItems.some(item=>item.conversation_id===requested)){await selectConversation(requested,false);return}
  if(!chatItems.length)renderChatWelcome('Start a private conversation with an accepted friend. Your messages stay in your inbox.');
  else renderChatWelcome()
}

async function openNewChatDialog() {
  if(!session)return openAuth()
  const root=document.querySelector('#modal-root')
  if(!root)return
  root.innerHTML='<div class="modal-backdrop" data-chat-modal-backdrop><section class="chat-new-modal" role="dialog" aria-modal="true" aria-labelledby="chat-modal-title"><header class="chat-new-modal-head"><div><h2 id="chat-modal-title">New message</h2><p>Choose a friend to start a private chat.</p></div><button class="chat-modal-close" type="button" data-close-chat-modal aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="chat-friend-list"><div class="chat-loading"><span class="friends-loading-dot"></span>Finding your friends</div></div></section></div>'
  const friendList=root.querySelector('.chat-friend-list')
  const {data:requests,error}=await supabase.from('friend_requests').select('from_user_id,to_user_id').eq('status','accepted').or(`from_user_id.eq.${session.user.id},to_user_id.eq.${session.user.id}`)
  if(error){friendList.innerHTML='<div class="chat-modal-empty"><strong>Friends could not load</strong><p>Try again in a moment.</p></div>';return}
  const ids=[...new Set((requests||[]).map(row=>row.from_user_id===session.user.id?row.to_user_id:row.from_user_id))]
  if(!ids.length){friendList.innerHTML='<div class="chat-modal-empty"><strong>Make a connection first</strong><p>You can start a chat after someone accepts your friend request.</p><a class="button button-soft" href="/friends/">Find friends</a></div>';return}
  const {data:friends,error:friendsError}=await supabase.from('profiles').select('id,username,full_name,avatar_url').in('id',ids).order('full_name')
  if(friendsError){friendList.innerHTML='<div class="chat-modal-empty"><strong>Friends could not load</strong><p>Try again in a moment.</p></div>';return}
  friendList.innerHTML=(friends||[]).map(friend=>`<button class="chat-friend-choice" type="button" data-start-chat="${esc(friend.id)}">${avatar(initials(friend.full_name||friend.username),'blue',friend.avatar_url)}<span><strong>${esc(friend.full_name||friend.username)}</strong><small>@${esc(friend.username)}</small></span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg></button>`).join('')||'<div class="chat-modal-empty"><strong>No friends available</strong><p>Try adding a friend before starting a chat.</p></div>'
}

function notificationIcon(type) {
  const icons={friend_request:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M19 8v6m-3-3h6"/></svg>',friend_accepted:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',post_like:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg>',post_comment:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-.95L3 21l1.95-5.5A8.5 8.5 0 1 1 21 11.5Z"/></svg>'}
  return icons[type]||'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/></svg>'
}

function notificationMessage(item) {
  const actor=item.actor?.full_name||item.actor?.username||'A Flexoverse member'
  const text={friend_request:'sent you a friend request.',friend_accepted:'accepted your friend request.',post_like:'liked your post.',post_comment:'commented on your post.'}[item.type]||'shared an update with you.'
  const action={friend_request:'Friend request',friend_accepted:'Friend request accepted',post_like:'Post like',post_comment:'Post comment'}[item.type]||'Activity'
  return {actor,text,action}
}

function renderNotifications() {
  const list=document.querySelector('#notifications-list')
  if(!list)return
  const unread=notificationItems.filter(item=>!item.is_read).length
  const requests=notificationItems.filter(item=>item.type==='friend_request'&&item.pending_request).length
  const unreadCount=document.querySelector('#notification-unread-count');if(unreadCount)unreadCount.textContent=String(unread)
  const requestCount=document.querySelector('#notification-request-count');if(requestCount)requestCount.textContent=String(requests)
  const markButton=document.querySelector('#notifications-mark-read');if(markButton)markButton.disabled=unread===0
  document.querySelectorAll('[data-notification-filter]').forEach(tab=>{const active=tab.dataset.notificationFilter===notificationFilter;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active))})
  let visible=notificationItems
  if(notificationFilter==='unread')visible=visible.filter(item=>!item.is_read)
  if(notificationFilter==='friend_request')visible=visible.filter(item=>item.type==='friend_request'&&item.pending_request)
  if(!visible.length){const title=notificationFilter==='unread'?'You’re all caught up':notificationFilter==='friend_request'?'No pending friend requests':'Nothing new yet';const body=notificationFilter==='unread'?'New activity will appear here when something happens.':notificationFilter==='friend_request'?'New friend requests will appear here.':'Friend requests and post activity will show up here.';list.innerHTML=`<div class="notification-empty"><span class="notification-empty-icon">${notificationIcon(notificationFilter==='friend_request'?'friend_request':'friend_accepted')}</span><strong>${title}</strong><p>${body}</p>${session?'<a class="button button-soft" href="/friends/">Explore friends</a>':'<a class="button button-primary" href="/login/">Sign in</a>'}</div>`;return}
  list.innerHTML=visible.map(item=>{const description=notificationMessage(item),actorUrl=item.actor?.username?`/${encodeURIComponent(item.actor.username)}`:'/friends/';const pending=item.type==='friend_request'&&item.pending_request;const targetUrl=item.type==='post_like'||item.type==='post_comment'?`/#post-${encodeURIComponent(item.target_id||'')}`:item.type==='friend_accepted'?'/chats/':actorUrl;return `<article class="notification-item ${item.is_read?'':'unread-item'}" data-notification-id="${esc(item.id)}">${avatar(initials(description.actor),'blue',item.actor?.avatar_url)}<div class="notification-copy"><span><strong><a href="${esc(actorUrl)}" data-mark-notification="${esc(item.id)}">${esc(description.actor)}</a></strong> ${esc(description.text)}</span>${item.preview?`<span class="notification-preview">“${esc(item.preview)}”</span>`:''}<small>${esc(timeAgo(item.created_at))}</small><span class="notification-kind">${notificationIcon(item.type)}${esc(description.action)}</span></div><div class="notification-actions">${pending?`<button class="button button-primary" type="button" data-accept-notification="${esc(item.target_id)}" data-notification="${esc(item.id)}">Accept</button><button class="notification-dismiss" type="button" data-ignore-notification="${esc(item.target_id)}" data-notification="${esc(item.id)}" aria-label="Ignore friend request"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>`:`<a class="button button-outline" href="${esc(targetUrl)}" data-mark-notification="${esc(item.id)}">${item.type==='post_like'||item.type==='post_comment'?'View post':item.type==='friend_accepted'?'Open chats':'View profile'}</a>`}</div>${item.is_read?'':'<span class="unread-dot" aria-label="Unread"></span>'}</article>`}).join('')
}

async function loadNotifications() {
  const list=document.querySelector('#notifications-list')
  if(!list)return
  if(!session){notificationItems=[];renderNotifications();return}
  list.innerHTML='<div class="notification-loading"><span class="friends-loading-dot"></span>Loading your activity</div>'
  const {data,error}=await supabase.from('notifications').select('id,recipient_id,actor_id,type,target_id,preview,is_read,created_at,actor:profiles!notifications_actor_id_fkey(full_name,username,avatar_url)').eq('recipient_id',session.user.id).order('created_at',{ascending:false}).limit(100)
  if(error){console.error('Could not load notifications:',error);list.innerHTML='<div class="notification-empty"><span class="notification-empty-icon">'+notificationIcon('friend_accepted')+'</span><strong>Activity could not load</strong><p>Check your connection and try again.</p><button class="button button-outline" type="button" data-retry-notifications>Try again</button></div>';return}
  notificationItems=(data||[]).map(item=>({...item,actor:Array.isArray(item.actor)?item.actor[0]||{}:item.actor||{},pending_request:false}))
  const pendingIds=notificationItems.filter(item=>item.type==='friend_request').map(item=>item.target_id).filter(Boolean)
  if(pendingIds.length){const {data:requests}=await supabase.from('friend_requests').select('id').in('id',pendingIds).eq('status','pending');const pending=new Set((requests||[]).map(row=>row.id));notificationItems.forEach(item=>item.pending_request=pending.has(item.target_id))}
  renderNotifications()
}

async function loadNotificationCount() {
  const badge=document.querySelector('#header-notification-count')
  if(!badge)return
  if(!session){badge.hidden=true;return}
  const {count,error}=await supabase.from('notifications').select('id',{count:'exact',head:true}).eq('recipient_id',session.user.id).eq('is_read',false)
  if(error){console.warn('Could not load notification count:',error.message);badge.hidden=true;return}
  badge.textContent=count>99?'99+':String(count||0)
  badge.hidden=!count
}

function subscribeToNotificationUpdates() {
  if(!session)return
  if(notificationRealtimeChannel)supabase.removeChannel(notificationRealtimeChannel)
  notificationRealtimeChannel=supabase.channel(`notification-count-${session.user.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`recipient_id=eq.${session.user.id}`},()=>{loadNotificationCount();if(page==='notifications')loadNotifications()}).subscribe()
}

async function markNotificationRead(notificationId) {
  const item=notificationItems.find(row=>row.id===notificationId)
  if(!item||item.is_read||!session)return
  const {error}=await supabase.from('notifications').update({is_read:true}).eq('id',notificationId).eq('recipient_id',session.user.id)
  if(error){toast(error.message,'error');return}
  item.is_read=true
  renderNotifications()
  await loadNotificationCount()
}

function bindChatPageEvents() {
  document.querySelector('#chat-new-button')?.addEventListener('click',openNewChatDialog)
  document.querySelector('#conversation-search')?.addEventListener('input',renderChatList)
  document.querySelector('#conversation-list')?.addEventListener('click',e=>{if(e.target.closest('[data-chat-new]'))return openNewChatDialog();if(e.target.closest('[data-retry-chats]'))return loadChats();const row=e.target.closest('[data-conversation-id]');if(row)selectConversation(row.dataset.conversationId)})
  document.querySelector('#chat-room')?.addEventListener('click',e=>{if(e.target.closest('[data-chat-back]')){document.querySelector('#chat-layout')?.classList.remove('has-active-conversation');history.replaceState(null,'','/chats/')}})
  document.querySelector('#chat-room')?.addEventListener('submit',async e=>{const form=e.target.closest('#message-form');if(!form)return;e.preventDefault();if(!session)return openAuth();const input=form.querySelector('[name="message"]'),content=String(input.value||'').trim();if(!content||!activeConversationId)return;const submit=form.querySelector('[type="submit"]');submit.disabled=true;const {data,error}=await supabase.from('messages').insert({conversation_id:activeConversationId,sender_id:session.user.id,content}).select('id,conversation_id,sender_id,content,created_at').single();submit.disabled=false;if(error){toast(error.message,'error');return}handleChatMessage(data);await markConversationRead(activeConversationId);document.querySelector('#message-form [name="message"]')?.focus()})
  document.querySelector('#modal-root')?.addEventListener('click',async e=>{
    if(e.target.closest('[data-close-chat-modal]')||e.target.matches('[data-chat-modal-backdrop]')){document.querySelector('#modal-root').innerHTML='';return}
    const choice=e.target.closest('[data-start-chat]');if(!choice)return
    choice.disabled=true
    const {data,error}=await supabase.rpc('start_direct_conversation',{target_user_id:choice.dataset.startChat})
    if(error){choice.disabled=false;toast(error.message,'error');return}
    document.querySelector('#modal-root').innerHTML=''
    await loadChats(data)
  })
}

function bindNotificationPageEvents() {
  document.querySelectorAll('[data-notification-filter]').forEach(tab=>tab.addEventListener('click',()=>{notificationFilter=tab.dataset.notificationFilter;renderNotifications()}))
  document.querySelector('#notifications-mark-read')?.addEventListener('click',async()=>{if(!session)return;const {error}=await supabase.from('notifications').update({is_read:true}).eq('recipient_id',session.user.id).eq('is_read',false);if(error)return toast(error.message,'error');notificationItems.forEach(item=>item.is_read=true);renderNotifications();await loadNotificationCount();toast('All caught up.','success')})
  document.querySelector('#notifications-list')?.addEventListener('click',async e=>{
    if(e.target.closest('[data-retry-notifications]'))return loadNotifications()
    const accept=e.target.closest('[data-accept-notification]')
    if(accept){accept.disabled=true;const {error}=await supabase.from('friend_requests').update({status:'accepted'}).eq('id',accept.dataset.acceptNotification).eq('to_user_id',session.user.id);if(error){accept.disabled=false;toast(error.message,'error');return}await supabase.from('notifications').update({is_read:true}).eq('id',accept.dataset.notification).eq('recipient_id',session.user.id);toast('Friend request accepted.','success');await loadNotifications();await loadNotificationCount();return}
    const ignore=e.target.closest('[data-ignore-notification]')
    if(ignore){ignore.disabled=true;const {error}=await supabase.from('friend_requests').delete().eq('id',ignore.dataset.ignoreNotification).eq('to_user_id',session.user.id);if(error){ignore.disabled=false;toast(error.message,'error');return}await supabase.from('notifications').update({is_read:true}).eq('id',ignore.dataset.notification).eq('recipient_id',session.user.id);toast('Friend request dismissed.');await loadNotifications();await loadNotificationCount();return}
    const link=e.target.closest('[data-mark-notification]')
    if(link){e.preventDefault();const target=link.href;await markNotificationRead(link.dataset.markNotification);location.href=target}
  })
}

async function initialize() {
  mountShell()
  const {data}=await supabase.auth.getSession();session=data.session
  if(session){const {data:row}=await supabase.from('profiles').select('id,username,full_name,bio,avatar_url,is_public').eq('id',session.user.id).maybeSingle();profile=row}
  if(session&&(page==='login'||page==='signup')){location.replace(authReturnPath());return}
  const signupLink=document.querySelector('#switch-to-signup');if(signupLink)signupLink.href=authPageHref('signup')
  const loginLink=document.querySelector('#switch-to-login');if(loginLink)loginLink.href=authPageHref('login')
  mountShell()
  if(session){await loadNotificationCount();subscribeToNotificationUpdates()}
  const composerAvatar=document.querySelector('[data-user-avatar]');if(composerAvatar)composerAvatar.outerHTML=avatar(session?initials(myName()):'FX','blue',profile?.avatar_url)
  if(page==='home')await loadHome()
  if(page==='friends')await loadFriends()
  if(page==='chats')await loadChats()
  if(page==='notifications')await loadNotifications()
  if(page==='reels')await loadReels()
  if(page==='profile')await loadProfilePage()
  if(page==='reel-create')prepareReelComposer()
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
  document.querySelectorAll('.feed-list').forEach(feed=>feed.addEventListener('click',async e=>{
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
  }))
  document.querySelectorAll('.feed-list').forEach(feed=>feed.addEventListener('submit',async e=>{
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
  }))
  document.querySelector('#suggestions-list')?.addEventListener('click',async e=>{const b=e.target.closest('[data-request]');if(!b||b.disabled)return;const old=b.innerHTML;b.disabled=true;b.innerHTML='<span>Sending…</span>';const sent=await sendFriendRequest(b.dataset.request);if(sent)await loadFriends();else{b.disabled=false;b.innerHTML=old}})
  document.querySelector('#requests-list')?.addEventListener('click',async e=>{const accept=e.target.closest('[data-accept]');const ignore=e.target.closest('[data-ignore]');if(accept){accept.disabled=true;const {error}=await supabase.from('friend_requests').update({status:'accepted'}).eq('id',accept.dataset.accept);if(error){accept.disabled=false;toast(error.message,'error')}else{await loadFriends();toast('You’re friends now.','success')}}if(ignore){ignore.disabled=true;const {error}=await supabase.from('friend_requests').delete().eq('id',ignore.dataset.ignore);if(error){ignore.disabled=false;toast(error.message,'error')}else{await loadFriends();toast('Request dismissed.','success')}}})
  document.querySelectorAll('[data-friends-filter]').forEach(input=>input.addEventListener('input',()=>{const list=document.querySelector(input.dataset.friendsFilter);if(!list)return;const query=input.value.trim().toLowerCase();let visible=0;list.querySelectorAll(input.dataset.filterItems).forEach(item=>{const matches=String(item.dataset.searchText||'').includes(query);item.hidden=!matches;if(matches)visible++});const empty=list.querySelector('[data-empty-results]');if(empty)empty.hidden=visible>0||!query}))
  document.querySelectorAll('[data-retry-friends]').forEach(button=>button.addEventListener('click',()=>loadFriends()))
  document.querySelector('#reels-list')?.addEventListener('click',e=>{const retry=e.target.closest('[data-retry-reels]');if(retry)return loadReels();const share=e.target.closest('[data-share-reel]');if(share){shareReel(share.dataset.shareReel);return}const open=e.target.closest('[data-open-reel]');if(open)openReelViewer(Number(open.dataset.openReel))})
  const viewerRoot=document.querySelector('#reel-viewer-root')
  viewerRoot?.addEventListener('click',e=>{const close=e.target.closest('[data-close-reel]');if(close){closeReelViewer();return}const step=e.target.closest('[data-reel-step]');if(step){stepReelViewer(Number(step.dataset.reelStep));return}const share=e.target.closest('[data-share-reel]');if(share)shareReel(share.dataset.shareReel)})
  let viewerTouchY=null
  viewerRoot?.addEventListener('touchstart',e=>{viewerTouchY=e.changedTouches[0]?.clientY??null},{passive:true})
  viewerRoot?.addEventListener('touchend',e=>{if(viewerTouchY===null)return;const delta=viewerTouchY-(e.changedTouches[0]?.clientY??viewerTouchY);viewerTouchY=null;if(Math.abs(delta)>70)stepReelViewer(delta>0?1:-1)},{passive:true})
  document.querySelectorAll('[data-profile-tab]').forEach(tab=>tab.addEventListener('click',()=>{const selected=tab.dataset.profileTab;document.querySelectorAll('[data-profile-tab]').forEach(item=>{const active=item===tab;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active))});document.querySelectorAll('.profile-panel').forEach(panel=>{panel.hidden=panel.id!==`profile-panel-${selected}`})}))
  document.querySelector('#profile-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!session)return openAuth();const f=new FormData(e.currentTarget);const username=String(f.get('username')).trim().toLowerCase();if(!/^[a-z0-9]{3,30}$/.test(username))return toast('Use 3–30 letters or numbers for your username.','error');const {error}=await supabase.from('profiles').update({username,full_name:f.get('full_name'),bio:f.get('bio'),is_public:document.querySelector('#public-profile').checked}).eq('id',session.user.id);if(error)return toast(error.code==='23505'?'That username is taken. Try adding a number.':error.message,'error');await supabase.auth.updateUser({data:{username}});toast('Profile saved.','success');document.querySelector('#profile-link').textContent=`/${username}`})
  document.querySelector('#username-field')?.addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'');document.querySelector('#profile-link').textContent=`/${e.target.value}`})
  bindChatPageEvents()
  bindNotificationPageEvents()
  document.querySelector('#global-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){const value=e.target.value.trim().replace(/^@/,'').toLowerCase();if(value)location.href=`/${encodeURIComponent(value)}`}})
  document.querySelectorAll('[data-toast]').forEach(b=>b.addEventListener('click',()=>toast(b.dataset.toast)))
  document.querySelectorAll('[data-friend-request]').forEach(b=>b.addEventListener('click',()=>session?toast('Find a person in search to send a friend request.'):openAuth()))
  document.querySelector('#notification-action')?.addEventListener('click',openAuth)
  window.addEventListener('keydown',e=>{if(reelViewerIndex>=0){if(e.key==='Escape'){closeReelViewer();return}if(e.key==='ArrowDown'||e.key==='PageDown'){e.preventDefault();stepReelViewer(1);return}if(e.key==='ArrowUp'||e.key==='PageUp'){e.preventDefault();stepReelViewer(-1);return}}if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();document.querySelector('#global-search')?.focus()}if(e.key==='Escape')document.querySelectorAll('.modal-backdrop').forEach(m=>m.hidden=true)})
}

function showAppLoader() {
  const loader=document.createElement('div')
  loader.className='app-loader'
  loader.setAttribute('role','status')
  loader.setAttribute('aria-live','polite')
  loader.innerHTML='<div class="app-loader-content"><span class="app-loader-symbol" aria-hidden="true"><span class="logo-mark"><svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 19a5.2 5.2 0 0 1 10.4 0v1H2.8zM14 15.3a4.4 4.4 0 0 1 7.2 3.4v1h-6"/></svg></span></span><span class="app-loader-label">Getting your circle ready</span></div>'
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
