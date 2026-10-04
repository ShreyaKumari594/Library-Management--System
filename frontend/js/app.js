const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');
const fmt = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const ini = (t) => t.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();
const todayStr = () => new Date().toISOString().slice(0, 10);
const state = (i) => (i.returned ? 'returned' : i.due < todayStr() ? 'overdue' : 'on-time');
const label = { returned: 'Returned', overdue: 'Overdue', 'on-time': 'On Time' };

function toast(t) {
  let el = $('#toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; document.body.appendChild(el); }
  el.textContent = t; el.style.display = 'block'; setTimeout(() => (el.style.display = 'none'), 3000);
}
const act = (fn) => async (...a) => { try { await fn(...a); } catch (e) { toast(e.message); } };
const setText = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };

const covers = ['one', 'two', 'three', 'four'], homeCovers = ['green', 'brown', 'blue', 'purple'];
const avatars = ['one', 'two', 'three', 'four', 'five', 'six'];

/* ---------- HOME ---------- */
async function home() {
  const [b, i] = await Promise.all([get('/api/books'), get('/api/issues')]);
  const open = i.filter((x) => !x.returned);
  setText('s-total', b.reduce((s, x) => s + x.copies, 0));
  setText('s-avail', b.reduce((s, x) => s + x.available, 0));
  setText('s-issued', open.length);
  setText('s-over', pad(open.filter((x) => state(x) === 'overdue').length));
  $('#recent-books').innerHTML = b.slice(-4).reverse().map((k, n) => `
    <div class="recent-book">
      <div class="large-book-cover cover-${homeCovers[n % 4]}">${esc(ini(k.title))}</div>
      <div><span>${esc(k.category.toUpperCase())}</span><h3>${esc(k.title)}</h3><p>${esc(k.author)}</p></div>
    </div>`).join('');
}

/* ---------- BOOKS ---------- */
async function books() {
  $('.book-tools').insertAdjacentHTML('afterend', `
    <form class="admin-form" id="book-form">
      <input name="title" placeholder="Title" required><input name="author" placeholder="Author" required>
      <input name="category" placeholder="Category"><input name="copies" type="number" min="1" placeholder="Copies">
      <button>Add Book</button></form>`);
  $('#book-form').onsubmit = act(async (e) => {
    e.preventDefault();
    await send('POST', '/api/books', Object.fromEntries(new FormData(e.target)));
    e.target.reset(); draw();
  });
  let all = [];
  const draw = async () => {
    all = await get('/api/books');
    setText('count-books', all.reduce((s, x) => s + x.copies, 0));
    show();
  };
  const show = () => {
    const q = $('#search').value.toLowerCase(), c = $('#category').value;
    const list = all.filter((b) => (c === 'All Categories' || b.category === c) &&
      (b.title + b.author + b.category).toLowerCase().includes(q));
    $('#books-list').innerHTML = list.map((b, n) => `
    <article class="library-book">
      <div class="large-cover cover-${covers[n % 4]}"><span>${pad(n + 1)}</span><h2>${esc(b.title)}</h2><small>${esc(b.category.toUpperCase())}</small></div>
      <div class="library-book-info">
        <div class="book-top"><span class="available">${b.available > 0 ? 'Available' : 'All Issued'}</span><span class="book-id">ID: ${esc(b.id)}</span></div>
        <h2>${esc(b.title)}</h2><p class="author">${esc(b.author)}</p>
        <p class="description">${esc(b.description)}</p>
        <div class="book-details">
          <div><span>Category</span><strong>${esc(b.category)}</strong></div>
          <div><span>Copies</span><strong>${pad(b.available)}/${pad(b.copies)}</strong></div>
        </div>
        <button class="mini-btn del" onclick="delItem('books','${b.id}')">Delete</button>
      </div></article>`).join('') || '<p class="empty">No books found.</p>';
  };
  $('#search').oninput = show; $('#category').onchange = show;
  window.delItem = act(async (col, id) => { await send('DELETE', `/api/${col}/${id}`); draw(); });
  draw();
}

