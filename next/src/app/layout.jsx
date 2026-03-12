import "@/styles/globals.css";
import Includes from "@/components/Includes";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <link rel="shortcut icon" href="/img/favicon-eyes.png" />
        <link rel="stylesheet" href="/css/style.css" />
        <link rel="stylesheet" href="/css/theme.css" />
        <link rel="stylesheet" href="/css/font.css" />
        <link rel="stylesheet" href="/css/images.css" />
        <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2" defer></script>
        <script src="/js/config.js" type="module" defer></script>
        <script src="/js/auth.js" defer></script>
      </head>
      <body>
        <div id="donate_placeholder" />
        <div id="header_placeholder" />
        <Includes />
        {children}
      </body>
    </html>
  );
}