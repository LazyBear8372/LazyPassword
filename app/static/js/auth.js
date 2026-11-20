const form = document.getElementById("auth-form");
const submit = form.querySelector("button[type=submit]");
const errorEl = document.getElementById("error");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submit.disabled) return;
  submit.disabled = true;
  errorEl.textContent = "";

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const endpoint = form.dataset.endpoint;
  const failureMessage = endpoint === "/signup" ? "회원가입에 실패했습니다." : "로그인에 실패했습니다.";

  try {
    const authValue = await deriveAuthValue(password, email);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, auth_value: authValue }),
    });
    if (response.ok) {
      saveEncKey(await deriveEncKey(password, email));
      window.location.href = "/";
      return;
    }

    const data = await response.json().catch(() => ({}));
    errorEl.textContent = typeof data.detail === "string" ? data.detail : failureMessage;
  } catch {
    errorEl.textContent = failureMessage;
  } finally {
    submit.disabled = false;
  }
});