/* ---------- MEMBERS ---------- */
async function members() {
  $('.member-search').insertAdjacentHTML('afterend', `
    <form class="admin-form" id="member-form">
      <input name="name" placeholder="Full name" required><input name="department" placeholder="Department">
      <button>Add Member</button></form>`);
  $('#member-form').onsubmit = act(async (e) => {
    e.preventDefault();
    await send('POST', '/api/members', Object.fromEntries(new FormData(e.target)));
    e.target.reset(); draw();
  });
  let m = [], iss = [];
  const draw = async () => {
    [m, iss] = await Promise.all([get('/api/members'), get('/api/issues')]);
    setText('m-total', m.length); setText('m-active', m.filter((x) => x.status === 'Active').length);
    show();
  };
  const show = () => {
    const q = $('#search').value.toLowerCase();
    $('#members-list').innerHTML = m.filter((x) => (x.name + x.id).toLowerCase().includes(q)).map((x, n) => `
    <article class="member-card">
      <div class="member-top"><div class="member-avatar avatar-${avatars[n % 6]}">${esc(ini(x.name))}</div>
        <span class="member-status ${x.status === 'Active' ? '' : 'inactive'}">${esc(x.status)}</span></div>
      <h2>${esc(x.name)}</h2><p class="member-role">Student</p>
      <div class="member-info">
        <div><span>Member ID</span><strong>${esc(x.id)}</strong></div>
        <div><span>Department</span><strong>${esc(x.department)}</strong></div>
      </div>
      <div class="member-books"><span>Books Issued</span><strong>${pad(iss.filter((i) => i.memberId === x.id && !i.returned).length)}</strong></div>
      <button class="mini-btn del" onclick="delItem('members','${x.id}')">Delete</button>
    </article>`).join('') || '<p class="empty">No members found.</p>';
  };
  $('#search').oninput = show;
  window.delItem = act(async (col, id) => { await send('DELETE', `/api/${col}/${id}`); draw(); });
  draw();
}

/* ---------- ISSUED ---------- */
async function issued() {
  $('.issued-summary').insertAdjacentHTML('beforebegin', `
    <form class="admin-form" id="issue-form"><select name="bookId" id="sel-book"></select>
      <select name="memberId" id="sel-member"></select><button>Issue Book</button></form>`);
  $('#issue-form').onsubmit = act(async (e) => {
    e.preventDefault();
    await send('POST', '/api/issue', Object.fromEntries(new FormData(e.target))); draw();
  });
  window.giveBack = act(async (id) => { await send('POST', `/api/return/${id}`); draw(); });
  const draw = async () => {
    const [b, m, i] = await Promise.all([get('/api/books'), get('/api/members'), get('/api/issues')]);
    $('#sel-book').innerHTML = b.map((x) => `<option value="${x.id}">${esc(x.title)} (${x.available} left)</option>`).join('');
    $('#sel-member').innerHTML = m.map((x) => `<option value="${x.id}">${esc(x.name)} (${x.id})</option>`).join('');
    const open = i.filter((x) => !x.returned), over = open.filter((x) => state(x) === 'overdue').length;
    setText('i-head', open.length); setText('i-total', open.length);
    setText('i-ontime', open.length - over); setText('i-over', pad(over));
    $('#issued-body').innerHTML = i.slice().reverse().map((x) => `<tr>
      <td><div class="book-name"><div class="mini-book">${esc(ini(x.bookTitle))}</div><div><strong>${esc(x.bookTitle)}</strong><span>${esc(x.bookId)}</span></div></div></td>
      <td><div class="member-name"><strong>${esc(x.memberName)}</strong><span>${esc(x.memberId)}</span></div></td>
      <td>${fmt(x.issued)}</td><td>${fmt(x.due)}</td>
      <td><span class="status ${state(x)}">${label[state(x)]}</span>
        ${x.returned ? '' : `<button class="mini-btn" onclick="giveBack('${x.id}')">Return</button>`}</td></tr>`).join('')
      || '<tr><td colspan="5" class="empty">No records yet.</td></tr>';
  };
  draw();
}

const page = location.pathname.split('/').pop() || 'index.html';
({ 'index.html': home, 'books.html': books, 'members.html': members, 'issued.html': issued }[page] || (() => {}))();
