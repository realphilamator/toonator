# Toonator — Next.js Migration

This is the Next.js fork of the homepage and user profile page.

## Structure

```
src/
  app/
    layout.jsx              # Root layout (loads your existing CSS files)
    page.jsx                # Homepage (replaces index.html + home-page.js)
    user/[username]/
      page.jsx              # User profile server component
      ProfileClient.jsx     # Interactive tabs, avatar change, auth check
  components/
    ToonCard.jsx            # Shared toon card (used on both pages)
  lib/
    supabase.js             # Supabase client
    api.js                  # All data fetching (mirrors your api.js)
  styles/
    globals.css             # Next.js global styles
```

## Key differences from the original

| Original | Next.js |
|---|---|
| `index.html` + `home-page.js` | `app/page.jsx` (server component) |
| `user.html` + `user-page.js` | `app/user/[username]/page.jsx` + `ProfileClient.jsx` |
| Manual DOM manipulation | React state + JSX |
| `loadIncludes()` for header/footer | `layout.jsx` handles shell |
| `?username=` query param routing | File-based `/user/[username]` routing |

## What's NOT migrated yet

- `i18n` (translations) — currently hardcoded English strings
- `colorUsernames()` — you'll want to port this as a React hook or component
- Header / footer includes
- Paginator on album tab
- Good Place feature

## Getting started

```bash
npm install
npm run dev
```

Your existing CSS files go in `/public/css/` as before — Next.js serves the `/public` folder statically.
