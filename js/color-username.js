const RUSSIAN_USERS_CACHE = {};

async function colorRussianUsernames() {
  const usernameEls = document.querySelectorAll('a.username:not([data-colored])');
  if (!usernameEls.length) return;

  // Mark immediately to prevent re-processing
  usernameEls.forEach(el => el.setAttribute('data-colored', '1'));

  const usernames = [...new Set(
    [...usernameEls]
      .map(el => {
        // Extract username from href="/user/USERNAME" — more reliable than textContent
        const href = el.getAttribute('href') || '';
        const match = href.match(/\/user\/([^/?#]+)/);
        return match ? decodeURIComponent(match[1]) : null;
      })
      .filter(Boolean)
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
        RUSSIAN_USERS_CACHE[uname] = {
          russian: data?.[0]?.russian || false,
          role: data?.[0]?.role || 'user'
        };
      }
      const cached = RUSSIAN_USERS_CACHE[uname];
      // Match by href instead of textContent
      document.querySelectorAll(`a.username[href="/user/${encodeURIComponent(uname)}"]`).forEach(el => {
        if (cached.role === 'admin') el.classList.add('admin');
        else if (cached.role === 'mod') el.classList.add('mod');
        else if (cached.russian) el.classList.add('russian');
      });
    } catch (e) {}
  }));
}

function observeAndColorUsernames() {
  colorRussianUsernames();
  const observer = new MutationObserver(() => colorRussianUsernames());
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', observeAndColorUsernames);
} else {
  observeAndColorUsernames();
}