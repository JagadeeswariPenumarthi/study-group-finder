/* ============================================================
   StudyCircle — Peer Study Group Finder (frontend)
   ============================================================ */

const API = '';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/* ---------------- Helpers ---------------- */

async function api(path, options = {}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong');
  return data;
}

function toast(message, type = 'success', sub = '') {
  const icons = {
    success: '<path d="M5 12l5 5L20 7"/>',
    error: '<path d="M18 6 6 18M6 6l12 12"/>',
    info: '<path d="M12 8v8M12 4v.01"/>',
  };
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `
    <span class="t-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${icons[type]}</svg></span>
    <div>${message}${sub ? `<small>${sub}</small>` : ''}</div>`;
  $('#toastWrap').appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3400);
}

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (name) => name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

function showSuccess(title, sub, ref) {
  $('#successTitle').textContent = title;
  $('#successSub').textContent = sub;
  const refBox = $('#successRef');
  if (ref) { refBox.hidden = false; refBox.textContent = ref; } else { refBox.hidden = true; }
  $('#successModal').hidden = false;
}
$('#successDone').addEventListener('click', () => { $('#successModal').hidden = true; });
$('#successModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#successModal').hidden = true; });

/* ---------------- Navigation (SPA) ---------------- */

function navigate(view, opts = {}) {
  $$('.view').forEach((v) => v.classList.remove('active'));
  $('#view-' + view).classList.add('active');
  $$('.nav-link').forEach((l) => l.classList.toggle('active', l.dataset.nav === view));
  $('#siteNav').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (view === 'home') initHome();
  if (view === 'browse') initBrowse(opts.subject);
  if (view === 'create') initCreate();
  if (view === 'my') initMy();
}

$('#navToggle').addEventListener('click', () => $('#siteNav').classList.toggle('open'));
$$('.nav-link, [data-nav]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    navigate(el.dataset.nav, { subject: el.dataset.subject });
  });
});

/* ---------------- HOME ---------------- */

