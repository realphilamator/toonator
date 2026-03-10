let authMode = 'login';

// ============================================================
// XSS FIX: escape all user-supplied strings before inserting
// into innerHTML. Used in updateAuthUI() for username.
// ============================================================
function escapeHTML(str) {
  const d = document.createElement('div');
  d.textContent = str ?? '';
  return d.innerHTML;
}

async function updateAuthUI() {
  const { data: { user } } = await db.auth.getUser();
  const menu = document.getElementById('newmenu');
  if (!menu) return;

  if (user) {
    // FIX: escape username before injecting into innerHTML —
    // a malicious username like <script>... would execute on every page otherwise.
    const rawUsername = user.user_metadata?.username || user.email;
    const username = escapeHTML(rawUsername);

    menu.innerHTML = `
      <li id="mnumessages">
        <a href="/messages/"><span class="counter"></span></a>
      </li>
      <li id="notify">
        <a href="/notifications/"><span class="counter"></span></a>
      </li>
      <li id="spiders">
        <a href="/user/${username}/fans/"><span class="counter"></span></a>
      </li>
      <li id="account">
        <a href="/user/${username}">${username}</a>
        <ul>
          <li><a href="/user/${username}">My toons</a></li>
          <li><a href="/settings/">Settings</a></li>
          <li><a href="#" onclick="signOut(); return false;">Sign Out</a></li>
        </ul>
      </li>
    `;

    const accountLi = document.getElementById('account');
    accountLi.addEventListener('mouseenter', () => {
      accountLi.querySelector('ul').style.display = 'block';
    });
    accountLi.addEventListener('mouseleave', () => {
      accountLi.querySelector('ul').style.display = 'none';
    });

  } else {
    menu.innerHTML = `
      <li><a href="#" onclick="showAuth('join'); return false;">Регистрация</a></li>
      <li><a href="#" onclick="showAuth('login'); return false;">Войти</a></li>
    `;
  }
}

async function signOut() {
  await db.auth.signOut();
  updateAuthUI();
}

function showAuth(mode) {
  authMode = mode;

  if (mode === 'join') {
    window.location.href = '/register/';
    return;
  }

  const modal = document.getElementById('authModal');
  modal.style.display = 'block';
  document.getElementById('authError').innerText = '';
  document.getElementById('authEmail').value = '';
  document.getElementById('authPassword').value = '';
}

function closeAuth() {
  document.getElementById('authModal').style.display = 'none';
}

async function submitAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const errorEl = document.getElementById('authError');

  if (!email || !password) {
    errorEl.innerText = 'Пожалуйста, введите email и пароль.';
    return;
  }

  let result;
  if (authMode === 'join') {
    result = await db.auth.signUp({ email, password });

    // After signup, set russian = true and username = '005500' in users table
    if (!result.error && result.data?.user) {
      await db.from('users').insert({
        id: result.data.user.id,
        username: '005500',
        russian: true
      });
    }

  } else {
    result = await db.auth.signInWithPassword({ email, password });
  }

  if (result.error) {
    // FIX: use textContent not innerText to prevent any injection via error messages
    errorEl.textContent = result.error.message;
  } else {
    closeAuth();
    updateAuthUI();
  }
}

function toggleOldSignin() {
  const el = document.getElementById('signin-old');
  if (el) el.classList.toggle('hidden');
}