// 볼트 페이지 로직: 항목을 복호화해 표시하고, 추가/수정/삭제를 처리한다.

const FIELDS = ["title", "username", "password", "url", "category"];

let encKey = loadEncKey();
const errorEl = document.getElementById("error");
const listEl = document.getElementById("item-list");
const form = document.getElementById("item-form");

// encKey가 없으면(세션 만료/직접 접근) 다시 로그인
if (encKey === null) {
  window.location.href = "/login";
}

function setError(msg) {
  errorEl.textContent = msg || "";
}

function readForm() {
  const obj = {};
  for (const f of FIELDS) obj[f] = document.getElementById(f).value;
  return obj;
}

function resetForm() {
  document.getElementById("item-id").value = "";
  for (const f of FIELDS) document.getElementById(f).value = "";
  document.getElementById("form-title").textContent = "새 항목 추가";
  document.getElementById("submit-btn").textContent = "추가";
  document.getElementById("cancel-edit").style.display = "none";
}

async function loadItems() {
  setError("");
  const res = await fetch("/vault/items");
  if (!res.ok) {
    setError("목록을 불러오지 못했습니다.");
    return;
  }
  const items = await res.json();
  listEl.innerHTML = "";
  for (const item of items) {
    let data;
    try {
      data = await decryptItem(encKey, item.ciphertext, item.nonce);
    } catch (e) {
      data = { title: "(복호화 실패)" };
    }
    const li = document.createElement("li");
    const info = document.createElement("span");
    info.textContent =
      `${data.title || ""} | ${data.username || ""} | ${data.password || ""} | ` +
      `${data.url || ""} | ${data.category || ""}`;
    const editBtn = document.createElement("button");
    editBtn.textContent = "수정";
    editBtn.addEventListener("click", () => startEdit(item.id, data));
    const delBtn = document.createElement("button");
    delBtn.textContent = "삭제";
    delBtn.addEventListener("click", () => removeItem(item.id));
    li.append(info, editBtn, delBtn);
    listEl.appendChild(li);
  }
}

function startEdit(id, data) {
  document.getElementById("item-id").value = id;
  for (const f of FIELDS) document.getElementById(f).value = data[f] || "";
  document.getElementById("form-title").textContent = "항목 수정";
  document.getElementById("submit-btn").textContent = "수정 저장";
  document.getElementById("cancel-edit").style.display = "inline";
}

async function removeItem(id) {
  setError("");
  const res = await fetch(`/vault/items/${id}`, { method: "DELETE" });
  if (res.status === 204) {
    await loadItems();
  } else {
    setError("삭제에 실패했습니다.");
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  setError("");
  try {
    const payload = await encryptItem(encKey, readForm());
    const id = document.getElementById("item-id").value;
    const res = id
      ? await fetch(`/vault/items/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      : await fetch("/vault/items", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
    if (res.ok) {
      resetForm();
      await loadItems();
    } else {
      setError("저장에 실패했습니다.");
    }
  } catch (err) {
    setError("오류: " + err.message);
  }
});

document.getElementById("cancel-edit").addEventListener("click", resetForm);

document.getElementById("logout-btn").addEventListener("click", async () => {
  await fetch("/logout", { method: "POST" });
  clearEncKey();
  window.location.href = "/login";
});

loadItems();