async function initHome() {
  $$('.stat [data-count]').forEach((el) => {
    const target = +el.dataset.count;
    const suffix = el.dataset.suffix || '';
    let cur = 0;
    const step = Math.max(1, Math.round(target / 40));
    const timer = setInterval(() => {
      cur += step;
      if (cur >= target) { cur = target; clearInterval(timer); }
      el.textContent = cur + suffix;
    }, 24);
  });

  const subjectGrid = $('#subjectGrid');
  if (subjectGrid.dataset.loaded) return;
  subjectGrid.dataset.loaded = '1';
  try {
    const subjects = await api('/api/subjects');
    subjectGrid.innerHTML = subjects.map((s, i) => `
      <div class="subject-card" style="animation-delay:${i * 40}ms" data-nav="browse" data-subject="${esc(s.id)}">
        <span class="subject-icon">${esc(s.icon)}</span>
        <h3>${esc(s.name)}</h3>
        <small>Find groups →</small>
      </div>`).join('');
    $$('#subjectGrid .subject-card').forEach((c) =>
      c.addEventListener('click', () => navigate('browse', { subject: c.dataset.subject })));
  } catch (err) {
    subjectGrid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><strong>Could not load subjects</strong>${esc(err.message)}</div>`;
  }

  loadHomeGroups();
}

async function loadHomeGroups() {
  const grid = $('#homeGroupGrid');
  grid.innerHTML = '<div class="skeleton"></div>'.repeat(3);
  try {
    const groups = await api('/api/groups');
    grid.innerHTML = groups.slice(0, 6).map(groupCardHtml).join('');
    bindGroupCards(grid);
  } catch {
    grid.innerHTML = '<div class="empty-state" style="grid-column:1/-1"><strong>No groups yet</strong>Be the first to create one!</div>';
  }
}

function groupCardHtml(g) {
  const pct = g.maxMembers ? Math.round((g.memberCount / g.maxMembers) * 100) : 0;
  const full = g.status === 'FULL';
  return `
  <div class="group-card" data-group-id="${g.id}">
    <div class="gc-top">
      <div class="gc-subject">${esc(g.subjectIcon)}</div>
      <div>
        <strong>${esc(g.groupName)}</strong>
        <small>${esc(g.subjectName)} · ${esc(g.location || 'Online')}</small>
      </div>
    </div>
    <p class="gc-desc">${esc(g.description || 'A collaborative study group — come with questions, leave with answers.')}</p>
    <div class="gc-chips">
      ${g.schedule ? `<span class="tag">🕐 ${esc(g.schedule)}</span>` : ''}
      <span class="tag ${full ? 'full' : ''}">${full ? 'Full' : 'Open'}</span>
    </div>
    <div class="gc-bottom">
      <span class="gc-count"><b>${g.memberCount}</b> / ${g.maxMembers} members</span>
      <button class="btn btn-primary btn-sm" data-join="${g.id}">${full ? 'View' : 'Join'}</button>
    </div>
  </div>`;
}

function bindGroupCards(grid) {
  $$('.group-card', grid).forEach((card) => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('[data-join]')) return;
      openGroup(card.dataset.groupId);
    });
    const joinBtn = $('[data-join]', card);
    if (joinBtn) joinBtn.addEventListener('click', () => openGroup(card.dataset.groupId));
  });
}

/* ---------------- BROWSE ---------------- */

let browseSubject = '';
let browseSearch = '';

async function initBrowse(preselectedSubject) {
  if (preselectedSubject) {
    browseSubject = preselectedSubject;
    $$('#subjectChips .chip').forEach((c) => c.classList.toggle('active', c.dataset.subject === preselectedSubject));
  }
  const chips = $('#subjectChips');
  if (!chips.dataset.loaded) {
    chips.dataset.loaded = '1';
    try {
      const subjects = await api('/api/subjects');
      chips.insertAdjacentHTML('beforeend', subjects.map((s) =>
        `<button class="chip" data-subject="${esc(s.id)}">${esc(s.name)}</button>`).join(''));
      $$('#subjectChips .chip[data-subject]').forEach((c) =>
        c.addEventListener('click', () => {
          $$('#subjectChips .chip').forEach((x) => x.classList.remove('active'));
          c.classList.add('active');
          browseSubject = c.dataset.subject;
          loadBrowse();
        }));
    } catch { /* non-fatal */ }
  }
  loadBrowse();
}

async function loadBrowse() {
  const grid = $('#browseGrid');
  const empty = $('#browseEmpty');
  grid.innerHTML = '<div class="skeleton"></div>'.repeat(3);
  empty.hidden = true;
  try {
    const params = new URLSearchParams();
    if (browseSubject) params.set('subject', browseSubject);
    if (browseSearch) params.set('q', browseSearch);
    const groups = await api('/api/groups?' + params.toString());
    if (!groups.length) { empty.hidden = false; grid.innerHTML = ''; return; }
    grid.innerHTML = groups.map(groupCardHtml).join('');
    bindGroupCards(grid);
  } catch (err) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><strong>Could not load groups</strong>${esc(err.message)}</div>`;
  }
}

let browseTimer;
$('#groupSearch').addEventListener('input', (e) => {
  clearTimeout(browseTimer);
  browseTimer = setTimeout(() => { browseSearch = e.target.value.trim(); loadBrowse(); }, 300);
});

/* ---------------- GROUP DETAIL MODAL ---------------- */

let currentGroup = null;

function openGroup(id) {
  $('#groupModal').hidden = false;
  $('#mMembers').innerHTML = '<div class="skeleton" style="min-height:50px"></div>';
  api('/api/groups/' + id)
    .then((g) => {
      currentGroup = g;
      $('#mSubjectIcon').textContent = g.subjectIcon;
      $('#mName').textContent = g.groupName;
      $('#mMeta').textContent = `${g.subjectName} · ${g.location || 'Online'}`;
      $('#mDesc').textContent = g.description || 'A collaborative study group — come with questions, leave with answers.';
      $('#mSchedule').textContent = `🕐 ${g.schedule || 'Schedule TBD'}`;
      $('#mCapacity').textContent = g.status === 'FULL' ? 'Full' : `${g.members.length} / ${g.maxMembers} members`;
      $('#mCapacity').className = 'tag' + (g.status === 'FULL' ? ' full' : '');
      $('#mMemberCount').textContent = `(${g.members.length})`;
      $('#mMembers').innerHTML = g.members.map((m) => `
        <div class="member">
          <div class="hc-avatar">${initials(m.name)}</div>
          <div><strong>${esc(m.name)}</strong><small>Joined ${new Date(m.joinedAt).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</small></div>
          ${m.role === 'Lead' ? '<span class="role-pill">Lead</span>' : ''}
        </div>`).join('');
    })
    .catch((err) => toast(err.message, 'error'));
}

