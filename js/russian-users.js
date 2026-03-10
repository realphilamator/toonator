const RUSSIAN_USERS_CACHE = {};

async function colorRussianUsernames() {
  const usernameEls = document.querySelectorAll('a.username');
  if (!usernameEls.length) return;

  const usernames = [...new Set([...usernameEls].map(el => el.textContent.trim()).filter(Boolean))];

  await Promise.all(usernames.map(async (uname) => {
    try {
      if (RUSSIAN_USERS_CACHE[uname] === undefined) {
        // On profile pages, PROFILE_USERNAME is already loaded — use cached result if available
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

// On profile pages, re-run after loadProfile() finishes populating the DOM
function hookProfilePage() {
  if (typeof PROFILE_USERNAME === 'undefined') return;

  // The profile avatar and stats load async; wait for the toons_list to be populated
  const toonsList = document.getElementById('toons_list');
  if (!toonsList) return;

  const profileObserver = new MutationObserver(() => {
    colorRussianUsernames();
  });
  profileObserver.observe(toonsList, { childList: true, subtree: true });
}

document.addEventListener('DOMContentLoaded', () => {
  observeAndColorUsernames();
  hookProfilePage();
});