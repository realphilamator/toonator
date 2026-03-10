const RUSSIAN_USERS_CACHE = {};

async function colorRussianUsernames() {
  const usernameEls = document.querySelectorAll('a.username');
  if (!usernameEls.length) return;

  const usernames = [...new Set(
    [...usernameEls]
      .map(el => el.textContent.trim())
      .filter(Boolean)
      // FIX: only send usernames that look like valid usernames to the API.
      // This prevents a secondary XSS vector where a malicious string injected
      // into a .username element gets forwarded to the backend as an API param.
      .filter(u => /^[a-zA-Z0-9_\- ]{1,50}$/.test(u))
  )];

  await Promise.all(usernames.map(async (uname) => {
    try {
      if (RUSSIAN_USERS_CACHE[uname] === undefined) {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_by_username`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ p_username: uname })
        });
        const data = await res.json();
        RUSSIAN_USERS_CACHE[uname] = data?.[0]?.russian || false;
      }

      if (RUSSIAN_USERS_CACHE[uname]) {
        document.querySelectorAll('a.username').forEach(el => {
          if (el.textContent.trim() === uname) el.classList.add('russian');
        });
      }
    } catch (e) {}
  }));
}

function observeAndColorUsernames() {
  colorRussianUsernames();
  const observer = new MutationObserver(() => colorRussianUsernames());
  observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', observeAndColorUsernames);