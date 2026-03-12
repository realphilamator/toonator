// ============================================================
// Auth State & Config
// ============================================================

let authMode = "login";

// ============================================================
// XSS FIX: escape all user-supplied strings before inserting
// into innerHTML. Used in updateAuthUI() for username.
// ============================================================
function escapeHTML(str) {
  const d = document.createElement("div");
  d.textContent = str ?? "";
  return d.innerHTML;
}

async function updateAuthUI() {
  const {
    data: { user },
  } = await db.auth.getUser();

  const guestItems = document.querySelectorAll("#guest_join, #guest_login");
  const authItems = document.querySelectorAll(".auth_only");

  if (user) {
    const username = user.user_metadata?.username || user.email;
    const escaped = escapeHTML(username);

    // Show auth menu, hide guest menu
    guestItems.forEach((item) => (item.style.display = "none"));
    authItems.forEach((item) => (item.style.display = ""));

    // Update links
    const profileLink = document.querySelector(".profile_link");
    const fansLink = document.querySelector(".fans_link");
    const myToonsLink = document.querySelector(".my_toons_link");

    const profileUrl = `/user/${escaped}`;
    if (profileLink) {
      profileLink.href = profileUrl;
      profileLink.textContent = escaped;
    }
    if (fansLink) fansLink.href = `/user/${escaped}/fans/`;
    if (myToonsLink) myToonsLink.href = profileUrl;
  } else {
    // Show guest menu, hide auth menu
    guestItems.forEach((item) => (item.style.display = ""));
    authItems.forEach((item) => (item.style.display = "none"));
  }

  setupHeaderEvents();

  // Show menu now that auth state is set
  const menu = document.getElementById("newmenu");
  if (menu) menu.style.display = "";
}

function setupHeaderEvents() {
  // Join button
  document.getElementById("join_btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuth("join");
  });

  // Login button
  document.getElementById("login_btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    showAuth("login");
  });

  // Logout button
  document.getElementById("logout_btn")?.addEventListener("click", (e) => {
    e.preventDefault();
    signOut();
  });

  // Account dropdown
  const accountLi = document.getElementById("account");

  if (accountLi) {
    accountLi.addEventListener("mouseenter", () => {
      const menu = accountLi.querySelector("ul");
      if (menu) menu.style.display = "block";
    });

    accountLi.addEventListener("mouseleave", () => {
      const menu = accountLi.querySelector("ul");
      if (menu) menu.style.display = "none";
    });
  }
}

async function signOut() {
  await db.auth.signOut();
  updateAuthUI();
}

function showAuth(mode) {
  authMode = mode;

  if (mode === "join") {
    window.location.href = "/register/";
    return;
  }

  const modal = document.getElementById("authModal");
  modal.style.display = "block";
  document.getElementById("authError").innerText = "";
  document.getElementById("authEmail").value = "";
  document.getElementById("authPassword").value = "";
}

function closeAuth() {
  document.getElementById("authModal").style.display = "none";
}

async function submitAuth() {
  const email = document.getElementById("authEmail").value.trim();
  const password = document.getElementById("authPassword").value;
  const errorEl = document.getElementById("authError");

  if (!email || !password) {
    errorEl.textContent = "Please enter your email and password.";
    return;
  }

  let result;
  if (authMode === "join") {
    result = await db.auth.signUp({ email, password });
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
  const el = document.getElementById("signin-old");
  if (el) el.classList.toggle("hidden");
}

// ============================================================
// Auto-initialize auth UI on all pages
// ============================================================

async function waitForDb(maxWait = 5000) {
  const start = Date.now();
  while (!window.db && Date.now() - start < maxWait) {
    await new Promise((r) => setTimeout(r, 10));
  }
  return window.db;
}

document.addEventListener("DOMContentLoaded", async () => {
  await waitForDb();
  updateAuthUI();
});
