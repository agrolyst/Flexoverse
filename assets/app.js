import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

// Use the Flexoverse brand mark as the site-wide browser favicon.
if (!document.querySelector('link[rel~="icon"]')) {
  const favicon = document.createElement('link')
  favicon.rel = 'icon'
  favicon.type = 'image/svg+xml'
  favicon.href = '/favicon.svg?v=brand-favicon-20261104'
  document.head.append(favicon)
}

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
let reelLiked = new Set()
let reelViewerIndex = -1
let reelPreviewObserver = null
let chatItems = []
let activeConversationId = null
let activeChatMessages = []
let chatRealtimeChannel = null
let chatTypingChannel=null;
let chatTypingStopTimer=null;
let voiceRecorder=null;
let voiceRecorderStream=null;
let voiceRecorderChunks=[];
let voiceRecordingStartedAt=0;
let callSignalChannel = null
let callWindowRef = null
let callRootElement = null
let homeIncomingCallChannel = null
let callPeer = null
let callLocalStream = null
let callRemoteStream = null
let currentCall = null
let callLogView = false
let chatSelectionMode = false
let chatListFilter = 'all'
let chatFavoriteIds = new Set()
let messageSelectionMode = false
let selectedMessageIds = new Set()
let pendingReplyTo = null
let activeMessageReactions = []
let selectedChatIds = new Set()
let pendingIceCandidates = []
let callHistoryId = null
let liveKitRoom=null;
let liveKitSdkPromise=null;
let pendingGroupInvite=null;
let notificationItems = []
let notificationFilter = 'all'
let notificationRealtimeChannel = null
let notificationDisplayPreferences = {in_app_enabled:true,friend_requests:true,post_likes:true,post_comments:true}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const initials = s => String(s || 'You').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase()
const myName = () => profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Your profile'
const myUsername = () => profile?.username || session?.user?.user_metadata?.username || 'yourname'
const avatar = (name, color = 'blue', url = '') => url ? `<img class="avatar ${color}" src="${esc(url)}" alt="">` : `<span class="avatar avatar-${color}">${esc(name)}</span>`
const profileUrl = username => `/profile/view/?username=${encodeURIComponent(String(username || '').trim().toLowerCase())}`
const pageUrl = () => profileUrl(myUsername())
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
  // Login and signup are standalone layouts: they intentionally do not include
  // the authenticated app's sidebars or mobile navigation containers.
  if (page === 'login' || page === 'signup') {
    const header = document.querySelector('#site-header')
    if (header) header.innerHTML = '<header class="site-header auth-site-header"><a class="wordmark" href="/" aria-label="Flexoverse home"><span class="logo-mark"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 19a5.2 5.2 0 0 1 10.4 0v1H2.8zM14 15.3a4.4 4.4 0 0 1 7.2 3.4v1h-7.2"/></svg></span><span>Flexoverse</span></a></header>'
    const modalRoot = document.querySelector('#modal-root')
    if (modalRoot) modalRoot.innerHTML = ''
    return
  }
  const navItems = [['home','Home','/'],['friends','Friends','/friends/'],['reels','Reels','/reels/'],['my-content','My content','/my-content/'],['chats','Chats','/chats/'],['notifications','Notifications','/notifications/'],['settings','Settings','/settings/']]
  const activePage=key=>page===key||(key==='reels'&&page==='reel-create')||(key==='settings'&&page.startsWith('settings-'))
  const brandIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="8" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M2.8 19a5.2 5.2 0 0 1 10.4 0v1H2.8zM14 15.3a4.4 4.4 0 0 1 7.2 3.4v1h-6"/></svg>'
  const searchIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.3 4.3"/></svg>'
  const signoutIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5M15 12H3"/><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6"/></svg>'
  const sidebarIcons = {
    home:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9"/><path d="M9 20v-6h6v6"/></svg>',
    friends:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    reels:'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></svg>',
    'my-content':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>',
    chats:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-.95L3 21l1.95-5.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg>',
    notifications:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    settings:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.8-.7a8 8 0 0 1-1.7 1l-.3 1.9h-2.8l-.3-1.9a8 8 0 0 1-1.7-1l-1.8.7-1.4-2.4 1.4-1.1a7 7 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.8.7a8 8 0 0 1 1.7-1l.3-1.9h2.8l.3 1.9a8 8 0 0 1 1.7 1l1.8-.7 1.4 2.4-1.4 1.1a7 7 0 0 1 0 2Z" transform="translate(-1 -1)"/></svg>'
  }
  const shellLinks = navItems.map(([key,label,url]) => `<a class="${activePage(key)?'active':''}" aria-current="${activePage(key)?'page':'false'}" href="${url}"><span class="side-glyph">${sidebarIcons[key]}</span><span class="side-link-label">${label}</span>${key==='friends'?'<span class="side-count" id="friend-count">0</span>':''}</a>`).join('')
  document.querySelector('#site-header').innerHTML = `<header class="site-header"><a class="wordmark" href="/" aria-label="Flexoverse home"><span class="logo-mark">${brandIcon}</span><span>Flexoverse</span></a><label class="header-search"><span class="search-icon">${searchIcon}</span><input id="global-search" placeholder="Search people" aria-label="Search people"><kbd class="search-shortcut">/</kbd></label><nav class="top-navigation" aria-label="Main navigation">${navItems.slice(0,4).map(([key,label,url])=>`<a class="${activePage(key)?'active':''}" aria-current="${activePage(key)?'page':'false'}" aria-label="${label}" href="${url}"><span class="nav-glyph">${sidebarIcons[key]}</span><span class="nav-label">${label}</span></a>`).join('')}</nav><div class="header-actions"><div class="header-notification-wrap"><a class="header-icon" id="notifications-link" href="/notifications/" aria-label="Notifications" aria-expanded="false">${sidebarIcons.notifications}<span class="notification-count" id="header-notification-count" hidden>0</span></a><div class="header-notification-dropdown" id="header-notification-dropdown" hidden></div></div>${session?`<a class="user-control" href="${esc(pageUrl())}">${avatar(initials(myName()),'blue',profile?.avatar_url)}<span>${esc(myName())}</span></a><button class="header-icon" id="signout" aria-label="Sign out">${signoutIcon}</button>`:'<a class="login-link" href="/login/">Sign in</a>'}</div></header>`
  const sidebarName=session?myName():'Your space'
  const sidebarHandle=session?'@'+myUsername():'Sign in to set up your profile'
  const sidebarAvatar=avatar(session?initials(myName()):'FX','blue',profile?.avatar_url)
  document.querySelector('#left-sidebar').innerHTML = `<section class="mini-profile"><a href="${session?esc(pageUrl()):'/login/'}" class="mini-profile-link"><span class="mini-cover" aria-hidden="true"><span class="mini-cover-orb"></span><span class="mini-cover-brand">FLEXOVERSE</span></span><span class="mini-profile-body">${sidebarAvatar}<span class="mini-profile-copy"><strong>${esc(sidebarName)}</strong><small>${esc(sidebarHandle)}</small></span></span><span class="mini-profile-action"><span>${session?'View your profile':'Sign in to personalize'}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></span></a></section><nav class="side-menu" aria-label="Primary navigation"><span class="side-label">YOUR SPACE</span>${shellLinks}</nav><footer class="side-footer"><nav aria-label="Information"><a href="/how-it-works/">How it works</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a><a href="/help/">Help</a></nav><small>© 2026 Flexoverse</small></footer>`
  document.querySelector('#right-sidebar').innerHTML = `<section class="right-card card community-rail-card"><span class="rail-kicker">COMMUNITY</span><h3>Find your people</h3><p>Connect with friends and keep up with what they share.</p><a class="button button-soft" href="/friends/">Explore friends <span>→</span></a></section><section class="right-card card community-rail-card"><span class="rail-kicker">MESSAGES</span><h3>Keep in touch</h3><p>Private conversations are here for your accepted friends.</p><a class="text-link" href="/chats/">Open chats <span>→</span></a></section>`
  const mobileNav=document.querySelector('#mobile-nav')
  mobileNav.className='mobile-nav'
  mobileNav.setAttribute('aria-label','Mobile navigation')
  mobileNav.innerHTML=navItems.filter(([key])=>key!=='notifications').map(([key,label,url])=>`<a class="${activePage(key)?'active':''}" aria-label="${label}" aria-current="${activePage(key)?'page':'false'}" href="${url}"><span class="mobile-nav-icon">${sidebarIcons[key]}</span><small>${label}</small></a>`).join('')
  document.querySelector('#modal-root').innerHTML = ''
}

