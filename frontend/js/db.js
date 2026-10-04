// Talks to the Supabase database directly (replaces the Node/Express server)
if (SUPABASE_URL.includes('YOUR-PROJECT')) alert('Add your Supabase URL and key in js/config.js');
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const ok = ({ data, error }) => {
  if (error) throw new Error(error.code === '23503' ? 'Cannot delete: this record has issue history' : error.message);
  return data;
};

async function get(u) {
  if (u === '/api/books') return ok(await sb.from('books').select('*').order('id'));
  if (u === '/api/members') return ok(await sb.from('members').select('*').order('id'));
  if (u === '/api/issues') {
    const rows = ok(await sb.from('issues')
      .select('id, book_id, member_id, issued, due, returned, books(title), members(name)')
      .order('created_at').order('id'));
    return rows.map((r) => ({
      id: r.id, bookId: r.book_id, bookTitle: r.books.title, memberId: r.member_id,
      memberName: r.members.name, issued: r.issued, due: r.due, returned: r.returned
    }));
  }
}

async function send(method, u, b = {}) {
  const parts = u.split('/'); // ['', 'api', 'books', 'BK001']
  if (method === 'DELETE') return ok(await sb.from(parts[2]).delete().eq('id', parts[3]));
  if (u === '/api/books') {
    if (!b.title || !b.author) throw new Error('Title and author are required');
    const n = Math.max(1, parseInt(b.copies, 10) || 1);
    return ok(await sb.from('books').insert({ title: b.title, author: b.author, category: b.category || 'General',
      description: 'Added to the library collection.', copies: n, available: n }));
  }
  if (u === '/api/members') {
    if (!b.name) throw new Error('Name is required');
    return ok(await sb.from('members').insert({ name: b.name, department: b.department || 'General' }));
  }
  if (u === '/api/issue') return ok(await sb.rpc('issue_book', { p_book: b.bookId, p_member: b.memberId }));
  if (parts[2] === 'return') return ok(await sb.rpc('return_book', { p_issue: parts[3] }));
}
