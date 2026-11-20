// 항목을 브라우저에서 복호화해 카드로 표시하고 검색과 편집을 처리한다.
const FIELDS = ["title", "username", "password", "url", "category"];
const MASKED_PASSWORD = "••••••••";

const encKey = loadEncKey();
const errorEl = document.getElementById("error");
const statusEl = document.getElementById("status");
const listEl = document.getElementById("item-list");
const emptyState = document.getElementById("empty-state");
const searchEl = document.getElementById("search");
const dialog = document.getElementById("item-dialog");
const form = document.getElementById("item-form");
const formTitle = document.getElementById("form-title");
const itemError = document.getElementById("item-error");
const submitButton = document.getElementById("submit-btn");
const cancelButton = document.getElementById("cancel-edit");
const logoutButton = document.getElementById("logout-btn");
const externalLinkIcon = document.getElementById("external-link-icon");

let allItems = [];
let editingId = null;
let latestLoad = 0;

function openEditor(id = null, data = {}) {
  editingId = id;
  form.reset();
  for (const field of FIELDS) {
    document.getElementById(field).value = data[field] || "";
  }
  itemError.textContent = "";
  formTitle.textContent = id === null ? "새 항목 추가" : "항목 수정";
  submitButton.textContent = id === null ? "추가" : "수정 저장";
  dialog.showModal();
}

function readForm() {
  const data = {};
  for (const field of FIELDS) {
    data[field] = document.getElementById(field).value;
  }
  return data;
}

async function copyText(text, label) {
  errorEl.textContent = "";
  statusEl.textContent = "";
  try {
    await navigator.clipboard.writeText(text);
    statusEl.textContent = label + " 복사를 완료했습니다.";
  } catch {
    errorEl.textContent = "클립보드 복사를 사용할 수 없습니다.";
  }
}

function cardButton(text, onClick, variant = "") {
  const button = document.createElement("button");
  button.type = "button";
  button.className = variant ? "button " + variant : "button";
  button.textContent = text;
  button.addEventListener("click", onClick);
  return button;
}

function fieldRow(label, value, ...buttons) {
  const row = document.createElement("div");
  row.className = "card-field";
  const term = document.createElement("dt");
  term.textContent = label;
  const field = document.createElement("dd");
  field.append(value);
  row.append(term, field);
  if (buttons.length) {
    const actions = document.createElement("dd");
    actions.className = "field-actions";
    actions.append(...buttons);
    row.append(actions);
  }
  return row;
}

function buildCard(id, data) {
  const item = document.createElement("li");
  const article = document.createElement("article");
  article.className = "vault-card";

  const heading = document.createElement("div");
  heading.className = "card-heading";
  const title = document.createElement("h2");
  title.textContent = data.title || "(제목 없음)";
  heading.append(title);
  if (data.category) {
    const category = document.createElement("span");
    category.className = "card-category";
    category.textContent = data.category;
    heading.append(category);
  }

  const fields = document.createElement("dl");
  fields.className = "card-fields";
  if (data.username) {
    const copy = cardButton("복사", () => copyText(data.username, "아이디"));
    copy.setAttribute("aria-label", "아이디 복사");
    fields.append(fieldRow("아이디", data.username, copy));
  }
  if (data.password) {
    const value = document.createElement("span");
    value.className = "masked-password";
    value.textContent = MASKED_PASSWORD;
    let shown = false;
    const toggle = cardButton("표시", () => {
      shown = !shown;
      value.classList.toggle("masked-password", !shown);
      value.textContent = shown ? data.password : MASKED_PASSWORD;
      toggle.textContent = shown ? "숨김" : "표시";
      toggle.setAttribute("aria-label", shown ? "비밀번호 숨김" : "비밀번호 표시");
    });
    toggle.setAttribute("aria-label", "비밀번호 표시");
    const copy = cardButton("복사", () => copyText(data.password, "비밀번호"));
    copy.setAttribute("aria-label", "비밀번호 복사");
    fields.append(fieldRow("비밀번호", value, toggle, copy));
  }
  if (data.url) {
    const link = document.createElement("a");
    link.className = "card-url";
    link.href = /^https?:\/\//i.test(data.url) ? data.url : "https://" + data.url;
    link.target = "_blank";
    link.rel = "noopener";
    link.append(data.url, externalLinkIcon.content.cloneNode(true));
    fields.append(fieldRow("URL", link));
  }

  const actions = document.createElement("div");
  actions.className = "card-actions";
  actions.append(
    cardButton("수정", () => openEditor(id, data), "outline"),
    cardButton("삭제", (event) => removeItem(id, event.currentTarget), "danger"),
  );
  article.append(heading);
  if (fields.childElementCount > 0) article.append(fields);
  article.append(actions);
  item.append(article);
  return item;
}

