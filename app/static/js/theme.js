(() => {
  const key = "lazypassword-theme";
  const root = document.documentElement;

  // 스타일시트보다 먼저 저장된 모드를 적용해 첫 화면이 깜박이지 않게 한다.
  try {
    root.dataset.theme = localStorage.getItem(key) === "dark" ? "dark" : "light";
  } catch {
    // 저장소를 사용할 수 없으면 HTML에 지정한 기본 모드를 쓴다.
  }

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.querySelector(".theme-toggle");
    if (!button) return;
    const label = button.querySelector(".theme-label");

    function applyTheme(theme) {
      root.dataset.theme = theme;
      const nextMode = theme === "dark" ? "화이트 모드" : "블랙 모드";
      label.textContent = nextMode;
      button.setAttribute("aria-label", nextMode + "로 전환");
      button.title = nextMode + "로 전환";
    }

    applyTheme(root.dataset.theme);
    button.addEventListener("click", () => {
      const theme = root.dataset.theme === "dark" ? "light" : "dark";
      applyTheme(theme);
      try {
        localStorage.setItem(key, theme);
      } catch {
        // 브라우저가 저장을 막으면 현재 페이지에서만 적용된다.
      }
    });

    window.addEventListener("storage", (event) => {
      if (event.key === key || event.key === null) {
        applyTheme(event.newValue === "dark" ? "dark" : "light");
      }
    });
  });
})();
