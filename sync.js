(() => {
  const SUPABASE_URL = "https://wqweuneidebxaostkpor.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_C9QK99yaSN0gJqZvmLZB_A_W4KEVdaA";
  const LOCAL_STARS_KEY = "pvstars";
  const LOCAL_PROGRESS_KEY = "pvprogress";
  let client;
  let currentUser;
  let syncTimer;
  window.cloudSyncActive = false;
  window.studyProgress = JSON.parse(localStorage.getItem(LOCAL_PROGRESS_KEY) || "{}");

  const syncButton = document.createElement("button");
  syncButton.type = "button";
  syncButton.className = "sync-button";
  syncButton.textContent = "☁ 클라우드 동기화";

  const setStatus = (label, state = "") => {
    syncButton.textContent = label;
    syncButton.dataset.state = state;
  };

  const showMessage = (message, isError = false) => {
    const output = document.getElementById("sync-message");
    if (!output) return;
    output.textContent = message;
    output.classList.toggle("error", isError);
  };

  const closeDialog = () => {
    document.getElementById("sync-dialog")?.close();
  };

  const saveToCloud = async () => {
    if (!currentUser) return;
    setStatus("☁ 저장 중…", "saving");
    const { error } = await client.from("study_progress").upsert({
      user_id: currentUser.id,
      stars: [...stars].sort((a, b) => a - b),
      progress: window.studyProgress,
      updated_at: new Date().toISOString(),
    });
    setStatus(error ? "⚠ 동기화 오류" : "☁ 동기화됨", error ? "error" : "ready");
  };

  const queueSave = () => {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(saveToCloud, 350);
  };

  const loadAndMerge = async () => {
    if (!currentUser) return;
    setStatus("☁ 불러오는 중…", "saving");
    const { data, error } = await client
      .from("study_progress")
      .select("stars, progress")
      .eq("user_id", currentUser.id)
      .maybeSingle();

    if (error) {
      setStatus("⚠ 동기화 오류", "error");
      return;
    }

    const merged = new Set([...stars, ...(data?.stars || [])].map(Number));
    stars = merged;
    localStorage.setItem(LOCAL_STARS_KEY, JSON.stringify([...stars]));
    const remoteProgress = data?.progress || {};
    const localProgress = window.studyProgress || {};
    for (const [id, remoteEntry] of Object.entries(remoteProgress)) {
      const localEntry = localProgress[id];
      if (!localEntry || (remoteEntry.updatedAt || 0) > (localEntry.updatedAt || 0)) {
        localProgress[id] = remoteEntry;
      }
    }
    window.studyProgress = localProgress;
    localStorage.setItem(LOCAL_PROGRESS_KEY, JSON.stringify(localProgress));
    window.refreshCurrentStudyView?.();
    if (!window.refreshCurrentStudyView) render();
    await saveToCloud();
  };

  const updateSession = async (session) => {
    currentUser = session?.user || null;
    window.cloudSyncActive = Boolean(currentUser);
    if (!currentUser) {
      setStatus("☁ 클라우드 동기화");
      syncButton.title = "휴대폰과 PC의 즐겨찾기를 동기화합니다";
      window.render?.();
      return;
    }
    syncButton.title = `${currentUser.email} · 클릭하면 로그아웃`;
    await loadAndMerge();
    window.render?.();
  };

  const openLogin = () => {
    const dialog = document.getElementById("sync-dialog");
    showMessage("");
    dialog.showModal();
    document.getElementById("sync-email").focus();
  };

  const addUi = () => {
    const tools = document.querySelector(".tools");
    if (!tools) return false;
    tools.appendChild(syncButton);

    const dialog = document.createElement("dialog");
    dialog.id = "sync-dialog";
    dialog.innerHTML = `
      <form id="sync-form" class="sync-card">
        <button type="button" class="sync-close" aria-label="닫기">×</button>
        <h2>휴대폰·PC 동기화</h2>
        <p>두 기기에서 같은 이메일로 로그인하면 즐겨찾기가 자동으로 합쳐집니다.</p>
        <label for="sync-email">이메일</label>
        <input id="sync-email" type="email" autocomplete="email" required placeholder="name@example.com">
        <button class="primary sync-submit" type="submit">로그인 링크 받기</button>
        <div id="sync-message" role="status" aria-live="polite"></div>
      </form>`;
    document.body.appendChild(dialog);

    const style = document.createElement("style");
    style.textContent = `
      .sync-button[data-state="ready"]{color:#087a55;border-color:#8fd3ba}
      .sync-button[data-state="error"]{color:#b22939;border-color:#e2a4ad}
      #sync-dialog{border:0;border-radius:18px;padding:0;width:min(92vw,410px);box-shadow:0 22px 70px rgba(10,20,40,.24)}
      #sync-dialog::backdrop{background:rgba(10,20,40,.48)}
      .sync-card{position:relative;padding:28px}.sync-card h2{margin:0 0 8px;font-size:21px}.sync-card p{color:#687386;font-size:14px;line-height:1.55;margin:0 0 20px}
      .sync-card label{display:block;font-size:13px;font-weight:700;margin-bottom:7px}.sync-card input{width:100%;padding:12px;border:1px solid #cfd6e3;border-radius:10px;font-size:16px}
      .sync-submit{width:100%;margin-top:11px}.sync-close{position:absolute;right:14px;top:12px;border:0;background:none;font-size:24px;color:#687386}
      #sync-message{min-height:21px;margin-top:10px;font-size:13px;color:#087a55;text-align:center}#sync-message.error{color:#b22939}`;
    document.head.appendChild(style);

    dialog.querySelector(".sync-close").addEventListener("click", closeDialog);
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog();
    });
    document.getElementById("sync-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const email = document.getElementById("sync-email").value.trim();
      showMessage("로그인 링크를 보내는 중입니다…");
      const { error } = await client.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: "https://aimtop7456-svg.github.io/study/" },
      });
      showMessage(
        error ? `전송하지 못했습니다: ${error.message}` : "이메일을 확인해 로그인 링크를 눌러 주세요.",
        Boolean(error),
      );
    });
    return true;
  };

  const start = async () => {
    if (!addUi() || !window.supabase?.createClient) return;
    client = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

    const originalStar = window.star;
    window.star = (id) => {
      originalStar(id);
      queueSave();
    };
    window.addEventListener("study-progress-changed", queueSave);

    syncButton.addEventListener("click", async () => {
      if (!currentUser) {
        openLogin();
        return;
      }
      if (confirm(`${currentUser.email} 동기화를 종료할까요?`)) {
        await client.auth.signOut();
      }
    });

    client.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => updateSession(session), 0);
    });
    const { data } = await client.auth.getSession();
    await updateSession(data.session);
  };

  start();
})();