function heartSvg(filled=false){return `<svg class="action-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 4.2-8.8 10-8.8 10S3.2 12.9 3.2 8.7A4.2 4.2 0 0 1 11 6.4l1 1.1 1-1.1a4.2 4.2 0 0 1 7.8 2.3Z" fill="${filled?'currentColor':'none'}" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`}
function commentSvg(){return '<svg class="action-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8 8.4 8.4 0 0 1-3.8-.9L4 20l1.4-4.2A8 8 0 1 1 20 11.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>'}
// Central badge renderer: add future badge types here and reuse renderBadge() anywhere.
const BADGE_TYPES = {
  verified: { className: 'post-verified-badge', title: 'Verified by Flexoverse', label: 'Verified account', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>' },
  member: { className: 'post-member-badge', title: 'Flexoverse member', label: 'Member', text: 'Member' },
  plus: { className: 'post-plus-badge', title: 'Flexoverse Plus member', label: 'Plus Member', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 2 2.2 5.1 5.5.5-4.2 3.6 1.3 5.4-4.8-2.9-4.8 2.9 1.3-5.4L4.3 7.6l5.5-.5L12 2Z"/><path d="M7 19h10"/></svg>' },
  subscriber: { className: 'post-subscriber-badge', title: 'Flexoverse Subscriber', label: 'Subscriber', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 14.8 8.7 21 9.6l-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>' },
  top_contributor: { className: 'post-contributor-badge', title: 'Top Contributor', label: 'Top Contributor', icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8v4a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4M12 12v5m-4 3h8m-6-3h4"/></svg>' }
}
function renderBadge(type) {
  const badge = BADGE_TYPES[type]
  if (!badge) return ''
  if (badge.icon) return `<span class="${badge.className}" title="${badge.title}" aria-label="${badge.label}">${badge.icon}</span>`
  return `<span class="${badge.className}" title="${badge.title}">${badge.text}</span>`
}

function renderUserBadges(user = {}) {
  const membership = user.membership_status === 'active' ? [user.membership_plan === 'plus' ? 'plus' : 'member'] : []
  const earned = Array.isArray(user.earned_badges) ? user.earned_badges : []
  const types = [...(user.is_verified === true ? ['verified'] : []), ...membership, ...earned]
  return [...new Set(types)].map(renderBadge).join('')
}

function postCard(p) {
  const user = Array.isArray(p.profiles) ? p.profiles[0] || {} : p.profiles || {}
  const name = p.name || user.full_name || 'Flexoverse member'
  const handle = p.username || user.username || 'member'
  const image = p.image || p.image_path || ''
  const id = String(p.id), safeId = esc(id)
  const likeCount = relationCount(p.likes), commentCount = relationCount(p.comments)
  const badges = renderUserBadges(user)
  const isLiked = liked.has(id), timestamp = timeAgo(p.created_at)
  return `<article class="post card" id="post-${safeId}" data-post="${safeId}"><div class="post-top">${avatar(p.initials||initials(name),p.color||'blue',p.avatar_url||user.avatar_url)}<div class="post-user"><a class="post-user-name" href="${profileUrl(handle)}"><strong>${esc(name)}</strong>${badges}</a><small>@${esc(handle)} · ${esc(timestamp)}</small></div><div class="post-menu-wrap"><button class="more-button" type="button" data-post-menu-toggle="${safeId}" aria-label="Post options" aria-expanded="false">···</button><div class="post-options-menu" data-post-menu="${safeId}" hidden><button type="button" data-save-post="${safeId}">Save post</button><button type="button" data-copy-post="${safeId}">Copy link</button><button type="button" data-report-post="${safeId}" class="post-option-report">Report post</button>${session&&session.user.id===p.user_id?`<button type="button" data-delete-post="${safeId}" class="post-option-danger">Delete post</button>`:''}</div></div></div><p class="post-text">${esc(p.content)}</p>${image?`<img class="post-photo" src="${esc(image)}" alt="Post image">`:''}<div class="post-meta"><span data-like-count="${safeId}" data-count="${likeCount}">${heartSvg(false)} <span>${likeCount} ${likeCount===1?'person':'people'}</span></span><button class="post-comment-total" type="button" data-comment="${safeId}" data-comment-count="${safeId}">${commentCount} ${commentCount===1?'comment':'comments'}</button></div><div class="post-actions"><button data-like="${safeId}" class="${isLiked?'liked':''}" aria-pressed="${isLiked}">${heartSvg(isLiked)} <span>${isLiked?'Liked':'Like'}</span></button><button data-comment="${safeId}" aria-expanded="false">${commentSvg()} <span>Comment</span></button><button data-share><svg class="action-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4m-5 5 5-5 5 5M5 14v5h14v-5" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg><span>Share</span></button></div></article>`
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

async function loadHomeReels(){
  const section=document.querySelector('#home-reels-section'),list=document.querySelector('#home-reels-list')
  if(!section||!list)return
  const {data,error}=await supabase.from('reels').select('id,user_id,caption,video_path,created_at,profiles!reels_user_id_fkey(full_name,username,avatar_url)').eq('is_public',true).order('created_at',{ascending:false}).limit(12)
  if(error){console.warn('Homepage reels unavailable:',error);section.hidden=true;return}
  const rows=data||[]
  if(!rows.length){section.hidden=true;return}
  const {data:urls,error:urlError}=await supabase.storage.from('reels').createSignedUrls(rows.map(row=>row.video_path),3600)
  if(urlError){console.warn('Could not sign homepage reel URLs:',urlError);section.hidden=true;return}
  const urlByPath=Object.fromEntries((urls||[]).filter(item=>item.signedUrl&&!item.error).map(item=>[item.path,item.signedUrl]))
  reelItems=rows.map(row=>{const user=Array.isArray(row.profiles)?row.profiles[0]||{}:row.profiles||{};return{id:row.id,user_id:row.user_id,caption:row.caption||'',video_path:row.video_path,video_url:urlByPath[row.video_path],created_at:row.created_at,user}}).filter(row=>row.video_url)
  if(!reelItems.length){section.hidden=true;return}
  section.hidden=false
  list.innerHTML=reelItems.map((reel,index)=>{const name=reel.user.full_name||reel.user.username||'Flexoverse member';return `<article class="home-reel-card"><video src="${esc(reel.video_url)}" muted playsinline loop preload="metadata"></video><button type="button" data-home-reel="${index}" aria-label="Watch reel"><svg viewBox="0 0 24 24"><path d="m9 6 10 6-10 6z"/></svg></button><div><strong>${esc(name)}</strong><small>${esc(timeAgo(reel.created_at))}</small>${reel.caption?`<p>${esc(reel.caption)}</p>`:''}</div></article>`}).join('')
  list.addEventListener('click',e=>{const button=e.target.closest('[data-home-reel]');if(button)openReelViewer(Number(button.dataset.homeReel))})
}

async function loadHome() {
  const feed = document.querySelector('#feed-list')
  if (!feed) return
  feed.innerHTML = '<div class="feed-state card">Loading posts from the community…</div>'
  const {data,error}=await supabase.from('posts').select('id,user_id,content,image_path,created_at,profiles!posts_user_id_fkey(full_name,username,avatar_url,membership_plan,membership_status,is_verified),likes(count),comments(count)').order('created_at',{ascending:false}).limit(30)
  if (error) {
    console.error('Could not load public posts:', error)
    feed.innerHTML = '<div class="feed-state card"><strong>Posts could not load</strong><span>Check your connection and try again.</span><button class="button button-outline" data-retry-feed>Try again</button></div>'
    return
  }
  const posts = data || []
  // Fetch badge flags independently of the nested post/profile relation. This avoids
  // missing homepage checks when the relation payload omits profile badge columns.
  const authorIds = [...new Set(posts.map(post => post.user_id).filter(Boolean))]
  if (authorIds.length) {
    const { data: authors, error: authorsError } = await supabase
      .from('profiles')
      .select('id,is_verified,membership_status')
      .in('id', authorIds)
    if (authorsError) console.warn('Could not load homepage author badges:', authorsError)
    else {
      const badgeByAuthor = new Map((authors || []).map(author => [author.id, author]))
      posts.forEach(post => {
        const nested = Array.isArray(post.profiles) ? post.profiles[0] || {} : post.profiles || {}
        const author = badgeByAuthor.get(post.user_id)
        if (author) {
          nested.is_verified = author.is_verified === true
          nested.membership_status = author.membership_status || nested.membership_status
        }
        post.profiles = nested
      })
    }
  }
  liked = new Set()
  if (session && posts.length) {
    const {data:myLikes,error:likesError}=await supabase.from('likes').select('post_id').eq('user_id',session.user.id).in('post_id',posts.map(post=>post.id))
    if (!likesError) liked = new Set((myLikes || []).map(row=>String(row.post_id)))
  }
  feed.innerHTML = posts.length ? posts.map(postCard).join('') : '<section class="empty-feed card"><span class="empty-feed-icon">✦</span><h3>No posts yet</h3><p>There are no public posts in the community yet. Share the first one.</p><a class="button button-primary" href="/create/">Create a post</a></section>'
  if(location.hash.startsWith('#post-'))requestAnimationFrame(()=>document.getElementById(location.hash.slice(1))?.scrollIntoView({behavior:'smooth',block:'start'}))
}

async function loadComments(postId) {
  const list=document.querySelector('#modal-root [data-modal-comment-list]')
  if(!list)return
  list.innerHTML='<p class="comment-state">Loading comments…</p>'
  const {data,error}=await supabase.from('comments').select('id,post_id,user_id,parent_comment_id,content,created_at,profiles!comments_user_id_fkey(full_name,username,avatar_url),comment_likes(count)').eq('post_id',postId).order('created_at',{ascending:true}).limit(150)
  if(error){console.error('Could not load comments:',error);list.innerHTML='<p class="comment-state">Comments could not load. Please try again.</p>';return}
  const rows=data||[],children=new Map(),ids=rows.map(row=>row.id)
  let myCommentLikes=new Set()
  if(session&&ids.length){
    const {data:mine,error:mineError}=await supabase.from('comment_likes').select('comment_id').eq('user_id',session.user.id).in('comment_id',ids)
    if(mineError)console.warn('Could not load your comment likes:',mineError)
    myCommentLikes=new Set((mine||[]).map(item=>item.comment_id))
  }
  rows.forEach(row=>{const key=row.parent_comment_id||'root';if(!children.has(key))children.set(key,[]);children.get(key).push(row)})
  const render=row=>{
    const author=Array.isArray(row.profiles)?row.profiles[0]||{}:row.profiles||{}
    const replies=children.get(row.id)||[]
    const count=relationCount(row.comment_likes)
    const isLiked=myCommentLikes.has(row.id)
    return `<article class="comment-thread"><div class="comment-item"><div class="comment-avatar">${avatar(initials(author.full_name||author.username||'Member'),'blue',author.avatar_url)}</div><div class="comment-content"><div class="comment-bubble"><strong>${esc(author.full_name||author.username||'Flexoverse member')}</strong><p>${esc(row.content)}</p></div><div class="comment-actions"><small>${esc(timeAgo(row.created_at))}</small><button type="button" data-reply-to="${esc(row.id)}">Reply</button></div><form class="reply-form" data-reply-form="${esc(row.id)}" hidden><input name="content" maxlength="1000" required placeholder="Write a reply…" aria-label="Write a reply"><button type="submit">Send</button></form></div><button type="button" class="comment-like ${isLiked?'is-liked':''}" data-like-comment="${esc(row.id)}" aria-label="${isLiked?'Unlike comment':'Like comment'}" aria-pressed="${isLiked}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.2S3.5 15.1 3.5 9.2a4.6 4.6 0 0 1 8.5-2.4 4.6 4.6 0 0 1 8.5 2.4c0 5.9-8.5 11-8.5 11Z"/></svg><span data-comment-like-count>${count}</span></button></div>${replies.length?`<div class="comment-replies">${replies.map(render).join('')}</div>`:''}</article>`
  }
  list.innerHTML=(children.get('root')||[]).map(render).join('')||'<p class="comment-state">No comments yet. Start the conversation.</p>'
  const count=document.querySelector(`#post-${CSS.escape(postId)} [data-comment-count]`)
  if(count)count.textContent=`${rows.length} ${rows.length===1?'comment':'comments'}`
}
function openComments(postId){
  const root=document.querySelector('#modal-root')
  if(!root)return toast('Comments are unavailable on this page.','error')
  const post=document.querySelector(`#post-${CSS.escape(postId)}`)
  const title=post?.querySelector('.post-user strong')?.textContent||'this post'
  root.innerHTML=`<div class="comments-modal-backdrop" data-close-comments><section class="comments-modal" role="dialog" aria-modal="true" aria-label="Comments"><header><div><span class="overline">CONVERSATION</span><h2>Comments</h2><p>On ${esc(title)}’s post</p></div><button type="button" data-close-comments aria-label="Close comments">×</button></header><div class="modal-comment-list" data-modal-comment-list><p class="comment-state">Loading comments…</p></div>${session?`<form class="modal-comment-form" data-new-comment="${esc(postId)}"><input name="content" maxlength="1000" required placeholder="Write a comment…" aria-label="Write a comment"><button type="submit" aria-label="Send comment"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 17 8-17 8 3-8-3-8Zm3 8h14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></button></form>`:`<p class="comment-signin"><a href="/login/">Sign in</a> to join the conversation.</p>`}</section></div>`
  document.body.classList.add('comments-open')
  loadComments(postId)
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
  const list=document.querySelector('#reels-list');if(!list)return
  list.innerHTML='<div class="reels-loading" role="status">Loading your video feed…</div>'
  const {data,error}=await supabase.from('reels').select('id,user_id,caption,video_path,created_at,profiles!reels_user_id_fkey(full_name,username,avatar_url),reel_likes(count),reel_comments(count)').eq('is_public',true).order('created_at',{ascending:false}).limit(50)
  if(error){console.error(error);list.innerHTML='<div class="reels-empty-state card"><strong>Reels could not load</strong><p>Please check your connection and try again.</p><button class="button button-outline" data-retry-reels>Try again</button></div>';return}
  const rows=data||[];let urlByPath={}
  if(rows.length){const {data:urls,error:urlError}=await supabase.storage.from('reels').createSignedUrls(rows.map(r=>r.video_path),3600);if(urlError){console.error(urlError);list.innerHTML='<div class="reels-empty-state card"><strong>Videos could not be loaded</strong><p>Refresh and try again.</p></div>';return}urlByPath=Object.fromEntries((urls||[]).filter(u=>u.signedUrl&&!u.error).map(u=>[u.path,u.signedUrl]))}
  reelItems=rows.map(row=>{const user=Array.isArray(row.profiles)?row.profiles[0]||{}:row.profiles||{};return{id:row.id,user_id:row.user_id,caption:row.caption||'',video_path:row.video_path,video_url:urlByPath[row.video_path],created_at:row.created_at,user,like_count:relationCount(row.reel_likes),comment_count:relationCount(row.reel_comments)}}).filter(r=>r.video_url)
  reelLiked=new Set()
  if(session&&reelItems.length){const {data:mine,error:mineError}=await supabase.from('reel_likes').select('reel_id').eq('user_id',session.user.id).in('reel_id',reelItems.map(r=>r.id));if(!mineError)reelLiked=new Set((mine||[]).map(x=>x.reel_id))}
  if(!reelItems.length){list.innerHTML='<div class="reels-empty-state card"><strong>Your video feed is ready</strong><p>When people share reels, they’ll appear here. Be the first to post a moment.</p><a class="button button-primary" href="/reels/create/">Create a reel</a></div>';return}
  list.innerHTML=reelItems.map((r,i)=>{const name=r.user.full_name||r.user.username||'Flexoverse member',username=r.user.username||'member',likedNow=reelLiked.has(r.id);return `<article class="reel-card tiktok-reel-card" data-reel-card="${i}"><video class="reel-preview" src="${esc(r.video_url)}" muted playsinline loop preload="metadata" aria-label="Video by ${esc(name)}"></video><div class="reel-card-shade"></div><button class="reel-open" type="button" data-open-reel="${i}" aria-label="Open reel">▶</button><div class="reel-card-details"><a class="reel-author" href="${profileUrl(username)}">${avatar(initials(name),'white',r.user.avatar_url)}<span><strong>${esc(name)}</strong><small>@${esc(username)}</small></span></a><p>${esc(r.caption)}</p></div><div class="reel-feed-actions"><button type="button" data-feed-like="${esc(r.id)}" class="${likedNow?'is-liked':''}" aria-pressed="${likedNow}" aria-label="Like reel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 8.7c0 4.2-8.8 10-8.8 10S3.2 12.9 3.2 8.7A4.2 4.2 0 0 1 11 6.4l1 1.1 1-1.1a4.2 4.2 0 0 1 7.8 2.3Z"/></svg><small data-feed-like-count="${esc(r.id)}">${r.like_count}</small></button><button type="button" data-feed-comments="${esc(r.id)}" aria-label="Comments"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11.5a8 8 0 0 1-8 8 8.4 8.4 0 0 1-3.8-.9L4 20l1.4-4.2A8 8 0 1 1 20 11.5Z"/><path d="M8 11h8M8 15h5"/></svg><small>${r.comment_count}</small></button><button type="button" data-share-reel="${esc(r.id)}" aria-label="Share reel"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V3m-5 5 5-5 5 5"/><path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/></svg><small>Share</small></button><button type="button" data-feed-mute aria-label="Mute or unmute"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M17 9a5 5 0 0 1 0 6m2-9a9 9 0 0 1 0 12"/></svg><small>Sound</small></button></div><div class="reel-desktop-controls"><input class="reel-desktop-progress" type="range" min="0" max="1000" value="0" aria-label="Video progress"><div class="reel-desktop-control-row"><div class="reel-desktop-left"><button type="button" data-feed-play aria-label="Pause video"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg></button><span data-feed-time>00:00 / 00:00</span></div><div class="reel-desktop-right"><label>Auto scroll <button type="button" class="reel-auto-toggle" data-feed-auto aria-pressed="false"><i></i></button></label><button type="button" data-feed-speed>1.0x</button><button type="button" data-feed-captions aria-label="Captions"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h4m-4 4h3m4-4h3m-3 4h3"/></svg></button><button type="button" data-feed-mute aria-label="Mute or unmute"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M17 9a5 5 0 0 1 0 6"/></svg></button></div></div></div></article>`}).join('')
  list.querySelectorAll('.tiktok-reel-card').forEach(card=>{
    const video=card.querySelector('video'),progress=card.querySelector('.reel-desktop-progress'),time=card.querySelector('[data-feed-time]')
    if(video&&window.matchMedia('(min-width: 701px)').matches)video.loop=false
    const clock=value=>{if(!Number.isFinite(value))return '00:00';const m=Math.floor(value/60),s=Math.floor(value%60);return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0')}
    video?.addEventListener('timeupdate',()=>{if(progress&&video.duration){const percent=video.currentTime/video.duration*100;progress.value=String(Math.round(percent*10));progress.style.setProperty('--reel-progress',percent+'%')}if(time)time.textContent=clock(video.currentTime)+' / '+clock(video.duration)})
    progress?.addEventListener('input',()=>{if(video.duration)video.currentTime=Number(progress.value)/1000*video.duration})
    card.querySelector('[data-feed-play]')?.addEventListener('click',()=>{if(video.paused){video.play().catch(()=>{});card.querySelector('[data-feed-play]').textContent='Ⅱ'}else{video.pause();card.querySelector('[data-feed-play]').textContent='▶'}})
    card.querySelectorAll('[data-feed-mute]').forEach(button=>button.addEventListener('click',()=>{video.muted=!video.muted;card.querySelectorAll('[data-feed-mute]').forEach(b=>b.textContent=video.muted?'◖':'♫')}))
    card.querySelector('[data-feed-speed]')?.addEventListener('click',event=>{const speeds=[1,1.25,1.5,2,.75];const next=speeds[(speeds.indexOf(video.playbackRate)+1)%speeds.length];video.playbackRate=next;event.currentTarget.textContent=next.toFixed(1)+'x'})
    card.querySelector('[data-feed-captions]')?.addEventListener('click',event=>{event.currentTarget.classList.toggle('active')})
    card.querySelector('[data-feed-auto]')?.addEventListener('click',event=>{const button=event.currentTarget,enabled=button.getAttribute('aria-pressed')!=='true';button.setAttribute('aria-pressed',String(enabled));card.dataset.autoScroll=String(enabled)})
    video?.addEventListener('ended',()=>{if(card.dataset.autoScroll==='true'){const next=card.nextElementSibling;if(next)next.scrollIntoView({behavior:'smooth',block:'start'})}else{video.currentTime=0;video.play().catch(()=>{})}})
  })
  observeReelPreviews()
  const sharedId=new URLSearchParams(location.search).get('id');if(sharedId){const i=reelItems.findIndex(r=>r.id===sharedId);if(i>=0)openReelViewer(i)}
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
  reelViewerIndex=index;reelPreviewObserver?.disconnect();document.querySelectorAll('.reel-preview').forEach(v=>v.pause())
  const root=document.querySelector('#reel-viewer-root');if(!root)return
  const r=reelItems[index],name=r.user.full_name||r.user.username||'Flexoverse member',username=r.user.username||'member',isLiked=reelLiked.has(r.id)
  root.innerHTML=`<div class="reel-viewer tiktok-viewer" role="dialog" aria-modal="true" aria-label="Reel by ${esc(name)}"><button class="reel-viewer-backdrop" type="button" data-close-reel aria-label="Close reel"></button><section class="reel-viewer-shell"><button class="reel-viewer-close" type="button" data-close-reel aria-label="Close reel">×</button><button class="reel-viewer-step reel-viewer-previous" type="button" data-reel-step="-1" aria-label="Previous reel">‹</button><div class="reel-viewer-frame"><video id="active-reel-video" src="${esc(r.video_url)}" playsinline autoplay loop preload="auto"></video><div class="reel-viewer-info"><a class="reel-author" href="${profileUrl(username)}">${avatar(initials(name),'white',r.user.avatar_url)}<span><strong>${esc(name)}</strong><small>@${esc(username)} · ${esc(timeAgo(r.created_at))}</small></span></a>${r.caption?`<p>${esc(r.caption)}</p>`:''}</div><div class="reel-viewer-actions"><button type="button" data-viewer-like="${esc(r.id)}" class="${isLiked?'is-liked':''}" aria-pressed="${isLiked}"><b>♥</b><small data-viewer-like-count>${r.like_count}</small></button><button type="button" data-viewer-comments="${esc(r.id)}"><b>●</b><small>${r.comment_count}</small></button><button type="button" data-share-reel="${esc(r.id)}"><b>↗</b><small>Share</small></button></div></div><aside class="reel-comments-panel" data-reel-comments-panel hidden><header><strong>Comments</strong><button type="button" data-hide-reel-comments>×</button></header><div class="reel-comments-list" data-reel-comments-list><p class="comment-state">Loading comments…</p></div>${session?`<form class="reel-comment-form" data-reel-comment-form="${esc(r.id)}"><input name="content" maxlength="1000" required placeholder="Add a comment…"><button type="submit">Post</button></form>`:'<p class="reel-comment-signin"><a href="/login/">Sign in</a> to join the conversation.</p>'}</aside><button class="reel-viewer-step reel-viewer-next" type="button" data-reel-step="1" aria-label="Next reel">›</button></section><span class="reel-viewer-position">${index+1} / ${reelItems.length}</span></div>`
  document.body.classList.add('reel-viewer-open');const video=root.querySelector('video');video.muted=false;video.play().catch(()=>{video.muted=true;video.play().catch(()=>{})});root.querySelector('.reel-viewer-close')?.focus()
}
async function toggleReelLike(id){
  if(!session){openAuth();return}const r=reelItems.find(x=>x.id===id);if(!r)return
  const was=reelLiked.has(id),next=!was;if(next){reelLiked.add(id);r.like_count++}else{reelLiked.delete(id);r.like_count=Math.max(0,r.like_count-1)}
  const paint=()=>{document.querySelectorAll('[data-viewer-like],[data-feed-like]').forEach(b=>{if((b.dataset.viewerLike||b.dataset.feedLike)===id){b.classList.toggle('is-liked',next);b.setAttribute('aria-pressed',String(next));const c=b.querySelector('[data-viewer-like-count],[data-feed-like-count]');if(c)c.textContent=r.like_count}})};paint()
  const res=next?await supabase.from('reel_likes').insert({reel_id:id,user_id:session.user.id}):await supabase.from('reel_likes').delete().eq('reel_id',id).eq('user_id',session.user.id)
  if(res.error&&!(res.error.code==='23505'&&next)){if(was){reelLiked.add(id);r.like_count++}else{reelLiked.delete(id);r.like_count=Math.max(0,r.like_count-1)};paint();toast(res.error.message,'error')}
}
async function loadReelComments(id){
  const list=document.querySelector('#reel-viewer-root [data-reel-comments-list]');if(!list)return
  list.innerHTML='<p class="comment-state">Loading comments…</p>'
  const {data,error}=await supabase.from('reel_comments').select('id,parent_comment_id,content,created_at,profiles!reel_comments_user_id_fkey(full_name,username)').eq('reel_id',id).order('created_at',{ascending:true}).limit(150)
  if(error){console.error(error);list.innerHTML='<p class="comment-state">Comments could not load. Try again.</p>';return}
  const rows=data||[],groups=new Map();rows.forEach(x=>{const k=x.parent_comment_id||'root';if(!groups.has(k))groups.set(k,[]);groups.get(k).push(x)})
  const draw=x=>{const u=Array.isArray(x.profiles)?x.profiles[0]||{}:x.profiles||{};return `<article class="reel-comment"><strong>${esc(u.full_name||u.username||'Flexoverse member')}</strong><p>${esc(x.content)}</p><small>${esc(timeAgo(x.created_at))}</small><button type="button" data-reel-reply="${esc(x.id)}">Reply</button><form data-reel-reply-form="${esc(x.id)}" hidden><input name="content" maxlength="1000" required placeholder="Write a reply"><button type="submit">Send</button></form>${(groups.get(x.id)||[]).map(draw).join('')}</article>`}
  list.innerHTML=(groups.get('root')||[]).map(draw).join('')||'<p class="comment-state">No comments yet. Start the conversation.</p>'
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

let tusClientPromise=null
async function loadTusClient(){
  if(window.tus?.Upload)return window.tus
  if(!tusClientPromise){
    tusClientPromise=new Promise((resolve,reject)=>{
      const script=document.createElement('script')
      script.src='https://cdn.jsdelivr.net/npm/tus-js-client@4.3.1/dist/tus.min.js'
      script.async=true
      script.onload=()=>window.tus?.Upload?resolve(window.tus):reject(new Error('The video uploader could not be loaded. Please refresh and try again.'))
      script.onerror=()=>{tusClientPromise=null;reject(new Error('The video uploader could not be loaded. Check your connection and try again.'))}
      document.head.append(script)
    })
  }
  return tusClientPromise
}

function prepareReelComposer() {
  const form=document.querySelector('#reel-form')
  if(!form)return
  if(!session){form.innerHTML=`<div class="reel-auth-state"><span class="friends-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/></svg></span><strong>Sign in to share a reel</strong><p>Connect with the community before you upload a video.</p><a class="button button-primary" href="${authPageHref('login')}">Sign in</a></div>`;return}
  const fileInput=document.querySelector('#reel-video-file')
  const preview=document.querySelector('#reel-video-preview')
  const cameraPreview=document.querySelector('#reel-camera-live')
  const cameraPlaceholder=document.querySelector('#reel-camera-placeholder')
  const prompt=document.querySelector('#reel-upload-prompt')
  const caption=document.querySelector('#reel-caption')
  const submit=document.querySelector('#reel-submit')
  const stage=document.querySelector('#reel-preview-stage')
  const startRange=document.querySelector('#reel-trim-start')
  const endRange=document.querySelector('#reel-trim-end')
  const startValue=document.querySelector('#reel-start-value')
  const endValue=document.querySelector('#reel-end-value')
  const speed=document.querySelector('#reel-speed')
  const overlayInput=document.querySelector('#reel-overlay-text')
  const overlay=document.querySelector('#reel-preview-overlay')
  const aspect=document.querySelector('#reel-aspect')
  const audioFile=document.querySelector('#reel-audio-file')
  const audio=document.querySelector('#reel-audio-preview')
  const audioControls=document.querySelector('#reel-audio-controls')
  const audioVolume=document.querySelector('#reel-audio-volume')
  let previewUrl='',audioUrl='',trimStart=0,trimEnd=0
  const draftKey='flexoverse-reel-draft:'+session.user.id
  try{const draft=JSON.parse(localStorage.getItem(draftKey)||'{}');if(draft.caption&&caption)caption.value=draft.caption}catch{}
  const updateCaptionCount=()=>{const count=document.querySelector('#reel-caption-count');if(count&&caption)count.textContent=`${caption.value.length} / 500`}
  const updateTrimLabels=()=>{if(startValue)startValue.textContent=`${trimStart.toFixed(1)}s`;if(endValue)endValue.textContent=preview?.duration? `${trimEnd.toFixed(1)}s`:'—'}
  const enableTools=enabled=>{[startRange,endRange,speed,overlayInput,audioFile].forEach(el=>{if(el)el.disabled=!enabled})}
  if(preview&&stage){preview.controls=true;preview.classList.add('reel-stage-video');stage.prepend(preview)}
  const recordStart=document.querySelector('#reel-record-start')
  const recordStop=document.querySelector('#reel-record-stop')
  const recordStatus=document.querySelector('#reel-record-status')
  let cameraStream=null,mediaRecorder=null,recordedChunks=[]
  const stopCameraPreview=()=>{cameraStream?.getTracks().forEach(track=>track.stop());cameraStream=null;if(cameraPreview)cameraPreview.srcObject=null}
  const startCameraPreview=async()=>{
    if(!cameraPreview||!navigator.mediaDevices?.getUserMedia)return
    try{
      cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'user'}},audio:false})
      cameraPreview.srcObject=cameraStream
      cameraPreview.hidden=false
      cameraPlaceholder?.classList.add('camera-ready')
      await cameraPreview.play().catch(()=>{})
      stage?.classList.add('has-camera')
      if(cameraPlaceholder)cameraPlaceholder.hidden=true
    }catch(error){
      if(cameraPlaceholder){cameraPlaceholder.hidden=false;cameraPlaceholder.innerHTML='<strong>Camera unavailable</strong><small>Allow camera access or attach a video.</small>'}
    }
  }
  if(window.matchMedia('(max-width: 700px)').matches)startCameraPreview()
  recordStart?.addEventListener('click',async()=>{
    if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Camera recording is not supported in this browser. Upload a video instead.','error');return}
    try{
      stopCameraPreview()
      cameraStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:'user'},audio:true})
      preview.srcObject=cameraStream;preview.hidden=false;prompt.hidden=true
      stage?.classList.add('has-video')
      await preview.play().catch(()=>{})
      const preferredType=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(type=>MediaRecorder.isTypeSupported(type))
      mediaRecorder=new MediaRecorder(cameraStream,preferredType?{mimeType:preferredType}:{})
      recordedChunks=[]
      mediaRecorder.ondataavailable=event=>{if(event.data?.size)recordedChunks.push(event.data)}
      mediaRecorder.onstop=()=>{
        const mime=mediaRecorder.mimeType||'video/webm'
        const extension=mime.includes('mp4')?'mp4':'webm'
        const recordedFile=new File(recordedChunks,`flexoverse-reel-${Date.now()}.${extension}`,{type:mime})
        const transfer=new DataTransfer();transfer.items.add(recordedFile);fileInput.files=transfer.files
        cameraStream?.getTracks().forEach(track=>track.stop());cameraStream=null
        preview.srcObject=null
        if(recordStatus)recordStatus.textContent='Recording ready. Preview it, then share your Reel.'
        recordStart.disabled=false;recordStop.disabled=true
        fileInput.dispatchEvent(new Event('change',{bubbles:true}))
      }
      mediaRecorder.start(500)
      recordStart.disabled=true;recordStop.disabled=false
      if(recordStatus)recordStatus.textContent='Recording… speak or move naturally. Select Stop when finished.'
    }catch(error){cameraStream?.getTracks().forEach(track=>track.stop());cameraStream=null;recordStart.disabled=false;recordStop.disabled=true;toast(error.message||'Camera permission was not granted.','error')}
  })
  recordStop?.addEventListener('click',()=>{if(mediaRecorder?.state==='recording')mediaRecorder.stop()})
  fileInput?.addEventListener('change',()=>{
    const file=fileInput.files?.[0]
    if(!file){submit.disabled=true;preview.hidden=true;prompt.hidden=false;enableTools(false);return}
    if(!['video/mp4','video/webm','video/quicktime'].includes(file.type)){toast('Choose an MP4, WebM or MOV video.','error');fileInput.value='';preview.hidden=true;prompt.hidden=false;submit.disabled=true;enableTools(false);return}
    if(file.size>50*1024*1024){toast('This video is larger than 50 MB.','error');fileInput.value='';preview.hidden=true;prompt.hidden=false;submit.disabled=true;enableTools(false);return}
    stopCameraPreview()
    if(previewUrl)URL.revokeObjectURL(previewUrl)
    previewUrl=URL.createObjectURL(file);preview.src=previewUrl;preview.hidden=false;prompt.hidden=true;submit.disabled=false;enableTools(true);preview.load()
  })
  preview?.addEventListener('loadedmetadata',()=>{
    const duration=Number.isFinite(preview.duration)?preview.duration:0
    trimStart=0;trimEnd=duration
    ;[startRange,endRange].forEach(el=>{if(el){el.max=String(duration);el.value=String(duration);el.disabled=!duration}})
    if(startRange)startRange.value='0'
    if(speed)speed.disabled=false
    if(overlayInput)overlayInput.disabled=false
    if(audioFile)audioFile.disabled=false
    updateTrimLabels()
    if(stage)stage.classList.add('has-video')
  })
  startRange?.addEventListener('input',()=>{trimStart=Math.min(Number(startRange.value),Math.max(0,trimEnd-.1));startRange.value=String(trimStart);if(preview&&preview.currentTime<trimStart)preview.currentTime=trimStart;updateTrimLabels()})
  endRange?.addEventListener('input',()=>{trimEnd=Math.max(Number(endRange.value),trimStart+.1);endRange.value=String(trimEnd);if(preview&&preview.currentTime>trimEnd)preview.currentTime=trimStart;updateTrimLabels()})
  preview?.addEventListener('timeupdate',()=>{if(trimEnd>trimStart&&preview.currentTime>=trimEnd){preview.pause();preview.currentTime=trimStart}})
  preview?.addEventListener('play',()=>{if(preview.currentTime<trimStart||preview.currentTime>=trimEnd)preview.currentTime=trimStart})
  speed?.addEventListener('change',()=>{if(preview)preview.playbackRate=Number(speed.value)||1})
  aspect?.addEventListener('change',()=>{if(stage)stage.style.aspectRatio=aspect.value})
  let overlayPosition={x:50,y:45},overlayDrag=null
  const paintOverlay=()=>{if(!overlay)return;overlay.textContent=overlayInput?.value||'';overlay.hidden=!(overlayInput?.value||'').trim();overlay.style.left=overlayPosition.x+'%';overlay.style.top=overlayPosition.y+'%';overlay.style.right='auto';overlay.style.transform='translate(-50%,-50%)'}
  overlayInput?.addEventListener('input',paintOverlay)
  if(overlay){
    overlay.style.pointerEvents='auto';overlay.style.touchAction='none';overlay.style.cursor='move'
    overlay.addEventListener('pointerdown',event=>{if(overlay.hidden)return;event.preventDefault();overlay.setPointerCapture(event.pointerId);const rect=stage.getBoundingClientRect();overlayDrag={id:event.pointerId,rect};overlay.style.cursor='grabbing'})
    overlay.addEventListener('pointermove',event=>{if(!overlayDrag||overlayDrag.id!==event.pointerId)return;const r=overlayDrag.rect;overlayPosition={x:Math.max(8,Math.min(92,(event.clientX-r.left)/r.width*100)),y:Math.max(6,Math.min(94,(event.clientY-r.top)/r.height*100))};paintOverlay()})
    const endOverlayDrag=event=>{if(overlayDrag?.id===event.pointerId){overlayDrag=null;overlay.style.cursor='move'}}
    overlay.addEventListener('pointerup',endOverlayDrag);overlay.addEventListener('pointercancel',endOverlayDrag)
  }
  const audioStartRange=document.querySelector('#reel-audio-trim-start')
  const audioEndRange=document.querySelector('#reel-audio-trim-end')
  const audioStartLabel=document.querySelector('#reel-audio-start-value')
  const audioEndLabel=document.querySelector('#reel-audio-end-value')
  const audioWaveform=document.querySelector('#reel-audio-waveform')
  let audioTrimStart=0,audioTrimEnd=0
  const paintAudioWaveform=async file=>{
    if(!audioWaveform)return
    audioWaveform.innerHTML=''
    try{
      const AudioContextClass=window.AudioContext||window.webkitAudioContext
      if(!AudioContextClass)return
      const context=new AudioContextClass()
      const buffer=await context.decodeAudioData(await file.arrayBuffer())
      const channel=buffer.getChannelData(0),bars=72,step=Math.max(1,Math.floor(channel.length/bars))
      const values=[]
      for(let i=0;i<bars;i++){let peak=0;for(let j=i*step;j<Math.min(channel.length,(i+1)*step);j+=Math.max(1,Math.floor(step/40)))peak=Math.max(peak,Math.abs(channel[j]));values.push(Math.max(5,Math.round(peak*100)))}
      audioWaveform.innerHTML=values.map(v=>`<i style="height:${v}%"></i>`).join('')
      await context.close()
    }catch{audioWaveform.innerHTML='<span>Audio waveform preview unavailable</span>'}
  }
  const updateAudioTrim=()=>{
    if(audioStartLabel)audioStartLabel.textContent=audioTrimStart.toFixed(1)+'s'
    if(audioEndLabel)audioEndLabel.textContent=audioTrimEnd.toFixed(1)+'s'
  }
  audioFile?.addEventListener('change',async()=>{
    const file=audioFile.files?.[0];if(!file||!audio)return
    if(audioUrl)URL.revokeObjectURL(audioUrl)
    audioUrl=URL.createObjectURL(file);audio.src=audioUrl;audioControls.hidden=false
    audio.volume=Number(audioVolume?.value??.5);audio.load()
    await paintAudioWaveform(file)
  })
  audio?.addEventListener('loadedmetadata',()=>{
    audioTrimStart=0;audioTrimEnd=Number.isFinite(audio.duration)?audio.duration:0
    ;[audioStartRange,audioEndRange].forEach(el=>{if(el){el.max=String(audioTrimEnd);el.disabled=!audioTrimEnd}})
    if(audioStartRange)audioStartRange.value='0'
    if(audioEndRange)audioEndRange.value=String(audioTrimEnd)
    updateAudioTrim()
  })
  audioStartRange?.addEventListener('input',()=>{
    audioTrimStart=Math.min(Number(audioStartRange.value),Math.max(0,audioTrimEnd-.1))
    audioStartRange.value=String(audioTrimStart)
    if(audio&&audio.currentTime<audioTrimStart)audio.currentTime=audioTrimStart
    updateAudioTrim()
  })
  audioEndRange?.addEventListener('input',()=>{
    audioTrimEnd=Math.max(Number(audioEndRange.value),audioTrimStart+.1)
    audioEndRange.value=String(audioTrimEnd)
    if(audio&&audio.currentTime>audioTrimEnd){audio.pause();audio.currentTime=audioTrimStart}
    updateAudioTrim()
  })
  audio?.addEventListener('timeupdate',()=>{
    if(audioTrimEnd>audioTrimStart&&audio.currentTime>=audioTrimEnd){audio.pause();audio.currentTime=audioTrimStart}
  })
  audio?.addEventListener('play',()=>{if(audio.currentTime<audioTrimStart||audio.currentTime>=audioTrimEnd)audio.currentTime=audioTrimStart})
  audioVolume?.addEventListener('input',()=>{if(audio)audio.volume=Number(audioVolume.value)})
  let selectedYoutubeTrack=null
  const musicModal=document.querySelector('#reel-music-modal')
  const musicSearchOpen=document.querySelector('#reel-music-search-open')
  const musicTrendingOpen=document.querySelector('#reel-music-trending-open')
  const musicQuery=document.querySelector('#reel-music-query')
  const musicSearchButton=document.querySelector('#reel-music-search-button')
  const musicStatus=document.querySelector('#reel-music-status')
  const musicResults=document.querySelector('#reel-music-results')
  const musicCurrentTitle=document.querySelector('#reel-music-current-title')
  const musicCurrentSubtitle=document.querySelector('#reel-music-current-subtitle')
  const musicRemove=document.querySelector('#reel-music-remove')
  const musicPlayer=document.querySelector('#reel-music-player')
  const musicPreview=document.querySelector('#reel-music-preview')
  const musicDone=document.querySelector('#reel-music-done')
  let pendingMusicTrack=null
  let musicRequestId=0
  const openMusicModal=async(mode='search')=>{
    if(!musicModal)return
    musicModal.hidden=false;document.body.classList.add('reel-music-open')
    if(mode==='search'){musicQuery?.focus();if(musicStatus)musicStatus.textContent='Search for a song, artist or sound.';if(musicResults)musicResults.innerHTML=''}
    else{if(musicQuery)musicQuery.value='';await searchMusic('trending music 2026',true)}
  }
  const closeMusicModal=()=>{if(!musicModal)return;musicModal.hidden=true;document.body.classList.remove('reel-music-open')}
  musicSearchOpen?.addEventListener('click',()=>openMusicModal('search'))
  musicTrendingOpen?.addEventListener('click',()=>openMusicModal('trending'))
  musicModal?.querySelectorAll('[data-music-close]').forEach(button=>button.addEventListener('click',closeMusicModal))
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&musicModal&&!musicModal.hidden)closeMusicModal()})
  const saveMusicDraft=()=>{try{localStorage.setItem(draftKey,JSON.stringify({caption:caption?.value||'',youtubeTrack:selectedYoutubeTrack,updatedAt:Date.now()}))}catch{}}
  const setPendingTrack=track=>{
    pendingMusicTrack=track
    if(musicDone)musicDone.disabled=!track
    if(musicDone)musicDone.textContent=track?'Use sound':'Use sound'
    if(musicResults)musicResults.querySelectorAll('.reel-music-track').forEach(row=>row.classList.toggle('selected',row.dataset.trackId===track?.videoId))
    if(track&&musicStatus)musicStatus.textContent='Preview selected. Tap “Use sound” to add it to your reel.'
  }
  const renderMusicResults=items=>{
    if(!musicResults)return
    musicResults.innerHTML=items.map((item,index)=>`<article class="reel-music-track ${pendingMusicTrack?.videoId===item.videoId?'selected':''}" data-track-id="${esc(item.videoId)}">
      <button type="button" class="reel-music-track-play" data-music-preview="${esc(item.videoId)}" aria-label="Preview ${esc(item.title)}"><img src="${esc(item.thumbnail)}" alt="" loading="lazy"><span class="reel-music-play-glyph">▶</span></button>
      <span class="reel-music-track-copy"><strong>${esc(item.title)}</strong><small>${esc(item.channel)}</small></span>
      <button type="button" class="reel-music-add" data-music-select="${esc(item.videoId)}">Add</button>
    </article>`).join('')
    musicResults.querySelectorAll('[data-music-preview]').forEach(button=>button.addEventListener('click',()=>{
      const track=items.find(item=>item.videoId===button.dataset.musicPreview)
      if(!track||!musicPlayer||!musicPreview)return
      musicPlayer.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(track.videoId)}?autoplay=1&rel=0`
      musicPreview.hidden=false
      setPendingTrack(track)
    }))
    musicResults.querySelectorAll('[data-music-select]').forEach(button=>button.addEventListener('click',()=>{
      const track=items.find(item=>item.videoId===button.dataset.musicSelect)
      if(track){setPendingTrack(track);if(musicPlayer&&musicPreview){musicPlayer.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(track.videoId)}?autoplay=1&rel=0`;musicPreview.hidden=false}}
    }))
  }
  const searchMusic=async(query,discover=false)=>{
    const clean=String(query||'').trim()
    if(!discover&&clean.length<2){if(musicStatus)musicStatus.textContent='Type at least two characters to search.';return}
    const requestId=++musicRequestId
    if(musicSearchButton){musicSearchButton.disabled=true;musicSearchButton.textContent='Searching…'}
    if(musicStatus)musicStatus.textContent=discover?'Finding popular sounds…':'Searching sounds…'
    if(musicResults)musicResults.innerHTML=''
    if(musicDone)musicDone.disabled=true
    try{
      const {data:{session:authSession}}=await supabase.auth.getSession()
      if(!authSession?.access_token)throw new Error('Please sign in again to browse music.')
      const response=await fetch('https://gkgjfbusdyiohiztwuec.supabase.co/functions/v1/youtube-music-search',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${authSession.access_token}`,'apikey':'sb_publishable_Kmm1YLrnBwDKV_1xO2DjNw_e4SzSZly'},body:JSON.stringify({query:clean})})
      const payload=await response.json().catch(()=>({}))
      if(!response.ok)throw new Error(payload.error||'Could not load sounds.')
      if(requestId!==musicRequestId)return
      const items=payload.items||[]
      renderMusicResults(items)
      if(musicStatus)musicStatus.textContent=items.length?(discover?'Trending sounds':'Search results'):'No sounds found. Try another search.'
    }catch(error){if(requestId===musicRequestId&&musicStatus)musicStatus.textContent=error.message||'Could not load sounds.'}
    finally{if(requestId===musicRequestId&&musicSearchButton){musicSearchButton.disabled=false;musicSearchButton.textContent='Search'}}
  }
  const mobileSounds=document.querySelector('#reel-mobile-sounds')
  const mobileSheet=document.querySelector('#reel-mobile-tool-sheet')
  const mobileSheetContent=document.querySelector('#reel-mobile-tool-content')
  const closeMobileSheet=()=>{if(mobileSheet)mobileSheet.hidden=true}
  mobileSounds?.addEventListener('click',()=>openMusicModal('trending'))
  document.querySelector('#reel-mobile-choose-video')?.addEventListener('click',()=>fileInput?.click())
  document.querySelector('#reel-mobile-sheet-close')?.addEventListener('click',closeMobileSheet)
  const openMobileTool=(kind)=>{
    if(!mobileSheet||!mobileSheetContent)return
    mobileSheet.hidden=false
    if(kind==='text'){mobileSheetContent.innerHTML='<h3>Add text</h3><p>Type your text, then drag it anywhere on the video preview.</p>';const field=document.createElement('input');field.type='text';field.maxLength=80;field.placeholder='Write something…';field.value=overlayInput?.value||'';field.addEventListener('input',()=>{if(overlayInput){overlayInput.value=field.value;overlayInput.dispatchEvent(new Event('input',{bubbles:true}))}});mobileSheetContent.append(field);field.focus()}
    else if(kind==='stickers'){mobileSheetContent.innerHTML='<h3>Stickers</h3><p>Tap a sticker to add it to your reel.</p>';['❤️','✨','😂','🔥','😍','🎉'].forEach(symbol=>{const b=document.createElement('button');b.type='button';b.className='reel-mobile-sticker';b.textContent=symbol;b.addEventListener('click',()=>{if(overlayInput){overlayInput.value=(overlayInput.value+' '+symbol).trim();overlayInput.dispatchEvent(new Event('input',{bubbles:true}))}});mobileSheetContent.append(b)})}
    else if(kind==='clips'){mobileSheetContent.innerHTML='<h3>Adjust clips</h3><p>Trim the beginning and end of your video.</p>';const tools=document.querySelector('.reel-editor-tools');if(tools)mobileSheetContent.append(tools);}
    else if(kind==='voiceover'){mobileSheetContent.innerHTML='<h3>Add voiceover</h3><p>Select an audio recording from your device.</p>';const pick=document.createElement('button');pick.type='button';pick.textContent='Choose audio';pick.addEventListener('click',()=>audioFile?.click());mobileSheetContent.append(pick)}
    else if(kind==='privacy'){mobileSheetContent.innerHTML='<h3>Privacy settings</h3><p>Your reel is currently set to Public community. Audience controls will be available when private audience publishing is enabled.</p>'}
    else if(kind==='filters'||kind==='effects'){const styles=['none','grayscale(1)','sepia(.65)','contrast(1.2) saturate(1.25)','brightness(1.15)'];const names=['Original','Mono','Warm','Vivid','Bright'];let current=0;mobileSheetContent.innerHTML='<h3>'+ (kind==='filters'?'Filters':'Effects')+'</h3><p>Choose a look for your preview.</p>';const row=document.createElement('div');row.className='reel-mobile-filter-row';styles.forEach((filter,i)=>{const b=document.createElement('button');b.type='button';b.textContent=names[i];b.addEventListener('click',()=>{current=i;if(preview)preview.style.filter=filter;row.querySelectorAll('button').forEach((x,j)=>x.classList.toggle('active',j===i))});row.append(b)});mobileSheetContent.append(row)}
  }
  document.querySelectorAll('[data-mobile-tool]').forEach(button=>button.addEventListener('click',()=>openMobileTool(button.dataset.mobileTool)))
  document.querySelector('#reel-mobile-next')?.addEventListener('click',()=>{const details=document.querySelector('.reel-studio-details');if(details?.classList.contains('mobile-details-open')){form.requestSubmit();return}if(details){details.classList.add('mobile-details-open');details.scrollIntoView({block:'nearest',behavior:'smooth'});const next=document.querySelector('#reel-mobile-next');if(next)next.textContent='Share reel'}})
  document.querySelector('#reel-mobile-story')?.addEventListener('click',()=>{if(!fileInput?.files?.length){fileInput?.click();return}form.requestSubmit()})
  musicSearchButton?.addEventListener('click',()=>searchMusic(musicQuery?.value))
  musicQuery?.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchMusic(musicQuery.value)}})
  document.querySelector('#reel-music-trending-tab')?.addEventListener('click',()=>{if(musicQuery)musicQuery.value='';searchMusic('trending music 2026',true)})
  musicDone?.addEventListener('click',()=>{
    if(!pendingMusicTrack)return
    selectedYoutubeTrack=pendingMusicTrack
    if(musicCurrentTitle)musicCurrentTitle.textContent=selectedYoutubeTrack.title
    if(musicCurrentSubtitle)musicCurrentSubtitle.textContent=selectedYoutubeTrack.channel
    if(musicRemove)musicRemove.hidden=false
    if(musicPlayer){musicPlayer.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selectedYoutubeTrack.videoId)}?rel=0`;musicPreview.hidden=false}
    saveMusicDraft();closeMusicModal();toast('Sound added to your reel.','success')
  })
  musicRemove?.addEventListener('click',()=>{
    selectedYoutubeTrack=null;pendingMusicTrack=null
    if(musicCurrentTitle)musicCurrentTitle.textContent='Add music to your reel'
    if(musicCurrentSubtitle)musicCurrentSubtitle.textContent='Find a sound that fits your video'
    musicRemove.hidden=true
    if(musicPlayer)musicPlayer.src=''
    if(musicPreview)musicPreview.hidden=true
    saveMusicDraft()
  })
  try{
    const savedDraft=JSON.parse(localStorage.getItem(draftKey)||'{}')
    if(savedDraft.youtubeTrack){
      selectedYoutubeTrack=savedDraft.youtubeTrack
      if(musicCurrentTitle)musicCurrentTitle.textContent=selectedYoutubeTrack.title
      if(musicCurrentSubtitle)musicCurrentSubtitle.textContent=selectedYoutubeTrack.channel
      if(musicRemove)musicRemove.hidden=false
      if(musicPlayer){musicPlayer.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(selectedYoutubeTrack.videoId)}?rel=0`;musicPreview.hidden=false}
    }
  }catch{}
  caption?.addEventListener('input',()=>{updateCaptionCount();try{localStorage.setItem(draftKey,JSON.stringify({caption:caption.value,youtubeTrack:selectedYoutubeTrack,updatedAt:Date.now()}))}catch{}})
  updateCaptionCount()
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
    const extension=({'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'})[file.type]
    const path=`${session.user.id}/${crypto.randomUUID()}.${extension}`
    let uploaded=false
    try{
      const {Upload}=await loadTusClient()
      const {data:{session:authSession}}=await supabase.auth.getSession()
      if(!authSession?.access_token)throw new Error('Your sign-in session expired. Sign in again to upload.')
      await new Promise((resolve,reject)=>{
        const upload=new Upload(file,{endpoint:'https://gkgjfbusdyiohiztwuec.storage.supabase.co/storage/v1/upload/resumable',retryDelays:[0,3000,5000,10000,20000],headers:{authorization:`Bearer ${authSession.access_token}`,'x-upsert':'false'},uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,chunkSize:6*1024*1024,metadata:{bucketName:'reels',objectName:path,contentType:file.type,cacheControl:'3600'},onError:reject,onProgress(bytesUploaded,bytesTotal){const percent=Math.round(bytesUploaded/bytesTotal*100);progressBar.style.width=`${percent}%`;progressLabel.textContent=`Uploading video · ${percent}%`},onSuccess:resolve})
        upload.start()
      })
      uploaded=true
      progressLabel.textContent='Saving your reel…'
      const captionValue=String(new FormData(form).get('caption')||'').trim()
      const {error}=await supabase.from('reels').insert({user_id:session.user.id,caption:captionValue,video_path:path,is_public:true,youtube_music_video_id:selectedYoutubeTrack?.videoId||null,youtube_music_title:selectedYoutubeTrack?.title||null,youtube_music_channel:selectedYoutubeTrack?.channel||null,youtube_music_url:selectedYoutubeTrack?`https://www.youtube.com/watch?v=${selectedYoutubeTrack.videoId}`:null})
      if(error){await supabase.storage.from('reels').remove([path]);uploaded=false;throw error}
      try{localStorage.removeItem(draftKey)}catch{}
      toast('Your reel was shared.','success')
      location.replace('/reels/')
    }catch(error){console.error(error);if(uploaded)await supabase.storage.from('reels').remove([path]);toast(error.message||'The video could not be uploaded. Try again.','error');submit.disabled=false;submit.querySelector('span').textContent='Share reel'}
  })
}

function prepareUnifiedComposer(){
  const format=document.querySelector('#post-format')
  const textFields=document.querySelector('#text-post-fields')
  const videoFields=document.querySelector('#video-post-fields')
  const content=document.querySelector('#post-content')
  const file=document.querySelector('#create-video-file')
  const preview=document.querySelector('#create-video-preview')
  const prompt=document.querySelector('#create-video-prompt')
  const submit=document.querySelector('#post-form [type="submit"]')
  let previewUrl=''
  if(!session){const form=document.querySelector('#post-form');if(form)form.insertAdjacentHTML('afterbegin',`<p class="create-signin-hint">Sign in to publish posts and videos. <a href="${authPageHref('login')}">Sign in</a></p>`)}
  const sync=()=>{const video=format.value==='video';textFields.hidden=video;videoFields.hidden=!video;content.required=!video;submit.textContent=video?'Share video':'Share post'}
  format?.addEventListener('change',sync);sync()
  file?.addEventListener('change',()=>{
    const selected=file.files?.[0]
    if(!selected){preview.hidden=true;prompt.hidden=false;return}
    if(!['video/mp4','video/webm','video/quicktime'].includes(selected.type)||selected.size>50*1024*1024){toast('Choose an MP4, WebM or MOV video up to 50 MB.','error');file.value='';preview.hidden=true;prompt.hidden=false;return}
    if(previewUrl)URL.revokeObjectURL(previewUrl)
    previewUrl=URL.createObjectURL(selected);preview.src=previewUrl;preview.hidden=false;prompt.hidden=true
  })
  document.querySelector('#video-caption')?.addEventListener('input',e=>{const count=document.querySelector('#video-caption-count');if(count)count.textContent=`${e.target.value.length} / 500`})
}

