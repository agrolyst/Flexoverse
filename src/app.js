import { createClient } from '@supabase/supabase-js'
import './style.css'

// The app shell and every page live here so navigation and responsive behavior stay consistent.
const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const db = url && publishableKey ? createClient(url, publishableKey) : null
const samplePosts = [
  { id: 'demo-1', name: 'Maya Chen', username: 'mayachen', avatar: 'MC', color: 'peach', time: '18 min ago', content: 'Found this little corner of the city on my walk today. A reminder that slowing down is sometimes the whole point. 🌿', image: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?auto=format&fit=crop&w=1100&q=85', likes: 28, comments: 6 },
  { id: 'demo-2', name: 'Jordan Lee', username: 'jordandoes', avatar: 'JL', color: 'lavender', time: '1 hr ago', content: 'Sunday recipe experiment: crispy potatoes, a little lemon, and enough herbs to make the kitchen smell like summer. Sharing the recipe soon 🍋', likes: 14, comments: 3 },
  { id: 'demo-3', name: 'Amara Okafor', username: 'amarawrites', avatar: 'AO', color: 'mint', time: '3 hrs ago', content: 'A small win: finally finished the book that has been living on my nightstand since April. What are you reading lately?', likes: 42, comments: 11 },
]
let userSession = null
let posts = [...samplePosts]
let activePage = 'home'
let likedPostIds = new Set()
let chatMessages = ['Hey! Are we still meeting at the market on Saturday?', 'Absolutely. I’ll be there around 9. ☀️']
let selectedChat = 'Maya Chen'
let photoFile = null
let viewedProfile = null
let viewedProfilePosts = []
let ownProfile = null
const clean = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])
const initials = value => String(value || 'You').split(/[\s@._-]+/).filter(Boolean).slice(0, 2).map(x => x[0]).join('').toUpperCase()
const username = () => userSession?.user?.user_metadata?.username || userSession?.user?.user_metadata?.full_name?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'you'
const displayName = () => userSession?.user?.user_metadata?.full_name || userSession?.user?.email?.split('@')[0] || 'You'
const avatar = (label, color = 'blue', image = '') => image ? `<img class="avatar" src="${clean(image)}" alt="" />` : `<span class="avatar ${color}">${clean(label)}</span>`
const pathPage = () => { const part = location.pathname.split('/').filter(Boolean)[0]; return ['home', 'friends', 'reels', 'chats', 'notifications', 'settings'].includes(part) ? part : part ? 'profile' : 'home' }
const pageLabels = { home: 'Home', friends: 'Friends', reels: 'Reels', chats: 'Chats', notifications: 'Notifications', settings: 'Settings', profile: 'Profile' }

function postCard(post) {
  const name = post.name || post.profiles?.full_name || 'Circle member'
  const user = post.username || post.profiles?.username || ''
  const image = post.avatar_url || post.profiles?.avatar_url || ''
  const own = post.user_id && userSession?.user?.id === post.user_id
  const liked = likedPostIds.has(post.id)
  const content = post.content || ''
  const media = post.image_url || post.image
  return `<article class="post-card"><div class="post-head">${avatar(post.avatar || initials(name), post.color, image)}<div class="post-author"><a href="/${clean(user)}"><strong>${clean(name)}</strong></a><span>@${clean(user)} <i>·</i> ${clean(post.time || new Date(post.created_at).toLocaleString())}</span></div><button class="icon-button more" aria-label="More options">···</button></div><p class="post-copy">${clean(content)}</p>${media ? `<img class="post-image" src="${clean(media)}" alt="Post attachment" />` : ''}<div class="post-stats"><span>♡ ${Number(post.like_count ?? post.likes ?? 0)} people</span><span>${Number(post.comment_count ?? post.comments ?? 0)} comments</span></div><div class="post-actions"><button class="action-btn ${liked ? 'is-liked' : ''}" data-like="${clean(post.id)}"><span>♡</span> Like</button><button class="action-btn" data-comment="${clean(post.id)}"><span>▱</span> Comment</button><button class="action-btn" data-share="${clean(post.id)}"><span>↗</span> Share</button></div>${own ? '<span class="your-post">Your post</span>' : ''}</article>`
}

