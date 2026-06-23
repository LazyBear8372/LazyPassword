// 볼트 페이지: 항목을 복호화해 카드로 표시하고, 추가/수정/삭제/검색을 처리한다.

const FIELDS = ["title", "username", "password", "url", "category"];

let encKey = loadEncKey();
let allItems = []; // { id, data } 복호화된 항목을 메모리에 보관(검색용)

const errorEl = document.getElementById("error");
const listEl = document.getElementById("item-list");
const form = document.getElementById("item-form");
const searchEl = document.getElementById("search");
const details = document.querySelector("details");

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

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    setError("클립보드 복사를 사용할 수 없습니다.");
  }
}

function fieldRow(label, valueEl, ...buttons) {
  const row = document.createElement("div");
  row.className = "card-field";
  const lab = document.createElement("span");
  lab.className = "label";
  lab.textContent = label;
  row.append(lab, valueEl, ...buttons);
  return row;
}

function iconButton(text, onClick) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "icon-btn secondary";
  b.textContent = text;
  b.addEventListener("click", onClick);
  return b;
}

function buildCard(id, data) {
  const li = document.createElement("li");
  const article = document.createElement("article");

  const header = document.createElement("header");
  const title = document.createElement("strong");
  title.textContent = data.title || "(제목 없음)";
  header.appendChild(title);
  if (data.category) {
    const cat = document.createElement("span");
    cat.className = "card-category";
    cat.textContent = "  " + data.category;
    header.appendChild(cat);
  }
  article.appendChild(header);

  if (data.username) {
    const v = document.createElement("span");
    v.className = "value";
    v.textContent = data.username;
    article.appendChild(fieldRow("아이디", v, iconButton("복사", () => copyText(data.username))));
  }

  if (data.password) {
    const v = document.createElement("span");
    v.className = "value";
    v.textContent = "••••••••";
    let shown = false;
    const toggle = iconButton("표시", () => {
      shown = !shown;
      v.textContent = shown ? data.password : "••••••••";
      toggle.textContent = shown ? "숨김" : "표시";
    });
    article.appendChild(
      fieldRow("비밀번호", v, toggle, iconButton("복사", () => copyText(data.password)))
    );
  }

  if (data.url) {
    const a = document.createElement("a");
    a.className = "value";
    a.href = /^https?:\/\//.test(data.url) ? data.url : "https://" + data.url;
    a.target = "_blank";
    a.rel = "noopener";
    a.textContent = data.url;
    article.appendChild(fieldRow("URL", a));
  }

  const footer = document.createElement("footer");
  footer.append(
    iconButton("수정", () => startEdit(id, data)),
    iconButton("삭제", () => removeItem(id))
  );
  article.appendChild(footer);

  li.appendChild(article);
  return li;
}

function renderCards() {
  const q = searchEl.value.trim().toLowerCase();
  listEl.innerHTML = "";
  for (const { id, data } of allItems) {
    const hay = `${data.title || ""} ${data.category || ""}`.toLowerCase();
    if (q && !hay.includes(q)) continue;
    listEl.appendChild(buildCard(id, data));
  }
}

async function loadItems() {
  setError("");
  const res = await fetch("/vault/items");
  if (!res.ok) {
    setError("목록을 불러오지 못했습니다.");
    return;
  }
  const items = await res.json();
  allItems = [];
  for (const item of items) {
    let data;
    try {
      data = await decryptItem(encKey, item.ciphertext, item.nonce);
    } catch {
      data = { title: "(복호화 실패)" };
    }
    allItems.push({ id: item.id, data });
  }
  renderCards();
}

function startEdit(id, data) {
  document.getElementById("item-id").value = id;
  for (const f of FIELDS) document.getElementById(f).value = data[f] || "";
  document.getElementById("form-title").textContent = "항목 수정";
  document.getElementById("submit-btn").textContent = "수정 저장";
  document.getElementById("cancel-edit").style.display = "block";
  details.open = true;
  window.scrollTo({ top: 0, behavior: "smooth" });
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

searchEl.addEventListener("input", renderCards);
document.getElementById("cancel-edit").addEventListener("click", resetForm);
document.getElementById("logout-btn").addEventListener("click", async () => {
  await fetch("/logout", { method: "POST" });
  clearEncKey();
  window.location.href = "/login";
});

loadItems();