$('#modalClose').addEventListener('click', () => { $('#groupModal').hidden = true; });
$('#groupModal').addEventListener('click', (e) => { if (e.target === e.currentTarget) $('#groupModal').hidden = true; });

$('#joinBtn').addEventListener('click', async () => {
  if (!currentGroup) return;
  const name = $('#jName').value.trim();
  const email = $('#jEmail').value.trim();
  if (name.length < 2) return toast('Please enter your name', 'error');
  if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Please enter a valid email', 'error');
  try {
    const r = await api(`/api/groups/${currentGroup.id}/join`, { method: 'POST', body: JSON.stringify({ name, email }) });
    toast('You joined the group! 🎉', 'success', r.group.refNumber);
    saveBookmark(currentGroup.id, email);
    $('#jName').value = ''; $('#jEmail').value = '';
    openGroup(currentGroup.id);
  } catch (err) { toast(err.message, 'error'); }
});

$('#leaveBtn').addEventListener('click', async () => {
  if (!currentGroup) return;
  const email = $('#lEmail').value.trim();
  if (!email) return toast('Enter the email you joined with', 'error');
  try {
    const r = await api(`/api/groups/${currentGroup.id}/leave`, { method: 'POST', body: JSON.stringify({ email }) });
    toast('You left the group', 'info');
    $('#lEmail').value = '';
    openGroup(currentGroup.id);
  } catch (err) { toast(err.message, 'error'); }
});

/* ---------------- CREATE ---------------- */

async function initCreate() {
  const sel = $('#gSubject');
  if (!sel.options.length) {
    try {
      const subjects = await api('/api/subjects');
      sel.innerHTML = '<option value="">Select a subject…</option>' + subjects.map((s) => `<option value="${esc(s.id)}">${esc(s.name)}</option>`).join('');
    } catch (err) { toast(err.message, 'error'); }
  }
}

$('#createBtn').addEventListener('click', async () => {
  const fields = { name: $('#gName'), subject: $('#gSubject'), desc: $('#gDesc'), schedule: $('#gSchedule'), location: $('#gLocation'), max: $('#gMax'), creator: $('#gCreator'), creatorEmail: $('#gCreatorEmail') };
  $$('.field-error').forEach((e) => e.remove());
  $$('.input').forEach((i) => i.classList.remove('invalid'));
  const flag = (el, msg) => {
    el.classList.add('invalid');
    const err = document.createElement('div');
    err.className = 'field-error';
    err.textContent = msg;
    el.closest('.field').appendChild(err);
  };
  let ok = true;
  if (fields.name.value.trim().length < 3) { flag(fields.name, 'Give your group a name (min 3 chars)'); ok = false; }
  if (!fields.subject.value) { flag(fields.subject, 'Choose a subject'); ok = false; }
  if (fields.creator.value.trim().length < 2) { flag(fields.creator, 'Enter your name'); ok = false; }
  if (!/^\S+@\S+\.\S+$/.test(fields.creatorEmail.value.trim())) { flag(fields.creatorEmail, 'Enter a valid email'); ok = false; }
  if (fields.max.value && (+fields.max.value < 2 || +fields.max.value > 50)) { flag(fields.max, 'Between 2 and 50'); ok = false; }
  if (!ok) { toast('Please fix the highlighted fields', 'error'); return; }

  const btn = $('#createBtn');
  btn.disabled = true;
  btn.textContent = 'Creating…';
  try {
    const g = await api('/api/groups', {
      method: 'POST',
      body: JSON.stringify({
        groupName: fields.name.value.trim(),
        subject: fields.subject.value,
        description: fields.desc.value.trim(),
        schedule: fields.schedule.value.trim(),
        location: fields.location.value.trim(),
        maxMembers: fields.max.value ? +fields.max.value : 10,
        creatorName: fields.creator.value.trim(),
        creatorEmail: fields.creatorEmail.value.trim(),
      }),
    });
    saveBookmark(g.id, fields.creatorEmail.value.trim());
    $('#createForm').reset();
    showSuccess('Group Created! 🎉', 'Your study group is live and looking for members.', g.refNumber);
    navigate('browse');
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Create Study Group';
  }
});