function homePage() {
  return `<div class="feed-title"><div><p class="eyebrow">YOUR COMMUNITY</p><h1>Good ${new Date().getHours() < 12 ? 'morning' : 'afternoon'}, ${clean(displayName().split(' ')[0])} <span>✳</span></h1><p class="subtitle">Here’s what’s happening with your people.</p></div><button class="filter-btn">For you <span>⌄</span></button></div><div class="composer"><div class="composer-top">${avatar(initials(displayName()), 'blue')}<button class="composer-prompt" id="composer-focus">What’s on your mind, ${clean(displayName().split(' ')[0])}?</button></div><textarea id="post-content" placeholder="Share a thought, a moment, or a little joy…"></textarea><div id="photo-preview"></div><div class="composer-bottom"><button class="composer-tool" id="photo-tool"><span class="photo-icon">▧</span> Photo</button><button class="composer-tool" id="feeling-tool"><span class="feeling-icon">☺</span> Feeling</button><button class="post-button" id="post-button">Post <span>↗</span></button><input type="file" id="photo-input" accept="image/*" hidden /></div></div><div class="stories"><div><p class="eyebrow">LITTLE MOMENTS</p><button class="see-all">See all <span>→</span></button></div><div class="story-row"><button class="story"><span class="story-photo add-photo">+</span><span class="story-name">Your story</span></button><button class="story"><span class="story-photo story-one"><i>✿</i></span><span class="story-name">Maya Chen</span></button><button class="story"><span class="story-photo story-two"><i>☀</i></span><span class="story-name">Jordan Lee</span></button><button class="story"><span class="story-photo story-three"><i>✦</i></span><span class="story-name">Amara O.</span></button><button class="story"><span class="story-photo story-four"><i>♡</i></span><span class="story-name">Sam Rivera</span></button></div></div><div class="feed-section-head"><h2>Happening now <span class="online-dot"></span></h2><button class="sort-btn">Latest <span>⌄</span></button></div><div id="post-list">${posts.map(postCard).join('')}</div>`
}

function friendsPage() {
  const suggestions = [['Nia Williams', 'niawilliams', 'NW', 'mint'], ['Ethan Brooks', 'ethanbrooks', 'EB', 'peach'], ['Sofia Martinez', 'sofiamartinez', 'SM', 'lavender'], ['Sam Rivera', 'samrivera', 'SR', 'blue']]
  return `<div class="page-heading"><p class="eyebrow">YOUR PEOPLE</p><h1>Friends</h1><p class="subtitle">Build your circle, one good connection at a time.</p></div><section class="surface"><div class="section-title"><div><h2>Friend requests</h2><p>People who would like to connect with you</p></div><span class="count-pill">2</span></div>${[['Tobi Adeyemi', 'tobiadeyemi', 'TA', 'peach'], ['Grace Mensah', 'gracem', 'GM', 'lavender']].map(p => `<div class="friend-row">${avatar(p[2], p[3])}<div class="friend-detail"><strong>${p[0]}</strong><small>@${p[1]} · 3 mutual friends</small></div><button class="primary-small" data-friend="accept">Accept</button><button class="quiet-small" data-friend="ignore">Ignore</button></div>`).join('')}</section><section class="surface"><div class="section-title"><div><h2>People you may know</h2><p>Some friendly faces to get your circle started</p></div><button class="text-button">See all →</button></div><div class="suggestion-grid">${suggestions.map(p => `<article class="suggestion-card">${avatar(p[2], p[3])}<strong>${p[0]}</strong><small>@${p[1]} · 2 mutual friends</small><button class="outline-button" data-friend="request">＋ Add friend</button></article>`).join('')}</div></section>`
}

