(() => {
  const AUTH_KEY = "renewable-study-auth-until";
  const PASSWORD_HASH = "a54641e4a7cb9e44720c8d0d53b640ce3ab4d40d9dd3ed655055b91bcd5ba062";
  const REMEMBER_MS = 30 * 24 * 60 * 60 * 1000;

  if (Number(localStorage.getItem(AUTH_KEY)) > Date.now()) return;

  document.documentElement.style.visibility = "hidden";

  const hash = async (value) => {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  };

  window.addEventListener("DOMContentLoaded", () => {
    document.body.innerHTML = `
      <main class="auth-screen">
        <form class="auth-card" id="auth-form">
          <div class="auth-icon" aria-hidden="true">☀</div>
          <h1>신재생에너지 산업기사 공부방</h1>
          <p>개인 학습 페이지입니다. 비밀번호를 입력해 주세요.</p>
          <label for="auth-password">비밀번호</label>
          <input id="auth-password" type="password" inputmode="numeric"
                 autocomplete="current-password" maxlength="12" required autofocus>
          <button type="submit">공부 시작하기</button>
          <div id="auth-error" role="alert" aria-live="polite"></div>
        </form>
      </main>`;

    const style = document.createElement("style");
    style.textContent = `
      html{visibility:visible!important}*{box-sizing:border-box}
      body{margin:0;background:#f4f6fa;color:#172033;font-family:system-ui,-apple-system,'Noto Sans KR',sans-serif}
      .auth-screen{min-height:100vh;display:grid;place-items:center;padding:20px}
      .auth-card{width:min(100%,390px);background:#fff;border:1px solid #e2e7ef;border-radius:20px;padding:32px;box-shadow:0 18px 50px rgba(23,32,51,.12)}
      .auth-icon{width:52px;height:52px;display:grid;place-items:center;margin-bottom:18px;border-radius:16px;background:#fff3cc;color:#9a6400;font-size:28px}
      .auth-card h1{font-size:21px;margin:0 0 8px}.auth-card p{color:#687386;font-size:14px;line-height:1.55;margin:0 0 24px}
      .auth-card label{display:block;font-size:13px;font-weight:700;margin-bottom:7px}
      .auth-card input{width:100%;border:1px solid #cfd6e3;border-radius:11px;padding:13px;font-size:18px;letter-spacing:.18em;outline:none}
      .auth-card input:focus{border-color:#2457e6;box-shadow:0 0 0 3px rgba(36,87,230,.12)}
      .auth-card button{width:100%;border:0;border-radius:11px;background:#2457e6;color:#fff;padding:13px;margin-top:12px;font-size:15px;font-weight:750;cursor:pointer}
      #auth-error{min-height:20px;color:#b22939;font-size:13px;margin-top:10px;text-align:center}`;
    document.head.appendChild(style);
    document.documentElement.style.visibility = "visible";

    const form = document.getElementById("auth-form");
    const password = document.getElementById("auth-password");
    const error = document.getElementById("auth-error");

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      error.textContent = "";
      if ((await hash(password.value)) !== PASSWORD_HASH) {
        password.value = "";
        password.focus();
        error.textContent = "비밀번호가 올바르지 않습니다.";
        return;
      }
      localStorage.setItem(AUTH_KEY, String(Date.now() + REMEMBER_MS));
      location.reload();
    });
  });
})();