/* ---------------- MY GROUPS ---------------- */

const BOOKMARK_KEY = 'studycircle_bookmarks';

function saveBookmark(groupId, email) {
  const list = JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]');
  if (!list.some((b) => b.id === groupId)) {
    list.unshift({ id: groupId, email });
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(list.slice(0, 12)));
  }
}

function bookmarks() {
  return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]');
}

function bookmarkCardHtml(g) {
  const pct = g.maxMembers ? Math.round((g.memberCount / g.maxMembers) * 100) : 0;
  return `
  <div class="bookmark-card" data-group-id="${g.id}">
    <div class="bk-subject">${esc(g.subjectIcon)}</div>
    <div class="bk-info">
      <strong>${esc(g.groupName)}</strong>
      <small>${esc(g.subjectName)} · ${esc(g.location || 'Online')}${g.schedule ? ` · ${esc(g.schedule)}` : ''}</small>
    </div>
    <div class="bk-count"><b>${g.memberCount} / ${g.maxMembers}</b>members</div>
    <button class="btn btn-outline btn-sm" data-view="${g.id}">View</button>
  </div>`;
}

async function initMy() {
  const marks = bookmarks();
  const box = $('#myBookmarks');
  if (!marks.length) {
    box.innerHTML = `<div class="empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
      <strong>No bookmarked groups yet</strong>
      Browse groups and join one — it'll show up here.
    </div>`;
    return;
  }
  box.innerHTML = '<div class="skeleton" style="min-height:70px"></div>'.repeat(marks.length);
  try {
    const groups = await api('/api/groups');
    const found = marks.map((m) => groups.find((g) => g.id === m.id)).filter(Boolean);
    if (!found.length) { box.innerHTML = '<div class="empty-state"><strong>No matching groups</strong>They may have been deleted.</div>'; return; }
    box.innerHTML = found.map(bookmarkCardHtml).join('');
    $$('#myBookmarks [data-view]').forEach((b) => b.addEventListener('click', () => openGroup(b.dataset.view)));
  } catch { /* ignore */ }
}

$('#refreshMy').addEventListener('click', initMy);

$('#myCheckBtn').addEventListener('click', doMembershipCheck);
$('#myEmail').addEventListener('keydown', (e) => { if (e.key === 'Enter') doMembershipCheck(); });

async function doMembershipCheck() {
  const email = $('#myEmail').value.trim().toLowerCase();
  const box = $('#myResult');
  if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Enter a valid email', 'error');
  box.innerHTML = '<div class="skeleton" style="min-height:70px;margin-bottom:20px"></div>';
  try {
    const groups = await api('/api/groups');
    const mine = groups.filter((g) => g.myEmailMatches === undefined || g.memberCount); // all groups come back without emails; match locally by bookmark
    const bookmarkedIds = bookmarks().filter((b) => b.email === email).map((b) => b.id);
    const joined = groups.filter((g) => bookmarkedIds.includes(g.id));
    if (!joined.length) {
      box.innerHTML = `<div class="empty-state" style="margin-bottom:20px">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
        <strong>No memberships found for ${esc(email)}</strong>
        If you've joined groups from another device, they won't be listed here.
      </div>`;
      return;
    }
    box.innerHTML = `<div class="section-head list-head" style="margin-top:0"><div><h2>Groups joined with ${esc(email)}</h2></div></div>` + joined.map(bookmarkCardHtml).join('');
    $$('#myResult [data-view]').forEach((b) => b.addEventListener('click', () => openGroup(b.dataset.view)));
  } catch (err) {
    box.innerHTML = `<div class="empty-state" style="margin-bottom:20px"><strong>Something went wrong</strong>${esc(err.message)}</div>`;
  }
}

/* ---------------- Boot ---------------- */

initHome();