function reelsPage() {
  const reels = [['A slow morning in the garden', 'mayachen', 'photo-1441974231531-c6227db76b6e'], ['Sunday cooking, from scratch', 'jordandoes', 'photo-1490645935967-10de6ba17061'], ['A little colour on my walk', 'amarawrites', 'photo-1470252649378-9c29740c9fa8']]
  return `<div class="page-heading"><p class="eyebrow">SHORTS FROM YOUR CIRCLE</p><h1>Reels</h1><p class="subtitle">Little moments, made to watch one at a time.</p></div><div class="reel-grid">${reels.map((r, i) => `<article class="reel-card" style="--reel-image:url(https://images.unsplash.com/${r[2]}?auto=format&fit=crop&w=650&q=85)"><button class="reel-play" aria-label="Play reel">▶</button><div class="reel-caption"><strong>${clean(r[0])}</strong><span>@${clean(r[1])} · ♡ ${24 + i * 17}</span></div></article>`).join('')}</div><p class="feature-note">Reel uploads and playback will be connected when media storage is set up.</p>`
}

function chatsPage() {
  const chats = [['Maya Chen', 'MC', 'peach', 'Absolutely. I’ll be there around 9. ☀️', '9:42'], ['Jordan Lee', 'JL', 'lavender', 'Sent you the recipe!', 'Yesterday'], ['Amara Okafor', 'AO', 'mint', 'That book sounds lovely.', 'Tue']]
  return `<div class="page-heading"><p class="eyebrow">YOUR PRIVATE CONVERSATIONS</p><h1>Chats</h1><p class="subtitle">Messages with the friends in your circle.</p></div><section class="chat-window"><aside class="chat-list">${chats.map(c => `<button class="chat-person ${selectedChat === c[0] ? 'active' : ''}" data-chat-name="${c[0]}">${avatar(c[1], c[2])}<span><strong>${c[0]}</strong><small>${c[3]}</small></span><time>${c[4]}</time></button>`).join('')}</aside><div class="chat-panel"><div class="chat-top">${avatar(initials(selectedChat), 'peach')}<div><strong>${clean(selectedChat)}</strong><small>Friend · private conversation</small></div><button class="icon-button more">···</button></div><div class="chat-history"><p class="chat-date">TODAY</p>${chatMessages.map((m, i) => `<div class="message ${i % 2 ? 'sent' : ''}">${clean(m)}<small>${i % 2 ? '9:42 AM' : '9:39 AM'}</small></div>`).join('')}</div><form class="chat-compose" id="chat-form"><input name="message" placeholder="Write a message…" autocomplete="off"/><button type="submit" aria-label="Send message">➤</button></form></div></section><p class="feature-note">Chat screen preview. Messages will be stored in Supabase and only visible to conversation members.</p>`
}

function notificationsPage() {
  return `<div class="page-heading"><p class="eyebrow">A LITTLE UPDATE</p><h1>Notifications</h1><p class="subtitle">The moments and people that need your attention.</p></div><section class="surface notifications-list">${[['TA','peach','Tobi Adeyemi','sent you a friend request.','12 min ago'],['MC','lavender','Maya Chen','and 4 others liked your post.','1 hr ago'],['AO','mint','Amara Okafor','commented: “I love this idea!”','Yesterday']].map(n => `<article class="notification-row">${avatar(n[0], n[1])}<p><strong>${n[2]}</strong> ${n[3]}<small>${n[4]}</small></p><span class="unread-dot"></span></article>`).join('')}</section>`
}

