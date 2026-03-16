const API_BASE = (() => {
  const url = new URL(window.location.href);
  if (url.port && url.port !== "3000") url.port = "3000";
  return url.origin;
})();

async function fetchOrders() {
  const list = document.querySelector("[data-orders-list]");
  const status = document.querySelector("[data-orders-status]");
  if (!list) return;

  list.innerHTML = "";
  if (status) status.textContent = "Loading live orders...";

  try {
    const res = await fetch(`${API_BASE}/orders`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      const message = data.error || "Unable to load orders.";
      if (status) status.textContent = message;
      return;
    }
    const orders = await res.json();
    if (!Array.isArray(orders) || orders.length === 0) {
      if (status) status.textContent = "No orders yet. Create the first one.";
      return;
    }
    if (status) status.textContent = `Showing ${orders.length} active order(s).`;
    orders.slice(0, 6).forEach((order) => {
      const chip = document.createElement("div");
      chip.className = "order-chip";
      chip.innerHTML = `<span>${order.dish || "Untitled dish"}</span><span class="badge">${order.status || "pending"}</span>`;
      list.appendChild(chip);
    });
  } catch (err) {
    if (status) status.textContent = "Kitchen API unreachable. Start the API and refresh.";
  }
}

async function fetchRecipes() {
  const grid = document.querySelector("[data-recipes-grid]");
  const status = document.querySelector("[data-recipes-status]");
  if (!grid) return;

  grid.innerHTML = "";
  if (status) status.textContent = "Loading recipes...";

  try {
    const res = await fetch(`${API_BASE}/recipes`);
    if (!res.ok) {
      if (status) status.textContent = "Unable to load recipes.";
      return;
    }
    const recipes = await res.json();
    if (!Array.isArray(recipes) || recipes.length === 0) {
      if (status) status.textContent = "No recipes available yet.";
      return;
    }
    if (status) status.textContent = `Showing ${recipes.length} recipes.`;
    recipes.forEach((recipe) => {
      const card = document.createElement("div");
      card.className = "card";
      const tags = (recipe.tags || []).slice(0, 3).map((tag) => `<span class="pill">${tag}</span>`).join("");
      card.innerHTML = `
        <a href="recipe.html?id=${encodeURIComponent(recipe.id || "")}">
          <div class="image-card">
            <img src="${recipe.image || "assets/recipe-1.svg"}" alt="${recipe.title || "Recipe"}" />
          </div>
          <h4>${recipe.title || "Untitled recipe"}</h4>
          <p>${recipe.description || "No description provided."}</p>
          <div class="pill-row">${tags}</div>
        </a>
      `;
      grid.appendChild(card);
    });
  } catch (err) {
    if (status) status.textContent = "Kitchen API unreachable. Start the API and refresh.";
  }
}

async function createOrder(event) {
  event.preventDefault();
  const input = document.querySelector("[data-order-input]");
  const status = document.querySelector("[data-order-create-status]");
  if (!input) return;
  const dish = input.value.trim();
  if (!dish) {
    if (status) status.textContent = "Please enter a dish name.";
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dish }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      if (status) status.textContent = data.error || "Order failed.";
      return;
    }
    if (status) status.textContent = "Order sent. Updating live list.";
    input.value = "";
    fetchOrders();
  } catch (err) {
    if (status) status.textContent = "Kitchen API unreachable. Try again later.";
  }
}

function wireOrderForm() {
  const form = document.querySelector("[data-order-form]");
  if (form) form.addEventListener("submit", createOrder);
}

async function fetchRecipeDetail() {
  const detail = document.querySelector("[data-recipe-detail]");
  if (!detail) return;
  const status = document.querySelector("[data-recipe-status]");
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (!id) {
    if (status) status.textContent = "Missing recipe id.";
    return;
  }
  if (status) status.textContent = "Loading recipe...";
  try {
    const res = await fetch(`${API_BASE}/recipes/${encodeURIComponent(id)}`);
    if (!res.ok) {
      if (status) status.textContent = "Recipe not found.";
      return;
    }
    const recipe = await res.json();
    detail.innerHTML = `
      <div class="split">
        <div class="hero-visual">
          <img src="${recipe.image || "assets/recipe-1.svg"}" alt="${recipe.title || "Recipe"}" />
        </div>
        <div>
          <h2 class="section-title">${recipe.title || "Untitled recipe"}</h2>
          <p class="section-lead">${recipe.description || "No description provided."}</p>
          <div class="list">
            <div>Prep time: ${recipe.prepMinutes || 0} minutes</div>
            <div>Calories per serving: ${recipe.calories || 0}</div>
            <div>Tags: ${(recipe.tags || []).join(", ") || "none"}</div>
          </div>
          <div class="hero-cta" style="margin-top: 18px;">
            <a class="button primary" href="dashboard.html">Add to plan</a>
            <a class="button secondary" href="recipes.html">Back to recipes</a>
          </div>
        </div>
      </div>
    `;
    if (status) status.textContent = "";
  } catch (err) {
    if (status) status.textContent = "Kitchen API unreachable. Start the API and refresh.";
  }
}

async function submitAuthForm(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const mode = form.dataset.authMode;
  const status = document.querySelector("[data-auth-status]");
  const payload = {};
  form.querySelectorAll("input").forEach((input) => {
    if (input.name) payload[input.name] = input.value.trim();
  });

  if (status) status.textContent = "Submitting...";
  try {
    const res = await fetch(`${API_BASE}/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (status) status.textContent = data.error || "Authentication failed.";
      return;
    }
    if (data.token) localStorage.setItem("kitchen_token", data.token);
    if (status) status.textContent = `Success. Welcome ${data.user?.name || ""}`.trim();
  } catch (err) {
    if (status) status.textContent = "Kitchen API unreachable. Try again later.";
  }
}

function wireAuthForms() {
  const forms = document.querySelectorAll("[data-auth-form]");
  forms.forEach((form) => form.addEventListener("submit", submitAuthForm));
}

function highlightNav() {
  const page = document.body.dataset.page;
  if (!page) return;
  const link = document.querySelector(`[data-nav="${page}"]`);
  if (link) link.classList.add("active");
}

function wireMobileNav() {
  const toggle = document.querySelector("[data-nav-toggle]");
  const menu = document.querySelector("[data-mobile-menu]");
  const overlay = document.querySelector("[data-mobile-overlay]");
  if (!toggle || !menu) return;
  const closeMenu = () => {
    menu.classList.remove("open");
    if (overlay) overlay.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };
  const openMenu = () => {
    menu.classList.add("open");
    if (overlay) overlay.classList.add("open");
    toggle.setAttribute("aria-expanded", "true");
  };

  toggle.addEventListener("click", () => {
    if (menu.classList.contains("open")) closeMenu();
    else openMenu();
  });
  if (overlay) overlay.addEventListener("click", closeMenu);
  menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeMenu();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  highlightNav();
  wireMobileNav();
  wireOrderForm();
  fetchOrders();
  fetchRecipes();
  fetchRecipeDetail();
  wireAuthForms();
});
