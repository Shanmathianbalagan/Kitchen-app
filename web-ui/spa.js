const h = React.createElement;
const API_BASE = (() => {
  const url = new URL(window.location.href);
  if (url.port && url.port !== "3000") url.port = "3000";
  return url.origin;
})();

function getToken() {
  return localStorage.getItem("kitchen_token");
}

function clearToken() {
  localStorage.removeItem("kitchen_token");
}

async function apiFetch(path, options = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (response.status === 401) clearToken();
  return response;
}

function useHashRoute() {
  const parse = () => {
    const hash = window.location.hash || "#/";
    const clean = hash.replace(/^#/, "");
    const segments = clean.split("/").filter(Boolean);
    if (segments[0] === "pricing") return { page: "home", anchor: "pricing" };
    if (segments[0] === "recipes" && segments[1]) return { page: "recipe", id: segments[1] };
    if (segments[0]) return { page: segments[0] };
    return { page: "home" };
  };
  const [route, setRoute] = React.useState(parse());
  React.useEffect(() => {
    const onChange = () => setRoute(parse());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

function Nav({ onToggle, isOpen }) {
  return h(
    "header",
    null,
    h(
      "div",
      { className: "container nav" },
      h("div", { className: "logo" }, "Kitchen App"),
      h(
        "nav",
        { className: "nav-links" },
        h("a", { href: "#/" }, "Home"),
        h("a", { href: "#/recipes" }, "Recipes"),
        h("a", { href: "#/dashboard" }, "Dashboard"),
        h("a", { href: "#/profile" }, "Profile"),
        h("a", { href: "#/about" }, "About"),
        h("a", { href: "#/pricing" }, "Pricing")
      ),
      h(
        "div",
        { className: "nav-actions" },
        h("a", { className: "nav-button", href: "#/auth" }, "Sign in"),
        h("a", { className: "button primary", href: "#/auth" }, "Get started")
      ),
      h(
        "button",
        { className: "nav-toggle", type: "button", "aria-expanded": isOpen ? "true" : "false", onClick: onToggle },
        "Menu"
      )
    ),
    h(
      "div",
      { className: `container mobile-menu ${isOpen ? "open" : ""}` },
      h("a", { href: "#/" }, "Home"),
      h("a", { href: "#/recipes" }, "Recipes"),
      h("a", { href: "#/dashboard" }, "Dashboard"),
      h("a", { href: "#/profile" }, "Profile"),
      h("a", { href: "#/about" }, "About"),
      h("a", { href: "#/pricing" }, "Pricing"),
      h("a", { href: "#/auth" }, "Sign in")
    )
  );
}

function Overlay({ isOpen, onClick }) {
  return h("div", { className: `mobile-overlay ${isOpen ? "open" : ""}`, onClick });
}

function HomePage({ recipes }) {
  const hero = h(
    "section",
    { className: "container hero" },
    h(
      "div",
      { className: "fade-up" },
      h("h1", null, "Your kitchen, organized like a pro."),
      h("p", null, "Plan meals, discover recipes, track pantry items, and build smart grocery lists in one polished workspace."),
      h(
        "div",
        { className: "hero-cta" },
        h("a", { className: "button primary", href: "#/auth" }, "Start free trial"),
        h("a", { className: "button secondary", href: "#/dashboard" }, "See live dashboard")
      )
    ),
    h(
      "div",
      { className: "hero-card fade-up delay-2" },
      h("h3", null, "Today's Focus"),
      h("p", { className: "section-lead" }, "Seasonal bowls, 30-minute dinners, and a synced grocery list built from your pantry."),
      h(
        "div",
        { className: "pill-row" },
        h("span", { className: "pill" }, "12 Recipes queued"),
        h("span", { className: "pill" }, "4 Meals planned"),
        h("span", { className: "pill" }, "Pantry 86% full")
      ),
      h(
        "div",
        { className: "metrics" },
        h("div", { className: "metric" }, h("span", null, "2,400+"), "curated recipes"),
        h("div", { className: "metric" }, h("span", null, "18 min"), "average prep time")
      )
    ),
    h("div", { className: "hero-visual fade-up delay-3" }, h("img", { src: "assets/hero.svg", alt: "Kitchen planning illustration" }))
  );

  const featureGrid = h(
    "section",
    { className: "container" },
    h("h2", { className: "section-title" }, "Everything you need for a complete kitchen workflow"),
    h("p", { className: "section-lead" }, "A professional, end-to-end experience designed for home cooks, teams, and busy households."),
    h(
      "div",
      { className: "grid" },
      h("div", { className: "card fade-up" }, h("h4", null, "Recipe studio"), h("p", null, "Create, import, and scale recipes with smart portions, nutrition, and step timing.")),
      h("div", { className: "card fade-up delay-1" }, h("h4", null, "Weekly meal planning"), h("p", null, "Drag-and-drop meals to a weekly board and auto-balance nutrition goals.")),
      h("div", { className: "card fade-up delay-2" }, h("h4", null, "Pantry intelligence"), h("p", null, "Track expiry dates, low-stock alerts, and ingredient substitutes.")),
      h("div", { className: "card fade-up delay-3" }, h("h4", null, "Grocery automation"), h("p", null, "Generate lists by aisle, sync with family members, and avoid duplicates."))
    )
  );

  const recipeCards = (recipes || []).slice(0, 3).map((recipe) =>
    h(
      "div",
      { className: "card", key: recipe.id },
      h("div", { className: "image-card" }, h("img", { src: recipe.image || "assets/recipe-1.svg", alt: recipe.title || "Recipe" })),
      h("h4", null, recipe.title || "Recipe"),
      h("p", null, recipe.description || "Recipe description")
    )
  );

  const popular = h(
    "section",
    { className: "container" },
    h("h2", { className: "section-title" }, "Popular recipes this week"),
    h("p", { className: "section-lead" }, "Explore curated dishes with clear prep steps, nutrition, and portioning."),
    h("div", { className: "grid" }, recipeCards)
  );

  const planner = h(
    "section",
    { className: "strip" },
    h(
      "div",
      { className: "container" },
      h("h2", { className: "section-title" }, "Plan, cook, and share in one flow"),
      h("p", { className: "section-lead" }, "Set goals, assign cooks, and keep every kitchen task visible and aligned."),
      h(
        "div",
        { className: "grid" },
        h("div", { className: "card" }, h("h4", null, "Weekly board"), h("p", null, "Visualize breakfast, lunch, and dinner with color-coded goals.")),
        h("div", { className: "card" }, h("h4", null, "Household roles"), h("p", null, "Assign tasks and track progress with shared shopping lists.")),
        h("div", { className: "card" }, h("h4", null, "Smart reminders"), h("p", null, "Get notifications for defrosting, marinating, and prep windows."))
      )
    )
  );

  const testimonials = h(
    "section",
    { className: "container" },
    h("h2", { className: "section-title" }, "Trusted by organized kitchens"),
    h("p", { className: "section-lead" }, "From busy families to boutique catering teams, Kitchen App keeps everyone in sync."),
    h(
      "div",
      { className: "testimonials" },
      h("div", { className: "quote" }, '"The pantry intelligence feature alone saved us dozens of wasted items each month."', h("strong", null, "Rina K., nutrition coach")),
      h("div", { className: "quote" }, '"Meal planning and grocery automation feel seamless. It finally looks like a pro tool."', h("strong", null, "Leon A., home chef")),
      h("div", { className: "quote" }, '"We replaced three apps with this. The interface is clean and serious."', h("strong", null, "Devon M., cafe owner"))
    )
  );

  const pricing = h(
    "section",
    { id: "pricing", className: "container" },
    h("h2", { className: "section-title" }, "Professional plans for every kitchen"),
    h("p", { className: "section-lead" }, "Start for free, then upgrade as you scale your meal prep and household planning."),
    h(
      "div",
      { className: "pricing" },
      h(
        "div",
        { className: "price-card" },
        h("h4", null, "Starter"),
        h("div", { className: "price-tag" }, "$0"),
        h("ul", null, h("li", null, "Up to 30 recipes"), h("li", null, "Weekly meal plan"), h("li", null, "Basic grocery list")),
        h("a", { className: "button secondary", href: "#/auth" }, "Get started")
      ),
      h(
        "div",
        { className: "price-card" },
        h("h4", null, "Pro Kitchen"),
        h("div", { className: "price-tag" }, "$12"),
        h("ul", null, h("li", null, "Unlimited recipes"), h("li", null, "Pantry tracking"), h("li", null, "Nutrition insights"), h("li", null, "Family sharing")),
        h("a", { className: "button primary", href: "#/auth" }, "Start trial")
      ),
      h(
        "div",
        { className: "price-card" },
        h("h4", null, "Team"),
        h("div", { className: "price-tag" }, "$29"),
        h("ul", null, h("li", null, "Multi-location kitchens"), h("li", null, "Role permissions"), h("li", null, "Bulk import"), h("li", null, "Dedicated support")),
        h("a", { className: "button secondary", href: "#/auth" }, "Talk to sales")
      )
    )
  );

  return h(React.Fragment, null, hero, featureGrid, popular, planner, testimonials, pricing);
}

function RecipesPage({ recipes, status }) {
  const grid = (recipes || []).map((recipe) =>
    h(
      "div",
      { className: "card", key: recipe.id },
      h(
        "a",
        { href: `#/recipes/${recipe.id}` },
        h("div", { className: "image-card" }, h("img", { src: recipe.image || "assets/recipe-1.svg", alt: recipe.title || "Recipe" })),
        h("h4", null, recipe.title || "Recipe"),
        h("p", null, recipe.description || "Recipe description"),
        h(
          "div",
          { className: "pill-row" },
          (recipe.tags || []).slice(0, 3).map((tag) => h("span", { className: "pill", key: tag }, tag))
        )
      )
    )
  );

  return h(
    React.Fragment,
    null,
    h("section", { className: "container page-header" }, h("h1", { className: "section-title" }, "Recipes built for real kitchens"), h("p", null, "Browse curated collections, save favorites, and send any recipe to your weekly plan in one click.")),
    h(
      "section",
      { className: "container split" },
      h(
        "div",
        null,
        h("h2", { className: "section-title" }, "Filter by goal"),
        h("p", { className: "section-lead" }, "Keep your kitchen organized with focus collections and nutrition-balanced plans."),
        h(
          "div",
          { className: "pill-row" },
          h("span", { className: "pill" }, "High protein"),
          h("span", { className: "pill" }, "30-minute meals"),
          h("span", { className: "pill" }, "Seasonal produce"),
          h("span", { className: "pill" }, "Family friendly"),
          h("span", { className: "pill" }, "Low waste")
        )
      ),
      h("div", { className: "hero-visual" }, h("img", { src: "assets/recipe-2.svg", alt: "Recipe collection preview" }))
    ),
    h("section", { className: "container" }, h("h2", { className: "section-title" }, "Chef curated picks"), h("p", { className: "section-lead" }, "Each recipe includes prep steps, ingredient swaps, and nutrition estimates."), h("p", { className: "section-lead" }, status || ""), h("div", { className: "grid" }, grid)),
    h(
      "section",
      { className: "container" },
      h(
        "div",
        { className: "highlight" },
        h("div", null, h("h2", { className: "section-title" }, "Build a weekly plan in minutes"), h("p", { className: "section-lead" }, "Drag recipes into your calendar, then auto-generate a grocery list by aisle.")),
        h("div", null, h("a", { className: "button primary", href: "#/dashboard" }, "Open dashboard"))
      )
    )
  );
}

function RecipeDetailPage({ recipe, status }) {
  return h(
    React.Fragment,
    null,
    h("section", { className: "container page-header" }, h("h1", { className: "section-title" }, "Recipe details"), h("p", { className: "section-lead" }, "See ingredient highlights, nutrition, and how it fits your plan."), h("p", { className: "section-lead" }, status || "")),
    h(
      "section",
      { className: "container" },
      recipe
        ? h(
            "div",
            { className: "split" },
            h("div", { className: "hero-visual" }, h("img", { src: recipe.image || "assets/recipe-1.svg", alt: recipe.title || "Recipe" })),
            h(
              "div",
              null,
              h("h2", { className: "section-title" }, recipe.title || "Untitled recipe"),
              h("p", { className: "section-lead" }, recipe.description || "No description provided."),
              h(
                "div",
                { className: "list" },
                h("div", null, `Prep time: ${recipe.prepMinutes || 0} minutes`),
                h("div", null, `Calories per serving: ${recipe.calories || 0}`),
                h("div", null, `Tags: ${(recipe.tags || []).join(", ") || "none"}`)
              ),
              h(
                "div",
                { className: "hero-cta", style: { marginTop: "18px" } },
                h("a", { className: "button primary", href: "#/dashboard" }, "Add to plan"),
                h("a", { className: "button secondary", href: "#/recipes" }, "Back to recipes")
              )
            )
          )
        : null
    ),
    h(
      "section",
      { className: "container" },
      h(
        "div",
        { className: "highlight" },
        h("div", null, h("h2", { className: "section-title" }, "Plan this recipe for the week"), h("p", { className: "section-lead" }, "Add to your plan and sync with grocery lists instantly.")),
        h("div", null, h("a", { className: "button primary", href: "#/dashboard" }, "Open dashboard"))
      )
    )
  );
}

function DashboardPage({ orders, orderStatus, onCreateOrder, formValue, setFormValue }) {
  return h(
    React.Fragment,
    null,
    h("section", { className: "container page-header" }, h("h1", { className: "section-title" }, "Kitchen operations dashboard"), h("p", null, "Track orders, timing, and prep metrics with a clean, professional overview.")),
    h(
      "section",
      { className: "container split" },
      h(
        "div",
        null,
        h(
          "div",
          { className: "stats-row" },
          h("div", { className: "stat-card" }, h("span", null, "86%"), "Pantry readiness"),
          h("div", { className: "stat-card" }, h("span", null, "4"), "Meals scheduled today"),
          h("div", { className: "stat-card" }, h("span", null, "18 min"), "Average prep time"),
          h("div", { className: "stat-card" }, h("span", null, "12"), "Active recipes")
        ),
        h(
          "div",
          { className: "list", style: { marginTop: "24px" } },
          h("div", null, "Auto-sort tasks by time and station."),
          h("div", null, "Monitor order status transitions live."),
          h("div", null, "Keep the whole kitchen in sync.")
        )
      ),
      h("div", { className: "hero-visual" }, h("img", { src: "assets/dashboard.svg", alt: "Dashboard preview" }))
    ),
    h(
      "section",
      { className: "container" },
      h("h2", { className: "section-title" }, "Live kitchen orders"),
      h("p", { className: "section-lead" }, "Connected to the Kitchen API at ", h("code", null, "http://localhost:3000"), "."),
      h(
        "div",
        { className: "orders-grid" },
        h(
          "div",
          { className: "card" },
          h("h4", null, "Create a new order"),
          h(
            "form",
            {
              onSubmit: (event) => {
                event.preventDefault();
                onCreateOrder();
              },
            },
            h("input", {
              className: "input",
              type: "text",
              placeholder: "Dish name, for example: Truffle pasta",
              value: formValue,
              onChange: (event) => setFormValue(event.target.value),
            }),
            h("button", { className: "button primary", type: "submit" }, "Send to kitchen")
          ),
          h("p", { className: "section-lead" }, orderStatus)
        ),
        h(
          "div",
          { className: "card" },
          h("h4", null, "Active orders"),
          h("p", { className: "section-lead" }, orders.length ? `Showing ${orders.length} active order(s).` : "No orders yet."),
          h("div", { className: "orders-list" }, orders.map((order) => h("div", { className: "order-chip", key: order._id || order.id }, h("span", null, order.dish || "Untitled dish"), h("span", { className: "badge" }, order.status || "pending"))))
        )
      )
    ),
    h(
      "section",
      { className: "container" },
      h(
        "div",
        { className: "highlight" },
        h("div", null, h("h2", { className: "section-title" }, "Share the dashboard with your team"), h("p", { className: "section-lead" }, "Invite cooks, nutritionists, or delivery staff to keep operations aligned.")),
        h("div", null, h("a", { className: "button primary", href: "#/about" }, "Learn about Kitchen App"))
      )
    )
  );
}

function AboutPage() {
  return h(
    React.Fragment,
    null,
    h("section", { className: "container page-header" }, h("h1", { className: "section-title" }, "Built for kitchens that run on trust"), h("p", null, "Kitchen App combines meal planning, pantry intelligence, and live operations into one professional workspace.")),
    h(
      "section",
      { className: "container split" },
      h(
        "div",
        null,
        h("h2", { className: "section-title" }, "Our mission"),
        h("p", { className: "section-lead" }, "We help households and small teams cook smarter, waste less, and keep everyone aligned. Every feature is designed to reduce friction between planning and cooking."),
        h("div", { className: "list" }, h("div", null, "Reduce waste with pantry tracking and smart expiry alerts."), h("div", null, "Deliver healthy meals with nutrition-balanced plans."), h("div", null, "Make cooking collaborative with shared lists and roles."))
      ),
      h("div", { className: "hero-visual" }, h("img", { src: "assets/hero.svg", alt: "Kitchen team workflow" }))
    ),
    h(
      "section",
      { className: "container" },
      h("h2", { className: "section-title" }, "What makes us different"),
      h(
        "div",
        { className: "grid" },
        h("div", { className: "card" }, h("h4", null, "Workflow first"), h("p", null, "From planning to prep, every step is supported by a clear, professional flow.")),
        h("div", { className: "card" }, h("h4", null, "Unified kitchen data"), h("p", null, "Recipes, pantry, and orders live in a single source of truth.")),
        h("div", { className: "card" }, h("h4", null, "Built for teams"), h("p", null, "Role-based visibility and shared task lists keep kitchens aligned."))
      )
    ),
    h(
      "section",
      { className: "container" },
      h(
        "div",
        { className: "highlight" },
        h("div", null, h("h2", { className: "section-title" }, "Ready to see it live?"), h("p", { className: "section-lead" }, "Open the dashboard and connect to the Kitchen API to experience live orders.")),
        h("div", null, h("a", { className: "button primary", href: "#/dashboard" }, "Open dashboard"))
      )
    )
  );
}

function AuthPage({ status, onLogin, onSignup }) {
  const [login, setLogin] = React.useState({ email: "", password: "" });
  const [signup, setSignup] = React.useState({ name: "", email: "", password: "" });

  return h(
    React.Fragment,
    null,
    h("section", { className: "container page-header" }, h("h1", { className: "section-title" }, "Welcome back to Kitchen App"), h("p", null, "Sign in to manage recipes, meal plans, and live kitchen operations.")),
    h(
      "section",
      { className: "container" },
      h(
        "div",
        { className: "auth-card" },
        h("h2", null, "Sign in"),
        h("p", null, "Use your account email and password to continue."),
        h(
          "form",
          {
            className: "auth-row",
            onSubmit: (event) => {
              event.preventDefault();
              onLogin(login);
            },
          },
          h("input", { className: "input", type: "email", placeholder: "Email address", value: login.email, onChange: (e) => setLogin({ ...login, email: e.target.value }) }),
          h("input", { className: "input", type: "password", placeholder: "Password", value: login.password, onChange: (e) => setLogin({ ...login, password: e.target.value }) }),
          h("button", { className: "button primary", type: "submit" }, "Sign in")
        ),
        h("p", { className: "auth-helper" }, "Don't have an account? Create one below."),
        h("div", { style: { height: "18px" } }),
        h("h2", null, "Create account"),
        h("p", null, "Start a free trial for your household or team."),
        h(
          "form",
          {
            className: "auth-row",
            onSubmit: (event) => {
              event.preventDefault();
              onSignup(signup);
            },
          },
          h("input", { className: "input", type: "text", placeholder: "Full name", value: signup.name, onChange: (e) => setSignup({ ...signup, name: e.target.value }) }),
          h("input", { className: "input", type: "email", placeholder: "Work email", value: signup.email, onChange: (e) => setSignup({ ...signup, email: e.target.value }) }),
          h("input", { className: "input", type: "password", placeholder: "Create a password", value: signup.password, onChange: (e) => setSignup({ ...signup, password: e.target.value }) }),
          h("button", { className: "button secondary", type: "submit" }, "Create account")
        ),
        h("p", { className: "auth-helper" }, status || "We will never share your email with third parties.")
      )
    )
  );
}

function ProfilePage({ profile, status, onLogout }) {
  return h(
    React.Fragment,
    null,
    h("section", { className: "container page-header" }, h("h1", { className: "section-title" }, "Your profile"), h("p", null, "Manage your account details and kitchen preferences.")),
    h(
      "section",
      { className: "container" },
      h(
        "div",
        { className: "card" },
        h("h4", null, "Account"),
        h("p", null, status || ""),
        profile
          ? h(
              "div",
              { className: "list" },
              h("div", null, `Name: ${profile.name}`),
              h("div", null, `Email: ${profile.email}`)
            )
          : null,
        h("div", { style: { marginTop: "18px" } }, h("button", { className: "button secondary", onClick: onLogout }, "Sign out"))
      )
    )
  );
}

function Footer() {
  return h(
    "footer",
    { className: "container footer" },
    h("div", null, h("div", { className: "logo" }, "Kitchen App"), h("div", null, "Professional cooking and planning suite.")),
    h("div", null, h("div", null, "Support: hello@kitchenapp.com"), h("div", null, "API health: ", h("code", null, "http://localhost:3000/health")))
  );
}

function App() {
  const route = useHashRoute();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [recipes, setRecipes] = React.useState([]);
  const [recipeStatus, setRecipeStatus] = React.useState("");
  const [recipeDetail, setRecipeDetail] = React.useState(null);
  const [orders, setOrders] = React.useState([]);
  const [orderStatus, setOrderStatus] = React.useState("");
  const [orderInput, setOrderInput] = React.useState("");
  const [authStatus, setAuthStatus] = React.useState("");
  const [profile, setProfile] = React.useState(null);
  const [profileStatus, setProfileStatus] = React.useState("");

  React.useEffect(() => {
    setMenuOpen(false);
  }, [route.page, route.id]);

  React.useEffect(() => {
    if (!route.anchor) return;
    const el = document.getElementById(route.anchor);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [route.anchor]);

  React.useEffect(() => {
    let mounted = true;
    async function loadRecipes() {
      setRecipeStatus("Loading recipes...");
      try {
        const res = await apiFetch("/recipes", { method: "GET" });
        if (!res.ok) {
          setRecipeStatus("Unable to load recipes.");
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        setRecipes(Array.isArray(data) ? data : []);
        setRecipeStatus(`Showing ${(data || []).length} recipes.`);
      } catch (err) {
        if (mounted) setRecipeStatus("Kitchen API unreachable. Start the API and refresh.");
      }
    }
    loadRecipes();
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    if (route.page !== "recipe") return;
    let mounted = true;
    async function loadRecipe() {
      setRecipeDetail(null);
      setRecipeStatus("Loading recipe...");
      try {
        const res = await apiFetch(`/recipes/${route.id}`, { method: "GET" });
        if (!res.ok) {
          setRecipeStatus("Recipe not found.");
          return;
        }
        const data = await res.json();
        if (!mounted) return;
        setRecipeDetail(data);
        setRecipeStatus("");
      } catch (err) {
        if (mounted) setRecipeStatus("Kitchen API unreachable. Start the API and refresh.");
      }
    }
    loadRecipe();
    return () => {
      mounted = false;
    };
  }, [route.page, route.id]);

  async function loadOrders() {
    setOrderStatus("Loading orders...");
    try {
      const res = await apiFetch("/orders", { method: "GET" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setOrderStatus(data.error || "Unable to load orders.");
        return;
      }
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
      setOrderStatus("");
    } catch (err) {
      setOrderStatus("Kitchen API unreachable. Start the API and refresh.");
    }
  }

  React.useEffect(() => {
    if (route.page === "dashboard") loadOrders();
  }, [route.page]);

  async function createOrder() {
    if (!orderInput.trim()) {
      setOrderStatus("Please enter a dish name.");
      return;
    }
    try {
      const res = await apiFetch("/orders", { method: "POST", body: JSON.stringify({ dish: orderInput.trim() }) });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setOrderStatus(data.error || "Order failed.");
        return;
      }
      setOrderInput("");
      setOrderStatus("Order sent. Updating live list.");
      loadOrders();
    } catch (err) {
      setOrderStatus("Kitchen API unreachable. Try again later.");
    }
  }

  async function login(payload) {
    setAuthStatus("Signing in...");
    try {
      const res = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthStatus(data.error || "Authentication failed.");
        return;
      }
      if (data.token) localStorage.setItem("kitchen_token", data.token);
      setAuthStatus(`Welcome back ${data.user?.name || ""}`.trim());
      window.location.hash = "#/dashboard";
    } catch (err) {
      setAuthStatus("Kitchen API unreachable. Try again later.");
    }
  }

  async function signup(payload) {
    setAuthStatus("Creating account...");
    try {
      const res = await apiFetch("/auth/signup", { method: "POST", body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAuthStatus(data.error || "Signup failed.");
        return;
      }
      if (data.token) localStorage.setItem("kitchen_token", data.token);
      setAuthStatus(`Welcome ${data.user?.name || ""}`.trim());
      window.location.hash = "#/dashboard";
    } catch (err) {
      setAuthStatus("Kitchen API unreachable. Try again later.");
    }
  }

  async function loadProfile() {
    setProfileStatus("Loading profile...");
    try {
      const res = await apiFetch("/me", { method: "GET" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setProfileStatus(data.error || "Unable to load profile.");
        return;
      }
      const data = await res.json();
      setProfile(data);
      setProfileStatus("");
    } catch (err) {
      setProfileStatus("Kitchen API unreachable. Try again later.");
    }
  }

  React.useEffect(() => {
    if (route.page === "profile") loadProfile();
  }, [route.page]);

  function logout() {
    clearToken();
    setProfile(null);
    window.location.hash = "#/auth";
  }

  const token = getToken();
  let page = null;

  if (route.page === "home") page = h(HomePage, { recipes });
  else if (route.page === "recipes") page = h(RecipesPage, { recipes, status: recipeStatus });
  else if (route.page === "recipe") page = h(RecipeDetailPage, { recipe: recipeDetail, status: recipeStatus });
  else if (route.page === "dashboard")
    page = token ? h(DashboardPage, { orders, orderStatus, onCreateOrder: createOrder, formValue: orderInput, setFormValue: setOrderInput }) : h(AuthPage, { status: "Sign in to access the dashboard.", onLogin: login, onSignup: signup });
  else if (route.page === "about") page = h(AboutPage);
  else if (route.page === "profile")
    page = token ? h(ProfilePage, { profile, status: profileStatus, onLogout: logout }) : h(AuthPage, { status: "Sign in to view your profile.", onLogin: login, onSignup: signup });
  else if (route.page === "auth") page = h(AuthPage, { status: authStatus, onLogin: login, onSignup: signup });
  else page = h(HomePage, { recipes });

  return h(React.Fragment, null, h(Nav, { onToggle: () => setMenuOpen(!menuOpen), isOpen: menuOpen }), h(Overlay, { isOpen: menuOpen, onClick: () => setMenuOpen(false) }), h("main", null, page), h(Footer));
}

ReactDOM.createRoot(document.getElementById("root")).render(h(App));