async function loadMyContent(){
  const postsList=document.querySelector('#my-content-posts')
  const videosList=document.querySelector('#my-content-videos')
  if(!postsList||!videosList)return
  if(!session){postsList.innerHTML=friendEmptyState('Sign in to view your content','Your posts, reels and videos will be collected here.','<a class="button button-primary" href="/login/">Sign in</a>');videosList.innerHTML='';return}
  postsList.innerHTML='<div class="feed-state card">Loading your posts…</div>'
  videosList.innerHTML='<div class="feed-state card">Loading your videos…</div>'
  const [postResult,reelResult]=await Promise.all([
    supabase.from('posts').select('id,user_id,content,image_path,created_at,profiles!posts_user_id_fkey(full_name,username,avatar_url,membership_plan,membership_status,is_verified),likes(count),comments(count)').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(100),
    supabase.from('reels').select('id,user_id,caption,video_path,created_at').eq('user_id',session.user.id).order('created_at',{ascending:false}).limit(100)
  ])
  if(postResult.error){console.error('Could not load your posts:',postResult.error);postsList.innerHTML='<div class="feed-state card"><strong>Your posts could not load</strong><span>Please refresh and try again.</span></div>'}
  else{
    const posts=postResult.data||[]
    liked=new Set()
    if(posts.length){const {data:mineLikes}=await supabase.from('likes').select('post_id').eq('user_id',session.user.id).in('post_id',posts.map(post=>post.id));liked=new Set((mineLikes||[]).map(row=>String(row.post_id)))}
    postsList.innerHTML=posts.length?posts.map(postCard).join():'<div class="empty-inline card">You have not shared any posts yet. <a class="text-link" href="/create/">Create your first post</a>.</div>'
    const count=document.querySelector('#my-post-count');if(count)count.textContent=String(posts.length)
  }
  if(reelResult.error){console.error('Could not load your videos:',reelResult.error);videosList.innerHTML='<div class="feed-state card"><strong>Your videos could not load</strong><span>Please refresh and try again.</span></div>'}
  else{
    const rows=reelResult.data||[]
    let urlByPath={}
    if(rows.length){
      const {data:urls,error:urlError}=await supabase.storage.from('reels').createSignedUrls(rows.map(row=>row.video_path),3600)
      if(urlError){console.error('Could not sign your video URLs:',urlError);videosList.innerHTML='<div class="feed-state card">Your videos could not be displayed. Please refresh and try again.</div>';return}
      urlByPath=Object.fromEntries((urls||[]).filter(item=>item.signedUrl).map(item=>[item.path,item.signedUrl]))
    }
    reelItems=rows.map(row=>({id:row.id,user_id:row.user_id,caption:row.caption||'',video_path:row.video_path,video_url:urlByPath[row.video_path],created_at:row.created_at,user:{full_name:myName(),username:myUsername(),avatar_url:profile?.avatar_url}})).filter(item=>item.video_url)
    videosList.innerHTML=reelItems.length?reelItems.map((reel,index)=>`<article class="my-content-video card"><video src="${esc(reel.video_url)}" muted playsinline preload="metadata"></video><button class="my-content-watch" type="button" data-open-my-video="${index}" aria-label="Watch your video">▶</button><div class="my-content-video-copy"><strong>${esc(reel.caption||'Your video')}</strong><small>${esc(timeAgo(reel.created_at))}</small></div></article>`).join(''):'<div class="empty-inline card">You have not shared any reels or videos yet. <a class="text-link" href="/create/">Share a video</a>.</div>'
    const count=document.querySelector('#my-video-count');if(count)count.textContent=String(reelItems.length)
  }
  const total=document.querySelector('#my-total-count')
  if(total)total.textContent=String(Number(document.querySelector('#my-post-count')?.textContent||0)+Number(document.querySelector('#my-video-count')?.textContent||0))
}

async function loadProfilePage() {
  const fromPath=decodeURIComponent(location.pathname.split('/').filter(Boolean).pop()||'').toLowerCase()
  const requestedHandle=new URLSearchParams(location.search).get('username')
  const handle=(requestedHandle||(!['profile','view'].includes(fromPath)?fromPath:profile?.username)||'').trim().toLowerCase()
  const content=document.querySelector('#profile-content')
  const state=document.querySelector('#profile-state')
  const showState=(title,message,action='')=>{content.hidden=true;state.hidden=false;state.innerHTML=`<span class="friends-empty-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/></svg></span><strong>${esc(title)}</strong><p>${esc(message)}</p>${action}`}
  if(!handle){showState('Your profile is ready when you are','Sign in to create and share your Flexoverse profile.','<a class="button button-primary" href="/login/">Sign in</a>');return}
  const {data,error}=await supabase.from('profiles').select('id,username,full_name,bio,avatar_url,is_public,search_index_enabled,created_at,membership_plan,membership_status,is_verified,verified_at').eq('username',handle).maybeSingle()
  if(error||!data){showState('This profile is unavailable','It may be private or the username may have changed.','<a class="button button-outline" href="/">Back to home</a>');return}
  profileRecord=data
  const name=data.full_name||data.username
  document.title=`${name} · Flexoverse`
  document.querySelector('meta[name="description"]')?.setAttribute('content',`${name} on Flexoverse. View their public posts and profile.`)
  let canonical=document.querySelector('link[rel="canonical"]');if(!canonical){canonical=document.createElement('link');canonical.rel='canonical';document.head.append(canonical)}canonical.href=new URL(`${profileUrl(data.username)}`,location.origin).href
  document.querySelector('#profile-name').textContent=name
  document.querySelector('#profile-username').textContent=`@${data.username}`
  const badgeRoot=document.querySelector('#profile-badges')
  if(badgeRoot){
    badgeRoot.innerHTML=renderUserBadges(data)
  }
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
  const {data:posts,error:postsError}=await supabase.from('posts').select('id,user_id,content,image_path,created_at,profiles!posts_user_id_fkey(full_name,username,avatar_url,membership_plan,membership_status,is_verified),likes(count),comments(count)').eq('user_id',data.id).order('created_at',{ascending:false}).limit(20)
  if(postsError)toast(postsError.message,'error')
  const profilePosts=posts||[]
  if(session&&profilePosts.length){const {data:mineLikes}=await supabase.from('likes').select('post_id').eq('user_id',session.user.id).in('post_id',profilePosts.map(post=>post.id));liked=new Set((mineLikes||[]).map(row=>row.post_id))}else liked=new Set()
  document.querySelector('#profile-post-count').textContent=profilePosts.length
  document.querySelector('#profile-posts').innerHTML=profilePosts.map(postCard).join('')||'<div class="empty-inline card">No public posts yet. Their posts will appear here when they share something.</div>'
  const photos=profilePosts.filter(post=>post.image_path)
  document.querySelector('#profile-photos').innerHTML=photos.length?photos.map(post=>`<a class="profile-photo" href="${esc(post.image_path)}" target="_blank" rel="noopener noreferrer"><img src="${esc(post.image_path)}" alt="Photo shared by ${esc(name)}" loading="lazy"></a>`).join(''):'<div class="empty-inline card">No photos shared yet.</div>'
  document.querySelector('#profile-share')?.addEventListener('click',async()=>{const url=`${location.origin}${profileUrl(data.username)}`;try{if(navigator.share)await navigator.share({title:`${name} on Flexoverse`,url});else{await navigator.clipboard.writeText(url);toast('Profile link copied.','success')}}catch(error){if(error.name!=='AbortError')toast('Copy this profile link from your browser address bar.')}})
  const robots=document.querySelector('meta[name="robots"]');if(robots)robots.content=data.is_public&&data.search_index_enabled?'index,follow':'noindex,nofollow'
}

function authReturnPath() {
  const requested=new URLSearchParams(location.search).get('next')
  const target=requested||(['login','signup','complete-profile'].includes(page)?'/':location.pathname+location.search)
  return target.startsWith('/')&&!target.startsWith('//')&&!/^\/(login|signup|complete-profile)(\/|$)/.test(target)?target:'/'
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
  const filtered=chatItems.filter(item=>{
    if(chatListFilter==='unread'&&!item.unread_count)return false
    if(chatListFilter==='groups'&&!item.is_group)return false
    if(chatListFilter==='favourites'&&!chatFavoriteIds.has(item.conversation_id))return false
    return true
  })
  const visible=filtered.filter(item=>`${item.peer_name} ${item.peer_username}`.toLowerCase().includes(search))
  const total=document.querySelector('#chat-total');if(total)total.textContent=String(chatItems.length)
  document.querySelectorAll('[data-chat-filter]').forEach(tab=>{const active=tab.dataset.chatFilter===chatListFilter;tab.classList.toggle('active',active);tab.setAttribute('aria-pressed',String(active))})
  renderChatSelectionControls()
  if(!visible.length){
    list.innerHTML=chatItems.length?'<div class="conversation-empty"><strong>No chats found</strong><p>Try searching with another name.</p></div>':'<div class="conversation-empty"><strong>Your inbox is quiet</strong><p>Start a private conversation with one of your friends.</p><button class="button button-soft" type="button" data-chat-new>Start a chat</button></div>'
    return
  }
  list.innerHTML=visible.map(item=>{const active=item.conversation_id===activeConversationId;const unread=item.unread_count>0;const selected=selectedChatIds.has(item.conversation_id);const preview=item.last_message?(item.last_sender_id===session?.user?.id?`You: ${item.last_message}`:item.last_message):'Start the conversation';return `<div class="conversation-row-wrap ${selected?'is-selected':''}"><button class="conversation ${active?'active':''} ${unread?'unread-conversation':''}" type="button" data-conversation-id="${esc(item.conversation_id)}" aria-current="${active?'true':'false'}">${chatSelectionMode?`<span class="chat-select-check ${selected?'checked':''}" aria-hidden="true">${selected?'✓':''}</span>`:''}${avatar(initials(item.peer_name),'blue',item.peer_avatar_url)}${chatFavoriteIds.has(item.conversation_id)?'<span class="conversation-favourite" aria-label="Favourite">★</span>':''}<span class="conversation-text"><strong>${esc(item.peer_name)}${item.peer_is_verified?'<span class="post-verified-badge" title="Verified by Flexoverse" aria-label="Verified account"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span>':''}</strong><small>${esc(preview)}</small></span><time>${esc(chatTime(item.last_message_at||item.created_at))}</time>${unread?'<i class="unread" aria-label="Unread messages"></i>':''}</button></div>`}).join('')
}

function renderChatWelcome(message='Choose a chat to catch up or start a new conversation with a friend.') {
  const room=document.querySelector('#chat-room')
  if(!room)return
  document.querySelector('#chat-layout')?.classList.remove('has-active-conversation')
  room.innerHTML=`<div class="chat-welcome"><span class="chat-welcome-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.7 8.7 0 0 1-4-.95L3 21l1.95-5.5A8.5 8.5 0 1 1 21 11.5Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/></svg></span><strong>${session?'Your conversations, all in one place':'Sign in to see your messages'}</strong><p>${esc(message)}</p>${session?'<button class="button button-soft" type="button" data-chat-new>Start a conversation</button>':'<a class="button button-primary" href="/login/">Sign in</a>'}</div>`
}