function settingsPage() {
  return `<div class="page-heading"><p class="eyebrow">MAKE IT YOURS</p><h1>Settings</h1><p class="subtitle">Account, privacy, and the way you show up on Flexoverse.</p></div><section class="surface settings-section"><h2>Your public profile</h2><p>Choose a unique username. Numbers are optional and only needed when the name is already taken.</p><label class="settings-field">Username<div class="username-input"><span>@</span><input id="settings-username" value="${clean(ownProfile?.username || username())}" maxlength="30"/><span id="username-status"></span></div></label><p class="url-preview">Your profile link: <strong>/${clean(ownProfile?.username || username())}</strong></p><button class="primary-small" id="save-profile">Save profile</button></section><section class="surface settings-section"><h2>Privacy & discovery</h2><label class="toggle-row"><span><strong>Public profile</strong><small>Let people view your profile page.</small></span><input type="checkbox" id="public-profile-toggle" ${ownProfile?.is_public === false ? '' : 'checked'}/></label><p class="feature-note">Google search visibility is enabled by Flexoverse after verification for people and an active business subscription for businesses.</p></section><section class="surface settings-section"><h2>Membership</h2><p>Keep the core social features free. Optional membership can add media storage and creator tools.</p><button class="outline-button" id="membership-button">Explore membership</button></section>`
}

