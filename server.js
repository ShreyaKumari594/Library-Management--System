const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const DB = path.join(__dirname, 'data.json');
const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

const seed = () => ({
  books: [
    { id: 'BK001', title: 'Clean Code', author: 'Robert C. Martin', category: 'Programming', description: 'A practical guide to writing clean, readable and maintainable software.', copies: 8, available: 7 },
    { id: 'BK002', title: 'Atomic Habits', author: 'James Clear', category: 'Self Growth', description: 'Build good habits, break bad ones and improve daily.', copies: 12, available: 11 },
    { id: 'BK003', title: 'Data Science', author: 'John D. Kelleher', category: 'Technology', description: 'Introduction to data science, machine learning and data analysis.', copies: 6, available: 6 },
    { id: 'BK004', title: 'Think Again', author: 'Adam Grant', category: 'Psychology', description: 'Question your assumptions and develop better thinking habits.', copies: 10, available: 10 }
  ],
  members: [
    ['LM1024', 'Laxmi Pandey', 'CSBS', 'Active'], ['LM1025', 'Ananya Sharma', 'CSE', 'Active'],
    ['LM1026', 'Rohan Kumar', 'ECE', 'Active'], ['LM1027', 'Priya Nair', 'IT', 'Inactive'],
    ['LM1028', 'Aryan Verma', 'CS', 'Active'], ['LM1029', 'Sneha Kapoor', 'CSBS', 'Active']
  ].map(([id, name, department, status]) => ({ id, name, department, status })),
  issues: [
    { id: 'i1', bookId: 'BK001', bookTitle: 'Clean Code', memberId: 'LM1024', memberName: 'Laxmi Pandey', issued: day(-5), due: day(9), returned: null },
    { id: 'i2', bookId: 'BK002', bookTitle: 'Atomic Habits', memberId: 'LM1025', memberName: 'Ananya Sharma', issued: day(-20), due: day(-6), returned: null }
  ]
});

const load = () => (fs.existsSync(DB) ? JSON.parse(fs.readFileSync(DB)) : seed());
const save = (d) => fs.writeFileSync(DB, JSON.stringify(d, null, 2));
const nextId = (list, prefix, start) =>
  prefix + (Math.max(start - 1, ...list.map((x) => parseInt(x.id.slice(prefix.length), 10) || 0)) + 1)
    .toString().padStart(prefix === 'BK' ? 3 : 4, '0');

app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

app.get('/api/:col(books|members|issues)', (req, res) => res.json(load()[req.params.col]));

app.post('/api/books', (req, res) => {
  const { title, author, category, copies } = req.body;
  if (!title || !author) return res.status(400).json({ error: 'Title and author are required' });
  const d = load(), n = Math.max(1, parseInt(copies, 10) || 1);
  const book = { id: nextId(d.books, 'BK', 1), title, author, category: category || 'General', description: 'Added to the library collection.', copies: n, available: n };
  d.books.push(book); save(d); res.status(201).json(book);
});

app.post('/api/members', (req, res) => {
  const { name, department } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const d = load();
  const m = { id: nextId(d.members, 'LM', 1000), name, department: department || 'General', status: 'Active' };
  d.members.push(m); save(d); res.status(201).json(m);
});

app.delete('/api/:col(books|members)/:id', (req, res) => {
  const d = load();
  d[req.params.col] = d[req.params.col].filter((x) => x.id !== req.params.id);
  save(d); res.json({ ok: true });
});

app.post('/api/issue', (req, res) => {
  const d = load();
  const book = d.books.find((b) => b.id === req.body.bookId);
  const member = d.members.find((m) => m.id === req.body.memberId);
  if (!book || !member) return res.status(404).json({ error: 'Book or member not found' });
  if (member.status !== 'Active') return res.status(400).json({ error: 'Member is inactive' });
  if (book.available < 1) return res.status(400).json({ error: 'No copies available' });
  book.available--;
  const issue = { id: Date.now().toString(36), bookId: book.id, bookTitle: book.title, memberId: member.id, memberName: member.name, issued: day(0), due: day(14), returned: null };
  d.issues.push(issue); save(d); res.status(201).json(issue);
});

app.post('/api/return/:id', (req, res) => {
  const d = load();
  const issue = d.issues.find((i) => i.id === req.params.id);
  if (!issue || issue.returned) return res.status(400).json({ error: 'Invalid issue record' });
  issue.returned = day(0);
  const book = d.books.find((b) => b.id === issue.bookId);
  if (book) book.available++;
  save(d); res.json(issue);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`LibraNest running at http://localhost:${PORT}`));