async function attachVoiceMessageUrls(messages){
 const rows=messages.filter(m=>m.message_type==='audio'&&m.media_path&&!m.audio_url);
 if(!rows.length)return;
 const results=await Promise.all(rows.map(async m=>{const {data}=await supabase.storage.from('chat-voice-notes').createSignedUrl(m.media_path,604800);return [m.id,data?.signedUrl||'']}));
 const urls=new Map(results);messages.forEach(m=>{if(urls.has(m.id))m.audio_url=urls.get(m.id)});
}
async function startVoiceRecording(button){
 if(!session||!activeConversationId)return openAuth();
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){toast('Voice recording is not supported in this browser.','error');return}
 try{
  voiceRecorderStream=await navigator.mediaDevices.getUserMedia({audio:true});
  voiceRecorderChunks=[];
  const mime=['audio/webm;codecs=opus','audio/ogg;codecs=opus','audio/mp4'].find(t=>MediaRecorder.isTypeSupported(t));
  voiceRecorder=new MediaRecorder(voiceRecorderStream,mime?{mimeType:mime}:{});
  voiceRecordingStartedAt=Date.now();
  voiceRecorder.ondataavailable=e=>{if(e.data?.size)voiceRecorderChunks.push(e.data)};
  voiceRecorder.onstop=async()=>{
   const blob=new Blob(voiceRecorderChunks,{type:voiceRecorder.mimeType||'audio/webm'});
   voiceRecorderStream?.getTracks().forEach(t=>t.stop());voiceRecorderStream=null;
   voiceRecorder=null;voiceRecorderChunks=[];
   const elapsed=Date.now()-voiceRecordingStartedAt;
   const btn=document.querySelector('[data-voice-record]');if(btn){btn.disabled=true;btn.classList.remove('recording');btn.innerHTML=voiceMicSvg();btn.setAttribute('aria-label','Record voice message')}
   if(blob.size<1000||elapsed<500){if(btn)btn.disabled=false;return}
   if(blob.size>15*1024*1024){toast('That voice message is too large. Please record a shorter one.','error');if(btn)btn.disabled=false;return}
   const ext=blob.type.includes('ogg')?'ogg':blob.type.includes('mp4')?'m4a':'webm';
   const path=activeConversationId+'/'+session.user.id+'/'+crypto.randomUUID()+'.'+ext;
   const {error:uploadError}=await supabase.storage.from('chat-voice-notes').upload(path,blob,{contentType:blob.type,upsert:false});
   if(uploadError){toast('Voice message could not be uploaded: '+uploadError.message,'error');if(btn)btn.disabled=false;return}
   const {data,error}=await supabase.from('messages').insert({conversation_id:activeConversationId,sender_id:session.user.id,content:'Voice message',message_type:'audio',media_path:path}).select('id,conversation_id,sender_id,content,created_at,edited_at,reply_to_message_id,message_type,media_path').single();
   if(error){await supabase.storage.from('chat-voice-notes').remove([path]);toast(error.message,'error');if(btn)btn.disabled=false;return}
   await attachVoiceMessageUrls([data]);if(activeConversationId===data.conversation_id){activeChatMessages.push(data);renderChatRoom(chatItems.find(x=>x.conversation_id===activeConversationId))}
   const item=chatItems.find(x=>x.conversation_id===data.conversation_id);if(item){item.last_message='🎤 Voice message';item.last_message_id=data.id;item.last_message_at=data.created_at;item.last_sender_id=session.user.id;renderChatList()}
   if(btn)btn.disabled=false;
  };
  voiceRecorder.start();button.classList.add('recording');button.setAttribute('aria-label','Stop recording');button.innerHTML=voiceStopSvg();toast('Recording… tap the microphone again to send.');
 }catch(error){voiceRecorderStream?.getTracks().forEach(t=>t.stop());voiceRecorderStream=null;voiceRecorder=null;toast(error.name==='NotAllowedError'?'Allow microphone access to record a voice message.':error.message,'error')}
}
function voiceMicSvg(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/></svg>'}
function voiceStopSvg(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>'}
function renderChatRoom(item,messages=activeChatMessages) {
 const room=document.querySelector('#chat-room');if(!room||!item)return;
 document.querySelector('#chat-layout')?.classList.add('has-active-conversation');
 const groups=[];let priorDay='';
 const selectionBar=messageSelectionMode?`<div class="message-selection-bar"><strong>${selectedMessageIds.size} selected</strong><button type="button" data-copy-selected-messages ${selectedMessageIds.size?'':'disabled'}>Copy</button><button type="button" data-cancel-message-selection>Cancel</button></div>`:'';
 for(let messageIndex=0;messageIndex<messages.length;messageIndex++){
  const message=messages[messageIndex],previous=messages[messageIndex-1],next=messages[messageIndex+1];
  const day=chatDay(message.created_at);if(day!==priorDay){groups.push(`<p class="chat-day-divider">${esc(day)}</p>`);priorDay=day}
  const own=message.sender_id===session?.user?.id;
  const senderLabel=item.is_group&&!own?`<span class="group-message-sender">${esc(message.sender_name||'Member')}${message.sender_is_verified?'<span class="post-verified-badge" title="Verified by Flexoverse" aria-label="Verified account"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span>':''}</span>`:'';
  const samePrev=previous&&previous.sender_id===message.sender_id&&(new Date(message.created_at)-new Date(previous.created_at))<300000&&chatDay(previous.created_at)===day;
  const sameNext=next&&next.sender_id===message.sender_id&&(new Date(next.created_at)-new Date(message.created_at))<120000&&chatDay(next.created_at)===day;
  const groupClass=(samePrev?'group-middle':'group-start')+(sameNext?'':' group-end');
  const parent=messages.find(m=>m.id===message.reply_to_message_id);
  const quote=message.reply_to_message_id?`<div class="message-reply-quote ${parent?'':'missing-reply'}"><span class="reply-quote-accent"></span><div class="reply-quote-content"><strong>${parent?(parent.sender_id===session?.user?.id?'You':esc(item.peer_name||'Contact')):'Original message'}</strong><span>${parent?esc(parent.content.slice(0,180)):'This message is no longer available'}</span></div></div>`:'';
  const messageBody=message.message_type==='audio'?(message.audio_url?`<div class="chat-voice-message"><button class="chat-voice-play" type="button" data-voice-play aria-label="Play voice message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg></button><div class="chat-voice-content"><div class="chat-voice-wave" aria-hidden="true">${Array.from({length:32},(_,i)=>`<i style="--wave:${[8,14,20,11,26,16,10,22,29,13,18,24,9,16,27,12,20,30,14,8,22,17,26,11,19,28,13,21,9,17,24,12][i]}px"></i>`).join('')}</div><div class="chat-voice-meta"><span data-voice-time>0:00</span><span>Voice message</span></div></div><a class="chat-voice-download" href="${esc(message.audio_url)}" download aria-label="Download voice message" title="Download voice message"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 20h16"/></svg></a><audio class="chat-voice-player" preload="metadata" src="${esc(message.audio_url)}"></audio></div>`:'<span class="voice-message-unavailable">Voice message unavailable</span>'):esc(message.content||'');
  const reactions=activeMessageReactions.filter(r=>r.message_id===message.id);
  const reactionBar=reactions.length?`<div class="message-reactions">${[...new Set(reactions.map(r=>r.reaction))].map(reaction=>{const mine=reactions.some(r=>r.reaction===reaction&&r.user_id===session?.user?.id);return `<button type="button" class="message-reaction ${mine?'mine':''}" data-toggle-reaction="${esc(reaction)}" data-message-id="${esc(message.id)}">${reaction} <small>${reactions.filter(r=>r.reaction===reaction).length}</small></button>`}).join('')}</div>`:'';
  const selectedMessage=selectedMessageIds.has(message.id);
  groups.push(`<div class="message-wrap ${own?'own-message':'other-message'} ${groupClass} ${selectedMessage?'is-message-selected':''}" data-message-wrap="${esc(message.id)}"><div class="message ${own?'sent':'received'}" data-message-id="${esc(message.id)}">${messageSelectionMode?`<span class="message-select-check" aria-hidden="true">${selectedMessage?'✓':''}</span>`:''}${senderLabel}${quote}${messageBody}<small>${esc(new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit'}).format(new Date(message.created_at)))}${message.edited_at?' · edited':''}</small>${reactionBar}</div>${own?`<button type="button" class="message-more" data-message-menu="${esc(message.id)}" aria-label="Message options"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/></svg></button>`:''}</div>`)
 }
 const replyBar=pendingReplyTo?`<div class="reply-composer-bar"><span><strong>Replying to ${pendingReplyTo.sender_id===session?.user?.id?'yourself':esc(item.peer_name)}</strong><small>${esc(pendingReplyTo.content.slice(0,120))}</small></span><button type="button" data-cancel-reply aria-label="Cancel reply">×</button></div>`:'';
 room.innerHTML=`${selectionBar}<header class="chat-room-head"><button class="chat-room-back" type="button" data-chat-back aria-label="Back to conversations"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6M9 12h12"/></svg></button>${avatar(initials(item.peer_name),'blue',item.peer_avatar_url)}<div class="chat-room-person"><strong>${esc(item.peer_name)}${item.peer_is_verified?'<span class="post-verified-badge" title="Verified by Flexoverse" aria-label="Verified account"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span>':''}</strong><small><span class="status-dot"></span> Your friend</small></div><div class="chat-header-menu-wrap"><button class="chat-header-menu-toggle" type="button" data-chat-menu-toggle aria-label="More chat options" aria-expanded="false" title="More options"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg></button><div class="chat-header-menu" data-chat-menu hidden>
<button type="button" data-chat-menu-action="contact">Contact info</button><button type="button" data-chat-menu-action="search">Search messages</button><button type="button" data-chat-menu-action="select">Select messages</button><button type="button" data-chat-menu-action="mute">Mute notifications</button><button type="button" data-chat-menu-action="theme">Chat theme</button><div class="chat-menu-divider"></div>${item.is_group?'<button type="button" data-start-group-call="audio">Group voice call</button><button type="button" data-start-group-call="video">Group video call</button>':'<button type="button" data-start-call="audio">Voice call</button><button type="button" data-start-call="video">Video call</button>'}<button type="button" data-chat-menu-action="favorite">${chatFavoriteIds.has(item.conversation_id)?'Remove from Favorites':'Add to Favorites'}</button><button type="button" data-chat-menu-action="export">Export chat</button><div class="chat-menu-divider"></div><button type="button" data-chat-menu-action="close">Close chat</button></div></div>${item.is_group?'':'<a class="chat-room-profile" href="'+profileUrl(item.peer_username||'')+'" aria-label="View profile"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg></a>'}</header><div class="chat-history" id="chat-history" role="log" aria-live="polite" aria-label="Conversation with ${esc(item.peer_name)}">${groups.join('')||'<p class="chat-history-empty">Say hello and start the conversation.</p>'}</div><div class="chat-typing-indicator" id="chat-typing-indicator" hidden aria-live="polite"></div><form class="message-composer" id="message-form">${replyBar}<input name="message" maxlength="4000" required autocomplete="off" placeholder="Write a message…" aria-label="Write a message"><button class="voice-record-button" type="button" data-voice-record aria-label="Record voice message">${voiceMicSvg()}</button><button class="send-button" aria-label="Send message" type="submit"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 4 16 8-16 8 3-8-3-8Z"/><path d="M7 12h13"/></svg></button></form>`;
 document.querySelectorAll('.chat-voice-message').forEach(card=>{const audio=card.querySelector('audio'),play=card.querySelector('[data-voice-play]'),time=card.querySelector('[data-voice-time]'),wave=card.querySelector('.chat-voice-wave');if(!audio||!play)return;const fmt=n=>{n=Math.max(0,Math.floor(n||0));return Math.floor(n/60)+':'+String(n%60).padStart(2,'0')};const update=()=>{if(time)time.textContent=fmt(audio.currentTime)+' / '+fmt(audio.duration);if(wave)wave.style.setProperty('--played',audio.duration?String(audio.currentTime/audio.duration):'0')};audio.addEventListener('loadedmetadata',update);audio.addEventListener('timeupdate',update);audio.addEventListener('ended',()=>{play.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg>';play.setAttribute('aria-label','Play voice message');update()});play.addEventListener('click',async()=>{if(audio.paused){document.querySelectorAll('.chat-voice-player').forEach(other=>{if(other!==audio)other.pause()});try{await audio.play();play.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM14 5h4v14h-4z"/></svg>';play.setAttribute('aria-label','Pause voice message')}catch(error){toast('Unable to play this voice message.','error')}}else{audio.pause();play.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 12 7-12 7z"/></svg>';play.setAttribute('aria-label','Play voice message')}});update()});
 const history=document.querySelector('#chat-history');if(history)history.scrollTop=history.scrollHeight;
 renderTypingPresence();
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

async function subscribeToChatTyping(conversationId){
 if(chatTypingStopTimer){clearTimeout(chatTypingStopTimer);chatTypingStopTimer=null}
 if(chatTypingChannel){await supabase.removeChannel(chatTypingChannel);chatTypingChannel=null}
 if(!session||!conversationId)return;
 const channel=supabase.channel('chat-typing:'+conversationId,{config:{presence:{key:session.user.id}}});
 channel.on('presence',{event:'sync'},()=>renderTypingPresence())
 .on('presence',{event:'join'},()=>renderTypingPresence())
 .on('presence',{event:'leave'},()=>renderTypingPresence());
 await new Promise((resolve,reject)=>{
  channel.subscribe(status=>{
   if(status==='SUBSCRIBED'){chatTypingChannel=channel;channel.track({userId:session.user.id,fullName:profile?.full_name||session.user.user_metadata?.full_name||'Someone',typing:false}).then(resolve).catch(reject)}
   else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reject(new Error('Typing status channel failed: '+status));
  });
 });
 renderTypingPresence();
}
function renderTypingPresence(){
 const node=document.querySelector('#chat-typing-indicator');if(!node)return;
 if(!chatTypingChannel){node.hidden=true;node.innerHTML='';return}
 const state=chatTypingChannel.presenceState();
 const users=Object.values(state).flat().filter(p=>p.userId!==session?.user?.id&&p.typing);
 const names=[...new Set(users.map(p=>String(p.fullName||'Someone').trim()).filter(Boolean))];
 if(!names.length){node.hidden=true;node.innerHTML='';return}
 const label=names.length===1?names[0]+' is typing':names.length===2?names[0]+' and '+names[1]+' are typing':names[0]+' and others are typing';
 node.innerHTML='<span class="typing-dots"><i></i><i></i><i></i></span><span>'+esc(label)+'…</span>';node.hidden=false;
}
async function setChatTyping(isTyping){
 if(!chatTypingChannel||!session)return;
 if(chatTypingStopTimer){clearTimeout(chatTypingStopTimer);chatTypingStopTimer=null}
 try{
  await chatTypingChannel.track({userId:session.user.id,fullName:profile?.full_name||session.user.user_metadata?.full_name||'Someone',typing:!!isTyping});
 }catch(error){console.warn('Could not update typing presence:',error)}
 if(isTyping)chatTypingStopTimer=setTimeout(()=>{setChatTyping(false)},2500);
}

async function selectConversation(conversationId,updateUrl=true) {
  const item=chatItems.find(chat=>chat.conversation_id===conversationId)
  if(!item)return
  messageSelectionMode=false;selectedMessageIds.clear()
  activeConversationId=conversationId
  await subscribeToChatTyping(conversationId)
  await endCall(false)
  await ensureCallChannel(conversationId).catch(error=>{console.warn('Call channel unavailable:',error.message)})
  activeChatMessages=[]
  renderChatList()
  const room=document.querySelector('#chat-room')
  if(room)room.innerHTML=`<header class="chat-room-head"><button class="chat-room-back" type="button" data-chat-back aria-label="Back to conversations"><svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6M9 12h12"/></svg></button>${avatar(initials(item.peer_name),'blue',item.peer_avatar_url)}<div class="chat-room-person"><strong>${esc(item.peer_name)}</strong><small><span class="status-dot"></span> Your friend</small></div></header><div class="chat-history" id="chat-history"><div class="chat-loading"><span class="friends-loading-dot"></span>Loading messages</div></div>`
  document.querySelector('#chat-layout')?.classList.add('has-active-conversation')
  if(updateUrl)history.replaceState(null,'',`/chats/?id=${encodeURIComponent(conversationId)}`)
  const {data,error}=await supabase.from('messages').select('id,conversation_id,sender_id,content,created_at,edited_at,reply_to_message_id,message_type,media_path').eq('conversation_id',conversationId).order('created_at',{ascending:false}).limit(100)
  if(activeConversationId!==conversationId)return
  if(error){toast('Messages could not load. Try selecting this chat again.','error');renderChatRoom(item,[]);return}
  activeChatMessages=(data||[]).reverse()
  await attachVoiceMessageUrls(activeChatMessages)
  const senderIds=[...new Set(activeChatMessages.map(m=>m.sender_id))];if(senderIds.length){const {data:senders}=await supabase.from('profiles').select('id,full_name,username,is_verified').in('id',senderIds);const names=new Map((senders||[]).map(p=>[p.id,{name:p.full_name||p.username,verified:p.is_verified===true}]));activeChatMessages=activeChatMessages.map(m=>({...m,sender_name:names.get(m.sender_id)?.name||'Member',sender_is_verified:names.get(m.sender_id)?.verified||false}))}
  const reactionResult=await supabase.from('message_reactions').select('id,message_id,user_id,reaction').in('message_id',activeChatMessages.map(m=>m.id))
  activeMessageReactions=reactionResult.data||[]
  renderChatRoom(item)
  await markConversationRead(conversationId)
}

function handleChatMessage(message) {
  const item=chatItems.find(chat=>chat.conversation_id===message.conversation_id)
  if(!item||item.last_message_id===message.id)return
  item.last_message=message.message_type==='audio'?'🎤 Voice message':message.content
  item.last_message_id=message.id
  item.last_message_at=message.created_at
  item.last_sender_id=message.sender_id
  if(message.sender_id!==session?.user?.id&&activeConversationId!==message.conversation_id)item.unread_count=Number(item.unread_count||0)+1
  renderChatList()
  if(activeConversationId===message.conversation_id){
    if(item.is_group&&message.sender_id!==session?.user?.id){supabase.from('profiles').select('full_name,username,is_verified').eq('id',message.sender_id).maybeSingle().then(({data})=>{message.sender_name=data?.full_name||data?.username||'Member';message.sender_is_verified=data?.is_verified===true;if(activeConversationId===message.conversation_id)renderChatRoom(item)})}
    if(!activeChatMessages.some(row=>row.id===message.id))activeChatMessages.push(message)
    const history=document.querySelector('#chat-history')
    const wasNearBottom=history&&history.scrollHeight-history.scrollTop-history.clientHeight<100
    renderChatRoom(item)
    if(message.message_type==='audio')attachVoiceMessageUrls([message]).then(()=>{if(activeConversationId===message.conversation_id)renderChatRoom(item)})
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
  try{chatFavoriteIds=new Set(JSON.parse(localStorage.getItem('flexoverse-chat-favorites:'+session.user.id)||'[]'))}catch{chatFavoriteIds=new Set()}
  const {data,error}=await supabase.rpc('list_my_conversations')
  if(error){console.error('Could not load conversations:',error);list.innerHTML='<div class="conversation-empty"><strong>Your chats could not load</strong><p>Check your connection and try again.</p><button class="button button-outline" type="button" data-retry-chats>Try again</button></div>';return}
  chatItems=(data||[]).map(row=>({...row,peer_name:row.peer_name||row.peer_username||'Flexoverse friend',peer_username:row.peer_username||'member',is_group:!row.peer_id,unread_count:Number(row.unread_count||0)}));const peerIds=[...new Set(chatItems.filter(x=>x.peer_id).map(x=>x.peer_id))];if(peerIds.length){const {data:peers}=await supabase.from('profiles').select('id,is_verified').in('id',peerIds);const verified=new Map((peers||[]).map(p=>[p.id,p.is_verified===true]));chatItems=chatItems.map(item=>({...item,peer_is_verified:verified.get(item.peer_id)||false}))}
  renderChatList()
  subscribeToChatInbox()
  const requested=preferredConversation||new URLSearchParams(location.search).get('id')
  if(requested&&chatItems.some(item=>item.conversation_id===requested)){await selectConversation(requested,false);return}
  if(!chatItems.length)renderChatWelcome('Start a private conversation with an accepted friend. Your messages stay in your inbox.');
  else renderChatWelcome()
}

async function openNewGroupDialog() {
 if(!session)return openAuth();
 const root=document.querySelector('#modal-root');if(!root)return;
 root.innerHTML='<div class="modal-backdrop" data-group-modal-backdrop><section class="chat-new-modal group-create-modal" role="dialog" aria-modal="true"><header class="chat-new-modal-head"><div><h2>Create a group</h2><p>Name your group and choose at least two friends.</p></div><button class="chat-modal-close" type="button" data-close-chat-modal aria-label="Close">×</button></header><form data-create-group-form><label class="group-name-label">Group name<input name="group_name" maxlength="60" required placeholder="e.g. Weekend crew"></label><div class="group-friend-list"><div class="chat-loading">Loading friends…</div></div><footer><span data-group-selected-count>0 selected</span><button class="button button-primary" type="submit">Create group</button></footer></form></section></div>';
 const box=root.querySelector('.group-friend-list');
 const {data:requests,error}=await supabase.from('friend_requests').select('from_user_id,to_user_id').eq('status','accepted').or(`from_user_id.eq.${session.user.id},to_user_id.eq.${session.user.id}`);
 if(error){box.textContent='Friends could not load. Please try again.';return}
 const ids=[...new Set((requests||[]).map(r=>r.from_user_id===session.user.id?r.to_user_id:r.from_user_id))];
 if(!ids.length){box.innerHTML='<p class="chat-modal-empty">Add friends before creating a group.</p>';return}
 const {data:friends,error:friendError}=await supabase.from('profiles').select('id,username,full_name,avatar_url').in('id',ids).order('full_name');
 if(friendError){box.textContent='Friends could not load. Please try again.';return}
 box.innerHTML=(friends||[]).map(f=>`<label class="group-friend-choice"> <input type="checkbox" name="group_member" value="${esc(f.id)}">${avatar(initials(f.full_name||f.username),'blue',f.avatar_url)}<span><strong>${esc(f.full_name||f.username)}</strong><small>@${esc(f.username)}</small></span></label>`).join('');
 root.querySelectorAll('[name="group_member"]').forEach(input=>input.addEventListener('change',()=>{const n=root.querySelectorAll('[name="group_member"]:checked').length;root.querySelector('[data-group-selected-count]').textContent=n+' selected'}));
}

async function openNewChatDialog() {
  if(!session)return openAuth()
  const root=document.querySelector('#modal-root')
  if(!root)return
  root.innerHTML='<div class="modal-backdrop" data-chat-modal-backdrop><section class="chat-new-modal" role="dialog" aria-modal="true" aria-labelledby="chat-modal-title"><header class="chat-new-modal-head"><div><h2 id="chat-modal-title">New message</h2><p>Choose a friend to start a private chat.</p><button type="button" class="button button-soft group-create-shortcut" data-open-new-group>Create group</button></div><button class="chat-modal-close" type="button" data-close-chat-modal aria-label="Close"><svg viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18"/></svg></button></header><div class="chat-friend-list"><div class="chat-loading"><span class="friends-loading-dot"></span>Finding your friends</div></div></section></div>'
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
  const text={friend_request:'sent you a friend request.',friend_accepted:'accepted your friend request.',post_like:'liked your post.',post_comment:'commented on your post.',chat_message:'sent you a message.',message:'sent you a message.',mention:'mentioned you in a message.',incoming_call:'is calling you.'}[item.type]||'shared an update with you.'
  const action={friend_request:'Friend request',friend_accepted:'Friend request accepted',post_like:'Post like',post_comment:'Post comment',chat_message:'New message',message:'New message',mention:'Mention',incoming_call:'Incoming call'}[item.type]||'Activity'
  return {actor,text,action}
}

function renderNotifications() {
  const list=document.querySelector('#notifications-list')
  if(!list)return
  const shown=notificationItems.filter(notificationIsVisible)
  const unread=shown.filter(item=>!item.is_read).length
  const requests=shown.filter(item=>item.type==='friend_request'&&item.pending_request).length
  const unreadCount=document.querySelector('#notification-unread-count');if(unreadCount)unreadCount.textContent=String(unread)
  const requestCount=document.querySelector('#notification-request-count');if(requestCount)requestCount.textContent=String(requests)
  const markButton=document.querySelector('#notifications-mark-read');if(markButton)markButton.disabled=unread===0
  document.querySelectorAll('[data-notification-filter]').forEach(tab=>{const active=tab.dataset.notificationFilter===notificationFilter;tab.classList.toggle('active',active);tab.setAttribute('aria-selected',String(active))})
  let visible=shown
  if(notificationFilter==='unread')visible=visible.filter(item=>!item.is_read)
  if(notificationFilter==='friend_request')visible=visible.filter(item=>item.type==='friend_request'&&item.pending_request)
  if(!visible.length){const title=notificationFilter==='unread'?'You’re all caught up':notificationFilter==='friend_request'?'No pending friend requests':shown.length?'No activity in this view':'Nothing new yet';const body=!notificationDisplayPreferences.in_app_enabled?'In-app notifications are hidden by your settings.':!shown.length?'Your notification settings currently hide these activity types.':notificationFilter==='unread'?'New activity will appear here when something happens.':notificationFilter==='friend_request'?'New friend requests will appear here.':'Friend requests and post activity will show up here.';list.innerHTML=`<div class="notification-empty"><span class="notification-empty-icon">${notificationIcon(notificationFilter==='friend_request'?'friend_request':'friend_accepted')}</span><strong>${title}</strong><p>${body}</p>${session?'<a class="button button-soft" href="/friends/">Explore friends</a>':'<a class="button button-primary" href="/login/">Sign in</a>'}</div>`;return}
  list.innerHTML=visible.map(item=>{const description=notificationMessage(item),actorUrl=item.actor?.username?`${profileUrl(item.actor.username)}`:'/friends/';const pending=item.type==='friend_request'&&item.pending_request;const targetUrl=item.type==='post_like'||item.type==='post_comment'?`/#post-${encodeURIComponent(item.target_id||'')}`:item.type==='friend_accepted'?'/chats/':['chat_message','message','mention'].includes(item.type)?(item.conversation_id?`/chats/?id=${encodeURIComponent(item.conversation_id)}`:'/chats/'):item.type==='incoming_call'?'/':actorUrl;return `<article class="notification-item ${item.is_read?'':'unread-item'}" data-notification-id="${esc(item.id)}">${avatar(initials(description.actor),'blue',item.actor?.avatar_url)}<div class="notification-copy"><span><strong><a href="${esc(actorUrl)}" data-mark-notification="${esc(item.id)}">${esc(description.actor)}</a></strong> ${esc(description.text)}</span>${item.preview?`<span class="notification-preview">“${esc(item.preview)}”</span>`:''}<small>${esc(timeAgo(item.created_at))}</small><span class="notification-kind">${notificationIcon(item.type)}${esc(description.action)}</span></div><div class="notification-actions">${pending?`<button class="button button-primary" type="button" data-accept-notification="${esc(item.target_id)}" data-notification="${esc(item.id)}">Accept</button><button class="notification-dismiss" type="button" data-ignore-notification="${esc(item.target_id)}" data-notification="${esc(item.id)}" aria-label="Ignore friend request"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button>`:`<a class="button button-outline" href="${esc(targetUrl)}" data-mark-notification="${esc(item.id)}">${item.type==='post_like'||item.type==='post_comment'?'View post':['chat_message','message','mention'].includes(item.type)?'Reply':item.type==='incoming_call'?'Open call':item.type==='friend_accepted'?'Open chats':'View profile'}</a>`}</div>${item.is_read?'':'<span class="unread-dot" aria-label="Unread"></span>'}</article>`}).join('')
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
  const messageIds=notificationItems.filter(item=>['chat_message','message','mention'].includes(item.type)).map(item=>item.target_id).filter(Boolean);
  if(messageIds.length){const {data:messages}=await supabase.from('messages').select('id,conversation_id').in('id',messageIds);const byId=new Map((messages||[]).map(row=>[row.id,row.conversation_id]));notificationItems.forEach(item=>{if(byId.has(item.target_id))item.conversation_id=byId.get(item.target_id)})}
  renderNotifications()
}

function notificationIsVisible(item){
  const prefs=notificationDisplayPreferences
  if(!prefs.in_app_enabled)return false
  if(item.type==='friend_request'||item.type==='friend_accepted')return prefs.friend_requests
  if(item.type==='post_like')return prefs.post_likes
  if(item.type==='post_comment')return prefs.post_comments
  return true
}

async function loadNotificationPreferences(){
  if(!session){notificationDisplayPreferences={in_app_enabled:true,friend_requests:true,post_likes:true,post_comments:true};return}
  const {data,error}=await supabase.from('notification_preferences').select('in_app_enabled,friend_requests,post_likes,post_comments').eq('user_id',session.user.id).maybeSingle()
  if(error){console.warn('Could not load notification display preferences:',error.message);return}
  notificationDisplayPreferences={...notificationDisplayPreferences,...(data||{})}
}

async function loadNotificationCount() {
  const badge=document.querySelector('#header-notification-count')
  if(!badge)return
  if(!session){badge.hidden=true;return}
  if(!notificationDisplayPreferences.in_app_enabled){badge.hidden=true;return}
  const counts=[]
  const requests=notificationDisplayPreferences.friend_requests?['friend_request','friend_accepted']:[]
  const categories=[requests,notificationDisplayPreferences.post_likes?['post_like']:[],notificationDisplayPreferences.post_comments?['post_comment']:[],['incoming_call']].filter(types=>types.length)
  for(const types of categories){const {count,error}=await supabase.from('notifications').select('id',{count:'exact',head:true}).eq('recipient_id',session.user.id).eq('is_read',false).in('type',types);if(error){console.warn('Could not load notification count:',error.message);badge.hidden=true;return}counts.push(count||0)}
  const total=counts.reduce((sum,count)=>sum+count,0)
  badge.textContent=total>99?'99+':String(total)
  badge.hidden=!total
}

async function loadHeaderNotificationDropdown(){
 const host=document.querySelector('#header-notification-dropdown');if(!host||!session)return;
 host.innerHTML='<div class="header-notification-loading">Loading notifications…</div>';
 const {data,error}=await supabase.from('notifications').select('id,type,target_id,preview,created_at,actor:profiles!notifications_actor_id_fkey(full_name,username)').eq('recipient_id',session.user.id).order('created_at',{ascending:false}).limit(8);
 if(error){host.innerHTML='<div class="header-notification-loading">Notifications could not load.</div>';return}
 const items=data||[],messageIds=items.filter(x=>['chat_message','message','mention'].includes(x.type)).map(x=>x.target_id).filter(Boolean);
 let conversations=new Map();
 if(messageIds.length){const {data:messages}=await supabase.from('messages').select('id,conversation_id').in('id',messageIds);conversations=new Map((messages||[]).map(x=>[x.id,x.conversation_id]))}
 if(!items.length){host.innerHTML='<div class="header-notification-loading">You are all caught up.</div><a class="header-notification-footer" href="/notifications/">See all notifications</a>';return}
 host.innerHTML=items.map(item=>{const actor=Array.isArray(item.actor)?item.actor[0]:item.actor;const name=actor?.full_name||actor?.username||'A member';const chatId=conversations.get(item.target_id);const isMessage=['chat_message','message','mention'].includes(item.type);const isCall=item.type==='incoming_call';const label=isMessage?'Open chat':isCall?'Open call':'View';const url=isMessage?(chatId?'/chats/?id='+encodeURIComponent(chatId):'/chats/'):isCall?'/':'/notifications/';const text=isCall?'is calling you':isMessage?(item.type==='mention'?'mentioned you':'sent you a message'):'shared an update';const quickReply=isMessage&&chatId?'<form class="header-quick-reply" data-header-quick-reply="'+esc(chatId)+'"><input name="reply" maxlength="4000" required placeholder="Reply…" aria-label="Quick reply to '+esc(name)+'"><button type="submit">Send</button></form>':'';return '<div class="header-notification-row"><div><strong>'+esc(name)+'</strong><span>'+text+'</span>'+(item.preview?'<small>'+esc(item.preview)+'</small>':'')+quickReply+'</div><a href="'+url+'">'+label+'</a></div>'}).join('')+'<a class="header-notification-footer" href="/notifications/">See all notifications</a>';
}
function bindHeaderNotificationDropdown(){
 const link=document.querySelector('#notifications-link'),host=document.querySelector('#header-notification-dropdown');if(!link||!host)return;
 link.addEventListener('click',e=>{e.preventDefault();host.hidden=!host.hidden;link.setAttribute('aria-expanded',String(!host.hidden));if(!host.hidden)loadHeaderNotificationDropdown()});
 document.addEventListener('click',e=>{if(!e.target.closest('.header-notification-wrap')){host.hidden=true;link.setAttribute('aria-expanded','false')}});
 host.addEventListener('submit',async e=>{const form=e.target.closest('[data-header-quick-reply]');if(!form)return;e.preventDefault();const input=form.querySelector('[name="reply"]'),content=String(input.value||'').trim(),conversationId=form.dataset.headerQuickReply;if(!content||!conversationId||!session)return;const button=form.querySelector('button');button.disabled=true;const {error}=await supabase.from('messages').insert({conversation_id:conversationId,sender_id:session.user.id,content,reply_to_message_id:null});button.disabled=false;if(error){toast(error.message,'error');return}input.value='';toast('Reply sent.','success');});
}

function subscribeToNotificationUpdates() {
  if(!session)return
  if(notificationRealtimeChannel)supabase.removeChannel(notificationRealtimeChannel)
  notificationRealtimeChannel=supabase.channel(`notification-count-${session.user.id}`).on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:`recipient_id=eq.${session.user.id}`},payload=>{loadNotificationCount();if(page==='notifications')loadNotifications();if(payload.new?.type==='incoming_call')handleIncomingCallNotification(payload.new);if(!document.querySelector('#header-notification-dropdown')?.hidden)loadHeaderNotificationDropdown()}).subscribe()
}
function renderHomepageIncomingCall(peer,mode='audio'){
 const root=document.querySelector('#homepage-call-alert');if(!root)return;
 const name=peer?.peer_name||'Flexoverse friend';
 root.innerHTML='<div class="home-incoming-call-card">'+avatar(initials(name),'blue',peer?.peer_avatar_url||'')+'<div class="home-incoming-call-copy"><strong>'+esc(name)+'</strong><span>Incoming '+(mode==='video'?'video':'voice')+' call</span></div><button type="button" data-home-call-decline>Decline</button><button type="button" data-home-call-answer>Answer</button></div>';
 root.hidden=false;
 root.onclick=e=>{if(e.target.closest('[data-home-call-answer]')){if(!openCallPopup())return toast('Please allow pop-ups for Flexoverse to open the call window.','error');acceptCall();root.hidden=true;return}if(e.target.closest('[data-home-call-decline]')){const p=window.__pendingCallOffer;if(p)callSignal('signal',{kind:'reject',callId:p.callId,to:p.from}).catch(()=>{});endCall(false);root.hidden=true}};
}
async function handleIncomingCallNotification(notification){
 if(page!=='home'||!session||!notification?.target_id)return;
 const {data:history,error}=await supabase.from('call_history').select('id,conversation_id,caller_id,receiver_id,call_type,status').eq('id',notification.target_id).maybeSingle();
 if(error||!history||history.receiver_id!==session.user.id||history.status!=='calling')return;
 const {data:caller}=await supabase.from('profiles').select('id,username,full_name,avatar_url').eq('id',history.caller_id).maybeSingle();
 activeConversationId=history.conversation_id;
 chatItems=[{conversation_id:history.conversation_id,peer_id:history.caller_id,peer_name:caller?.full_name||caller?.username||'Flexoverse friend',peer_username:caller?.username||'member',peer_avatar_url:caller?.avatar_url||null,is_group:false}];
 const channel=supabase.channel('call:'+history.conversation_id,{config:{private:true,broadcast:{ack:true}}});
 channel.on('broadcast',{event:'signal'},({payload})=>{callSignalChannel=channel;handleCallSignal(payload)});
 await new Promise((resolve,reject)=>{channel.subscribe(status=>{if(status==='SUBSCRIBED'){homeIncomingCallChannel=channel;callSignalChannel=channel;resolve()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT')reject(new Error('Call alerts could not connect'))})}).catch(error=>console.warn(error));
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

let incomingRingContext=null,incomingRingTimer=null,incomingVibrationTimer=null;
function stopIncomingRingtone(){
 if(incomingRingTimer){clearInterval(incomingRingTimer);incomingRingTimer=null}
 if(incomingVibrationTimer){clearInterval(incomingVibrationTimer);incomingVibrationTimer=null}
 try{navigator.vibrate?.(0)}catch{}
 if(incomingRingContext){incomingRingContext.close().catch(()=>{});incomingRingContext=null}
}
async function playIncomingRingtone(){
 stopIncomingRingtone();
 try{
  const AudioCtx=window.AudioContext||window.webkitAudioContext;if(!AudioCtx)return;
  incomingRingContext=new AudioCtx();await incomingRingContext.resume();
  const ctx=incomingRingContext;
  const ring=()=>{
   if(!ctx||ctx.state==='closed')return;
   [0,0.38,0.76].forEach(offset=>{
    const osc=ctx.createOscillator(),gain=ctx.createGain();
    osc.type='triangle';osc.frequency.setValueAtTime(520,ctx.currentTime+offset);
    osc.frequency.setValueAtTime(660,ctx.currentTime+offset+0.16);
    gain.gain.setValueAtTime(0.0001,ctx.currentTime+offset);
    gain.gain.linearRampToValueAtTime(0.32,ctx.currentTime+offset+0.025);
    gain.gain.setValueAtTime(0.32,ctx.currentTime+offset+0.2);
    gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+offset+0.27);
    osc.connect(gain);gain.connect(ctx.destination);osc.start(ctx.currentTime+offset);osc.stop(ctx.currentTime+offset+0.28);
   });
  };
  ring();incomingRingTimer=setInterval(ring,1900);
 }catch(error){console.warn('Incoming ringtone could not play:',error)}
 try{if(navigator.vibrate){navigator.vibrate([500,180,500,650]);incomingVibrationTimer=setInterval(()=>navigator.vibrate([500,180,500,650]),1900)}}catch(error){console.warn('Call vibration unavailable:',error)}
}

function openCallPopup(){
 if(callWindowRef&&!callWindowRef.closed){callWindowRef.focus();return true}
 const popup=window.open('','flexoverse-call-window','popup=yes,width=440,height=760,resizable=yes,scrollbars=no');
 if(!popup)return false;
 callWindowRef=popup;
 popup.document.open();
 popup.document.write(`<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Flexoverse Call</title><link rel="stylesheet" href="${location.origin}/assets/site.css?v=call-popout-home-alerts-20261104-2"><style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:#10171b}#call-root{position:fixed;inset:0;z-index:99999}.call-backdrop{position:absolute!important;inset:0!important}.call-window{width:100%!important;height:100%!important;max-width:none!important;max-height:none!important;border-radius:0!important}@media(max-width:600px){.call-window{padding-top:env(safe-area-inset-top)!important;padding-bottom:env(safe-area-inset-bottom)!important}}</style></head><body><div id="call-window-host"></div></body></html>`);
 popup.document.close();
 let root=document.querySelector('#call-root');
 if(!root){root=document.createElement('div');root.id='call-root';document.body.appendChild(root);
  root.addEventListener('click',e=>{
   if(e.target.closest('[data-end-call]')){endCall(true);return}
   if(e.target.closest('[data-accept-call]')){acceptCall();return}
   if(e.target.closest('[data-reject-call]')){const p=window.__pendingCallOffer;if(p)callSignal('signal',{kind:'reject',callId:p.callId,to:p.from}).catch(()=>{});endCall(false);return}
   if(e.target.closest('[data-call-speaker]')){const audio=(callRootElement||document).querySelector('[data-remote-video]');if(audio){audio.muted=!audio.muted;e.target.closest('[data-call-speaker]').classList.toggle('is-muted',audio.muted)}return}
   if(e.target.closest('[data-call-mute]')&&callLocalStream){const track=callLocalStream.getAudioTracks()[0];if(track)track.enabled=!track.enabled;return}
   if(e.target.closest('[data-call-camera]')&&callLocalStream){const track=callLocalStream.getVideoTracks()[0];if(track)track.enabled=!track.enabled;return}
  });
 }
 if(root){callRootElement=root;popup.document.querySelector('#call-window-host').appendChild(root)}
 popup.addEventListener('beforeunload',()=>{if(currentCall)endCall(true);if(callRootElement&&callRootElement.ownerDocument!==document)document.body.appendChild(callRootElement);callRootElement=null;callWindowRef=null});
 popup.focus();
 return true;
}
function closeCallPopup(){
 const popup=callWindowRef,root=callRootElement;
 if(root&&root.ownerDocument!==document)document.body.appendChild(root);
 callRootElement=null;callWindowRef=null;
 if(popup&&!popup.closed){try{popup.close()}catch{}}
}
function callUi(html='') { const root=callRootElement||document.querySelector('#call-root'); if(root)root.innerHTML=html }
function callSignal(event,payload) { if(!callSignalChannel)return Promise.reject(new Error('Call connection is not ready'));return callSignalChannel.send({type:'broadcast',event,payload:{...payload,from:session.user.id}}) }
async function ensureCallChannel(conversationId) {
  if(callSignalChannel&&callSignalChannel.topic===`call:${conversationId}`)return callSignalChannel
  if(callSignalChannel){await supabase.removeChannel(callSignalChannel);callSignalChannel=null}
  const channel=supabase.channel(`call:${conversationId}`,{config:{private:true,broadcast:{ack:true}}})
  channel.on('broadcast',{event:'signal'},({payload})=>handleCallSignal(payload))
  await new Promise((resolve,reject)=>{channel.subscribe(status=>{if(status==='SUBSCRIBED'){callSignalChannel=channel;resolve()}else if(status==='CHANNEL_ERROR'||status==='TIMED_OUT'){reject(new Error('Could not connect call service. Check Realtime permissions.'))}})})
  return channel
}
function renderIncomingCallScreen(peer,mode='audio',group=false){
 const name=peer?.peer_name||'Flexoverse friend',isVideo=mode==='video';
 callUi(`<div class="call-backdrop call-screen-backdrop incoming-call-backdrop"><section class="call-window call-screen incoming-call-screen" role="dialog" aria-modal="true" aria-label="Incoming ${isVideo?'video':'voice'} call"><div class="incoming-call-content"><span class="incoming-call-label">${group?'GROUP CALL':'INCOMING CALL'}</span><div class="incoming-call-avatar-wrap"><span class="call-avatar-pulse"></span>${avatar(initials(name),'blue',peer?.peer_avatar_url||'')}</div><h2>${esc(name)}</h2><p>${group?'Started a group '+(isVideo?'video':'voice')+' call':(isVideo?'Video':'Voice')+' call'}</p><div class="incoming-call-actions"><button class="incoming-decline" type="button" ${group?'data-reject-group-call':'data-reject-call'} aria-label="Decline call"><span>✕</span><small>Decline</small></button><button class="incoming-answer" type="button" ${group?'data-accept-group-call':'data-accept-call'} aria-label="${group?'Join':'Answer'} call"><span>✓</span><small>${group?'Join':'Answer'}</small></button></div></div></section></div>`);
}
function renderCallScreen(status='Calling…',video=false) {
 const peer=chatItems.find(x=>x.conversation_id===activeConversationId);
 callUi(`<div class="call-backdrop call-screen-backdrop"><section class="call-window call-screen" role="dialog" aria-modal="true" aria-label="Call">
 <header class="call-screen-top"><button type="button" data-call-participants aria-label="Participants" title="Participants"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.2a4 4 0 0 1 0 7.6"/></svg></button><div class="call-screen-title"><strong>${esc(peer?.peer_name||'Flexoverse call')}</strong><span data-call-status>${esc(status)}</span></div><button type="button" data-call-flip aria-label="Switch camera" title="Switch camera" ${video?'':'hidden'}><svg viewBox="0 0 24 24"><path d="M20 7h-3l-2-3H9L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2Z"/><circle cx="12" cy="13" r="3"/></svg></button></header>
 <div class="call-video-stage call-screen-stage" ${video?'':'data-audio-call'}><video data-remote-video autoplay playsinline></video><video data-local-video autoplay muted playsinline></video><div class="call-audio-avatar">${avatar(initials(peer?.peer_name||'Friend'),'blue',peer?.peer_avatar_url||'')}<strong>${esc(peer?.peer_name||'Flexoverse')}</strong></div></div>
 <div class="call-screen-controls"><button type="button" data-call-more aria-label="More call options" title="More options"><svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></button><button type="button" data-call-speaker aria-label="Speaker on" title="Speaker"><svg viewBox="0 0 24 24"><path d="M4 9v6h4l5 4V5L8 9H4Zm12-1a6 6 0 0 1 0 8m2-11a10 10 0 0 1 0 14"/></svg></button><button type="button" data-call-camera aria-label="Turn camera off" title="Camera" ${video?'':'hidden'}><svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg></button><button type="button" data-call-mute aria-label="Mute microphone" title="Microphone"><svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg></button><button type="button" class="call-end-button" data-end-call aria-label="End call" title="End call"><svg viewBox="0 0 24 24"><path d="m4 14 3-3a2 2 0 0 1 2-.4l2 .7a2 2 0 0 0 2 0l2-.7a2 2 0 0 1 2 .4l3 3-2 4-4-1-2-2-2 2-4 1z"/></svg></button></div></section></div>`);
 const local=(callRootElement||document).querySelector('[data-local-video]');if(local&&callLocalStream){local.srcObject=callLocalStream;local.hidden=!video}
 const remote=(callRootElement||document).querySelector('[data-remote-video]');if(remote&&callRemoteStream)remote.srcObject=callRemoteStream;
}
async function createCallPeer(video) {
  callPeer=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}]})
  callRemoteStream=new MediaStream()
  const remote=(callRootElement||document).querySelector('[data-remote-video]');if(remote)remote.srcObject=callRemoteStream
  callPeer.ontrack=e=>{e.streams[0]?.getTracks().forEach(track=>callRemoteStream.addTrack(track));const v=(callRootElement||document).querySelector('[data-remote-video]');if(v)v.srcObject=callRemoteStream}
  callPeer.onicecandidate=e=>{if(e.candidate&&currentCall)callSignal('signal',{kind:'ice',callId:currentCall.id,candidate:e.candidate})}
  callPeer.onconnectionstatechange=()=>{if(callPeer&&['failed','disconnected'].includes(callPeer.connectionState)){const st=(callRootElement||document).querySelector('[data-call-status]');if(st)st.textContent='Connection interrupted…'}}
  callLocalStream=await navigator.mediaDevices.getUserMedia({audio:true,video:!!video})
  callLocalStream.getTracks().forEach(track=>callPeer.addTrack(track,callLocalStream))
  const local=(callRootElement||document).querySelector('[data-local-video]');if(local){local.srcObject=callLocalStream;local.hidden=!video}
  return callPeer
}

async function loadCallHistory() {
 const list=document.querySelector('#conversation-list');if(!list||!session)return;
 list.innerHTML='<div class="chat-loading">Loading call history…</div>';
 const result=await supabase.from('call_history').select('id,conversation_id,caller_id,receiver_id,call_type,status,started_at,duration_seconds,caller:profiles!call_history_caller_id_fkey(full_name,username,avatar_url),receiver:profiles!call_history_receiver_id_fkey(full_name,username,avatar_url)').order('started_at',{ascending:false}).limit(100);
 if(result.error){console.error(result.error);list.innerHTML='<div class="conversation-empty">Could not load call history. <button type="button" data-retry-call-history>Retry</button></div>';return}
 if(!result.data?.length){list.innerHTML='<div class="conversation-empty"><strong>No calls yet</strong><p>Your voice and video calls will appear here.</p></div>';return}
 list.innerHTML=result.data.map(row=>{
  const outgoing=row.caller_id===session.user.id,person=outgoing?row.receiver:row.caller,name=person?.full_name||person?.username||'Flexoverse friend';
  const missed=row.status==='missed'||(row.status==='calling'&&!outgoing),state=missed?'Missed':row.status==='declined'?'Declined':row.status==='cancelled'?'Cancelled':row.status==='calling'?'Calling':'Completed';
  const icon=row.call_type==='video'?'<svg viewBox="0 0 24 24"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg>':'<svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2A19.8 19.8 0 0 1 11.2 18a19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 3.2 2 2 0 0 1 4.1 1h3a2 2 0 0 1 2 1.7l.5 2.8a2 2 0 0 1-.6 1.7L7.1 9.1a16 16 0 0 0 6 6l1.9-1.9a2 2 0 0 1 1.7-.6l2.8.5a2 2 0 0 1 1.5 1.8Z"/></svg>';
  return '<button class="call-history-row" type="button" data-call-conversation="'+esc(row.conversation_id)+'"><span>'+avatar(initials(name),'blue',person?.avatar_url||'')+'</span><span class="call-history-details"><strong>'+esc(name)+'</strong><small class="'+(missed?'is-missed':'')+'">'+(outgoing?'Outgoing':'Incoming')+' '+row.call_type+' · '+state+'</small><time>'+esc(chatTime(row.started_at))+'</time></span><span class="call-history-type '+(missed?'is-missed':'')+'">'+icon+'</span></button>';
 }).join('');
}
function showCallHistory(show) {
 callLogView=show;
 document.querySelector('#call-log-toggle')?.classList.toggle('active',show);
 document.querySelector('#chat-inbox-toggle')?.classList.toggle('active',!show);
 const search=document.querySelector('#conversation-search');if(search)search.placeholder=show?'Search call history':'Search chats';
 if(show)loadCallHistory();else renderChatList();
}
async function createCallHistory(mode,receiverId,conversationId) {
 const {data,error}=await supabase.from('call_history').insert({conversation_id:conversationId,caller_id:session.user.id,receiver_id:receiverId,call_type:mode,status:'calling'}).select('id').single();
 if(error)throw error;callHistoryId=data.id;return data.id;
}
async function updateCallHistory(status) {
 if(!callHistoryId)return;
 const patch={status};
 if(status==='answered')patch.answered_at=new Date().toISOString();
 if(['ended','declined','missed','cancelled'].includes(status)){patch.ended_at=new Date().toISOString();patch.ended_by=session?.user?.id||null;if(currentCall?.answeredAt)patch.duration_seconds=Math.max(0,Math.floor((Date.now()-currentCall.answeredAt)/1000))}
 const {error}=await supabase.from('call_history').update(patch).eq('id',callHistoryId);
 if(error)console.warn('Call history update failed:',error.message);
 if(callLogView)loadCallHistory();
}
async function startCall(mode) {
  if(!session||!activeConversationId)return openAuth()
  if(!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection)return toast('Calls need a supported browser and a secure HTTPS connection.','error')
  if(!navigator.onLine)return toast('You appear to be offline.','error')
  if(!openCallPopup())return toast('Please allow pop-ups for Flexoverse to open the call window.','error')
  try {
    await ensureCallChannel(activeConversationId)
    const receiverId=chatItems.find(x=>x.conversation_id===activeConversationId)?.peer_id
    callHistoryId=await createCallHistory(mode,receiverId,activeConversationId)
    currentCall={id:crypto.randomUUID(),mode,initiator:true,answeredAt:null}
    renderCallScreen('Calling…',mode==='video')
    await createCallPeer(mode==='video')
    const offer=await callPeer.createOffer();await callPeer.setLocalDescription(offer)
    await callSignal('signal',{kind:'offer',callId:currentCall.id,conversationId:activeConversationId,to:receiverId,mode,sdp:offer,callLogId:callHistoryId})
    const status=(callRootElement||document).querySelector('[data-call-status]');if(status)status.textContent='Ringing…'
  } catch(error){console.error('Call start failed:',error);await endCall(false);toast(error.message||'Could not start the call. Check microphone and camera permissions.','error')}
}
async function loadLiveKitSdk(){
 if(!liveKitSdkPromise)liveKitSdkPromise=import('https://cdn.jsdelivr.net/npm/livekit-client@2.23.0/+esm');
 return liveKitSdkPromise;
}
function renderGroupCallScreen(status='Connecting…',video=false){
 const item=chatItems.find(x=>x.conversation_id===activeConversationId);
 callUi(`<div class="call-backdrop call-screen-backdrop"><section class="call-window call-screen flexoverse-group-call" role="dialog" aria-modal="true" aria-label="Group call">
 <header class="call-screen-top"><button type="button" data-call-participants aria-label="Participants"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M20 21v-2a4 4 0 0 0-3-3.9M16 3.2a4 4 0 0 1 0 7.6"/></svg></button><div class="call-screen-title"><strong>${esc(item?.peer_name||'Group call')}</strong><span data-group-call-status>${esc(status)}</span></div><button type="button" data-call-flip aria-label="Switch camera" ${video?'':'hidden'}>↻</button></header>
 <div class="group-call-participants call-screen-stage" data-group-call-participants></div>
 <div class="call-screen-controls" aria-label="Group call controls">
 <button type="button" data-call-more aria-label="More call options" title="More options"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg></button>
 <button type="button" data-group-speaker aria-label="Enable audio" title="Audio output"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4Zm12-1a6 6 0 0 1 0 8m2-11a10 10 0 0 1 0 14"/></svg></button>
 <button type="button" data-group-camera ${video?'':'hidden'} aria-label="Turn camera off" title="Camera"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/></svg></button>
 <button type="button" data-group-mute aria-label="Mute microphone" title="Microphone"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5m-4 0h8"/></svg></button>
 <button type="button" class="call-end-button" data-end-group-call aria-label="Leave group call" title="Leave call"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 14 3-3a2 2 0 0 1 2-.4l2 .7a2 2 0 0 0 2 0l2-.7a2 2 0 0 1 2 .4l3 3-2 4-4-1-2-2-2 2-4 1z"/></svg></button>
 </div>
 </section></div>`);
}
async function joinLiveKitGroupCall(invite){
 stopIncomingRingtone();
 const item=chatItems.find(x=>x.conversation_id===invite.conversationId);
 const {data,error}=await supabase.functions.invoke('livekit-token',{body:{conversationId:invite.conversationId,displayName:myName()}});
 if(error||!data?.serverUrl||!data?.participantToken)throw new Error(data?.error||error?.message||'Could not get a secure group-call token.');
 const sdk=await loadLiveKitSdk();
 liveKitRoom=new sdk.Room({adaptiveStream:true,dynacast:true});
 const video=invite.mode==='video';
 renderGroupCallScreen('Joining…',video);
 const host=(callRootElement||document).querySelector('[data-group-call-participants]');
 const addTrack=(track,participant)=>{
  const element=track.attach();
  element.dataset.participant=participant.identity;
  if(track.kind==='video'){element.autoplay=true;element.playsInline=true;element.className='group-call-video';}
  else {element.autoplay=true;element.hidden=true;}
  host?.appendChild(element);
 };
 liveKitRoom.on(sdk.RoomEvent.TrackSubscribed,(track,publication,participant)=>addTrack(track,participant));
 liveKitRoom.on(sdk.RoomEvent.TrackUnsubscribed,(track)=>track.detach().forEach(el=>el.remove()));
 liveKitRoom.on(sdk.RoomEvent.ParticipantConnected,()=>{const st=(callRootElement||document).querySelector('[data-group-call-status]');if(st)st.textContent=liveKitRoom.numParticipants+' people in call'});
 liveKitRoom.on(sdk.RoomEvent.ParticipantDisconnected,()=>{const st=(callRootElement||document).querySelector('[data-group-call-status]');if(st)st.textContent=liveKitRoom.numParticipants+' people in call'});
 await liveKitRoom.connect(data.serverUrl,data.participantToken);
 await liveKitRoom.localParticipant.setMicrophoneEnabled(true);
 if(video)await liveKitRoom.localParticipant.setCameraEnabled(true);
 for(const participant of liveKitRoom.remoteParticipants.values()){
  for(const publication of participant.trackPublications.values())if(publication.track)addTrack(publication.track,participant);
 }
 const st=(callRootElement||document).querySelector('[data-group-call-status]');if(st)st.textContent='Connected · '+liveKitRoom.numParticipants+' people';
}
async function startGroupCall(mode){
 const item=chatItems.find(x=>x.conversation_id===activeConversationId);
 if(!session||!item?.is_group)return openAuth();
 if(!openCallPopup())return toast('Please allow pop-ups for Flexoverse to open the call window.','error');
 if(currentCall)return toast('You are already in a call.','info');
 if(!navigator.mediaDevices?.getUserMedia)return toast('Calls need microphone permission and a supported HTTPS browser.','error');
 try{
  await ensureCallChannel(activeConversationId);
  const invite={kind:'group-invite',callId:crypto.randomUUID(),conversationId:activeConversationId,mode};
  currentCall={id:invite.callId,mode,group:true,initiator:true,answeredAt:Date.now()};
  await callSignal('signal',invite);
  await joinLiveKitGroupCall(invite);
 }catch(error){console.error('Group call failed:',error);await endGroupCall(false);toast(error.message||'Could not start the group call.','error')}
}
async function endGroupCall(notify=true){
 stopIncomingRingtone();
 if(notify&&currentCall?.group&&callSignalChannel)callSignal('signal',{kind:'group-end',callId:currentCall.id,conversationId:activeConversationId}).catch(()=>{});
 if(liveKitRoom){try{await liveKitRoom.disconnect()}catch{}liveKitRoom=null}
 currentCall=null;pendingGroupInvite=null;callUi();closeCallPopup();
}

async function handleCallSignal(payload) {
  if(!payload||payload.from===session?.user?.id)return
  if(payload.kind==='group-invite'&&payload.conversationId===activeConversationId){
    if(currentCall){callSignal('signal',{kind:'group-busy',callId:payload.callId,to:payload.from}).catch(()=>{});return}
    pendingGroupInvite=payload;
    currentCall={id:payload.callId,mode:payload.mode,group:true,initiator:false,from:payload.from,answeredAt:null};
    playIncomingRingtone();
    const caller=chatItems.find(x=>x.conversation_id===payload.conversationId)?.peer_name||'A group member';
    renderIncomingCallScreen({peer_name:caller},payload.mode,true);
    return;
  }
  if(payload.kind==='group-end'&&currentCall?.group&&payload.callId===currentCall.id){await endGroupCall(false);return}
  if(payload.kind==='group-busy')return;
  if(payload.kind==='offer')
  if(payload.kind==='offer') {
    if(payload.to!==session?.user?.id||(activeConversationId&&payload.conversationId!==activeConversationId))return
    if(currentCall){await callSignal('signal',{kind:'busy',callId:payload.callId,to:payload.from});return}
    currentCall={id:payload.callId,mode:payload.mode,initiator:false,from:payload.from,answeredAt:null}
    callHistoryId=payload.callLogId||null
    playIncomingRingtone()
    const peer=chatItems.find(x=>x.conversation_id===activeConversationId)
    if(page==='home')renderHomepageIncomingCall(peer,payload.mode);else renderIncomingCallScreen(peer,payload.mode);
    window.__pendingCallOffer=payload
    return
  }
  if(!currentCall||payload.callId!==currentCall.id)return
  try {
    if(payload.kind==='answer'&&callPeer){currentCall.answeredAt=Date.now();await updateCallHistory('answered');await callPeer.setRemoteDescription(new RTCSessionDescription(payload.sdp));for(const c of pendingIceCandidates.splice(0))await callPeer.addIceCandidate(new RTCIceCandidate(c));const st=(callRootElement||document).querySelector('[data-call-status]');if(st)st.textContent='Connected'}
    if(payload.kind==='ice'&&callPeer){if(callPeer.remoteDescription)await callPeer.addIceCandidate(new RTCIceCandidate(payload.candidate));else pendingIceCandidates.push(payload.candidate)}
    if(payload.kind==='reject'){await updateCallHistory('declined');toast('The call was declined.');await endCall(false)}
    if(payload.kind==='busy'){toast('They are already on another call.');await endCall(false)}
    if(payload.kind==='end'){await endCall(false)}
  }catch(error){console.error('Call signal error:',error);toast('The call connection could not be completed.','error');await endCall(false)}
}
async function acceptCall() {
  stopIncomingRingtone()
  const offer=window.__pendingCallOffer;if(!offer||!currentCall)return
  try{currentCall.answeredAt=Date.now();await updateCallHistory('answered');callUi();await createCallPeer(offer.mode==='video');await callPeer.setRemoteDescription(new RTCSessionDescription(offer.sdp));for(const c of pendingIceCandidates.splice(0))await callPeer.addIceCandidate(new RTCIceCandidate(c));const answer=await callPeer.createAnswer();await callPeer.setLocalDescription(answer);await callSignal('signal',{kind:'answer',callId:currentCall.id,to:offer.from,sdp:answer});renderCallScreen('Connecting…',offer.mode==='video')}catch(error){console.error(error);toast(error.message||'Could not answer the call. Check microphone and camera permissions.','error');await endCall(true)}
}
async function endCall(notify=true) {
  stopIncomingRingtone()
  if(currentCall&&callHistoryId)await updateCallHistory(currentCall.answeredAt?'ended':(currentCall.initiator?'missed':'declined'))
  callHistoryId=null
  if(notify&&currentCall&&callSignalChannel)callSignal('signal',{kind:'end',callId:currentCall.id,to:currentCall.from}).catch(()=>{})
  callPeer?.close();callPeer=null;callLocalStream?.getTracks().forEach(t=>t.stop());callLocalStream=null;callRemoteStream=null;pendingIceCandidates=[];currentCall=null;window.__pendingCallOffer=null;callUi();closeCallPopup()
}


function renderChatSelectionControls(){
 const host=document.querySelector('#chat-selection-controls');if(!host)return;
 host.innerHTML=chatSelectionMode?`<span>${selectedChatIds.size} selected</span><button type="button" data-delete-selected-chats ${selectedChatIds.size?'':'disabled'}>Delete</button><button type="button" data-toggle-chat-selection>Cancel</button>`:`<button type="button" data-toggle-chat-selection>Select</button>`;
}
async function deleteSelectedChats(){
 if(!selectedChatIds.size)return;
 const ids=[...selectedChatIds];
 const root=document.querySelector('#modal-root');
 root.innerHTML=`<div class="modal-backdrop" data-chat-confirm-backdrop><section class="chat-edit-modal" role="dialog" aria-modal="true"><h2>Delete ${ids.length} chat${ids.length===1?'':'s'}?</h2><p>This removes ${ids.length===1?'this chat':'these chats'} from your inbox only. The other participant may still see the conversation.</p><div class="chat-edit-actions"><button type="button" data-cancel-chat-delete>Cancel</button><button type="button" class="danger" data-confirm-chat-delete>Delete</button></div></section></div>`;
 root.onclick=async e=>{if(e.target.closest('[data-cancel-chat-delete]')||e.target.matches('[data-chat-confirm-backdrop]')){root.innerHTML='';root.onclick=null;return}if(!e.target.closest('[data-confirm-chat-delete]'))return;const btn=e.target.closest('[data-confirm-chat-delete]');btn.disabled=true;const {error}=await supabase.from('conversation_members').delete().eq('user_id',session.user.id).in('conversation_id',ids);if(error){btn.disabled=false;toast(error.message,'error');return}root.innerHTML='';root.onclick=null;chatItems=chatItems.filter(x=>!selectedChatIds.has(x.conversation_id));if(selectedChatIds.has(activeConversationId)){activeConversationId=null;renderChatWelcome('Choose a chat or start a new conversation.');document.querySelector('#chat-layout')?.classList.remove('has-active-conversation')}selectedChatIds.clear();chatSelectionMode=false;renderChatList();renderChatSelectionControls();toast('Chat removed from your inbox.','success')};
}

let messageLongPressTimer=null;
function messageCanEdit(message){return !!message&&message.sender_id===session?.user?.id&&(Date.now()-new Date(message.created_at).getTime())<=5*60*1000}
function closeWhatsAppMessageMenu(){const root=document.querySelector('#modal-root');if(root)root.innerHTML=''}
function openWhatsAppMessageMenu(messageId,wrap){
 const message=activeChatMessages.find(m=>m.id===messageId);if(!message)return;
 const own=message.sender_id===session?.user?.id,canEdit=messageCanEdit(message),root=document.querySelector('#modal-root');
 const iconSvg={reply:'<path d="m9 14-5-5 5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-2"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',react:'<circle cx="12" cy="12" r="9"/><path d="M8 14s1.3 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',edit:'<path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16z"/>',delete:'<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/>',report:'<path d="M5 21V4m0 1c6-4 8 4 14 0v10c-6 4-8-4-14 0"/>',forward:'<path d="m14 5 7 7-7 7M21 12H9a5 5 0 0 0-5 5"/>',pin:'<path d="m16 3 5 5-4 1-4 4 1 4-2 2-4-6-6-4 2-2 4 1 4-4zM12 17l-7 7"/>',star:'<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z"/>'};
 const items=[['reply','Reply'],['copy','Copy'],['select','Select'],['react','React']];if(canEdit)items.push(['edit','Edit']);items.push(['delete','Delete']);
 root.innerHTML='<div class="wa-message-menu-backdrop" data-wa-menu-close><div class="wa-message-menu" role="menu" aria-label="Message options">'+items.map(([action,label])=>'<button type="button" role="menuitem" data-message-action="'+action+'" data-message-id="'+esc(messageId)+'"><svg class="wa-menu-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+iconSvg[action]+'</svg>'+label+'</button>').join('')+'</div></div>';
 const menu=root.querySelector('.wa-message-menu'),bubble=wrap?.querySelector('.message'),rect=bubble?.getBoundingClientRect()||wrap?.getBoundingClientRect();
 if(menu&&rect){const width=Math.min(210,window.innerWidth-24);let left=own?rect.right-width:rect.left;left=Math.max(12,Math.min(left,window.innerWidth-width-12));let top=rect.top-8;if(top+menu.offsetHeight>window.innerHeight-12)top=window.innerHeight-menu.offsetHeight-12;if(top<12)top=12;menu.style.left=left+'px';menu.style.top=top+'px';}
}
async function handleWhatsAppMessageAction(action,id){
 const message=activeChatMessages.find(m=>m.id===id);if(!message)return;
 if(action==='select'){messageSelectionMode=true;selectedMessageIds.add(id);closeWhatsAppMessageMenu();renderChatRoom(chatItems.find(x=>x.conversation_id===activeConversationId));return}
 if(action==='edit'){if(!messageCanEdit(message)){closeWhatsAppMessageMenu();return toast('Messages can only be edited within 5 minutes.','info')}closeWhatsAppMessageMenu();openMessageEdit(id);const form=document.querySelector('[data-edit-message-form]');if(form)form.dataset.messageId=id;return}
 if(action==='delete'){closeWhatsAppMessageMenu();const root=document.querySelector('#modal-root');root.innerHTML='<div class="modal-backdrop" data-confirm-message-delete><section class="chat-edit-modal" role="dialog" aria-modal="true"><h2>Delete message?</h2><p>This removes the message for everyone in this conversation.</p><div class="chat-edit-actions"><button type="button" data-cancel-message-delete>Cancel</button><button type="button" class="danger" data-confirm-message-delete-id="'+esc(id)+'">Delete</button></div></section></div>';return}
 if(action==='copy'){try{await navigator.clipboard.writeText(message.content);toast('Message copied.','success')}catch{toast('Could not copy this message.','error')}closeWhatsAppMessageMenu();return}
 if(action==='reply'){pendingReplyTo=message;closeWhatsAppMessageMenu();renderChatRoom(chatItems.find(x=>x.conversation_id===activeConversationId));document.querySelector('#message-form [name="message"]')?.focus();return}
 if(action==='react'){closeWhatsAppMessageMenu();const root=document.querySelector('#modal-root');root.innerHTML='<div class="wa-reaction-backdrop" data-wa-menu-close><div class="wa-reaction-picker">'+['👍','❤️','😂','😮','😢','🙏'].map(x=>'<button type="button" data-message-reaction="'+x+'" data-message-id="'+esc(id)+'">'+x+'</button>').join('')+'</div></div>';return}
}

function openMessageEdit(messageId){
 const message=activeChatMessages.find(m=>m.id===messageId);if(!message||message.sender_id!==session?.user?.id)return;
 const root=document.querySelector('#modal-root');if(!root)return;
 root.innerHTML=`<div class="modal-backdrop" data-edit-message-backdrop><form class="chat-edit-modal" data-edit-message-form role="dialog" aria-modal="true"><h2>Edit message</h2><textarea name="content" maxlength="4000" required>${esc(message.content)}</textarea><div class="chat-edit-actions"><button type="button" data-cancel-message-edit>Cancel</button><button type="submit">Save</button></div></form></div>`;
 root.querySelector('textarea')?.focus();
}
async function saveEditedMessage(form){
 const messageId=form.dataset.messageId||document.querySelector('[data-edit-message-form]')?.dataset.messageId;
}
async function updateChatMessage(messageId,content){
 const {data,error}=await supabase.from('messages').update({content,edited_at:new Date().toISOString()}).eq('id',messageId).eq('sender_id',session.user.id).select('id,conversation_id,sender_id,content,created_at,edited_at,reply_to_message_id').single();
 if(error){toast(error.message,'error');return}
 const idx=activeChatMessages.findIndex(m=>m.id===messageId);if(idx>=0)activeChatMessages[idx]=data;
 const item=chatItems.find(x=>x.conversation_id===activeConversationId);renderChatRoom(item);document.querySelector('#modal-root').innerHTML='';toast('Message edited.','success');
}
function bindChatPageEvents() {
  document.querySelector('#chat-new-button')?.addEventListener('click',openNewChatDialog)
  document.querySelectorAll('[data-chat-filter]').forEach(tab=>tab.addEventListener('click',()=>{chatListFilter=tab.dataset.chatFilter||'all';renderChatList()}))
  document.querySelector('#chat-plus-button')?.addEventListener('click',()=>{const menu=document.querySelector('#chat-plus-menu');if(menu)menu.hidden=!menu.hidden})
  document.querySelector('#chat-plus-menu')?.addEventListener('click',e=>{if(e.target.closest('[data-chat-plus-new]')){document.querySelector('#chat-plus-menu').hidden=true;openNewChatDialog()}if(e.target.closest('[data-chat-plus-group]')){document.querySelector('#chat-plus-menu').hidden=true;openNewGroupDialog()}})
  document.querySelector('#conversation-search')?.addEventListener('input',()=>callLogView?loadCallHistory():renderChatList())
  document.querySelector('#call-log-toggle')?.addEventListener('click',()=>showCallHistory(true))
  document.querySelector('#chat-inbox-toggle')?.addEventListener('click',()=>showCallHistory(false))
  document.querySelector('#chat-inbox-heading')?.addEventListener('click',e=>{if(e.target.closest('[data-toggle-chat-selection]')){chatSelectionMode=!chatSelectionMode;selectedChatIds.clear();renderChatList();return}if(e.target.closest('[data-delete-selected-chats]'))deleteSelectedChats()})
  document.querySelector('#conversation-list')?.addEventListener('click',e=>{if(e.target.closest('[data-chat-new]'))return openNewChatDialog();if(e.target.closest('[data-retry-chats]'))return loadChats();if(e.target.closest('[data-retry-call-history]'))return loadCallHistory();const callRow=e.target.closest('[data-call-conversation]');if(callRow){showCallHistory(false);return selectConversation(callRow.dataset.callConversation)}const row=e.target.closest('[data-conversation-id]');if(row){if(chatSelectionMode){const id=row.dataset.conversationId;selectedChatIds.has(id)?selectedChatIds.delete(id):selectedChatIds.add(id);renderChatList();return}selectConversation(row.dataset.conversationId)}})
  document.querySelector('#chat-room')?.addEventListener('click',e=>{const voice=e.target.closest('[data-voice-record]');if(voice){if(voiceRecorder&&voiceRecorder.state==='recording'){voice.disabled=true;voiceRecorder.stop()}else startVoiceRecording(voice);return}if(e.target.closest('[data-chat-back]')){document.querySelector('#chat-layout')?.classList.remove('has-active-conversation');history.replaceState(null,'','/chats/')}})
  document.querySelector('#chat-room')?.addEventListener('click',e=>{
    const toggle=e.target.closest('[data-chat-menu-toggle]');
    if(toggle){const menu=document.querySelector('[data-chat-menu]');if(menu){menu.hidden=!menu.hidden;toggle.setAttribute('aria-expanded',String(!menu.hidden))}return}
    const groupCall=e.target.closest('[data-start-group-call]');
    if(groupCall){const menu=document.querySelector('[data-chat-menu]');if(menu)menu.hidden=true;document.querySelector('[data-chat-menu-toggle]')?.setAttribute('aria-expanded','false');startGroupCall(groupCall.dataset.startGroupCall);return}
    const call=e.target.closest('[data-start-call]');
    if(call){const menu=document.querySelector('[data-chat-menu]');if(menu)menu.hidden=true;document.querySelector('[data-chat-menu-toggle]')?.setAttribute('aria-expanded','false');startCall(call.dataset.startCall);return}
    const action=e.target.closest('[data-chat-menu-action]')?.dataset.chatMenuAction;
    if(!action)return;
    const menu=document.querySelector('[data-chat-menu]');if(menu)menu.hidden=true;
    document.querySelector('[data-chat-menu-toggle]')?.setAttribute('aria-expanded','false');
    if(action==='contact'){document.querySelector('.chat-room-profile')?.click();return}
    if(action==='close'){document.querySelector('[data-chat-back]')?.click();return}
    if(action==='search'){let box=document.querySelector('[data-chat-message-search]');if(!box){box=document.createElement('input');box.type='search';box.placeholder='Search messages…';box.setAttribute('data-chat-message-search','');box.className='chat-message-search';document.querySelector('#chat-history')?.before(box);box.addEventListener('input',()=>{const q=box.value.trim().toLowerCase();document.querySelectorAll('#chat-history .message').forEach(m=>m.hidden=!!q&&!m.textContent.toLowerCase().includes(q))})}box.focus();return}
    if(action==='select'){chatSelectionMode=true;renderChatList();toast('Select one or more chats, then choose Delete.');return}
    if(action==='mute'){const b=e.target.closest('[data-chat-menu-action]');b.textContent=b.textContent.includes('Mute')?'✓ Notifications muted':'♩ Mute notifications';toast('Notification preference is shown for this chat.');return}
    if(action==='theme'){document.querySelector('#chat-room')?.classList.toggle('chat-room-soft-theme');return}
    if(action==='favorite'){const id=activeConversationId;if(!id)return;chatFavoriteIds.has(id)?chatFavoriteIds.delete(id):chatFavoriteIds.add(id);try{localStorage.setItem('flexoverse-chat-favorites:'+session.user.id,JSON.stringify([...chatFavoriteIds]))}catch{}const button=e.target.closest('[data-chat-menu-action="favorite"]');if(button)button.textContent=chatFavoriteIds.has(id)?'Remove from Favorites':'Add to Favorites';renderChatList();toast(chatFavoriteIds.has(id)?'Added to Favorites.':'Removed from Favorites.','success');return}
    if(action==='export'){const item=chatItems.find(x=>x.conversation_id===activeConversationId);const lines=activeChatMessages.map(m=>{const who=m.sender_id===session?.user?.id?'You':(item?.peer_name||'Friend');return '['+new Date(m.created_at).toLocaleString()+'] '+who+': '+m.content});const blob=new Blob([lines.join('\n')],{type:'text/plain;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='flexoverse-chat.txt';a.click();URL.revokeObjectURL(url);return}
  })
  document.querySelector('#call-root')?.addEventListener('click',e=>{if(e.target.closest('[data-accept-group-call]')){if(!openCallPopup())return toast('Please allow pop-ups for Flexoverse to open the call window.','error');const invite=pendingGroupInvite;if(invite)joinLiveKitGroupCall(invite).catch(error=>{console.error(error);toast(error.message||'Could not join group call.','error');endGroupCall(false)});return}if(e.target.closest('[data-reject-group-call]')){stopIncomingRingtone();pendingGroupInvite=null;currentCall=null;callUi();return}if(e.target.closest('[data-end-group-call]')){endGroupCall(true);return}if(e.target.closest('[data-group-speaker]')&&liveKitRoom){liveKitRoom.startAudio().then(()=>{const b=e.target.closest('[data-group-speaker]');b.classList.toggle('is-muted',false);b.setAttribute('aria-label','Audio output enabled')}).catch(()=>toast('Tap again to enable call audio.','info'));return}if(e.target.closest('[data-group-mute]')&&liveKitRoom){const b=e.target.closest('[data-group-mute]'),p=liveKitRoom.localParticipant,next=!p.isMicrophoneEnabled;p.setMicrophoneEnabled(next).then(()=>{b.classList.toggle('is-muted',!next);b.setAttribute('aria-label',next?'Mute microphone':'Unmute microphone')}).catch(error=>toast(error.message,'error'));return}if(e.target.closest('[data-group-camera]')&&liveKitRoom){const b=e.target.closest('[data-group-camera]'),p=liveKitRoom.localParticipant,next=!p.isCameraEnabled;p.setCameraEnabled(next).then(()=>{b.classList.toggle('is-muted',!next);b.setAttribute('aria-label',next?'Turn camera off':'Turn camera on')}).catch(error=>toast(error.message,'error'));return}if(e.target.closest('[data-end-call]'))endCall(true);if(e.target.closest('[data-call-speaker]')){const audio=(callRootElement||document).querySelector('[data-remote-video]');if(audio){audio.muted=!audio.muted;e.target.closest('[data-call-speaker]').classList.toggle('is-muted',audio.muted)}return}if(e.target.closest('[data-call-flip]')&&callLocalStream){const track=callLocalStream.getVideoTracks()[0];if(track&&track.applyConstraints)track.applyConstraints({facingMode:track.getSettings().facingMode==='user'?'environment':'user'}).catch(()=>{});return}if(e.target.closest('[data-reject-call]')){const p=window.__pendingCallOffer;if(p)callSignal('signal',{kind:'reject',callId:p.callId,to:p.from}).catch(()=>{});endCall(false)}if(e.target.closest('[data-accept-call]')){if(!openCallPopup())return toast('Please allow pop-ups for Flexoverse to open the call window.','error');acceptCall()}if(e.target.closest('[data-call-mute]')&&callLocalStream){const track=callLocalStream.getAudioTracks()[0];if(track){track.enabled=!track.enabled;e.target.closest('[data-call-mute]').classList.toggle('is-muted',!track.enabled)}}if(e.target.closest('[data-call-camera]')&&callLocalStream){const track=callLocalStream.getVideoTracks()[0];if(track){track.enabled=!track.enabled;e.target.closest('[data-call-camera]').classList.toggle('is-muted',!track.enabled)}}})
  document.querySelector('#chat-room')?.addEventListener('touchstart',e=>{if(messageSelectionMode)return;const bubble=e.target.closest('.message');if(!bubble)return;const wrap=bubble.closest('[data-message-wrap]');const id=bubble.dataset.messageId;if(!id)return;messageLongPressTimer=setTimeout(()=>{messageLongPressTimer=null;openWhatsAppMessageMenu(id,wrap)},520)},{passive:true})
  document.querySelector('#chat-room')?.addEventListener('touchend',()=>{if(messageLongPressTimer){clearTimeout(messageLongPressTimer);messageLongPressTimer=null}},{passive:true})
  document.querySelector('#chat-room')?.addEventListener('touchmove',()=>{if(messageLongPressTimer){clearTimeout(messageLongPressTimer);messageLongPressTimer=null}},{passive:true})
  document.querySelector('#chat-room')?.addEventListener('contextmenu',e=>{const bubble=e.target.closest('.message');if(!bubble)return;e.preventDefault();openWhatsAppMessageMenu(bubble.dataset.messageId,bubble.closest('[data-message-wrap]'))})
  document.querySelector('#chat-room')?.addEventListener('click',e=>{
    if(messageSelectionMode){
      const bubble=e.target.closest('.message');
      if(bubble){const id=bubble.dataset.messageId;if(id){selectedMessageIds.has(id)?selectedMessageIds.delete(id):selectedMessageIds.add(id);renderChatRoom(chatItems.find(x=>x.conversation_id===activeConversationId))}return}
      if(e.target.closest('[data-cancel-message-selection]')){messageSelectionMode=false;selectedMessageIds.clear();renderChatRoom(chatItems.find(x=>x.conversation_id===activeConversationId));return}
      if(e.target.closest('[data-copy-selected-messages]')){const text=activeChatMessages.filter(m=>selectedMessageIds.has(m.id)).map(m=>m.content).join('\n');navigator.clipboard.writeText(text).then(()=>toast('Selected messages copied.','success')).catch(()=>toast('Could not copy messages.','error'));messageSelectionMode=false;selectedMessageIds.clear();renderChatRoom(chatItems.find(x=>x.conversation_id===activeConversationId));return}
    }
    const msgMenu=e.target.closest('[data-message-menu]');
    if(msgMenu){openWhatsAppMessageMenu(msgMenu.dataset.messageMenu,msgMenu.closest('[data-message-wrap]'));return}
    const menuAction=e.target.closest('[data-message-action]');
    if(menuAction){handleWhatsAppMessageAction(menuAction.dataset.messageAction,menuAction.dataset.messageId);return}
  })
  document.querySelector('#modal-root')?.addEventListener('click',async e=>{
 const menuAction=e.target.closest('[data-message-action]');if(menuAction){await handleWhatsAppMessageAction(menuAction.dataset.messageAction,menuAction.dataset.messageId);return}
 const confirmDelete=e.target.closest('[data-confirm-message-delete-id]');if(confirmDelete){const id=confirmDelete.dataset.confirmMessageDeleteId;confirmDelete.disabled=true;const {error}=await supabase.from('messages').delete().eq('id',id).eq('sender_id',session.user.id);if(error){confirmDelete.disabled=false;toast(error.message,'error');return}activeChatMessages=activeChatMessages.filter(m=>m.id!==id);activeMessageReactions=activeMessageReactions.filter(r=>r.message_id!==id);document.querySelector('#modal-root').innerHTML='';renderChatRoom(chatItems.find(x=>x.conversation_id===activeConversationId));toast('Message deleted.','success');return}
 if(e.target.closest('[data-wa-menu-close]')){closeWhatsAppMessageMenu();return}const reaction=e.target.closest('[data-message-reaction]');if(reaction){const messageId=reaction.dataset.messageId,emoji=reaction.dataset.messageReaction;const existing=activeMessageReactions.find(r=>r.message_id===messageId&&r.user_id===session.user.id&&r.reaction===emoji);const result=existing?await supabase.from('message_reactions').delete().eq('id',existing.id):await supabase.from('message_reactions').insert({message_id:messageId,user_id:session.user.id,reaction:emoji});if(result.error){toast(result.error.message,'error');return}const fresh=await supabase.from('message_reactions').select('id,message_id,user_id,reaction').in('message_id',activeChatMessages.map(m=>m.id));activeMessageReactions=fresh.data||[];closeWhatsAppMessageMenu();renderChatRoom(chatItems.find(x=>x.conversation_id===activeConversationId));return}if(e.target.closest('[data-cancel-reply]')){pendingReplyTo=null;renderChatRoom(chatItems.find(x=>x.conversation_id===activeConversationId));return}if(e.target.closest('[data-cancel-message-edit]')||e.target.closest('[data-cancel-message-delete]')||e.target.matches('[data-close-message-actions]')){document.querySelector('#modal-root').innerHTML='';return}const del=e.target.closest('[data-confirm-message-delete-id]');if(del){const id=del.dataset.confirmMessageDeleteId;supabase.from('messages').delete().eq('id',id).eq('sender_id',session.user.id).then(({error})=>{if(error){toast(error.message,'error');return}activeChatMessages=activeChatMessages.filter(m=>m.id!==id);renderChatRoom(chatItems.find(x=>x.conversation_id===activeConversationId));document.querySelector('#modal-root').innerHTML='';toast('Message deleted.','success')})}})
  document.querySelector('#modal-root')?.addEventListener('submit',async e=>{
 const editForm=e.target.closest('[data-edit-message-form]');if(editForm){e.preventDefault();const id=editForm.dataset.messageId,content=editForm.querySelector('textarea').value.trim();if(!content)return;if(!messageCanEdit(activeChatMessages.find(m=>m.id===id))){toast('Messages can only be edited within 5 minutes.','info');document.querySelector('#modal-root').innerHTML='';return}const save=editForm.querySelector('[type="submit"]');save.disabled=true;await updateChatMessage(id,content);return}
 const form=e.target.closest('[data-edit-message-form]');if(!form)return;e.preventDefault();const content=form.querySelector('textarea').value.trim();if(!content)return;const btn=form.querySelector('[type=submit]');btn.disabled=true;await updateChatMessage(form.dataset.messageId,content);btn.disabled=false})
  document.querySelector('#chat-room')?.addEventListener('input',e=>{if(e.target.matches('#message-form [name="message"]'))setChatTyping(!!e.target.value.trim())});
  document.querySelector('#chat-room')?.addEventListener('submit',async e=>{const form=e.target.closest('#message-form');if(!form)return;e.preventDefault();if(!session)return openAuth();const input=form.querySelector('[name="message"]'),content=String(input.value||'').trim();if(!content||!activeConversationId)return;setChatTyping(false);const submit=form.querySelector('[type="submit"]');submit.disabled=true;const replyId=pendingReplyTo?.id||null;const {data,error}=await supabase.from('messages').insert({conversation_id:activeConversationId,sender_id:session.user.id,content,reply_to_message_id:replyId}).select('id,conversation_id,sender_id,content,created_at,edited_at,reply_to_message_id,message_type,media_path').single();submit.disabled=false;if(error){toast(error.message,'error');return}pendingReplyTo=null;handleChatMessage(data);await markConversationRead(activeConversationId);document.querySelector('#message-form [name="message"]')?.focus()})
  document.querySelector('#modal-root')?.addEventListener('click',async e=>{
    if(e.target.closest('[data-close-chat-modal]')||e.target.matches('[data-chat-modal-backdrop]')){document.querySelector('#modal-root').innerHTML='';return}
    if(e.target.closest('[data-open-new-group]')){openNewGroupDialog();return}
    const choice=e.target.closest('[data-start-chat]');if(!choice)return
    choice.disabled=true
    const {data,error}=await supabase.rpc('start_direct_conversation',{target_user_id:choice.dataset.startChat})
    if(error){choice.disabled=false;toast(error.message,'error');return}
    document.querySelector('#modal-root').innerHTML=''
    await loadChats(data)
  });
  document.querySelector('#modal-root')?.addEventListener('submit',async e=>{
    const form=e.target.closest('[data-create-group-form]');if(!form)return;e.preventDefault();
    const groupName=String(form.elements.group_name.value||'').trim();
    const memberIds=[...form.querySelectorAll('[name="group_member"]:checked')].map(x=>x.value);
    if(!groupName)return toast('Enter a group name.','error');
    if(memberIds.length<2)return toast('Choose at least two friends for your group.','error');
    const button=form.querySelector('[type="submit"]');button.disabled=true;button.textContent='Creating…';
    const {data:conversation,error:createError}=await supabase.from('conversations').insert({created_by:session.user.id,is_group:true,group_name:groupName}).select('id').single();
    if(createError){button.disabled=false;button.textContent='Create group';toast(createError.message,'error');return}
    const members=[session.user.id,...memberIds].map(user_id=>({conversation_id:conversation.id,user_id}));
    const {error:membersError}=await supabase.from('conversation_members').insert(members);
    if(membersError){await supabase.from('conversations').delete().eq('id',conversation.id);button.disabled=false;toast(membersError.message,'error');return}
    document.querySelector('#modal-root').innerHTML='';toast('Group created.','success');await loadChats(conversation.id);
  })
}

function bindNotificationPageEvents() {
  document.querySelectorAll('[data-notification-filter]').forEach(tab=>tab.addEventListener('click',()=>{notificationFilter=tab.dataset.notificationFilter;renderNotifications()}))
  document.querySelector('#notifications-mark-read')?.addEventListener('click',async()=>{if(!session)return;const unread=notificationItems.filter(item=>!item.is_read&&notificationIsVisible(item));if(!unread.length)return;const {error}=await supabase.from('notifications').update({is_read:true}).eq('recipient_id',session.user.id).eq('is_read',false).in('id',unread.map(item=>item.id));if(error)return toast(error.message,'error');unread.forEach(item=>item.is_read=true);renderNotifications();await loadNotificationCount();toast('All caught up.','success')})
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

const settingsSections={
  profile:{title:'Profile information',description:'Update the details people see when they visit your profile.'},
  privacy:{title:'Privacy & discovery',description:'Choose who can see your profile and review how discovery works.'},
  content:{title:'Content & audience',description:'Share posts and reels with the audience you intend.'},
  notifications:{title:'Notifications',description:'Choose which activity creates an in-app notification.'},
  blocked:{title:'Blocked accounts',description:'Review accounts you have blocked and change that choice.'},
  security:{title:'Account & security',description:'Review your sign-in email and password recovery options.'},
  membership:{title:'Membership & storage',description:'See what is available now and what is planned.'},
  verification:{title:'Verification',description:'Learn about profile verification on Flexoverse.'},
  business:{title:'Business profile',description:'Information for organizations and businesses on Flexoverse.'},
  appearance:{title:'Appearance',description:'Choose how Flexoverse looks on this device.'},
  accessibility:{title:'Accessibility',description:'Adjust reading comfort and motion preferences.'},
  account:{title:'Account data',description:'Review your account and sign-out options.'}
}
const settingsIcon='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
const settingSwitch=(id,title,description,checked=false,disabled=false)=>`<label class="setting-switch"><span><strong>${title}</strong><small>${description}</small></span><input id="${id}" type="checkbox" ${checked?'checked':''} ${disabled?'disabled':''}><i aria-hidden="true"></i></label>`

function applySavedPreferences(){
  const theme=localStorage.getItem('flexoverse-theme')||'system'
  document.documentElement.dataset.theme=theme
  document.documentElement.dataset.textSize=localStorage.getItem('flexoverse-text-size')||'standard'
  document.documentElement.classList.toggle('reduce-motion',localStorage.getItem('flexoverse-reduce-motion')==='true')
}

function settingPanel(title,description,body){return `<section class="settings-panel card"><header class="settings-panel-head"><div><h2>${title}</h2><p class="muted">${description}</p></div></header>${body}</section>`}

async function loadBlockedAccounts(root){
  const list=root.querySelector('#blocked-account-list')
  if(!list||!session)return
  list.innerHTML='<div class="feed-state">Loading blocked accounts…</div>'
  const {data,error}=await supabase.from('user_blocks').select('blocked_id,created_at,blocked:profiles!user_blocks_blocked_id_fkey(id,username,full_name,avatar_url)').eq('blocker_id',session.user.id).order('created_at',{ascending:false})
  if(error){console.error('Could not load blocked accounts:',error);list.innerHTML='<div class="settings-empty"><strong>Blocked accounts could not load</strong><p>Please refresh and try again.</p></div>';return}
  const rows=data||[]
  list.innerHTML=rows.length?rows.map(row=>{const user=Array.isArray(row.blocked)?row.blocked[0]||{}:row.blocked||{};const name=user.full_name||user.username||`Blocked profile · ${String(row.blocked_id).slice(0,8)}`;return `<article class="blocked-account" data-blocked-row="${esc(row.blocked_id)}">${avatar(initials(name), 'blue',user.avatar_url)}<span><strong>${esc(name)}</strong><small>${user.username?'@'+esc(user.username)+' · ':''}blocked ${esc(timeAgo(row.created_at))}</small></span><button class="button button-outline" type="button" data-unblock="${esc(row.blocked_id)}">Unblock</button></article>`}).join(''):'<div class="settings-empty"><strong>No blocked accounts</strong><p>Accounts you block will appear here.</p></div>'
}

async function renderSettingsSection(){
  const root=document.querySelector('#settings-content')
  if(!root)return
  const key=page.replace('settings-','')
  const meta=settingsSections[key]
  if(!meta)return
  document.title=`${meta.title} · Settings · Flexoverse`
  if(!session){root.innerHTML=`<section class="settings-panel card"><p class="overline">SIGN IN REQUIRED</p><h1>${meta.title}</h1><p class="muted">Sign in to view and update your account settings.</p><a class="button button-primary" href="/login/?next=${encodeURIComponent(location.pathname)}">Sign in</a></section>`;return}
  let content=''
  let privateDetails=null
  if(key==='profile'){
    const {data:loadedPrivateDetails,error:detailsError}=await supabase.from('private_profile_details').select('address,account_type,date_of_birth,gender,phone,city,hometown,country,state,lga,address_place_id').eq('user_id',session.user.id).maybeSingle()
    if(detailsError)throw new Error('Your private profile details could not be loaded: '+detailsError.message)
    privateDetails=loadedPrivateDetails||{}
    const details=privateDetails
    const photo=profile?.avatar_url||''
    const displayName=profile?.full_name||myName()
    const username=profile?.username||myUsername()
    const profileMarkup=`<section class="profile-settings-hero">
      <div class="profile-settings-hero-copy"><p class="overline">YOUR ACCOUNT</p><h2>Make your profile yours</h2><p>Keep your information up to date. You control what you share publicly and what stays private.</p></div>
      <a class="profile-preview-link" href="${esc(profileUrl(username))}" target="_blank" rel="noopener noreferrer">View profile <span aria-hidden="true">↗</span></a>
    </section>
    <section class="profile-identity-card">
      <div class="profile-photo-settings"><div class="profile-photo-settings-preview" id="profile-avatar-preview">${avatar(initials(displayName),'blue',photo)}</div><div class="profile-photo-settings-copy"><span class="profile-identity-eyebrow">PROFILE PHOTO</span><strong>${esc(displayName)}</strong><small>@${esc(username)}</small><div class="profile-photo-actions"><input id="profile-photo-input" type="file" accept="image/jpeg,image/png,image/webp,image/avif" hidden><button class="button button-soft" id="profile-photo-button" type="button">${photo?'Change photo':'Add photo'}</button><span id="profile-photo-status" aria-live="polite"></span></div><small>JPG, PNG, WebP or AVIF · up to 5 MB</small></div></div>
    </section>
    <form id="profile-form" class="settings-form profile-settings-form">
      <section class="profile-settings-group"><header class="profile-settings-group-heading"><span class="profile-settings-step">01</span><div><h3>Basic information</h3><p>Your name, username and the introduction people see on your profile.</p></div></header>
        <div class="profile-settings-grid">
          <label class="form-label">Account type<select name="account_type"><option value="personal" ${(details.account_type||'personal')==='personal'?'selected':''}>Personal</option><option value="business" ${details.account_type==='business'?'selected':''}>Business</option></select></label>
          <label class="form-label">Full name<input id="full-name" name="full_name" maxlength="80" required value="${esc(profile?.full_name||'')}"></label>
          <label class="form-label">Username<span class="input-with-prefix"><span>@</span><input id="username-field" name="username" minlength="3" maxlength="30" pattern="[a-z0-9]+" required value="${esc(profile?.username||'')}"></span><small>3–30 lowercase letters or numbers.</small></label>
          <label class="form-label profile-settings-span">Bio<textarea name="bio" maxlength="300" rows="4" placeholder="A little about you">${esc(profile?.bio||'')}</textarea><small>Up to 300 characters.</small></label>
        </div>
      </section>
      <section class="profile-settings-group"><header class="profile-settings-group-heading"><span class="profile-settings-step">02</span><div><h3>Personal details</h3><p>These details are kept private and are only used to manage your account.</p></div></header>
        <div class="profile-settings-grid">
          <label class="form-label">Date of birth<input type="date" name="date_of_birth" value="${esc(details.date_of_birth||'')}"></label>
          <label class="form-label">Gender<select name="gender"><option value="">Select gender</option><option value="female" ${details.gender==='female'?'selected':''}>Female</option><option value="male" ${details.gender==='male'?'selected':''}>Male</option><option value="non_binary" ${details.gender==='non_binary'?'selected':''}>Non-binary</option><option value="self_described" ${details.gender==='self_described'?'selected':''}>Prefer to self-describe</option><option value="prefer_not_to_say" ${details.gender==='prefer_not_to_say'?'selected':''}>Prefer not to say</option></select></label>
          <label class="form-label">Phone number <span class="required-label">Required</span><input type="tel" name="phone" required inputmode="tel" value="${esc(details.phone||'')}" placeholder="Select country code and enter number"><small>One phone number can belong to only one account.</small></label>
        </div>
      </section>
      <section class="profile-settings-group"><header class="profile-settings-group-heading"><span class="profile-settings-step">03</span><div><h3>Location</h3><p>Your location helps with local discovery. Your street address remains private.</p></div></header>
        <div class="profile-settings-grid">
          <label class="form-label">Country<select name="country" required><option value="">Loading countries…</option></select></label>
          <label class="form-label">State / Region<select name="state" required disabled><option value="">Select a country first</option></select></label>
          <label class="form-label">Local Government Area / District<select name="lga" disabled><option value="">Select a state first</option></select></label>
          <label class="form-label">Current city<input name="city" maxlength="100" value="${esc(details.city||'')}"></label>
          <label class="form-label">Hometown<input name="hometown" maxlength="100" value="${esc(details.hometown||'')}"></label>
          <label class="form-label profile-settings-span">Address or general location<div class="google-address-wrap" data-google-address-wrap><input data-google-address name="address" maxlength="300" autocomplete="off" value="${esc(details.address||'')}" placeholder="Start typing an address or city"><input type="hidden" name="address_place_id" value="${esc(details.address_place_id||'')}"><div class="google-address-suggestions" data-google-suggestions hidden></div><small data-google-address-status>Choose a matching suggestion if available. This address is private.</small></div></label>
        </div>
      </section>
      <section class="profile-settings-footer"><div><strong>Profile link</strong><span id="profile-link">${esc(profileUrl(username))}</span></div><button class="button button-primary" type="submit">Save changes</button></section>
    </form>`
    content=settingPanel('Profile information','Manage the details connected to your Flexoverse account.',profileMarkup)
  }else if(key==='privacy'){
    content=settingPanel('Profile visibility','Choose whether your profile details are public or limited to accepted friends.',`${settingSwitch('public-profile','Public profile','Anyone can view your profile details.',profile?.is_public!==false)}<div class="settings-note settings-note-warning"><strong>Public posts may remain visible</strong><p>In the current database setup, posts marked public can still be viewed when a profile is private. Avoid sharing sensitive content publicly. Full private-post enforcement needs an additional security-policy update.</p></div><div class="settings-note"><strong>Search engine visibility</strong><p>Google indexing is not enabled for this account yet. Flexoverse plans to make public profile indexing available to eligible verified accounts and subscribed business profiles. Search engines decide when and whether to list a page.</p><span class="pending-pill">Not available yet</span></div><div class="settings-note settings-note-soft"><strong>Blocking</strong><p>Blocked accounts cannot start a conversation with you. You can review your list at any time.</p><a class="text-link" href="/settings/blocked/">Manage blocked accounts ${settingsIcon}</a></div>`)
  }else if(key==='content'){
    content=settingPanel('Sharing on Flexoverse','Posts and reels are shared from their own pages.',`<div class="settings-feature-row"><span class="settings-feature-icon">${sidebarContentIcon('post')}</span><span><strong>Write a post</strong><small>Share an update or photo with the community.</small></span><a class="button button-soft" href="/create/">Create post</a></div><div class="settings-feature-row"><span class="settings-feature-icon">${sidebarContentIcon('reel')}</span><span><strong>Publish a reel</strong><small>Upload a short video to the public reels feed.</small></span><a class="button button-soft" href="/reels/create/">Create reel</a></div><div class="settings-note"><strong>Who can see your content?</strong><p>Public posts and reels can be viewed by anyone. Your profile visibility controls profile discovery. Audience controls for individual posts are not available yet.</p><a class="text-link" href="/settings/privacy/">Review profile privacy ${settingsIcon}</a></div>`)
  }else if(key==='notifications'){
    const {data:preferences,error}=await supabase.from('notification_preferences').select('in_app_enabled,friend_requests,post_likes,post_comments').eq('user_id',session.user.id).maybeSingle()
    const browserSupported='Notification' in window
    const browserPermission=browserSupported?Notification.permission:'unsupported'
    const browserLabel=browserPermission==='granted'?'Allowed':browserPermission==='denied'?'Blocked in browser settings':browserPermission==='default'?'Not enabled':'Not supported by this browser'
    const browserButton=browserPermission==='default'?'<button class="button button-outline" id="enable-browser-notifications" type="button">Enable browser notifications</button>':browserPermission==='denied'?'<p class="settings-footnote">Change this site’s notification permission in your browser settings, then refresh this page.</p>':''
    const browserPanel=`<div class="settings-note browser-notification-settings"><div class="browser-notification-heading"><strong>Browser notifications</strong><span class="status-pill ${browserPermission==='granted'?'status-good':''}">${browserLabel}</span></div><p>Allow Flexoverse to request browser notification permission on this device. You can change this choice in your browser at any time.</p>${browserButton}<p class="settings-footnote">Permission is only one step. Background push delivery also requires a registered service worker and a valid push subscription.</p></div>`
    if(error){console.error('Could not load notification preferences:',error);content=settingPanel('Notifications','Manage browser permission and the activity recorded in your inbox.',browserPanel+`<div class="settings-empty"><strong>In-app preferences are unavailable</strong><p>Please refresh and try again.</p></div>`)}
    else{
      const p=preferences||{in_app_enabled:true,friend_requests:true,post_likes:true,post_comments:true}
      content=settingPanel('Notifications','Choose how Flexoverse can reach you.',browserPanel+`<div class="settings-divider"></div><h3 class="notification-settings-subheading">In-app activity</h3>${settingSwitch('notify-enabled','Show in-app notifications','Hide all activity from your inbox on Flexoverse.',p.in_app_enabled)}<div class="settings-divider"></div>${settingSwitch('notify-friends','Friend requests','Show sent and accepted friend request activity.',p.friend_requests)}${settingSwitch('notify-likes','Post likes','Show when someone likes one of your posts.',p.post_likes)}${settingSwitch('notify-comments','Post comments','Show when someone comments on one of your posts.',p.post_comments)}<p class="settings-footnote">These controls filter what appears in your inbox. Activity records generated by the current app may still be stored in Supabase.</p>`)
    }
  }else if(key==='blocked'){
    content=settingPanel('People you have blocked','You can unblock someone here. They may be able to interact with you again afterward.','<div id="blocked-account-list" class="blocked-account-list"><div class="feed-state">Loading blocked accounts…</div></div>')
  }else if(key==='security'){
    const verified=session.user.email_confirmed_at
    content=settingPanel('Sign-in details','Your account uses the email address below to sign in.',`<div class="settings-detail-row"><span><small>Email address</small><strong>${esc(session.user.email||'Not available')}</strong></span><span class="${verified?'status-pill status-good':'status-pill'}">${verified?'Verified':'Not verified'}</span></div><div class="settings-note"><strong>Password recovery</strong><p>Send a password reset link to your sign-in email.</p><button id="send-password-reset" class="button button-outline" type="button" ${session.user.email?'':'disabled'}>Send reset link</button></div><p class="settings-footnote">For your safety, use a unique password and do not share sign-in links.</p>`)
  }else if(key==='membership'){
    const plan=profile?.membership_plan==='plus'?'Flexoverse Plus':'Standard member'
    const active=profile?.membership_status==='active'
    const joined=profile?.created_at?new Intl.DateTimeFormat(undefined,{month:'long',year:'numeric'}).format(new Date(profile.created_at)):'Your account creation date'
    content=settingPanel('Your membership','Your current Flexoverse membership and account benefits.',`<div class="membership-status-card"><div class="membership-status-top"><span class="membership-plan-label">FLEXOVERSE MEMBERSHIP</span><span class="membership-state-pill ${active?'is-active':''}">${active?'Active':'Paused'}</span></div><h3>${plan}</h3><p>${active?'Your membership is active on this account.':'Your membership is currently paused.'}</p><div class="membership-status-meta"><span>Member since</span><strong>${esc(joined)}</strong></div></div><div class="settings-note"><strong>Flexoverse Plus</strong><p>Paid upgrades, billing and extra storage are not open yet. Your current membership remains available without a payment.</p><span class="pending-pill">Upgrades coming later</span></div><section class="settings-note" aria-labelledby="badge-roadmap-title"><strong id="badge-roadmap-title">Flexoverse badge roadmap</strong><p>We will introduce these badges one by one. This list is our feature checklist.</p><div class="badge-roadmap-grid"><div class="badge-roadmap-item badge-verified"><span class="badge-roadmap-icon"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></span><span class="badge-roadmap-copy"><b>Verified</b><p>For accounts reviewed and approved by Flexoverse.</p></span></div><div class="badge-roadmap-item badge-plus"><span class="badge-roadmap-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 2.8 8 4.6v9.2l-8 4.6-8-4.6V7.4l8-4.6Z"/><path d="M12 7v10M7 12h10"/></svg></span><span class="badge-roadmap-copy"><b>Plus Member</b><p>For users with an active Flexoverse Plus subscription.</p></span></div><div class="badge-roadmap-item badge-admin"><span class="badge-roadmap-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3 20 7v5c0 4.5-3.2 7.5-8 9-4.8-1.5-8-4.5-8-9V7l8-4Z"/><path d="m8.5 12 2.2 2.2 4.8-4.8"/></svg></span><span class="badge-roadmap-copy"><b>Admin</b><p>For authorised platform administrators.</p></span></div><div class="badge-roadmap-item badge-moderator"><span class="badge-roadmap-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m14.5 5.5 4 4M5 19l3.5-.7L19 7.8a2.1 2.1 0 0 0-3-3L5.5 15.3 5 19Z"/><path d="m12.5 7.5 4 4M4 21h16"/></svg></span><span class="badge-roadmap-copy"><b>Moderator</b><p>For trusted community moderators.</p></span></div><div class="badge-roadmap-item badge-founder"><span class="badge-roadmap-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m3 8 5 4 4-7 4 7 5-4-2 12H5L3 8Z"/><path d="M6 16h12"/></svg></span><span class="badge-roadmap-copy"><b>Founder</b><p>Reserved for the original Flexoverse founder.</p></span></div><div class="badge-roadmap-item badge-og"><span class="badge-roadmap-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 3c1.2 3-1 4.2 1.2 6.2 1.1-1.1 1.5-2 1.5-3.2 3 2.3 5 5 4 8.6A7 7 0 0 1 5.2 17C3.5 12.8 6.3 9.2 9 7c-.1 2.3.5 3.5 1.7 4.4C12 9.2 10.8 6.4 12 3Z"/><path d="M10 17.5c0-1.6 1-2.7 2.2-3.7 1.4 1.1 2.1 2.2 2.1 3.7a2.2 2.2 0 0 1-4.3 0Z"/></svg></span><span class="badge-roadmap-copy"><b>OG Member</b><p>For members who joined during the early days.</p></span></div><div class="badge-roadmap-item badge-creator"><span class="badge-roadmap-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="3" y="5" width="18" height="14" rx="3"/><circle cx="12" cy="12" r="3.5"/><path d="M7 5V3m10 2V3"/></svg></span><span class="badge-roadmap-copy"><b>Creator</b><p>For recognised content creators.</p></span></div><div class="badge-roadmap-item badge-top"><span class="badge-roadmap-icon"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z"/><path d="m9.5 12 1.7 1.7 3.5-3.5"/></svg></span><span class="badge-roadmap-copy"><b>Top Contributor</b><p>For members who make valuable community contributions.</p></span></div></div><p style="margin-top:12px">Implementation plan: build and release each badge individually. Verified, Admin, Moderator and Founder badges will be assigned only through authorised Flexoverse controls, never self-selected by users.</p></section><p class="settings-footnote">Membership status is managed by Flexoverse. Payment or subscription status is never inferred from a profile badge.</p>`)
  }else if(key==='verification'){
    const {data:requestRows,error:requestError}=await supabase.rpc('get_my_verification_request')
    const latestRequest=Array.isArray(requestRows)?requestRows[0]||null:null
    if(profile?.is_verified){
      content=settingPanel('Verified profile','Your identity has been reviewed by Flexoverse.',`<div class="verification-status-card verification-approved"><span class="profile-verified-badge"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8 14.8 4l3-.2.9 2.9 2.3 1.9-1.1 2.8.5 3-2.7 1.3-1.4 2.7-3-.5-2.8 1.1-1.9-2.3-2.9-.9.2-3L3 12l1.1-2.8-.5-3 2.7-1.3 1.4-2.7 3 .5L12 2.8Z"/><path d="m8.5 12.2 2.2 2.2 4.8-5"/></svg>Verified</span><h3>Your profile is verified</h3><p>The verified badge appears on your public Flexoverse profile.</p></div>`)
    }else if(requestError){
      console.error('Could not load verification status:',requestError)
      content=settingPanel('Profile verification','Verification applications are reviewed by the Flexoverse team.',`<div class="settings-note settings-note-warning"><strong>Verification status could not load</strong><p>Please refresh the page and try again. No badge is granted until your identity is reviewed.</p></div>`)
    }else if(latestRequest?.status==='pending'){
      content=settingPanel('Verification request received','Your request is waiting for a review by Flexoverse.',`<div class="verification-status-card verification-pending"><span class="pending-pill">Under review</span><h3>We have received your request</h3><p>We will review the information you submitted. The verified badge will only appear after approval.</p><div class="membership-status-meta"><span>Submitted</span><strong>${esc(new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(latestRequest.requested_at)))}</strong></div></div>`)
    }else{
      const rejected=latestRequest?.status==='rejected'
      content=settingPanel('Request a verified badge','Apply for a blue verified badge. Flexoverse reviews requests manually, and submitting a request does not guarantee approval.',`${rejected?'<div class="settings-note settings-note-warning"><strong>Your previous request was not approved</strong><p>You may submit a new request with updated information.</p></div>':''}<form id="verification-request-form" class="settings-form verification-form"><label class="form-label">Full legal or public name<input name="full_name" maxlength="100" required autocomplete="name" value="${esc(latestRequest?.full_name||profile?.full_name||'')}" placeholder="Name people know you by"></label><label class="form-label">Public links (optional)<textarea name="public_links" rows="3" maxlength="1000" placeholder="Website, public social profiles, news or work links">${esc(latestRequest?.public_links||'')}</textarea><small>Share links that help us confirm your identity.</small></label><label class="form-label">Why should this account be verified?<textarea name="reason" rows="4" minlength="20" maxlength="800" required placeholder="Tell us about your public identity or work (20–800 characters)"></textarea></label><div class="settings-form-actions"><button class="button button-primary" type="submit">Submit for review</button></div></form><p class="settings-footnote">Do not submit passwords, one-time codes or bank details. Verification is free to request at this stage.</p>`)
    }
  }else if(key==='business'){
    const {data:details}=await supabase.from('private_profile_details').select('account_type,business_name,business_category,business_description,business_phone,business_website,business_hours').eq('user_id',session.user.id).maybeSingle()
    content=settingPanel('Business information','Add or update your organization details. These fields are saved privately for now; public business pages and listings will be introduced separately.',`<form id="business-profile-form" class="settings-form"><label class="form-label">Business account status<select name="account_type"><option value="personal" ${details?.account_type!=='business'?'selected':''}>Personal account</option><option value="business" ${details?.account_type==='business'?'selected':''}>Business account</option></select></label><label class="form-label">Business or organization name<input name="business_name" maxlength="120" value="${esc(details?.business_name||'')}" placeholder="Business name"></label><label class="form-label">Business category<select name="business_category"><option value="">Choose a category</option>${['Retail & Shopping','Food & Restaurant','Beauty & Wellness','Education','Technology','Professional Services','Health','Arts & Entertainment','Travel & Hospitality','Agriculture','Non-profit & Community','Other'].map(v=>`<option ${details?.business_category===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="form-label">Business description<textarea name="business_description" maxlength="600" rows="4">${esc(details?.business_description||'')}</textarea></label><label class="form-label">Business phone<input name="business_phone" type="tel" maxlength="30" value="${esc(details?.business_phone||'')}"></label><label class="form-label">Website<input name="business_website" type="url" maxlength="200" value="${esc(details?.business_website||'')}" placeholder="https://example.com"></label><label class="form-label">Opening hours<textarea name="business_hours" maxlength="500" rows="3">${esc(details?.business_hours||'')}</textarea></label><div class="settings-form-actions"><button class="button button-primary" type="submit">Save business details</button></div></form>`)
  }else if(key==='appearance'){
    const theme=localStorage.getItem('flexoverse-theme')||'system'
    content=settingPanel('Theme','This preference is saved on this device.',`<div class="theme-options" role="radiogroup" aria-label="Color theme">${[['light','Light','A bright, clear interface'],['dark','Dark','A darker interface for low light'],['system','Use device setting','Follow your device appearance']].map(([value,label,desc])=>`<label class="theme-option ${theme===value?'selected':''}"><input type="radio" name="theme" value="${value}" ${theme===value?'checked':''}><span class="theme-preview theme-${value}" aria-hidden="true"></span><span><strong>${label}</strong><small>${desc}</small></span></label>`).join('')}</div>`)
  }else if(key==='accessibility'){
    const size=localStorage.getItem('flexoverse-text-size')||'standard'
    const reduced=localStorage.getItem('flexoverse-reduce-motion')==='true'
    content=settingPanel('Reading comfort','These preferences are saved on this device.',`<label class="form-label">Text size<select id="text-size" class="settings-select"><option value="standard" ${size==='standard'?'selected':''}>Standard</option><option value="large" ${size==='large'?'selected':''}>Large</option><option value="larger" ${size==='larger'?'selected':''}>Extra large</option></select></label>${settingSwitch('reduce-motion','Reduce motion','Limit non-essential movement and transitions.',reduced)}<p class="settings-footnote">Your device’s own reduced-motion preference is also respected.</p>`)
  }else if(key==='account'){
    content=settingPanel('Your Flexoverse account','Manage your current sign-in session.',`<div class="settings-detail-row"><span><small>Signed in as</small><strong>${esc(session.user.email||myUsername())}</strong></span></div><div class="settings-note"><strong>Sign out</strong><p>This signs out this browser on this device.</p><button id="settings-signout" class="button button-outline" type="button">Sign out</button></div><div class="settings-note settings-note-warning"><strong>Account deletion</strong><p>Self-serve account deletion is not available yet. Add the Flexoverse privacy contact email before offering requests through this page.</p></div>`)
  }
  root.innerHTML=`<header class="settings-section-heading"><div><p class="overline">SETTINGS</p><h1>${meta.title}</h1><p class="muted">${meta.description}</p></div></header><div class="settings-content">${content}</div>`
  if(key==='profile'){const preview=root.querySelector('#profile-avatar-preview');if(preview)preview.innerHTML=avatar(initials(myName()),'blue',profile?.avatar_url);const profileForm=root.querySelector('#profile-form');initInternationalPhone(profileForm?.querySelector('[name="phone"]'));bindGoogleAddressAutocomplete(profileForm?.querySelector('[data-google-address]'));loadLocationChoices(profileForm,privateDetails||{}).then(()=>setupProfileInlineEditing(profileForm))}
  if(key==='blocked')await loadBlockedAccounts(root)
}

function sidebarContentIcon(kind){return kind==='post'?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="m10 8 6 4-6 4z"/></svg>'}

const guidePages={
  'getting-started':{title:'Getting started',intro:'Set up your account, meet people, and find your way around Flexoverse.',steps:['Create an account with your email, a password, and an available username.','Complete your profile with your name and a short bio.','Use Friends to send or respond to requests.','Share a post or explore the public Reels feed.'],links:[['Edit your profile','/settings/profile/'],['Explore friends','/friends/']]},
  profile:{title:'Your profile',intro:'Your profile contains your name, username, bio, and the posts you have shared.',steps:['Open Settings → Profile information to update your details.','Your public profile URL uses /profile/view/?username=yourname.','An address or general location is optional and is stored privately for your account.','Use Privacy & discovery to choose public or friend visibility.'],links:[['Profile settings','/settings/profile/'],['Privacy settings','/settings/privacy/']]},
  posts:{title:'Posts and photos',intro:'Write an update or add a photo from the dedicated post page.',steps:['Choose Create post from Home or Settings → Content & audience.','Write your message and attach a photo if the option is available.','Review your text and share it.','Public posts can be seen by anyone; individual audience controls are not available yet.'],links:[['Create a post','/create/'],['Content settings','/settings/content/']]},
  friends:{title:'Friends and requests',intro:'Friend requests help you connect with people you know.',steps:['Search for a person by username in the top search field.','Open Friends to send a request or respond to one you received.','Accepted friends can access friend-only profile content.','Use Blocked accounts in Settings to manage people you blocked.'],links:[['Open Friends','/friends/'],['Blocked accounts','/settings/blocked/']]},
  chats:{title:'Chats',intro:'Direct chats are available to signed-in friends.',steps:['Open Chats and choose a conversation or start one with an accepted friend.','Messages are stored in Flexoverse’s Supabase database.','Only members of that conversation can access its messages through the app.','Avoid sending highly sensitive information in chat.'],links:[['Open Chats','/chats/'],['Privacy settings','/settings/privacy/']]},
  reels:{title:'Reels',intro:'Reels are short videos shared with the public feed.',steps:['Open Reels and choose Create reel.','Select a video that meets the file limits shown on the upload page.','Add a caption and publish when ready.','The current app stores reel videos in private Supabase Storage and uses signed links for playback.'],links:[['Explore Reels','/reels/'],['Create a reel','/reels/create/']]},
  privacy:{title:'Privacy and blocking',intro:'Use the privacy controls to choose profile visibility and manage blocks.',steps:['A public profile can be viewed by anyone.','A private profile is intended to be visible to you and accepted friends.','Blocking helps prevent a person from starting a conversation with you.','Search engine indexing is not currently available for this account.'],links:[['Privacy settings','/settings/privacy/'],['Blocked accounts','/settings/blocked/']]},
  membership:{title:'Membership and verification',intro:'Paid subscriptions, storage upgrades, and verification applications have not launched yet.',steps:['You will see plan features and prices before any subscription is offered.','Verification will require a review; purchasing a plan will not automatically grant a badge.','Any Google discovery option for eligible verified profiles or subscribed businesses will be explained before launch.'],links:[['Membership settings','/settings/membership/'],['Verification settings','/settings/verification/']]}
}

function renderInfoPage(){
  const root=document.querySelector('#info-content')
  if(!root)return
  const article=(title,eyebrow,updated,body)=>`<article class="info-article card"><p class="overline">${eyebrow}</p><h1>${title}</h1><p class="info-updated">Last updated: October 31, 2026</p>${updated?`<div class="draft-banner"><strong>Draft for review</strong><span>Complete the privacy contact email and review this page before launch.</span></div>`:''}<div class="info-body">${body}</div><a class="settings-back-link" href="/settings/">Back to Settings</a></article>`
  if(page==='privacy'){
    document.title='Privacy Policy · Flexoverse'
    root.innerHTML=article('Privacy Policy','YOUR PRIVACY',true,`<p>This draft describes how Flexoverse handles information in the current app. It is intended as a product explanation and needs legal review before launch.</p><h2>Information we handle</h2><ul><li><strong>Account information:</strong> email address for sign-in, username, display name, profile bio, avatar, and profile visibility.</li><li><strong>Private profile details:</strong> an optional address or general location entered during profile setup. It is stored separately from public profile data and is only available to the signed-in account that entered it.</li><li><strong>Content:</strong> posts, photos, comments, likes, and reels you choose to share.</li><li><strong>Messages:</strong> message text and conversation membership for direct chats.</li><li><strong>Activity:</strong> friend requests and accepted requests, likes, comments, notification read status, and timestamps.</li><li><strong>Technical information:</strong> the app and its infrastructure may process information needed to authenticate requests, store content, and protect service reliability. The exact logs and retention periods need to be documented before launch.</li></ul><h2>How the app uses information</h2><p>Flexoverse uses account information to sign you in, display your profile, connect you with friends, show content, deliver notifications, and operate chats and reels. Data is stored in the Supabase project used by this app. Reels are stored in a private storage bucket and are delivered using temporary signed playback URLs.</p><h2>Who can see your information</h2><p>Public profiles and public posts are intended to be viewable by anyone. Private profile details such as your address are stored separately and are available only to your signed-in account. Private profiles are intended for you and accepted friends, but a post marked public may remain viewable when its author’s profile is private. Direct chat messages are available to conversation participants in the app. Flexoverse staff or infrastructure providers may process information when needed to operate, secure, or support the service. Public content can be copied or captured by people who can view it.</p><h2>Your choices</h2><p>You can edit profile information and your private address in Settings, change profile visibility, block accounts, and adjust which activity appears in your notification inbox. The current notification preferences filter the inbox display; activity notifications may still be stored. Some features described as upcoming—such as paid plans, verification applications, and search-engine indexing—are not active yet.</p><h2>Retention and account closure</h2><p>The current app does not include self-serve account deletion or a published retention schedule. Before launch, Flexoverse should define deletion workflows, backup retention, and how to submit data-rights requests.</p><h2>Privacy rights and contact</h2><p>Depending on where you live, data-protection laws may give you rights over your personal information. In Nigeria, the <a href="https://ndpc.gov.ng/download/nigeria-data-protection-act-2023" target="_blank" rel="noopener noreferrer">Nigeria Data Protection Act 2023</a> establishes a framework for protecting personal data and data-subject rights; see also the <a href="https://ndpc.gov.ng/faqs/" target="_blank" rel="noopener noreferrer">NDPC FAQs</a>. Contact: <strong>[Add a privacy contact email before launch]</strong>.</p><p>We will update this policy when the service or its data practices change. Read the <a href="/terms/">Terms &amp; Policies</a> and the <a href="/help/">Help Center</a>.</p>`)
  }else if(page==='terms'){
    document.title='Terms & Policies · Flexoverse'
    root.innerHTML=article('Terms & Policies','COMMUNITY GUIDELINES',true,`<p>This draft explains the basic expectations for using Flexoverse. Have it reviewed and complete the operator and contact details before launch.</p><h2>Using Flexoverse</h2><p>Use an account you control and provide a username that follows the on-screen rules. Keep your sign-in details private. You are responsible for activity on your account and for the content you choose to share.</p><h2>Content and permissions</h2><p>You retain rights to content you create. When you post or upload content, you give Flexoverse permission to store, process, and display it as needed to operate the features you choose, such as showing a post in a feed or playing a reel. Share only content you have the right to use.</p><h2>Respect and safety</h2><p>Do not use Flexoverse to threaten, harass, impersonate, violate another person’s rights, distribute unlawful content, or interfere with the service. Do not attempt to access another person’s account or private conversations. Use blocking and reporting tools where available.</p><h2>Visibility and messages</h2><p>Public posts and reels may be viewed beyond your friend circle. Private profile settings are intended to limit profile access to accepted friends. Direct chats are intended for conversation participants, but the service does not promise end-to-end encryption. Do not use chat for information that requires that protection.</p><h2>Plans and verification</h2><p>Paid subscriptions, storage upgrades, and verification applications are not currently active. Flexoverse will present pricing, benefits, eligibility, and cancellation terms before offering paid plans. A subscription will not itself guarantee verification.</p><h2>Availability and changes</h2><p>Features may change as the service develops. Flexoverse may restrict or suspend accounts for serious misuse, subject to applicable law and any process provided by the service. These draft terms do not replace rights you have under applicable law.</p><h2>Contact</h2><p>Contact: <strong>[Add a Flexoverse contact email before launch]</strong>.</p>`)
  }else if(page==='how-it-works'){
    document.title='How Flexoverse works · Flexoverse'
    root.innerHTML=`<header class="info-hero"><p class="overline">A QUICK TOUR</p><h1>How Flexoverse works</h1><p>Share updates, connect with friends, and keep conversations in one place.</p></header><div class="info-card-grid">${[['01','Build your profile','Choose a username, add a name and bio, then set your profile visibility.','/settings/profile/'],['02','Find your circle','Search for people and send friend requests. Accepted friends can start chats.','/friends/'],['03','Share updates','Write a post or upload a short reel. Public posts and reels can be seen beyond your friends.','/create/'],['04','Chat privately','Messages are available to the people in that conversation. Messages are stored in Supabase; the app does not currently provide end-to-end encryption.','/chats/'],['05','Stay in control','Adjust notifications, change privacy, block accounts, or sign out through Settings.','/settings/']].map(([n,t,d,u])=>`<a class="info-step card" href="${u}"><span>${n}</span><div><h2>${t}</h2><p>${d}</p></div>${settingsIcon}</a>`).join('')}</div><p class="info-footnote">Paid membership, verification applications, storage upgrades, and Google indexing are planned features and are not active in this version.</p>`
  }else if(page==='help'){
    document.title='Help Center · Flexoverse'
    root.innerHTML=`<header class="info-hero"><p class="overline">FLEXOVERSE HELP</p><h1>What can we help you with?</h1><p>Short guides to help you get started and manage your account.</p></header><div class="help-guide-grid">${Object.entries(guidePages).map(([slug,guide])=>`<a class="help-guide-card card" href="/help/guides/${slug}/"><span class="guide-icon">${sidebarContentIcon(slug==='reels'?'reel':'post')}</span><span><strong>${guide.title}</strong><small>${guide.intro}</small></span>${settingsIcon}</a>`).join('')}</div><section class="help-contact card"><strong>Still need help?</strong><p>Flexoverse’s support contact has not been set yet. The operator should add a contact email before launch.</p></section>`
  }else if(page==='help-guide'){
    const guide=guidePages[document.body.dataset.guide]
    if(!guide){root.innerHTML='<div class="settings-empty card"><strong>Guide not found</strong><p>Choose a guide from the Help Center.</p><a class="text-link" href="/help/">Open Help Center</a></div>';return}
    document.title=`${guide.title} · Help Center · Flexoverse`
    root.innerHTML=`<article class="info-article card"><a class="settings-back-link" href="/help/">← Help Center</a><p class="overline">HELP CENTER</p><h1>${guide.title}</h1><p class="info-lede">${guide.intro}</p><ol class="guide-steps">${guide.steps.map(step=>`<li>${step}</li>`).join('')}</ol><div class="guide-related"><h2>Related pages</h2>${guide.links.map(([label,url])=>`<a class="settings-item" href="${url}"><strong>${label}</strong>${settingsIcon}</a>`).join('')}</div></article>`
  }
}


function initInternationalPhone(input){
  if(!input||input.dataset.phoneBound==='true'||!window.intlTelInput)return
  input.dataset.phoneBound='true'
  input._iti=window.intlTelInput(input,{initialCountry:'ng',separateDialCode:true,nationalMode:true,autoPlaceholder:'polite',formatOnDisplay:true,allowDropdown:true,loadUtils:()=>import('https://cdn.jsdelivr.net/npm/intl-tel-input@25.3.1/build/js/utils.js')})
}
function readInternationalPhone(input){
  if(!input||!input.value.trim())return ''
  if(input._iti){
    if(typeof input._iti.isValidNumber==='function'&&!input._iti.isValidNumber())return ''
    return input._iti.getNumber()||''
  }
  return input.value.trim()
}

function setupProfileInlineEditing(form){
  if(!form||form.dataset.inlineEditingReady==='true')return
  form.dataset.inlineEditingReady='true'
  const reveal=(name)=>{
    const control=form.querySelector('[name="'+name+'"]')
    const label=control?.closest('.form-label')
    const row=label?.querySelector('.profile-field-value-row')
    const wrap=control?.matches('[data-google-address]')?control.closest('.google-address-wrap'):(control?.closest('.input-with-prefix')||control?.closest('.iti')||control)
    if(row)row.hidden=true
    if(wrap)wrap.hidden=false
    label?.classList.add('profile-field-editing')
  }
  form.querySelectorAll('.form-label').forEach(label=>{
    const control=label.querySelector('input:not([type="hidden"]),select,textarea')
    if(!control)return
    const wrap=control.matches('[data-google-address]')?control.closest('.google-address-wrap'):(control.closest('.input-with-prefix')||control.closest('.iti')||control)
    if(!wrap)return
    const valueText=()=>{
      if(control.tagName==='SELECT')return control.selectedOptions?.[0]?.textContent?.trim()||'Not added yet'
      if(control.type==='date'&&control.value){const date=new Date(control.value+'T00:00:00');return Number.isNaN(date.getTime())?control.value:new Intl.DateTimeFormat(undefined,{day:'numeric',month:'long',year:'numeric'}).format(date)}
      if(control.matches('[name="phone"]')&&control._iti?.getNumber)return control._iti.getNumber()||'Not added yet'
      return control.value?.trim()||'Not added yet'
    }
    const row=document.createElement('div');row.className='profile-field-value-row'
    const summary=document.createElement('span');summary.className='profile-field-value';summary.textContent=valueText()
    const edit=document.createElement('button');edit.type='button';edit.className='profile-field-edit';edit.textContent=control.value?'Edit':'Add'
    edit.setAttribute('aria-label',(control.value?'Edit ':'Add ')+(label.childNodes[0]?.textContent?.trim()||'profile detail'))
    row.append(summary,edit);wrap.hidden=true;wrap.classList.add('profile-field-control');wrap.insertAdjacentElement('afterend',row)
    edit.addEventListener('click',()=>{
      const name=control.name
      if(name==='country'){reveal('country');reveal('state');reveal('lga')}
      else if(name==='state'){reveal('state');reveal('lga')}
      else reveal(name)
      control.focus?.()
    })
    control.addEventListener('change',()=>{summary.textContent=valueText();edit.textContent='Edit'})
    control.addEventListener('input',()=>{summary.textContent=valueText();edit.textContent='Edit'})
  })
}
async function loadLocationChoices(root,saved={}){
  const country=root?.querySelector('[name="country"]'),state=root?.querySelector('[name="state"]'),lga=root?.querySelector('[name="lga"]')
  if(!country||!state||!lga)return
  const endpoint='https://countriesnow.space/api/v0.1'
  const fill=(select,items,placeholder,selected='')=>{
    select.innerHTML='<option value="">'+esc(placeholder)+'</option>'+items.map(item=>'<option value="'+esc(item)+'"'+(item===selected?' selected':'')+'>'+esc(item)+'</option>').join('')
  }
  country.disabled=true;country.innerHTML='<option value="">Loading countries…</option>'
  try{
    const response=await fetch(endpoint+'/countries/positions'),payload=await response.json()
    if(!response.ok||payload.error)throw new Error('Country list unavailable')
    const countries=(payload.data||[]).map(item=>item.name).filter(Boolean).sort((a,b)=>a.localeCompare(b))
    fill(country,countries,'Select a country',saved.country||'');country.disabled=false
  }catch(error){country.innerHTML='<option value="">Countries could not load — refresh to retry</option>';console.warn(error);return}
  const loadAreas=async(countryName,stateName,selected='')=>{
    lga.disabled=true;fill(lga,[],'Loading local areas…')
    if(!stateName){fill(lga,[],'Select a state first');return}
    try{
      const response=countryName==='Nigeria'?await fetch('https://nga-states-lga.onrender.com/?state='+encodeURIComponent(stateName)):await fetch(endpoint+'/countries/state/cities',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({country:countryName,state:stateName})})
      const payload=await response.json()
      if(!response.ok||(countryName!=='Nigeria'&&payload.error))throw new Error('Local area list unavailable')
      const areas=(countryName==='Nigeria'?payload:(payload.data||[])).map(item=>typeof item==='string'?item:item.name).filter(Boolean).sort((a,b)=>a.localeCompare(b))
      fill(lga,areas,countryName==='Nigeria'?'Select an LGA / area':'Select a local area / district',selected);lga.disabled=false
    }catch(error){fill(lga,[],'Local areas could not load');console.warn(error)}
  }
  const loadStates=async(countryName,selectedState='',selectedLga='')=>{
    state.disabled=true;lga.disabled=true;fill(state,[],'Loading states / regions…');fill(lga,[],'Select a state first')
    if(!countryName){fill(state,[],'Select a country first');return}
    try{
      const response=await fetch(endpoint+'/countries/states',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({country:countryName})}),payload=await response.json()
      if(!response.ok||payload.error)throw new Error('State list unavailable')
      const states=(payload.data?.states||[]).map(item=>typeof item==='string'?item:item.name).filter(Boolean).sort((a,b)=>a.localeCompare(b))
      fill(state,states,'Select a state / region',selectedState);state.disabled=false
      if(selectedState&&states.includes(selectedState))await loadAreas(countryName,selectedState,selectedLga)
    }catch(error){fill(state,[],'States could not load');console.warn(error)}
  }
  country.addEventListener('change',()=>loadStates(country.value))
  state.addEventListener('change',()=>loadAreas(country.value,state.value))
  if(country.value)await loadStates(country.value,saved.state||'',saved.lga||'')
}

function bindGoogleAddressAutocomplete(input){
  if(!input||input.dataset.googleBound==='true')return
  input.dataset.googleBound='true'
  const wrap=input.closest('[data-google-address-wrap]'),list=wrap?.querySelector('[data-google-suggestions]'),status=wrap?.querySelector('[data-google-address-status]'),placeField=wrap?.querySelector('[name="address_place_id"]')
  let timer=null,request=0
  input.addEventListener('input',()=>{
    if(placeField)placeField.value=''
    const query=input.value.trim(),sequence=++request
    if(timer)clearTimeout(timer)
    if(query.length<3){if(list){list.hidden=true;list.innerHTML=''}if(status)status.textContent='Enter at least 3 characters to search for an address.';return}
    if(status)status.textContent='Checking address suggestions…'
    timer=setTimeout(async()=>{
      let result
      try{result=await supabase.functions.invoke('google-places',{body:{action:'autocomplete',input:query}})}
      catch(error){if(sequence===request&&status)status.textContent='Address suggestions are temporarily unavailable. You can still enter your address manually.';if(list)list.hidden=true;return}
      const {data,error}=result
      if(sequence!==request)return
      if(error||data?.error){if(status)status.textContent='Address suggestions are temporarily unavailable. You can still enter your address manually.';if(list)list.hidden=true;return}
      const suggestions=data?.suggestions||[]
      if(list){list.innerHTML=suggestions.map(item=>`<button type="button" class="google-address-suggestion" data-place-id="${esc(item.placeId)}"><strong>${esc(item.mainText||item.description)}</strong><small>${esc(item.secondaryText||'')}</small></button>`).join('');list.hidden=!suggestions.length}
      if(status)status.textContent=suggestions.length?'Choose a matching address suggestion.':'No matching addresses found.'
    },300)
  })
  list?.addEventListener('click',async event=>{
    const button=event.target.closest('[data-place-id]')
    if(!button)return
    const placeId=button.dataset.placeId
    if(status)status.textContent='Verifying selected address…'
    list.hidden=true
    let result
    try{result=await supabase.functions.invoke('google-places',{body:{action:'details',placeId}})}
    catch(error){if(status)status.textContent='Address verification is temporarily unavailable. You can still enter your address manually.';return}
    const {data,error}=result
    if(error||data?.error){if(status)status.textContent='Address verification is temporarily unavailable. You can still enter your address manually.';return}
    input.value=data.place?.address||input.value
    if(placeField)placeField.value=data.place?.placeId||placeId
    if(status)status.textContent='Address verified and selected.'
  })
  document.addEventListener('click',event=>{if(!wrap?.contains(event.target)&&list)list.hidden=true})
}

async function loadProfileCompletion(){
  const form=document.querySelector('#complete-profile-form')
  const guest=document.querySelector('#profile-completion-guest')
  const content=document.querySelector('#profile-completion-content')
  if(!form)return
  if(!session){if(content)content.hidden=true;if(guest)guest.hidden=false;return}
  const {data:row,error}=await supabase.from('profiles').select('id,username,full_name,bio').eq('id',session.user.id).maybeSingle()
  if(error){toast('Your profile could not load. Please refresh and try again.','error');return}
  const {data:details,error:detailsError}=await supabase.from('private_profile_details').select('address,account_type,date_of_birth,gender,phone,city,hometown,country,state,lga,business_name,business_category,business_description,business_phone,business_website,business_hours,address_place_id').eq('user_id',session.user.id).maybeSingle()
  if(detailsError)console.warn('Could not load private profile details:',detailsError.message)
  const set=(name,value)=>{const field=form.querySelector(`[name="${name}"]`);if(field&&value!=null)field.value=value}
  set('full_name',row?.full_name||session.user.user_metadata?.full_name||'')
  set('email',session.user.email||'')
  set('username',row?.username||session.user.user_metadata?.username||'')
  set('bio',row?.bio||'')
  ;['address','date_of_birth','gender','phone','city','hometown','business_name','business_category','business_description','business_phone','business_website','business_hours','address_place_id'].forEach(name=>set(name,details?.[name]||''))
  const accountType=details?.account_type||''
  const radio=accountType?form.querySelector(`[name="account_type"][value="${accountType}"]`):null
  if(radio)radio.checked=true
  const reveal=()=>{
    const selected=form.querySelector('[name="account_type"]:checked')?.value
    const detailsPanel=document.querySelector('#onboarding-details'),businessPanel=document.querySelector('#business-onboarding-section')
    if(detailsPanel)detailsPanel.hidden=!selected
    if(businessPanel)businessPanel.hidden=selected!=='business'
    ;['business_name','business_category'].forEach(name=>{const field=form.querySelector(`[name="${name}"]`);if(field)field.required=selected==='business'})
    form.querySelectorAll('.onboarding-account-option').forEach(option=>option.classList.toggle('selected',option.querySelector('input')?.checked))
  }
  form.querySelectorAll('[name="account_type"]').forEach(input=>input.addEventListener('change',reveal))
  reveal()
  bindGoogleAddressAutocomplete(form.querySelector('[data-google-address]'))
  initInternationalPhone(form.querySelector('[name="phone"]'))
  await loadLocationChoices(form,details||{})
}

function bindProfileCompletionEvents(){
  const form=document.querySelector('#complete-profile-form')
  if(!form)return
  const skip=form.querySelector('#skip-profile-setup')
  skip?.addEventListener('click',async()=>{
    if(!session){location.href='/login/';return}
    skip.disabled=true
    skip.textContent='Skipping…'
    try{
      const {error}=await supabase.auth.updateUser({data:{profile_completed:true,profile_setup_skipped:true}})
      if(error)throw error
      location.replace(authReturnPath())
    }catch(error){
      skip.disabled=false
      skip.textContent='Skip for now'
      toast(error?.message||'Could not skip profile setup. Please try again.','error')
    }
  })
  form.querySelector('[name="username"]')?.addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'')})
  form.addEventListener('submit',async e=>{
    e.preventDefault()
    if(!session){location.href='/login/?next=%2Fcomplete-profile%2F';return}
    const fields=new FormData(form)
    const value=name=>String(fields.get(name)||'').trim()
    const fullName=value('full_name'),username=value('username').toLowerCase(),bio=value('bio'),address=value('address'),phone=readInternationalPhone(form.querySelector('[name="phone"]'))
    const accountType=value('account_type')
    if(!['personal','business'].includes(accountType))return toast('Choose a personal or business account to continue.','error')
    if(!/^[a-z0-9]{3,30}$/.test(username))return toast('Use 3–30 lowercase letters or numbers for your username.','error')
    if(!value('date_of_birth'))return toast('Please enter your date of birth.','error')
    if(!value('gender'))return toast('Please choose a gender option.','error')
    if(!phone)return toast('Enter a valid phone number and choose its country code.','error')
    if(!value('country')||!value('state'))return toast('Choose your country and state / region.','error')
    if(accountType==='business'&&(!value('business_name')||!value('business_category')))return toast('Enter your business name and category.','error')
    if(value('business_website')&&!/^https?:\/\//i.test(value('business_website')))return toast('Enter your business website starting with https://','error')
    const save=form.querySelector('[type="submit"]')
    save.disabled=true;save.textContent='Saving your details…'
    const privateDetails={
      user_id:session.user.id,address,account_type:accountType,date_of_birth:value('date_of_birth'),gender:value('gender'),
      phone,city:value('city')||null,hometown:value('hometown')||null,country:value('country'),state:value('state'),lga:value('lga')||null,
      business_name:accountType==='business'?value('business_name'):null,
      business_category:accountType==='business'?value('business_category'):null,
      business_description:accountType==='business'?value('business_description'):null,
      business_phone:accountType==='business'?value('business_phone'):null,
      business_website:accountType==='business'?value('business_website'):null,
      business_hours:accountType==='business'?value('business_hours'):null,
      address_place_id:value('address_place_id')||null,updated_at:new Date().toISOString()
    }
    try{
    const {error:addressError}=await supabase.from('private_profile_details').upsert(privateDetails,{onConflict:'user_id'})
    if(addressError){save.disabled=false;save.textContent='Save and continue';toast(addressError.message,'error');return}
    const {data:updated,error}=await supabase.from('profiles').update({full_name:fullName,username,bio,account_type:accountType}).eq('id',session.user.id).select('id,username,full_name,bio,avatar_url,is_public,account_type').single()
    if(error){save.disabled=false;save.textContent='Save and continue';toast(error.code==='23505'?'That username is taken. Try another one.':error.message,'error');return}
    const {error:authError}=await supabase.auth.updateUser({data:{full_name:fullName,username,profile_completed:true,account_type:accountType}})
    if(authError){save.disabled=false;save.textContent='Save and continue';toast('Your details were saved, but setup could not finish. Please try again.','error');return}
    profile=updated;location.replace(authReturnPath())
    }catch(error){
      save.disabled=false;save.textContent='Save and continue'
      toast(error?.message||'Your details could not be saved. Please try again.','error')
    }
  })

}

function ownAvatarStoragePath(url,userId){
  if(!url)return ''
  try{
    const pathname=new URL(url,location.origin).pathname
    const marker='/storage/v1/object/public/avatars/'
    const start=pathname.indexOf(marker)
    if(start<0)return ''
    const path=decodeURIComponent(pathname.slice(start+marker.length))
    return path.startsWith(`${userId}/`)?path:''
  }catch{return ''}
}

async function saveProfilePhoto(file){
  if(!file||!session)return
  const input=document.querySelector('#profile-photo-input')
  const mimeToExtension={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','image/avif':'avif'}
  const extensionToMime={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',webp:'image/webp',avif:'image/avif'}
  const extension=String(file.name||'').split('.').pop()?.toLowerCase()
  const mime=file.type||extensionToMime[extension]
  if(!mimeToExtension[mime]||extensionToMime[extension]&&extensionToMime[extension]!==mime){if(input)input.value='';toast('Choose a JPG, PNG, WebP, or AVIF image.','error');return}
  if(file.size>5*1024*1024){if(input)input.value='';toast('Choose an image smaller than 5 MB.','error');return}
  const button=document.querySelector('#profile-photo-button')
  const status=document.querySelector('#profile-photo-status')
  const oldPath=ownAvatarStoragePath(profile?.avatar_url,session.user.id)
  if(button){button.disabled=true;button.textContent='Uploading…'}
  if(status)status.textContent='Uploading your profile photo…'
  const path=`${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2,10)}.${mimeToExtension[mime]}`
  const storage=supabase.storage.from('avatars')
  try{
    const {data:stored,error:uploadError}=await storage.upload(path,file,{cacheControl:'3600',upsert:false,contentType:mime})
    if(uploadError)throw uploadError
    const {data:{publicUrl}}=storage.getPublicUrl(stored.path)
    const {data,error:profileError}=await supabase.from('profiles').update({avatar_url:publicUrl}).eq('id',session.user.id).select('id,username,full_name,bio,avatar_url,is_public,search_index_enabled').single()
    if(profileError){await storage.remove([stored.path]);throw profileError}
    profile=data
    const preview=document.querySelector('#profile-avatar-preview')
    if(preview)preview.innerHTML=avatar(initials(myName()),'blue',profile.avatar_url)
    if(oldPath&&oldPath!==stored.path){const {error:removeError}=await storage.remove([oldPath]);if(removeError)console.warn('Could not remove the previous profile photo:',removeError.message)}
    mountShell()
    if(status)status.textContent='Your photo is saved and appears on your profile, posts, and chats.'
    toast('Profile photo updated.','success')
  }catch(error){
    console.error('Could not save profile photo:',error)
    if(status)status.textContent='The photo could not be saved. Please try again.'
    toast(error.message||'The photo could not be saved. Please try again.','error')
  }finally{
    if(button){button.disabled=false;button.textContent=profile?.avatar_url?'Change photo':'Add photo'}
    if(input)input.value=''
  }
}

function bindSettingsEvents(){
  document.querySelector('#verification-request-form')?.addEventListener('submit',async e=>{
    e.preventDefault()
    if(!session)return openAuth()
    const form=e.currentTarget,fields=new FormData(form),button=form.querySelector('[type="submit"]')
    const fullName=String(fields.get('full_name')||'').trim()
    const publicLinks=String(fields.get('public_links')||'').trim()
    const reason=String(fields.get('reason')||'').trim()
    if(fullName.length<2||fullName.length>100)return toast('Enter a name between 2 and 100 characters.','error')
    if(reason.length<20||reason.length>800)return toast('Please explain your request in 20–800 characters.','error')
    button.disabled=true;button.textContent='Submitting…'
    const {error}=await supabase.rpc('submit_verification_request',{p_full_name:fullName,p_public_links:publicLinks,p_reason:reason})
    if(error){button.disabled=false;button.textContent='Submit for review';return toast(error.message.includes('already have a verification request')?'Your request is already under review.':error.message,'error')}
    toast('Your verification request has been submitted.','success')
    await renderSettingsSection()
  })
  document.querySelector('#enable-browser-notifications')?.addEventListener('click',async e=>{
    const button=e.currentTarget
    if(!('Notification' in window)){toast('This browser does not support notifications.','error');return}
    button.disabled=true;button.textContent='Requesting permission…'
    try{
      const permission=await Notification.requestPermission()
      if(permission==='granted')toast('Browser notification permission is now allowed on this device.','success')
      else if(permission==='denied')toast('Notifications are blocked. Change the site permission in your browser settings.','error')
      else toast('Notification permission was not changed.')
      await renderSettingsSection()
    }catch(error){button.disabled=false;button.textContent='Enable browser notifications';toast(error.message||'Could not request notification permission.','error')}
  })
  document.querySelector('#profile-form')?.addEventListener('submit',async e=>{
    e.preventDefault()
    if(!session)return openAuth()
    const form=e.currentTarget,fields=new FormData(form),username=String(fields.get('username')||'').trim().toLowerCase(),fullName=String(fields.get('full_name')||'').trim(),bio=String(fields.get('bio')||'').trim(),button=form.querySelector('[type="submit"]'),phone=readInternationalPhone(form.querySelector('[name="phone"]'))
    if(!/^[a-z0-9]{3,30}$/.test(username))return toast('Use 3–30 lowercase letters or numbers for your username.','error');if(!phone)return toast('Enter a valid phone number and choose its country code.','error');if(!fields.get('country')||!fields.get('state'))return toast('Choose your country and state / region.','error')
    button.disabled=true;button.textContent='Saving…'
    const {data,error}=await supabase.from('profiles').update({username,full_name:fullName,bio,account_type:String(fields.get('account_type')||'personal')}).eq('id',session.user.id).select('id,username,full_name,bio,avatar_url,is_public,search_index_enabled,account_type').single()
    if(error){button.disabled=false;button.textContent='Save changes';return toast(error.code==='23505'?'That username is taken. Try another one.':error.message,'error')}
    const detail={user_id:session.user.id,address:String(fields.get('address')||'').trim(),account_type:String(fields.get('account_type')||'personal'),date_of_birth:fields.get('date_of_birth')||null,gender:fields.get('gender')||null,phone,city:fields.get('city')||null,hometown:fields.get('hometown')||null,country:fields.get('country')||null,state:fields.get('state')||null,lga:fields.get('lga')||null,address_place_id:fields.get('address_place_id')||null,updated_at:new Date().toISOString()}
    const {error:detailError}=await supabase.from('private_profile_details').upsert(detail,{onConflict:'user_id'})
    button.disabled=false;button.textContent='Save changes'
    if(detailError)return toast(detailError.code==='23505'?'That phone number is already linked to another account. Use a different number.':`Profile saved, but private details could not be saved: ${detailError.message}`,'error')
    profile=data;await supabase.auth.updateUser({data:{username,full_name:fullName,account_type:detail.account_type}});await renderSettingsSection();mountShell();toast('Profile details saved.','success')
  })
  document.querySelector('#business-profile-form')?.addEventListener('submit',async e=>{
    e.preventDefault()
    if(!session)return openAuth()
    const form=e.currentTarget,fields=new FormData(form),button=form.querySelector('[type="submit"]'),accountType=String(fields.get('account_type')||'personal'),name=String(fields.get('business_name')||'').trim(),category=String(fields.get('business_category')||'').trim(),website=String(fields.get('business_website')||'').trim()
    if(accountType==='business'&&(!name||!category))return toast('Enter your business name and category.','error')
    if(website&&!/^https?:\/\//i.test(website))return toast('Enter a website starting with https://','error')
    button.disabled=true;button.textContent='Saving…'
    const {error}=await supabase.from('private_profile_details').upsert({user_id:session.user.id,account_type:accountType,business_name:name||null,business_category:category||null,business_description:String(fields.get('business_description')||'').trim()||null,business_phone:String(fields.get('business_phone')||'').trim()||null,business_website:website||null,business_hours:String(fields.get('business_hours')||'').trim()||null,updated_at:new Date().toISOString()},{onConflict:'user_id'})
    button.disabled=false;button.textContent='Save business details'
    if(error)return toast(error.message,'error')
    const {error:accountError}=await supabase.from('profiles').update({account_type:accountType}).eq('id',session.user.id)
    if(accountError)return toast('Business details saved, but account type could not be updated: '+accountError.message,'error')
    await supabase.auth.updateUser({data:{account_type:accountType}})
    toast('Business information saved.','success')
  })
  document.querySelector('#profile-photo-button')?.addEventListener('click',()=>document.querySelector('#profile-photo-input')?.click())
  document.querySelector('#profile-photo-input')?.addEventListener('change',e=>saveProfilePhoto(e.currentTarget.files?.[0]))
  document.querySelector('#username-field')?.addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'');const link=document.querySelector('#profile-link');if(link)link.textContent=`/${e.target.value}`})
  document.querySelector('#public-profile')?.addEventListener('change',async e=>{
    e.target.disabled=true
    const {data,error}=await supabase.from('profiles').update({is_public:e.target.checked}).eq('id',session.user.id).select('id,username,full_name,bio,avatar_url,is_public,search_index_enabled').single()
    e.target.disabled=false
    if(error){e.target.checked=!e.target.checked;toast(error.message,'error');return}
    profile=data;toast(e.target.checked?'Your profile is public.':'Your profile is private.','success')
  })
  document.querySelector('#settings-content')?.addEventListener('change',async e=>{
    const input=e.target
    if(input.matches('#notify-enabled,#notify-friends,#notify-likes,#notify-comments')){
      if(!session)return openAuth()
      const fields={in_app_enabled:document.querySelector('#notify-enabled')?.checked??true,friend_requests:document.querySelector('#notify-friends')?.checked??true,post_likes:document.querySelector('#notify-likes')?.checked??true,post_comments:document.querySelector('#notify-comments')?.checked??true}
      document.querySelectorAll('#notify-enabled,#notify-friends,#notify-likes,#notify-comments').forEach(control=>control.disabled=true)
      const {error}=await supabase.from('notification_preferences').upsert({user_id:session.user.id,...fields},{onConflict:'user_id'})
      document.querySelectorAll('#notify-enabled,#notify-friends,#notify-likes,#notify-comments').forEach(control=>control.disabled=false)
      if(error){toast(error.message,'error');return}
      notificationDisplayPreferences=fields
      if(page==='notifications')renderNotifications()
      await loadNotificationCount()
      toast('Notification display preferences saved.','success')
    }
    if(input.matches('input[name="theme"]')){localStorage.setItem('flexoverse-theme',input.value);applySavedPreferences();document.querySelectorAll('.theme-option').forEach(option=>option.classList.toggle('selected',option.querySelector('input')===input))}
    if(input.matches('#text-size')){localStorage.setItem('flexoverse-text-size',input.value);applySavedPreferences()}
    if(input.matches('#reduce-motion')){localStorage.setItem('flexoverse-reduce-motion',String(input.checked));applySavedPreferences()}
  })
  document.querySelector('#blocked-account-list')?.addEventListener('click',async e=>{const button=e.target.closest('[data-unblock]');if(!button)return;button.disabled=true;const {error}=await supabase.from('user_blocks').delete().eq('blocker_id',session.user.id).eq('blocked_id',button.dataset.unblock);if(error){button.disabled=false;toast(error.message,'error');return}button.closest('[data-blocked-row]')?.remove();if(!document.querySelector('[data-blocked-row]'))document.querySelector('#blocked-account-list').innerHTML='<div class="settings-empty"><strong>No blocked accounts</strong><p>Accounts you block will appear here.</p></div>';toast('Account unblocked.','success')})
  document.querySelector('#send-password-reset')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;const {error}=await supabase.auth.resetPasswordForEmail(session.user.email,{redirectTo:`${location.origin}/settings/security/`});e.currentTarget.disabled=false;if(error)return toast(error.message,'error');toast('Password reset link sent.','success')})
  document.querySelector('#settings-signout')?.addEventListener('click',async e=>{e.currentTarget.disabled=true;const {error}=await supabase.auth.signOut();if(error){e.currentTarget.disabled=false;toast(error.message,'error')}})
}

function showNotificationPermissionPrompt(userId){
  if(!userId||!('Notification' in window)||Notification.permission!=='default')return
  const key=`flexoverse-notification-prompt-dismissed:${userId}`
  try{if(localStorage.getItem(key)==='1')return}catch{}
  const root=document.querySelector('#modal-root')
  if(!root||document.querySelector('#notification-permission-prompt'))return
  root.insertAdjacentHTML('beforeend',`<div class="notification-permission-backdrop" id="notification-permission-prompt"><section class="notification-permission-card" role="dialog" aria-modal="true" aria-labelledby="notification-permission-title"><span class="notification-permission-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg></span><p class="overline">STAY IN THE LOOP</p><h2 id="notification-permission-title">Turn on notifications?</h2><p>Get browser alerts for new activity from Flexoverse. You can change this permission any time in your browser settings.</p><button class="button button-primary" id="notification-permission-allow" type="button">Enable notifications</button><button class="notification-permission-later" id="notification-permission-later" type="button">Not now</button></section></div>`)
  const dismiss=()=>{try{localStorage.setItem(key,'1')}catch{};document.querySelector('#notification-permission-prompt')?.remove()}
  document.querySelector('#notification-permission-later')?.addEventListener('click',dismiss)
  document.querySelector('#notification-permission-allow')?.addEventListener('click',async e=>{
    const button=e.currentTarget
    button.disabled=true;button.textContent='Requesting permission…'
    try{
      const permission=await Notification.requestPermission()
      if(permission==='granted')toast('Browser notification permission is allowed on this device.','success')
      else if(permission==='denied')toast('Notifications are blocked. You can change this in browser settings.','error')
      else toast('Notification permission was not changed.')
      dismiss()
    }catch(error){button.disabled=false;button.textContent='Enable notifications';toast(error.message||'Could not request notification permission.','error')}
  })
}

async function initialize() {
  applySavedPreferences()
  mountShell()
  const {data}=await supabase.auth.getSession();session=data.session
  if(session){const {data:row}=await supabase.from('profiles').select('id,username,full_name,bio,avatar_url,is_public,created_at,membership_plan,membership_status,is_verified,verified_at').eq('id',session.user.id).maybeSingle();profile=row}
  const needsGoogleProfile=session?.user?.app_metadata?.provider==='google'&&session.user.user_metadata?.profile_completed!==true
  if(session&&(page==='login'||page==='signup')){const destination=authReturnPath();location.replace(session.user.user_metadata?.profile_completed===false||needsGoogleProfile?`/complete-profile/?next=${encodeURIComponent(destination)}`:destination);return}
  if(session&&(session.user.user_metadata?.profile_completed===false||needsGoogleProfile)&&page!=='complete-profile'){const destination=authReturnPath();location.replace(`/complete-profile/?next=${encodeURIComponent(destination)}`);return}
  const signupLink=document.querySelector('#switch-to-signup');if(signupLink)signupLink.href=authPageHref('signup')
  const loginLink=document.querySelector('#switch-to-login');if(loginLink)loginLink.href=authPageHref('login')
  mountShell()
  bindHeaderNotificationDropdown()
  // Bind interactions before remote data loads so the page remains responsive.
  bindEvents()
  const composerAvatar=document.querySelector('[data-user-avatar]');if(composerAvatar)composerAvatar.outerHTML=avatar(session?initials(myName()):'FX','blue',profile?.avatar_url)
  // Load the active page before optional notification queries; chat inbox must never wait on notification counts.
  if(page==='chats')await loadChats()
  if(page==='home'){await Promise.all([loadHome(),loadHomeReels()])}
  if(page==='friends')await loadFriends()
  if(page==='notifications')await loadNotifications()
  if(session){loadNotificationPreferences().then(()=>loadNotificationCount()).catch(error=>console.warn('Notification preferences unavailable:',error));subscribeToNotificationUpdates();showNotificationPermissionPrompt(session.user.id)}
  if(page==='reels')await loadReels()
  if(page==='my-content')await loadMyContent()
  if(page==='profile')await loadProfilePage()
  if(page==='reel-create')prepareReelComposer()
  if(page==='create'){const name=document.querySelector('#post-author-name');if(name)name.textContent=myName();const handle=document.querySelector('#post-author-handle');if(handle)handle.textContent='@'+myUsername();const photo=document.querySelector('#post-author-avatar');if(photo)photo.outerHTML=avatar(initials(myName()),'blue',profile?.avatar_url);prepareUnifiedComposer()}
  if(page==='complete-profile')await loadProfileCompletion()
  if(page.startsWith('settings-'))await renderSettingsSection()
  if(['privacy','terms','how-it-works','help','help-guide'].includes(page))renderInfoPage()
  bindSettingsEvents()
  bindProfileCompletionEvents()
  supabase.auth.onAuthStateChange((event,next)=>{session=next;if(event==='SIGNED_OUT')location.reload()})
}

function bindEvents() {
  document.querySelector('#signup-username')?.addEventListener('input',async e=>{const value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'');e.target.value=value;const hint=document.querySelector('#username-hint');if(!/^[a-z0-9]{3,30}$/.test(value)){hint.textContent='Use 3–30 letters or numbers.';return}hint.textContent='Checking availability…';const {data,error}=await supabase.from('profiles').select('username').eq('username',value).maybeSingle();hint.textContent=error?'Could not check yet.':data?'Taken — try adding a number.':'Available ✓'})
  document.querySelectorAll('[data-google-auth]').forEach(button=>button.addEventListener('click',async()=>{const destination=authReturnPath();button.disabled=true;button.classList.add('is-loading');const {error}=await supabase.auth.signInWithOAuth({provider:'google',options:{redirectTo:`${location.origin}/?next=${encodeURIComponent(destination)}`,queryParams:{prompt:'select_account'}}});if(error){button.disabled=false;button.classList.remove('is-loading');toast(error.message,'error')}}))
  document.querySelector('#login-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const {data,error}=await supabase.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(error)return toast(error.message,'error');const destination=authReturnPath();location.replace(data.user?.user_metadata?.profile_completed===false?`/complete-profile/?next=${encodeURIComponent(destination)}`:destination)})
  document.querySelector('#signup-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const username=String(f.get('username')||'').toLowerCase();if(!/^[a-z0-9]{3,30}$/.test(username))return toast('Use 3–30 letters or numbers for your username.','error');const submit=e.currentTarget.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Creating account…';const {data,error}=await supabase.auth.signUp({email:f.get('email'),password:f.get('password'),options:{emailRedirectTo:`${location.origin}/complete-profile/`,data:{full_name:f.get('name'),username,profile_completed:false}}});if(error){submit.disabled=false;submit.textContent='Create account and continue';return toast(error.message,'error')}if(data.session){location.replace(`/complete-profile/?next=${encodeURIComponent(authReturnPath())}`);return}const message=document.querySelector('#signup-message');if(message)message.textContent='Account created. Open the confirmation email to continue to profile setup. If asked to sign in, sign in with this email; you can skip the optional details.';submit.disabled=false;submit.textContent='Create account and continue'})
  document.querySelector('#signout')?.addEventListener('click',()=>supabase.auth.signOut())
  document.querySelector('#post-form')?.addEventListener('submit',async e=>{
    e.preventDefault()
    if(!session){openAuth();return}
    const form=e.currentTarget
    const values=new FormData(form)
    const submit=form.querySelector('[type="submit"]')
    if(values.get('format')==='video'){
      const file=document.querySelector('#create-video-file')?.files?.[0]
      if(!file)return toast('Choose a video before sharing.','error')
      if(!['video/mp4','video/webm','video/quicktime'].includes(file.type)||file.size>50*1024*1024)return toast('Choose an MP4, WebM or MOV video up to 50 MB.','error')
      submit.disabled=true;submit.textContent='Uploading…'
      const progress=document.querySelector('#create-upload-progress'),bar=document.querySelector('#create-progress-bar'),label=document.querySelector('#create-progress-label')
      progress.hidden=false
      const extension=({'video/mp4':'mp4','video/webm':'webm','video/quicktime':'mov'})[file.type]
      const path=`${session.user.id}/${crypto.randomUUID()}.${extension}`
      let uploaded=false
      try{
        const {Upload}=await loadTusClient()
        const {data:{session:authSession}}=await supabase.auth.getSession()
        if(!authSession?.access_token)throw new Error('Your sign-in session expired. Sign in again to upload.')
        await new Promise((resolve,reject)=>{
          const upload=new Upload(file,{endpoint:'https://gkgjfbusdyiohiztwuec.storage.supabase.co/storage/v1/upload/resumable',retryDelays:[0,3000,5000,10000,20000],headers:{authorization:`Bearer ${authSession.access_token}`,'x-upsert':'false'},uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,chunkSize:6*1024*1024,metadata:{bucketName:'reels',objectName:path,contentType:file.type,cacheControl:'3600'},onError:reject,onProgress(bytesUploaded,bytesTotal){const percent=Math.round(bytesUploaded/bytesTotal*100);bar.style.width=`${percent}%`;label.textContent=`Uploading video · ${percent}%`},onSuccess:resolve})
          upload.start()
        })
        uploaded=true;label.textContent='Publishing your video…'
        const category=String(values.get('category')||'Entertainment')
        const caption=String(values.get('caption')||'').trim()
        const taggedCaption=caption?`[${category}] ${caption}`:`[${category}]`
        const {error}=await supabase.from('reels').insert({user_id:session.user.id,caption:taggedCaption,video_path:path,is_public:true})
        if(error)throw error
        toast('Your video was shared.','success');location.replace('/reels/')
      }catch(error){
        console.error(error);if(uploaded)await supabase.storage.from('reels').remove([path])
        toast(error.message||'The video could not be uploaded. Try again.','error')
        submit.disabled=false;submit.textContent='Share post'
      }
      return
    }
    const content=String(values.get('content')||'').trim()
    if(!content)return toast('Write something before sharing.','error')
    submit.disabled=true;submit.textContent='Sharing…'
    const {error}=await supabase.from('posts').insert({user_id:session.user.id,content})
    if(error){submit.disabled=false;submit.textContent='Share post';return toast(error.message,'error')}
    toast('Your post was shared.','success');form.reset()
    if(page==='create')setTimeout(()=>location.href='/',700)
    else{submit.disabled=false;submit.textContent='Share post';await loadHome()}
  })
  document.addEventListener('submit',async e=>{
    const form=e.target.closest('[data-report-form]');if(!form)return;e.preventDefault();if(!session)return openAuth()
    const submit=form.querySelector('[type="submit"]');submit.disabled=true;submit.textContent='Submitting…';const values=new FormData(form)
    const {error}=await supabase.from('post_reports').insert({post_id:form.dataset.reportForm,reporter_id:session.user.id,reason:values.get('reason'),details:String(values.get('details')||'').trim()||null})
    if(error){submit.disabled=false;submit.textContent='Submit report';toast(error.code==='23505'?'You have already reported this post.':error.message,'error');return}
    document.querySelector('#modal-root').innerHTML='';toast('Thanks. Your report has been submitted for review.','success')
  })
  document.querySelector('#post-content')?.addEventListener('input',e=>{const count=document.querySelector('#post-count');if(count)count.textContent=`${e.target.value.length} / 2000`})
  document.addEventListener('click',async e=>{
    if(e.target.closest('[data-retry-feed]'))return loadHome()
    const menuToggle=e.target.closest('[data-post-menu-toggle]')
    if(menuToggle){
      const post=menuToggle.closest('.post'),menu=post?.querySelector('[data-post-menu]'),opening=menu?.hidden
      document.querySelectorAll('[data-post-menu]').forEach(item=>item.hidden=true)
      document.querySelectorAll('[data-post-menu-toggle]').forEach(item=>item.setAttribute('aria-expanded','false'))
      if(menu){menu.hidden=!opening;menuToggle.setAttribute('aria-expanded',String(!!opening))}
      return
    }
    if(!e.target.closest('.post-menu-wrap')){document.querySelectorAll('[data-post-menu]').forEach(item=>item.hidden=true);document.querySelectorAll('[data-post-menu-toggle]').forEach(item=>item.setAttribute('aria-expanded','false'))}
    const savePost=e.target.closest('[data-save-post]')
    if(savePost){if(!session)return openAuth();const postId=savePost.dataset.savePost;const {error}=await supabase.from('saved_posts').insert({post_id:postId,user_id:session.user.id});if(error?.code==='23505'){toast('Post is already saved.');return}if(error){toast(error.message,'error');return}savePost.textContent='Saved';toast('Post saved.','success');return}
    const copyPost=e.target.closest('[data-copy-post]')
    if(copyPost){const url=location.origin+'/#post-'+copyPost.dataset.copyPost;try{await navigator.clipboard.writeText(url);toast('Post link copied.','success')}catch{toast('Could not copy the link.','error')}return}
    const reportPost=e.target.closest('[data-report-post]')
    if(reportPost){if(!session)return openAuth();const postId=reportPost.dataset.reportPost;const root=document.querySelector('#modal-root');root.innerHTML='<div class="report-modal-backdrop" data-close-report><form class="report-modal" data-report-form="'+esc(postId)+'" role="dialog" aria-modal="true" aria-label="Report post"><button type="button" class="report-close" data-close-report aria-label="Close">×</button><h2>Report post</h2><p>Tell us why this post should be reviewed.</p><label for="post-report-reason">Reason</label><select id="post-report-reason" name="reason" required><option value="">Choose a reason</option><option>Spam</option><option>Harassment or bullying</option><option>Hate speech</option><option>Violence or dangerous content</option><option>Nudity or sexual content</option><option>Scam or fraud</option><option>Other</option></select><label for="post-report-details">Additional details (optional)</label><textarea id="post-report-details" name="details" maxlength="1000" placeholder="Add details to help our team review…"></textarea><button class="button button-primary" type="submit">Submit report</button></form></div>';return}
    const deletePost=e.target.closest('[data-delete-post]')
    if(deletePost){if(!session)return openAuth();if(!confirm('Delete this post? This cannot be undone.'))return;const postId=deletePost.dataset.deletePost;const {error}=await supabase.from('posts').delete().eq('id',postId).eq('user_id',session.user.id);if(error){toast(error.message,'error');return}deletePost.closest('.post')?.remove();toast('Post deleted.','success');return}
    const likeButton=e.target.closest('[data-like]')
    if(likeButton){
      if(!session)return openAuth()
      const postId=likeButton.dataset.like
      const wasLiked=liked.has(postId)
      const nextLiked=!wasLiked
      const total=likeButton.closest('.post')?.querySelector('[data-like-count]')
      const previousCount=total?Number(total.dataset.count||0):0
      if(nextLiked)liked.add(postId);else liked.delete(postId)
      likeButton.classList.toggle('liked',nextLiked)
      likeButton.setAttribute('aria-pressed',String(nextLiked))
      likeButton.innerHTML=heartSvg(nextLiked)+' <span>'+(nextLiked?'Liked':'Like')+'</span>'
      if(total){const count=Math.max(0,previousCount+(nextLiked?1:-1));total.dataset.count=String(count);total.innerHTML=heartSvg(false)+' <span>'+count+' '+(count===1?'person':'people')+'</span>'}
      const result=nextLiked
        ?await supabase.from('likes').insert({post_id:postId,user_id:session.user.id})
        :await supabase.from('likes').delete().eq('post_id',postId).eq('user_id',session.user.id)
      if(result.error&&!(result.error.code==='23505'&&nextLiked)){
        if(wasLiked)liked.add(postId);else liked.delete(postId)
        likeButton.classList.toggle('liked',wasLiked)
        likeButton.setAttribute('aria-pressed',String(wasLiked))
        likeButton.innerHTML=heartSvg(wasLiked)+' <span>'+(wasLiked?'Liked':'Like')+'</span>'
        if(total){total.dataset.count=String(previousCount);total.innerHTML=heartSvg(false)+' <span>'+previousCount+' '+(previousCount===1?'person':'people')+'</span>'}
        toast(result.error.message,'error')
      }
      return
    }
    const commentButton=e.target.closest('[data-comment]')
    if(commentButton){openComments(commentButton.dataset.comment);return}
    const shareButton=e.target.closest('[data-share]')
    if(shareButton){
      const post=shareButton.closest('.post')
      const postUrl=`${location.origin}/#${post?.id||''}`
      try{await navigator.clipboard.writeText(postUrl);toast('Post link copied.','success')}catch{toast('Copy this post link from your browser address bar.')}
    }
  })
  document.querySelector('#modal-root')?.addEventListener('click',async e=>{
    if(e.target.matches('[data-close-comments],[data-close-report]')){document.querySelector('#modal-root').innerHTML='';document.body.classList.remove('comments-open');return}
    const like=e.target.closest('[data-like-comment]')
    if(like){
      if(!session){openAuth();return}
      const commentId=like.dataset.likeComment
      like.disabled=true
      const {data:existing,error:lookupError}=await supabase.from('comment_likes').select('id').eq('comment_id',commentId).eq('user_id',session.user.id).maybeSingle()
      if(lookupError){like.disabled=false;toast('Could not update comment like. Please try again.','error');return}
      const result=existing
        ?await supabase.from('comment_likes').delete().eq('id',existing.id)
        :await supabase.from('comment_likes').insert({comment_id:commentId,user_id:session.user.id})
      if(result.error){like.disabled=false;toast(result.error.message,'error');return}
      const postId=document.querySelector('[data-new-comment]')?.dataset.newComment
      if(postId)await loadComments(postId)
      return
    }
    const reply=e.target.closest('[data-reply-to]')
    if(reply){const form=reply.closest('.comment-content')?.querySelector('[data-reply-form]');if(form){form.hidden=!form.hidden;if(!form.hidden)form.querySelector('input')?.focus()}}
  })
  document.querySelector('#modal-root')?.addEventListener('submit',async e=>{
    const form=e.target.closest('[data-new-comment],[data-reply-form]')
    if(!form)return
    e.preventDefault()
    if(!session)return openAuth()
    const content=String(new FormData(form).get('content')||'').trim()
    if(!content)return
    const postId=document.querySelector('[data-new-comment]')?.dataset.newComment
    if(!postId)return
    const payload={post_id:postId,user_id:session.user.id,content}
    if(form.dataset.replyForm)payload.parent_comment_id=form.dataset.replyForm
    const submit=form.querySelector('[type="submit"]');if(submit)submit.disabled=true
    const {error}=await supabase.from('comments').insert(payload)
    if(submit)submit.disabled=false
    if(error){toast(error.message,'error');return}
    form.reset();if(form.dataset.replyForm)form.hidden=true
    await loadComments(postId)
    toast(form.dataset.replyForm?'Reply added.':'Comment added.','success')
  })

  document.querySelector('#suggestions-list')?.addEventListener('click',async e=>{const b=e.target.closest('[data-request]');if(!b||b.disabled)return;const old=b.innerHTML;b.disabled=true;b.innerHTML='<span>Sending…</span>';const sent=await sendFriendRequest(b.dataset.request);if(sent)await loadFriends();else{b.disabled=false;b.innerHTML=old}})
  document.querySelector('#requests-list')?.addEventListener('click',async e=>{const accept=e.target.closest('[data-accept]');const ignore=e.target.closest('[data-ignore]');if(accept){accept.disabled=true;const {error}=await supabase.from('friend_requests').update({status:'accepted'}).eq('id',accept.dataset.accept);if(error){accept.disabled=false;toast(error.message,'error')}else{await loadFriends();toast('You’re friends now.','success')}}if(ignore){ignore.disabled=true;const {error}=await supabase.from('friend_requests').delete().eq('id',ignore.dataset.ignore);if(error){ignore.disabled=false;toast(error.message,'error')}else{await loadFriends();toast('Request dismissed.','success')}}})
  document.querySelectorAll('[data-friends-filter]').forEach(input=>input.addEventListener('input',()=>{const list=document.querySelector(input.dataset.friendsFilter);if(!list)return;const query=input.value.trim().toLowerCase();let visible=0;list.querySelectorAll(input.dataset.filterItems).forEach(item=>{const matches=String(item.dataset.searchText||'').includes(query);item.hidden=!matches;if(matches)visible++});const empty=list.querySelector('[data-empty-results]');if(empty)empty.hidden=visible>0||!query}))
  document.querySelectorAll('[data-retry-friends]').forEach(button=>button.addEventListener('click',()=>loadFriends()))
  document.querySelector('#my-content-videos')?.addEventListener('click',e=>{const open=e.target.closest('[data-open-my-video]');if(open)openReelViewer(Number(open.dataset.openMyVideo))})
  document.querySelectorAll('[data-my-content-filter]').forEach(button=>button.addEventListener('click',()=>{const selected=button.dataset.myContentFilter;document.querySelectorAll('[data-my-content-filter]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active))});document.querySelectorAll('[data-my-content-type]').forEach(section=>{section.hidden=selected!=='all'&&section.dataset.myContentType!==selected})}))
  document.querySelector('#reels-list')?.addEventListener('click',async e=>{const retry=e.target.closest('[data-retry-reels]');if(retry)return loadReels();const like=e.target.closest('[data-feed-like]');if(like){await toggleReelLike(like.dataset.feedLike);return}const comments=e.target.closest('[data-feed-comments]');if(comments){const i=reelItems.findIndex(r=>r.id===comments.dataset.feedComments);if(i>=0){openReelViewer(i);const panel=document.querySelector('[data-reel-comments-panel]');if(panel){panel.hidden=false;panel.closest('.tiktok-viewer')?.classList.add('comments-open')}loadReelComments(comments.dataset.feedComments)}return}const share=e.target.closest('[data-share-reel]');if(share){shareReel(share.dataset.shareReel);return}const open=e.target.closest('[data-open-reel]');if(open)openReelViewer(Number(open.dataset.openReel))})
  const viewerRoot=document.querySelector('#reel-viewer-root')
  viewerRoot?.addEventListener('click',async e=>{const close=e.target.closest('[data-close-reel]');if(close){closeReelViewer();return}const step=e.target.closest('[data-reel-step]');if(step){stepReelViewer(Number(step.dataset.reelStep));return}const share=e.target.closest('[data-share-reel]');if(share){shareReel(share.dataset.shareReel);return}const like=e.target.closest('[data-viewer-like]');if(like){await toggleReelLike(like.dataset.viewerLike);return}const comments=e.target.closest('[data-viewer-comments]');if(comments){const panel=viewerRoot.querySelector('[data-reel-comments-panel]');if(panel){panel.hidden=false;panel.closest('.tiktok-viewer')?.classList.add('comments-open')}loadReelComments(comments.dataset.viewerComments);return}if(e.target.closest('[data-hide-reel-comments]')){const panel=viewerRoot.querySelector('[data-reel-comments-panel]');if(panel){panel.hidden=true;panel.closest('.tiktok-viewer')?.classList.remove('comments-open')}return}const reply=e.target.closest('[data-reel-reply]');if(reply){const f=reply.parentElement.querySelector('[data-reel-reply-form]');if(f){f.hidden=!f.hidden;f.querySelector('input')?.focus()}}})
  viewerRoot?.addEventListener('submit',async e=>{const reply=e.target.closest('[data-reel-reply-form]');if(reply){e.preventDefault();if(!session)return openAuth();const id=document.querySelector('[data-reel-comment-form]')?.dataset.reelCommentForm;const content=String(new FormData(reply).get('content')||'').trim();if(!id||!content)return;const {error}=await supabase.from('reel_comments').insert({reel_id:id,user_id:session.user.id,parent_comment_id:reply.dataset.reelReplyForm,content});if(error){toast(error.message,'error');return}await loadReelComments(id);return}const form=e.target.closest('[data-reel-comment-form]');if(!form)return;e.preventDefault();if(!session)return openAuth();const content=String(new FormData(form).get('content')||'').trim();if(!content)return;const button=form.querySelector('button');button.disabled=true;const {error}=await supabase.from('reel_comments').insert({reel_id:form.dataset.reelCommentForm,user_id:session.user.id,content});button.disabled=false;if(error){toast(error.message,'error');return}form.reset();await loadReelComments(form.dataset.reelCommentForm);const r=reelItems.find(x=>x.id===form.dataset.reelCommentForm);if(r)r.comment_count++;const c=viewerRoot.querySelector('[data-viewer-comments] small');if(c&&r)c.textContent=r.comment_count;toast('Comment added.','success')})
  let viewerTouchY=null
  viewerRoot?.addEventListener('touchstart',e=>{viewerTouchY=e.changedTouches[0]?.clientY??null},{passive:true})
  viewerRoot?.addEventListener('touchend',e=>{if(viewerTouchY===null)return;const delta=viewerTouchY-(e.changedTouches[0]?.clientY??viewerTouchY);viewerTouchY=null;if(Math.abs(delta)>70)stepReelViewer(delta>0?1:-1)},{passive:true})
  document.querySelectorAll('[data-profile-tab]').forEach(tab=>tab.addEventListener('click',()=>{const selected=tab.dataset.profileTab;document.querySelectorAll('[data-profile-tab]').forEach(item=>{const active=item===tab;item.classList.toggle('active',active);item.setAttribute('aria-selected',String(active))});document.querySelectorAll('.profile-panel').forEach(panel=>{panel.hidden=panel.id!==`profile-panel-${selected}`})}))
  bindChatPageEvents()
  bindNotificationPageEvents()
  document.querySelector('#global-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){const value=e.target.value.trim().replace(/^@/,'').toLowerCase();if(value)location.href=`${profileUrl(value)}`}})
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
  .catch(error=>{
    console.error(error)
    const feed=document.querySelector('#feed-list')
    if(feed)feed.innerHTML='<div class="feed-state card"><strong>The feed is unavailable</strong><span>Check your connection and refresh the page.</span></div>'
    if(page==='profile'){
      const content=document.querySelector('#profile-content')
      const state=document.querySelector('#profile-state')
      if(content)content.hidden=true
      if(state){state.hidden=false;state.innerHTML='<strong>We could not load this profile</strong><p>Please refresh the page. If the problem continues, try again in a moment.</p><a class="button button-outline" href="/">Back to home</a>'}
    }
    if(page.startsWith('settings-')){
      const root=document.querySelector('#settings-content')
      if(root)root.innerHTML='<section class="settings-connection-state card"><span class="settings-connection-icon" aria-hidden="true">!</span><p class="overline">SETTINGS UNAVAILABLE</p><h2>We could not load your settings</h2><p>Your saved profile information has not been changed. Check your connection and try again.</p><button class="button button-primary" type="button" data-settings-retry>Try again</button></section>'
      root?.querySelector('[data-settings-retry]')?.addEventListener('click',()=>location.reload())
    }
    toast(page.startsWith('settings-')?'Settings could not load. Your saved information is safe.':'Could not connect. Refresh and try again.','error')
  })
  .finally(()=>{
    const minimumTime=320
    const remaining=Math.max(0,minimumTime-(performance.now()-loaderStartedAt))
    setTimeout(()=>{appLoader.classList.add('is-hidden');setTimeout(()=>appLoader.remove(),240)},remaining)
  })