function renderCards() {
  const query = searchEl.value.trim().toLowerCase();
  const matches = allItems.filter(({ data }) => {
    const searchable = `${data.title || ""} ${data.category || ""}`.toLowerCase();
    return searchable.includes(query);
  });

  const cards = document.createDocumentFragment();
  for (const { id, data } of matches) cards.append(buildCard(id, data));
  listEl.replaceChildren(cards);
  emptyState.hidden = matches.length !== 0;
  emptyState.textContent = query ? "검색 결과가 없습니다." : "저장된 항목이 없습니다.";
}

async function loadItems() {
  const load = ++latestLoad;
  errorEl.textContent = "";
  try {
    const response = await fetch("/vault/items");
    if (!response.ok) throw new Error();

    const items = await response.json();
    const decrypted = [];
    for (const item of items) {
      let data;
      try {
        data = await decryptItem(encKey, item.ciphertext, item.nonce);
      } catch {
        data = { title: "(복호화 실패)" };
      }
      decrypted.push({ id: item.id, data });
    }
    if (load === latestLoad) {
      allItems = decrypted;
      renderCards();
    }
  } catch {
    if (load === latestLoad) errorEl.textContent = "목록을 불러오지 못했습니다.";
  }
}

async function removeItem(id, button) {
  button.disabled = true;
  errorEl.textContent = "";
  try {
    const response = await fetch(`/vault/items/${id}`, { method: "DELETE" });
    if (!response.ok) throw new Error();
    await loadItems();
  } catch {
    errorEl.textContent = "삭제에 실패했습니다.";
  } finally {
    button.disabled = false;
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (submitButton.disabled) return;
  itemError.textContent = "";
  submitButton.disabled = true;
  cancelButton.disabled = true;

  try {
    const payload = await encryptItem(encKey, readForm());
    const isNew = editingId === null;
    const response = await fetch(isNew ? "/vault/items" : `/vault/items/${editingId}`, {
      method: isNew ? "POST" : "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error();
    dialog.close();
    await loadItems();
  } catch {
    itemError.textContent = "저장에 실패했습니다.";
  } finally {
    submitButton.disabled = false;
    cancelButton.disabled = false;
  }
});

dialog.addEventListener("cancel", (event) => {
  if (submitButton.disabled) event.preventDefault();
});
dialog.addEventListener("close", () => form.reset());
cancelButton.addEventListener("click", () => dialog.close());
document.getElementById("add-item").addEventListener("click", () => openEditor());
searchEl.addEventListener("input", renderCards);
logoutButton.addEventListener("click", async () => {
  logoutButton.disabled = true;
  try {
    const response = await fetch("/logout", { method: "POST" });
    if (!response.ok) throw new Error();
    clearEncKey();
    window.location.href = "/login";
  } catch {
    errorEl.textContent = "로그아웃에 실패했습니다.";
    logoutButton.disabled = false;
  }
});

if (encKey === null) {
  window.location.href = "/login";
} else {
  loadItems();
}
