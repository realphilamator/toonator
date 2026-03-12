"use client";
import { useEffect } from "react";
export default function Includes() {
  useEffect(() => {
    async function load() {
      const [header, footer, donate, modal] = await Promise.all([
        fetch("/includes/header.html").then((r) => r.text()),
        fetch("/includes/footer.html").then((r) => r.text()),
        fetch("/includes/donate.html").then((r) => r.text()),
        fetch("/includes/auth-modal.html").then((r) => r.text()),
      ]);
      const headerEl = document.getElementById("header_placeholder");
      if (headerEl) headerEl.innerHTML = header;
      const footerEl = document.getElementById("footer_placeholder");
      if (footerEl) footerEl.innerHTML = footer;
      const donateEl = document.getElementById("donate_placeholder");
      if (donateEl) donateEl.innerHTML = donate;
      if (modal) document.body.insertAdjacentHTML("beforeend", modal);

      // Call updateAuthUI after header is in the DOM
      if (typeof window.updateAuthUI === 'function') {
        window.updateAuthUI();
      } else {
        // auth.js might not be ready yet — wait for it
        const interval = setInterval(() => {
          if (typeof window.updateAuthUI === 'function') {
            window.updateAuthUI();
            clearInterval(interval);
          }
        }, 50);
      }
    }
    load();
  }, []);
  return null;
}