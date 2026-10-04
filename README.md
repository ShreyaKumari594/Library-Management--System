# LibraNest – Library Management System

Full stack project: **Node.js + Express** backend (JSON file storage) and an HTML/CSS/JavaScript frontend.

## Structure
```
server.js            # REST API + serves /frontend
frontend/
  index.html books.html members.html issued.html profile.html rules.html
  css/style.css      # your main stylesheet
  css/extra.css      # small styles for the add/issue forms
  js/app.js          # fetches data from the API and renders the pages
```

## Run
```bash
npm install
npm start      # http://localhost:3000
```

## API
GET /api/books | /api/members | /api/issues  
POST /api/books, /api/members, /api/issue, /api/return/:id  
DELETE /api/books/:id, /api/members/:id
