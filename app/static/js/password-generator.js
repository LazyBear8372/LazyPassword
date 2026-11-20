(() => {
  const generator = document.querySelector(".password-generator");
  if (!generator) return;

  const toggle = generator.querySelector(".password-generator-toggle");
  const panel = generator.querySelector(".password-generator-panel");
  const preview = panel.querySelector(".password-generator-value");
  const slider = panel.querySelector('input[type="range"]');
  const count = panel.querySelector(".password-generator-count");
  const options = panel.querySelector(".password-generator-options");
  const regenerate = panel.querySelector(".password-regenerate");
  const copy = panel.querySelector(".password-copy");
  const status = panel.querySelector(".password-generator-status");
  const characterSets = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()-_=+[]{};:,.?/",
  };

  function generatePassword(length, sets) {
    const alphabet = sets.join("");
    const limit = 256 - (256 % alphabet.length);
    let password;

    // 나머지 연산의 편향을 없애고, 선택한 종류가 모두 들어간 결과만 사용한다.
    do {
      password = "";
      while (password.length < length) {
        const bytes = crypto.getRandomValues(new Uint8Array(length - password.length));
        for (const byte of bytes) {
          if (byte < limit) password += alphabet[byte % alphabet.length];
        }
      }
    } while (!sets.every((set) => [...password].some((character) => set.includes(character))));

    return password;
  }

  function updatePassword() {
    const length = slider.valueAsNumber;
    const sets = Array.from(options.querySelectorAll("input:checked"), (option) =>
      characterSets[option.value]
    );

    count.textContent = `${length}자`;
    regenerate.disabled = copy.disabled = sets.length === 0;
    preview.value = sets.length ? generatePassword(length, sets) : "";
    status.textContent = sets.length ? "" : "문자 종류를 하나 이상 선택하세요.";
  }

  function close() {
    panel.hidden = true;
    toggle.setAttribute("aria-expanded", "false");
    preview.value = "";
    status.textContent = "";
  }

  toggle.addEventListener("click", () => {
    if (panel.hidden) {
      updatePassword();
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
    } else {
      close();
    }
  });

  document.addEventListener("click", (event) => {
    if (!panel.hidden && !generator.contains(event.target)) close();
  });

  generator.addEventListener("focusout", (event) => {
    if (!panel.hidden && event.relatedTarget && !generator.contains(event.relatedTarget)) close();
  });

  generator.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || panel.hidden) return;
    event.preventDefault();
    toggle.focus();
    close();
  });

  slider.addEventListener("input", updatePassword);
  options.addEventListener("change", updatePassword);
  regenerate.addEventListener("click", updatePassword);
  copy.addEventListener("click", async () => {
    const password = preview.value;
    let copied = false;
    try {
      await navigator.clipboard.writeText(password);
      copied = true;
    } catch {
      // 클립보드 접근이 차단된 경우 수동 복사할 수 있게 선택한다.
    }

    if (panel.hidden || preview.value !== password) return;
    if (!copied) {
      preview.focus();
      preview.select();
    }
    status.textContent = copied ? "복사했습니다." : "선택된 비밀번호를 직접 복사하세요.";
  });
})();