function profilePage() {
  const handle = decodeURIComponent(location.pathname.slice(1)).toLowerCase()
  const me = handle === username()
  const demo = samplePosts.find(p => p.username === handle)
  const profile = viewedProfile?.username === handle ? viewedProfile : null
  const name = profile?.full_name || (me ? displayName() : demo?.name || handle.replace(/[0-9]+$/g, '').replace(/[._-]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
  const postList = profile ? viewedProfilePosts : demo ? [demo] : []
  if (profile && !profile.is_public && !me) return `<section class="surface empty-state"><h2>This profile is private</h2><p>Only the account owner can view this page.</p></section>`
  return `<section class="profile-cover"><div class="profile-cover-art"></div><div class="profile-header">${avatar(initials(name), 'blue', profile?.avatar_url)}<div><h1>${clean(name)} ${profile?.verified ? '<span class="verified" aria-label="Verified">✓</span>' : ''}</h1><p>@${clean(handle)}</p>${profile?.bio ? `<p>${clean(profile.bio)}</p>` : ''}</div><button class="outline-button">${me ? 'Edit profile' : '＋ Add friend'}</button></div><div class="profile-tabs"><button class="selected">Posts</button><button>About</button><button>Photos</button></div></section>${postList.length ? postList.map(postCard).join('') : `<section class="surface empty-state"><span>✧</span><h2>${me ? 'Make this space yours' : 'A new page in your circle'}</h2><p>${me ? 'Share a post and let your friends know what you are up to.' : 'When this person shares public posts, they’ll show up here.'}</p></section>`}`
}

function pageBody() {
  if (activePage === 'home') return homePage()
  if (activePage === 'friends') return friendsPage()
  if (activePage === 'reels') return reelsPage()
  if (activePage === 'chats') return chatsPage()
  if (activePage === 'notifications') return notificationsPage()
  if (activePage === 'settings') return settingsPage()
  return profilePage()
}

function render() {
  activePage = pathPage()
  if (activePage !== 'profile') {
    document.title = 'Flexoverse — your people, your place'
    const robots = document.querySelector('meta[name="robots"]')
    if (robots) robots.content = 'index,follow'
  }
  const nav = [['home', '⌂'], ['friends', '♙'], ['reels', '▶'], ['chats', '▤']]
  document.querySelector('#app').innerHTML = `<header class="topbar"><a class="brand" href="/home" data-route="home"><span class="brand-mark">f</span><span>flexoverse</span></a><label class="search"><span>⌕</span><input id="search" placeholder="Search Flexoverse" aria-label="Search" /></label><nav class="top-nav">${nav.map(([key, icon]) => `<a class="nav-item ${activePage === key ? 'selected' : ''}" href="/${key}" data-route="${key}">${icon}<span>${pageLabels[key]}</span></a>`).join('')}</nav><div class="top-right"><a class="icon-button notification" href="/notifications" data-route="notifications" aria-label="Notifications">♧<b></b></a>${userSession ? `<a class="profile-chip" href="/${clean(username())}" data-profile>${avatar(initials(displayName()), 'blue')}<span>${clean(displayName())}</span></a><button class="icon-button" id="signout" aria-label="Sign out">↪</button>` : '<button class="sign-in" id="open-auth">Sign in</button>'}</div></header><main class="layout"><aside class="left-rail"><div class="welcome-card"><div class="welcome-art"><span>✳</span><span>✦</span></div><div class="welcome-body"><strong>Your people, your place.</strong><p>A little more human. A little less noisy.</p><button id="rail-action">${userSession ? 'Find your people' : 'Join Flexoverse'} <span>→</span></button></div></div><div class="side-links"><small>YOUR SPACE</small>${[['home', '⌂', 'Home'], ['friends', '♙', 'Friends'], ['reels', '▶', 'Reels'], ['chats', '▤', 'Chats'], ['notifications', '♧', 'Notifications'], ['settings', '⚙', 'Settings']].map(([key, icon, label]) => `<a class="side-link ${activePage === key ? 'active' : ''}" href="/${key}" data-route="${key}"><i>${icon}</i>${label}${key === 'friends' ? '<span class="side-count">2</span>' : ''}</a>`).join('')}</div><div class="side-footer">About · Privacy · Terms<br/>© 2026 Flexoverse</div></aside><section class="feed page-${activePage}">${pageBody()}</section><aside class="right-rail"><div class="rail-heading"><h3>Your circle</h3><button>•••</button></div><p class="rail-caption">A few people you may know</p><div class="people-list">${[['Nia Williams','NW','mint'],['Ethan Brooks','EB','peach'],['Sofia Martinez','SM','lavender']].map(([name, ini, color]) => `<div class="person">${avatar(ini, color)}<span class="person-name"><strong>${name}</strong><small>2 mutual friends</small></span><button class="add-friend" data-friend="request">+</button></div>`).join('')}</div><button class="view-all" data-route="friends">See everyone <span>→</span></button><div class="right-divider"></div><div class="rail-heading"><h3>Upcoming</h3><button class="view-calendar">Calendar →</button></div><div class="event-card"><span class="event-date"><b>08</b><small>NOV</small></span><div><strong>Saturday farmers market</strong><p>📍 Riverside Park · 9:00 AM</p><small>12 friends are going</small></div></div><div class="right-divider"></div><div class="prompt-card"><span>✧ A LITTLE PROMPT</span><p>What’s something small that made you smile this week?</p><button id="prompt-answer">Answer this <span>→</span></button></div><div class="right-footer">Made for real life <span>♡</span></div></aside></main><nav class="mobile-nav">${[['home','⌂'],['friends','♙'],['reels','▶'],['chats','▤'],['settings','⚙']].map(([key, icon]) => `<a class="${activePage === key ? 'selected' : ''}" href="/${key}" data-route="${key}"><span>${icon}</span><small>${pageLabels[key]}</small></a>`).join('')}</nav><div id="toast" class="toast"></div><div id="auth-modal" class="modal hidden"><div class="modal-card"><button class="modal-close" id="close-auth">×</button><span class="brand-mark modal-mark">f</span><p class="eyebrow">A PLACE FOR YOUR PEOPLE</p><h2 id="auth-title">Welcome to Flexoverse</h2><p class="auth-copy">Sign in or create your account to join the conversation.</p><form id="auth-form"><label id="name-field" class="hidden">Your name<input name="name" autocomplete="name" placeholder="Your name" /></label><label id="username-field" class="hidden">Username<div class="username-input"><span>@</span><input name="username" autocomplete="username" placeholder="yourname" minlength="3" maxlength="30" pattern="[A-Za-z0-9]+"/><span id="signup-username-status"></span></div><small class="field-help">Letters and numbers only. Add numbers only if your preferred name is taken.</small></label><label>Email<input name="email" type="email" autocomplete="email" required placeholder="you@example.com" /></label><label>Password<input name="password" type="password" autocomplete="current-password" minlength="6" required placeholder="At least 6 characters" /></label><button class="auth-submit" type="submit" id="auth-submit">Sign in</button></form><button class="auth-switch" id="auth-switch" data-signup="false">New here? Create an account</button></div></div>`
  bindEvents()
}

function toast(message) { const el = document.querySelector('#toast'); if (!el) return; el.textContent = message; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 2800) }
function navigate(path) { history.pushState({}, '', path); render(); if (pathPage() === 'profile' && db) loadPublicProfile(decodeURIComponent(location.pathname.slice(1))).then(render); window.scrollTo({ top: 0, behavior: 'smooth' }) }

function bindEvents() {
  document.querySelectorAll('[data-route]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); navigate(`/${el.dataset.route}`) }))
  document.querySelectorAll('[data-profile]').forEach(el => el.addEventListener('click', e => { e.preventDefault(); navigate(`/${username()}`) }))
  document.querySelector('#open-auth')?.addEventListener('click', () => document.querySelector('#auth-modal').classList.remove('hidden'))
  document.querySelector('#close-auth')?.addEventListener('click', () => document.querySelector('#auth-modal').classList.add('hidden'))
  document.querySelector('#auth-modal')?.addEventListener('click', e => { if (e.target.id === 'auth-modal') e.currentTarget.classList.add('hidden') })
  document.querySelector('#auth-switch')?.addEventListener('click', e => { const signup = e.currentTarget.dataset.signup !== 'true'; e.currentTarget.dataset.signup = signup; document.querySelector('#auth-title').textContent = signup ? 'Create your account' : 'Welcome to Flexoverse'; document.querySelector('#auth-submit').textContent = signup ? 'Create account' : 'Sign in'; document.querySelector('#name-field').classList.toggle('hidden', !signup); document.querySelector('#username-field').classList.toggle('hidden', !signup); document.querySelector('[name="username"]').required = signup })
  document.querySelector('[name="username"]')?.addEventListener('input', async e => { const field = e.currentTarget; const value = field.value.toLowerCase(); field.value = value; const status = document.querySelector('#signup-username-status'); if (!/^[a-z0-9]{3,30}$/.test(value)) { status.textContent = value ? 'Use 3–30 letters or numbers.' : ''; status.className = 'username-status invalid'; return } if (!db) { status.textContent = 'Availability checked when connected'; status.className = 'username-status'; return } status.textContent = 'Checking…'; const { data, error } = await db.from('profiles').select('username').eq('username', value).maybeSingle(); status.textContent = error ? '' : data ? 'Taken' : 'Available ✓'; status.className = data ? 'username-status invalid' : 'username-status available' })
  document.querySelector('#auth-form')?.addEventListener('submit', async e => { e.preventDefault(); if (!db) return toast('Add your Supabase keys to .env.local first.'); const data = new FormData(e.currentTarget); const signup = document.querySelector('#auth-switch').dataset.signup === 'true'; const payload = { email: data.get('email'), password: data.get('password') }; const result = signup ? await db.auth.signUp({ ...payload, options: { data: { full_name: data.get('name'), username: String(data.get('username')).toLowerCase() } } }) : await db.auth.signInWithPassword(payload); if (result.error) return toast(result.error.message); userSession = result.data.session; document.querySelector('#auth-modal').classList.add('hidden'); toast(signup && !userSession ? 'Check your email to confirm your account.' : 'Welcome to Flexoverse!'); await loadPosts(); render() })
  document.querySelector('#signout')?.addEventListener('click', async () => { await db?.auth.signOut(); userSession = null; posts = [...samplePosts]; navigate('/home') })
  document.querySelector('#rail-action')?.addEventListener('click', () => userSession ? navigate('/friends') : document.querySelector('#open-auth')?.click())
  document.querySelector('#post-content')?.addEventListener('focus', e => e.target.classList.add('expanded'))
  document.querySelector('#composer-focus')?.addEventListener('click', () => { const input = document.querySelector('#post-content'); input.classList.add('expanded'); input.focus() })
  document.querySelector('#photo-tool')?.addEventListener('click', () => document.querySelector('#photo-input').click())
  document.querySelector('#photo-input')?.addEventListener('change', e => { photoFile = e.target.files?.[0] || null; document.querySelector('#photo-preview').innerHTML = photoFile ? `<p class="file-note">📷 ${clean(photoFile.name)}</p>` : '' })
  document.querySelector('#feeling-tool')?.addEventListener('click', () => { const input = document.querySelector('#post-content'); input.value += ' 😊'; input.classList.add('expanded'); input.focus() })
  document.querySelector('#post-button')?.addEventListener('click', async () => { const box = document.querySelector('#post-content'); const content = box.value.trim(); if (!content) return toast('Write something first.'); if (!userSession || !db) { posts.unshift({ id: crypto.randomUUID(), name: 'You', username: 'you', avatar: 'YO', color: 'blue', time: 'Just now', content, likes: 0, comments: 0 }); box.value = ''; render(); return toast('Preview post added. Connect Supabase to save posts.') } const { error } = await db.from('posts').insert({ user_id: userSession.user.id, content }); if (error) return toast(error.message); box.value = ''; await loadPosts(); render(); toast('Your post is live!') })
  document.querySelector('#post-list')?.addEventListener('click', async e => { const likeId = e.target.closest('[data-like]')?.dataset.like; if (likeId) { if (!userSession || !db || likeId.startsWith('demo-')) { likedPostIds.has(likeId) ? likedPostIds.delete(likeId) : likedPostIds.add(likeId); const post = posts.find(p => p.id === likeId); if (post) post.likes = Number(post.likes || 0) + (likedPostIds.has(likeId) ? 1 : -1); render(); return } const result = likedPostIds.has(likeId) ? await db.from('likes').delete().eq('post_id', likeId).eq('user_id', userSession.user.id) : await db.from('likes').insert({ post_id: likeId, user_id: userSession.user.id }); if (result.error) toast(result.error.message); else { likedPostIds.has(likeId) ? likedPostIds.delete(likeId) : likedPostIds.add(likeId); await loadPosts(); render() } } if (e.target.closest('[data-comment]')) toast('Comments are next on the build list.'); if (e.target.closest('[data-share]')) { await navigator.clipboard?.writeText(location.origin + location.pathname); toast('Page link copied.') } })
  document.querySelectorAll('[data-friend]').forEach(b => b.addEventListener('click', () => toast(b.dataset.friend === 'accept' ? 'Friend request accepted.' : b.dataset.friend === 'ignore' ? 'Request removed.' : 'Friend request sent.')))
  document.querySelectorAll('[data-chat-name]').forEach(b => b.addEventListener('click', () => { selectedChat = b.dataset.chatName; chatMessages = [`Hi ${displayName().split(' ')[0]}! How is your week going?`, 'Pretty good, thanks! Looking forward to Saturday.']; render() }))
  document.querySelector('#chat-form')?.addEventListener('submit', e => { e.preventDefault(); const input = e.currentTarget.elements.message; const message = input.value.trim(); if (!message) return; chatMessages.push(message); render() })
  document.querySelector('#settings-username')?.addEventListener('input', e => { e.target.value = e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''); const status = document.querySelector('#username-status'); status.textContent = /^[a-z0-9]{3,30}$/.test(e.target.value) ? 'Available format ✓' : 'Use 3–30 letters or numbers'; document.querySelector('.url-preview strong').textContent = `/${e.target.value}` })
  document.querySelector('#save-profile')?.addEventListener('click', async () => {
    if (!db || !userSession) return toast('Sign in to save profile settings.')
    const newUsername = document.querySelector('#settings-username').value.trim().toLowerCase()
    if (!/^[a-z0-9]{3,30}$/.test(newUsername)) return toast('Use 3–30 letters or numbers for your username.')
    const { error } = await db.from('profiles').update({ username: newUsername, is_public: document.querySelector('#public-profile-toggle').checked }).eq('id', userSession.user.id)
    if (error) return toast(error.code === '23505' ? 'That username is already taken. Try adding a number.' : error.message)
    const authUpdate = await db.auth.updateUser({ data: { username: newUsername } })
    if (authUpdate.error) return toast(authUpdate.error.message)
    userSession = authUpdate.data.user ? { ...userSession, user: authUpdate.data.user } : userSession
    await loadOwnProfile()
    render()
    toast('Profile settings saved.')
  })
  document.querySelector('#membership-button')?.addEventListener('click', () => toast('Membership options will be available after launch.'))
  document.querySelector('#prompt-answer')?.addEventListener('click', () => { navigate('/home'); setTimeout(() => { const input = document.querySelector('#post-content'); if (input) { input.value = 'Something small that made me smile this week was… '; input.classList.add('expanded'); input.focus() } }, 0) })
  document.querySelector('#search')?.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.value.trim()) { const q = e.target.value.trim().replace(/^@/, '').replace(/[^a-z0-9]/gi, '').toLowerCase(); navigate(`/${q}`) } })
}

