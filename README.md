# Priyanshu's Blog — AI-Powered Blog Platform

**A complete multi-user blogging website where visitors read published articles, members publish content (AI-generated or written by hand), and administrators control everything from a built-in admin panel.**

> IGNOU BCA Final-Semester Project (BCSP-064)
> Stack: **Node.js · Express.js · EJS · MongoDB · Groq API**

---

## 1. What it does

- **Public blog site** — a homepage feed of published articles, category browsing, search, and a clean reading page for every post.
- **Two ways to publish** — logged-in members can either:
  - **Generate with AI** — enter a topic and get a complete, structured article (supports long-form **2000+ word** posts), or
  - **Write manually** — use a full **rich-text editor** (Quill) with headings, bold/italic/underline, lists, quotes, links, images, code blocks and alignment.
- **Safe rendering** — all content (AI or manual) is **sanitised** on the server before it is stored, so user HTML can never inject scripts (XSS-safe).
- **SEO everywhere** — each blog gets a clean slug, meta description, keywords and **Open Graph** tags, and the site exposes a **/sitemap.xml**.
- **Role-based access** — ordinary **members** vs **administrators**.
- **Admin panel** — statistics dashboard, manage users (add, ban/un-ban, delete), per-user blog counts, moderate all blogs, **create more administrators**, and **update API keys + AI model** at run time.

---

## 2. Technology used

| Layer             | Technology                                 |
| ----------------- | ------------------------------------------ |
| Runtime           | Node.js (>= 18)                            |
| Web framework     | Express.js                                 |
| Views             | EJS (server-rendered)                      |
| Database          | MongoDB + Mongoose                         |
| AI content        | Groq API (`llama-3.3-70b-versatile`)       |
| Rich-text editor  | Quill (via CDN)                            |
| HTML sanitisation | sanitize-html                              |
| Images            | Pexels / Pixabay + Sharp                   |
| Auth              | express-session + connect-mongo + bcryptjs |
| Misc              | dotenv, connect-flash, method-override     |

No Redis and no paid services — sessions live in MongoDB and images are stored on disk.

---

## 3. Project structure

```
ai-blog-platform/
├── server.js                  # entry point + bootstrap seeding
├── config/db.js               # MongoDB connection
├── models/                    # User, Blog, Category, Setting
├── middleware/                # auth.js (login), roles.js (admin RBAC)
├── services/                  # groq, image, seo, sanitize, settings
├── controllers/               # auth, public, blog (member), admin
├── routes/                    # auth, public, blog, admin
├── views/
│   ├── partials/              # header (SEO/OG), nav, footer, flash
│   ├── public/                # home, blog, search, category
│   ├── auth/                  # login, register
│   ├── member/                # dashboard, generate, write, edit
│   ├── admin/                 # dashboard, users, blogs, settings, admin_nav
│   └── error.ejs
└── public/                    # css, js, uploads/
```

This maps to the modules in the synopsis: User & Auth, Role-Based Access Control, AI Generation, Manual Editor, SEO, Image, Public Site, Blog Management and Admin.

---

## 4. Setup and installation

### Step 1 — Prerequisites

- Install **Node.js 18+** ([nodejs.org](https://nodejs.org))
- Install **MongoDB** locally ([download](https://www.mongodb.com/try/download/community)) **or** create a free cloud DB on **MongoDB Atlas**.

### Step 2 — Free API keys

- **Groq** (AI): [console.groq.com](https://console.groq.com) → API Keys → create key (no card needed).
- **Pexels** (images): [pexels.com/api](https://www.pexels.com/api/) — or Pixabay ([docs](https://pixabay.com/api/docs/), set `IMAGE_PROVIDER=pixabay`).

### Step 3 — Install dependencies

```bash
npm install
```

### Step 4 — Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

```
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/ai_blog_platform
SESSION_SECRET=any_long_random_string
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.3-70b-versatile
IMAGE_PROVIDER=pexels
IMAGE_API_KEY=your_pexels_key
ADMIN_NAME=Super Admin
ADMIN_EMAIL=admin@blogplatform.local
ADMIN_PASSWORD=Admin@12345
```

### Step 5 — Run

```bash
# make sure MongoDB is running, then:
npm start        # or: npm run dev  (auto-restart)
```

Open **http://localhost:3000**.

On first start the app automatically creates the **bootstrap administrator** (from the `ADMIN_*` values above) and a set of default categories.

---

## 5. How to use

**As a visitor:** browse the homepage feed, search, open any article.

**As a member:** register/login → Dashboard → choose **“Generate with AI”** (enter a topic, pick tone/length/category) or **“Write Manually”** (use the rich-text editor). Manage your posts (edit/delete) from the dashboard.

**As an administrator:** log in with the bootstrap admin account. You are taken to **/admin**, where you can:

- view platform statistics (users, blogs, AI vs manual, views),
- manage users (ban/un-ban, delete) and see each user’s blog count,
- moderate (delete) any blog,
- create additional administrators,
- update the Groq/image API keys and AI model — useful when a key expires.

> **Tip:** change the bootstrap admin password after the first login by creating a new admin and removing the default, or by updating the `.env` and re-seeding.

---

## 6. Security

- Passwords hashed with **bcrypt** (never stored in plain text).
- **Session** cookies are `httpOnly` and stored in MongoDB.
- **Role-based access control** guards every `/admin` route; members cannot reach admin pages.
- **HTML sanitisation** (`sanitize-html`) cleans all stored content → no stored XSS.
- A **banned** user is blocked at login and on every request.
- API keys and secrets live in `.env` (git-ignored); run-time keys are admin-only.
- All user input is validated before processing.

---

## 7. SEO features

- Per-blog clean **slug**, **meta description**, **keywords**, and **Open Graph** tags (for social sharing).
- Server-rendered HTML, so search engines receive complete pages.
- A site **/sitemap.xml** listing all published blogs.
- Proper heading structure inside each article.

---

## 8. Testing checklist (for the report)

| Test                                 | Expected                           |
| ------------------------------------ | ---------------------------------- |
| Register / login                     | Works; banned user blocked         |
| Generate AI blog (incl. 2000+ words) | Full article + image + SEO created |
| Write manual blog with formatting    | Saved; renders with formatting     |
| Submit `<script>` in manual content  | Script stripped by sanitiser       |
| Member opens `/admin`                | Redirected / access denied         |
| Admin ban a user                     | User cannot log in                 |
| Admin per-user blog count            | Correct counts shown               |
| Admin update API key                 | New key used for next generation   |
| Open `/sitemap.xml`                  | Valid XML of published blogs       |
| Unknown URL                          | 404 page                           |

---

## 9. Screenshots to capture (for the report)

Public home feed · single blog page · register · login · AI generate form · generated blog · rich-text write page · dashboard · admin dashboard (stats) · admin users page · admin blogs page · admin settings (API keys + create admin) · a sanitised-content example · MongoDB collections in Compass.

---

## 10. Limitations & future scope

**Limitations:** needs internet (AI/image APIs); AI text may need review; free-tier API limits; local image storage suits small/medium scale.

**Future scope:** comments & reactions, multi-language generation, scheduled posts, direct publishing to WordPress, analytics dashboards, cloud image storage.

---

_Built for the IGNOU BCA (BCSP-064) final-semester project._
