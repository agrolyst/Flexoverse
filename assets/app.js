import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const supabase = createClient('https://gkgjfbusdyiohiztwuec.supabase.co', 'sb_publishable_Kmm1YLrnBwDKV_1xO2DjNw_e4SzSZly')
const page = document.body.dataset.page
const demoPosts = [
  { id: 'demo-1', name: 'Maya Chen', username: 'mayachen', initials: 'MC', color: 'peach', time: '18 min ago', content: 'Found this little corner of the city on my walk today. A reminder that slowing down is sometimes the whole point. 🌿', image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1200&q=85', likes: 28, comments: 6 },
  { id: 'demo-2', name: 'Jordan Lee', username: 'jordandoes', initials: 'JL', color: 'lavender', time: '1 hr ago', content: 'Sunday recipe experiment: crispy potatoes, a little lemon, and enough herbs to make the kitchen smell like summer. Sharing the recipe soon 🍋', likes: 14, comments: 3 },
  { id: 'demo-3', name: 'Amara Okafor', username: 'amarawrites', initials: 'AO', color: 'mint', time: '3 hrs ago', content: 'A small win: finally finished the book that has been living on my nightstand since April. What are you reading lately?', likes: 42, comments: 11 },
]
let session = null
let profile = null
let liked = new Set()
let acceptedFriends = []
let friendRequests = []
let profileRecord = null

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const initials = s => String(s || 'You').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase()
const myName = () => profile?.full_name || session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0] || 'Your profile'
const myUsername = () => profile?.username || session?.user?.user_metadata?.username || 'yourname'
const avatar = (name, color = 'blue', url = '') => url ? `<img class="avatar ${color}" src="${esc(url)}" alt="">` : `<span class="avatar avatar-${color}">${esc(name)}</span>`
const pageUrl = () => '/' + myUsername()
const toast = message => { const el = document.querySelector('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2500) }

function mountShell() {
  const navItems = [['home','⌂','Home','/'],['friends','♙','Friends','/friends/'],['reels','▶','Reels','/reels/'],['chats','▤','Chats','/chats/'],['notifications','♧','Notifications','/notifications/'],['settings','⚙','Settings','/settings/']]
  const shellLinks = navItems.map(([key,glyph,label,url]) => `<a class="${page===key?'active':''}" href="${url}"><span class="side-glyph">${glyph}</span>${label}${key==='friends'?'<span class="side-count" id="friend-count">0</span>':''}</a>`).join('')
  document.querySelector('#site-header').innerHTML = `<header class="site-header"><a class="wordmark" href="/"><span class="logo-mark">f</span><span>flexoverse</span></a><label class="header-search"><span>⌕</span><input id="global-search" placeholder="Search people" aria-label="Search people"></label><nav class="top-navigation">${navItems.slice(0,4).map(([key,glyph,label,url])=>`<a class="${page===key?'active':''}" href="${url}"><span class="nav-glyph">${glyph}</span>${label}</a>`).join('')}</nav><div class="header-actions"><a class="header-icon" href="/notifications/" aria-label="Notifications">♧<i class="ping"></i></a>${session?`<a class="user-control" href="${esc(pageUrl())}">${avatar(initials(myName()),'blue',profile?.avatar_url)}<span>${esc(myName())}</span></a><button class="header-icon" id="signout" aria-label="Sign out">↪</button>`:'<button class="login-link" data-open-auth>Sign in</button>'}</div></header>`
  document.querySelector('#left-sidebar').innerHTML = `<div class="mini-profile"><div class="mini-cover"></div><a href="${session?esc(pageUrl()):'/profile/'}" class="mini-profile-body">${avatar(initials(myName()),'blue',profile?.avatar_url)}<strong>${esc(myName())}</strong><span>@${esc(myUsername())}</span></a></div><nav class="side-menu"><span class="side-label">YOUR SPACE</span>${shellLinks}</nav><div class="side-footer">About · Privacy · Terms<br>© 2026 Flexoverse</div>`
  document.querySelector('#right-sidebar').innerHTML = `<section class="right-card card"><div class="right-title"><h3>People to know</h3><a href="/friends/">See all</a></div><p class="right-subtitle">A few people you may know</p>${[['Nia Williams','NW','mint'],['Ethan Brooks','EB','peach'],['Sofia Martinez','SM','lavender']].map(p=>`<div class="suggested-person">${avatar(p[1],p[2])}<span class="suggested-info"><strong>${p[0]}</strong><small>2 mutual friends</small></span><button class="add-person" data-toast="Find people in Friends">＋</button></div>`).join('')}</section><section class="right-card card"><div class="right-title"><h3>Coming up</h3><button data-toast="Events are coming soon">Calendar →</button></div><p class="right-subtitle">Things happening around your circle</p><div class="event-line"><span class="event-date"><strong>08</strong><small>NOV</small></span><span class="event-info"><strong>Saturday farmers market</strong><small>Riverside Park · 9:00 AM</small></span></div><div class="event-line"><span class="event-date"><strong>14</strong><small>NOV</small></span><span class="event-info"><strong>Friends book club</strong><small>Juniper Coffee · 6:30 PM</small></span></div></section><section class="right-prompt"><span>✦ A LITTLE PROMPT</span><p>What’s something small that made you smile this week?</p><button data-prompt>Answer this →</button></section>`
  document.querySelector('#mobile-nav').className = 'mobile-nav'
  document.querySelector('#mobile-nav').innerHTML = navItems.filter(([key])=>key!=='notifications').map(([key,glyph,label,url])=>`<a class="${page===key?'active':''}" href="${url}"><span>${glyph}</span><small>${label}</small></a>`).join('')
  document.querySelector('#modal-root').innerHTML = `<div class="modal-backdrop" id="auth-backdrop" hidden><section class="auth-modal"><button class="auth-close" data-close-modal aria-label="Close">×</button><span class="logo-mark">f</span><p class="overline">A PLACE FOR YOUR PEOPLE</p><h2 id="auth-title">Welcome to Flexoverse</h2><p>Sign in or create an account to join your circle.</p><form id="auth-form"><label id="name-wrap" hidden>Your name<input name="name" placeholder="Your name" autocomplete="name"></label><label id="username-wrap" hidden>Username<div class="input-with-prefix"><span>@</span><input name="username" id="signup-username" minlength="3" maxlength="30" pattern="[A-Za-z0-9]+" placeholder="yourname"></div><small id="username-hint">Letters and numbers only. Numbers are optional.</small></label><label>Email<input name="email" type="email" required placeholder="you@example.com" autocomplete="email"></label><label>Password<input name="password" type="password" required minlength="6" placeholder="At least 6 characters" autocomplete="current-password"></label><button class="button button-primary" id="auth-submit">Sign in</button></form><button class="auth-switch" id="auth-switch">New here? Create an account</button></section></div><div class="modal-backdrop" id="post-backdrop" hidden><section class="auth-modal post-modal"><button class="auth-close" data-close-modal aria-label="Close">×</button><p class="overline">SHARE WITH YOUR CIRCLE</p><h2>Create a post</h2><form id="post-form"><textarea name="content" required maxlength="2000" placeholder="What would you like to share?" style="min-height:140px;resize:vertical"></textarea><button type="button" class="button button-outline" data-toast="Photo uploads are the next step">＋ Add photo</button><button class="button button-primary">Share post</button></form></section></div>`
}

function postCard(p) {
  const user = p.profiles || {}
  const name = p.name || user.full_name || 'Flexoverse member'
  const handle = p.username || user.username || 'member'
  const image = p.image || p.image_path || user.avatar_url
  const id = esc(p.id)
  const count = Number(p.likes?.[0]?.count ?? p.likes ?? 0)
  return `<article class="post card"><div class="post-top">${avatar(p.initials||initials(name),p.color||'blue',p.avatar_url||user.avatar_url)}<div class="post-user"><a href="/${esc(handle)}"><strong>${esc(name)}</strong></a><small>@${esc(handle)} · ${esc(p.time||new Date(p.created_at||Date.now()).toLocaleDateString())}</small></div><button class="more-button" data-toast="More post options">···</button></div><p class="post-text">${esc(p.content)}</p>${image?`<img class="post-photo" src="${esc(image)}" alt="Post image">`:''}<div class="post-meta"><span>♡ ${count} people</span><span>${p.comments||0} comments</span></div><div class="post-actions"><button data-like="${id}">♡ <span>Like</span></button><button data-comment="${id}">▱ <span>Comment</span></button><button data-share>↗ <span>Share</span></button></div></article>`
}

async function loadHome() {
  if (!session) return
  const {data,error}=await supabase.from('posts').select('id,user_id,content,image_path,created_at,profiles(full_name,username,avatar_url),likes(count)').order('created_at',{ascending:false}).limit(30)
  if (error) return toast(error.message)
  document.querySelector('#feed-list').innerHTML=data.length?data.map(postCard).join():'<div class="empty-inline card">Your feed is ready. Add friends and share your first post.</div>'
}

async function loadFriends() {
  if(!session)return
  const {data,error}=await supabase.from('friend_requests').select('id,from_user_id,to_user_id,status,created_at').or(`from_user_id.eq.${session.user.id},to_user_id.eq.${session.user.id}`).order('created_at',{ascending:false})
  if(error)return toast(error.message)
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

function openAuth() { document.querySelector('#auth-backdrop').hidden=false }
function closeModal(e) { e.target.closest('.modal-backdrop').hidden=true }
async function sendFriendRequest(id) {
  if(!session)return openAuth()
  const {error}=await supabase.from('friend_requests').insert({from_user_id:session.user.id,to_user_id:id})
  toast(error?(error.code==='23505'?'A request already exists.':error.message):'Friend request sent.')
}

async function initialize() {
  mountShell()
  const {data}=await supabase.auth.getSession();session=data.session
  if(session){const {data:row}=await supabase.from('profiles').select('id,username,full_name,bio,avatar_url,is_public').eq('id',session.user.id).maybeSingle();profile=row}
  mountShell()
  if(page==='home')await loadHome()
  if(page==='friends')await loadFriends()
  if(page==='profile')await loadProfilePage()
  if(page==='settings'&&profile){document.querySelector('#full-name').value=profile.full_name||'';document.querySelector('#username-field').value=profile.username||'';document.querySelector('#bio-field').value=profile.bio||'';document.querySelector('#public-profile').checked=profile.is_public;document.querySelector('#profile-link').textContent=`/${profile.username}`}
  bindEvents()
  supabase.auth.onAuthStateChange((event,next)=>{session=next;if(event==='SIGNED_IN'||event==='SIGNED_OUT')location.reload()})
}

function bindEvents() {
  document.querySelectorAll('[data-open-auth]').forEach(b=>b.addEventListener('click',openAuth))
  document.querySelectorAll('[data-close-modal]').forEach(b=>b.addEventListener('click',closeModal))
  document.querySelectorAll('.modal-backdrop').forEach(b=>b.addEventListener('click',e=>{if(e.target===b)b.hidden=true}))
  document.querySelector('#auth-switch')?.addEventListener('click',e=>{const signup=e.currentTarget.dataset.signup!=='true';e.currentTarget.dataset.signup=signup;document.querySelector('#auth-title').textContent=signup?'Create your account':'Welcome to Flexoverse';document.querySelector('#auth-submit').textContent=signup?'Create account':'Sign in';document.querySelector('#name-wrap').hidden=!signup;document.querySelector('#username-wrap').hidden=!signup;document.querySelector('[name="name"]').required=signup;document.querySelector('#signup-username').required=signup})
  document.querySelector('#signup-username')?.addEventListener('input',async e=>{const value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'');e.target.value=value;const hint=document.querySelector('#username-hint');if(!/^[a-z0-9]{3,30}$/.test(value)){hint.textContent='Use 3–30 letters or numbers.';return}hint.textContent='Checking availability…';const {data,error}=await supabase.from('profiles').select('username').eq('username',value).maybeSingle();hint.textContent=error?'Could not check yet.':data?'Taken — try adding a number.':'Available ✓'})
  document.querySelector('#auth-form')?.addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const signup=document.querySelector('#auth-switch').dataset.signup==='true';const auth=signup?await supabase.auth.signUp({email:f.get('email'),password:f.get('password'),options:{data:{full_name:f.get('name'),username:String(f.get('username')).toLowerCase()}}}):await supabase.auth.signInWithPassword({email:f.get('email'),password:f.get('password')});if(auth.error)return toast(auth.error.message);toast(signup?'Check your email to confirm your account.':'Signed in.');document.querySelector('#auth-backdrop').hidden=true})
  document.querySelector('#signout')?.addEventListener('click',()=>supabase.auth.signOut())
  document.querySelectorAll('[data-open-composer]').forEach(b=>b.addEventListener('click',()=>session?document.querySelector('#post-backdrop').hidden=false:openAuth()))
  document.querySelector('#post-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!session)return openAuth();const content=new FormData(e.currentTarget).get('content').trim();if(!content)return;const {error}=await supabase.from('posts').insert({user_id:session.user.id,content});if(error)return toast(error.message);document.querySelector('#post-backdrop').hidden=true;toast('Your post was shared.');await loadHome()})
  document.querySelector('#feed-list')?.addEventListener('click',async e=>{const btn=e.target.closest('[data-like]');if(btn){if(!session)return openAuth();const {error}=await supabase.from('likes').insert({post_id:btn.dataset.like,user_id:session.user.id});if(error&&error.code!=='23505')toast(error.message);else{btn.classList.add('liked');toast('You liked this post.')}}if(e.target.closest('[data-comment]'))toast('Comments are coming next.');if(e.target.closest('[data-share]')){await navigator.clipboard?.writeText(location.href);toast('Link copied.')}})
  document.querySelector('#suggestions-list')?.addEventListener('click',e=>{const b=e.target.closest('[data-request]');if(b)sendFriendRequest(b.dataset.request)})
  document.querySelector('#requests-list')?.addEventListener('click',async e=>{const accept=e.target.closest('[data-accept]');const ignore=e.target.closest('[data-ignore]');if(accept){const {error}=await supabase.from('friend_requests').update({status:'accepted'}).eq('id',accept.dataset.accept);if(error)toast(error.message);else{await loadFriends();toast('You’re friends now.')}}if(ignore){await supabase.from('friend_requests').delete().eq('id',ignore.dataset.ignore);await loadFriends()}})
  document.querySelector('#profile-form')?.addEventListener('submit',async e=>{e.preventDefault();if(!session)return openAuth();const f=new FormData(e.currentTarget);const username=String(f.get('username')).trim().toLowerCase();if(!/^[a-z0-9]{3,30}$/.test(username))return toast('Use 3–30 letters or numbers for your username.');const {error}=await supabase.from('profiles').update({username,full_name:f.get('full_name'),bio:f.get('bio'),is_public:document.querySelector('#public-profile').checked}).eq('id',session.user.id);if(error)return toast(error.code==='23505'?'That username is taken. Try adding a number.':error.message);await supabase.auth.updateUser({data:{username}});toast('Profile saved.');document.querySelector('#profile-link').textContent=`/${username}`})
  document.querySelector('#username-field')?.addEventListener('input',e=>{e.target.value=e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'');document.querySelector('#profile-link').textContent=`/${e.target.value}`})
  document.querySelector('#message-form')?.addEventListener('submit',e=>{e.preventDefault();toast('Chat messages are being connected next.')})
  document.querySelector('#global-search')?.addEventListener('keydown',e=>{if(e.key==='Enter'){const value=e.target.value.trim().replace(/^@/,'').toLowerCase();if(value)location.href=`/${encodeURIComponent(value)}`}})
  document.querySelectorAll('[data-toast]').forEach(b=>b.addEventListener('click',()=>toast(b.dataset.toast)))
  document.querySelectorAll('[data-friend-request]').forEach(b=>b.addEventListener('click',()=>session?toast('Find a person in search to send a friend request.'):openAuth()))
  document.querySelector('[data-prompt]')?.addEventListener('click',()=>{if(page==='home'){document.querySelector('[data-open-composer]')?.click()}else location.href='/'})
  document.querySelector('#notification-action')?.addEventListener('click',openAuth)
  window.addEventListener('keydown',e=>{if(e.key==='/'&&!['INPUT','TEXTAREA'].includes(document.activeElement.tagName)){e.preventDefault();document.querySelector('#global-search')?.focus()}if(e.key==='Escape')document.querySelectorAll('.modal-backdrop').forEach(m=>m.hidden=true)})
}

initialize().catch(error=>{console.error(error);toast('Could not connect. Refresh and try again.')})