async function loadPosts() {
  if (!db || !userSession) return
  const { data, error } = await db.from('posts').select('id,user_id,content,created_at,profiles(full_name,username,avatar_url),likes(count)').order('created_at', { ascending: false }).limit(30)
  if (error) { toast(error.message); return }
  posts = data.map(p => ({ ...p, like_count: p.likes?.[0]?.count || 0, comment_count: 0 }))
}

async function loadOwnProfile() {
  if (!db || !userSession) { ownProfile = null; return }
  const { data, error } = await db.from('profiles').select('id,username,full_name,bio,avatar_url,is_public,search_index_enabled').eq('id', userSession.user.id).maybeSingle()
  if (error) { toast(error.message); return }
  ownProfile = data
}

async function loadPublicProfile(handle) {
  if (!db) return
  viewedProfile = null
  viewedProfilePosts = []
  const { data, error } = await db.from('profiles').select('id,username,full_name,bio,avatar_url,is_public,search_index_enabled').eq('username', handle.toLowerCase()).maybeSingle()
  if (error) { toast(error.message); return }
  viewedProfile = data
  if (data) {
    const { data: profilePosts, error: postsError } = await db.from('posts').select('id,user_id,content,image_path,created_at,profiles(full_name,username,avatar_url),likes(count)').eq('user_id', data.id).order('created_at', { ascending: false }).limit(30)
    if (postsError) toast(postsError.message)
    viewedProfilePosts = (profilePosts || []).map(p => ({ ...p, like_count: p.likes?.[0]?.count || 0, comment_count: 0 }))
  }
  if (pathPage() !== 'profile' || decodeURIComponent(location.pathname.slice(1)).toLowerCase() !== handle.toLowerCase()) return
  document.title = data ? `${data.full_name || data.username} (@${data.username}) · Flexoverse` : 'Profile not found · Flexoverse'
  const robots = document.querySelector('meta[name="robots"]')
  if (robots) robots.content = data?.is_public && data?.search_index_enabled ? 'index,follow' : 'noindex,nofollow'
  const description = document.querySelector('meta[name="description"]')
  if (description) description.content = data?.bio || `See ${data?.full_name || data?.username}'s public profile on Flexoverse.`
}

window.addEventListener('popstate', render)
window.addEventListener('keydown', e => { if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) { e.preventDefault(); document.querySelector('#search')?.focus() } if (e.key === 'Escape') document.querySelector('#auth-modal')?.classList.add('hidden') })
async function start() { if (db) { const { data } = await db.auth.getSession(); userSession = data.session; db.auth.onAuthStateChange((_event, next) => { userSession = next; if (next) Promise.all([loadPosts(), loadOwnProfile()]).then(render); else { ownProfile = null; render() } }); await Promise.all([loadPosts(), loadOwnProfile()]) } render(); if (pathPage() === 'profile' && db) { await loadPublicProfile(decodeURIComponent(location.pathname.slice(1))); render() } }
start()

