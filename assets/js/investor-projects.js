(() => {
  const root = document.querySelector("[data-investor-projects]");
  if (!root) return;
  const ui = window.ADTC_UI || {budget:'Бюджет:',project:'Проект',discussProject:'Обсудить проект',notifyProject:'Сообщить о развитии проекта',selectedProject:'Выбран проект:',investorTopic:'Сотрудничество по поставочным и тендерным проектам',greeting:'Здравствуйте! Интересует:',cacheUnavailable:'Показана сохранённая публичная версия. Актуальность новых предложений уточняется.',cacheVerified:'Показана последняя проверенная публичная версия.',cacheSaved:'Показана сохранённая публичная версия.'};

  const endpoint = root.dataset.projectEndpoint || "data/investor-projects.json";
  const template = document.querySelector("#project-card-template");
  const statusNode = root.querySelector("[data-project-sync-status]");
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  const fields = new Set([
    "public_id", "public_title", "public_description", "category", "public_region", "stage_label",
    "budget_label", "budget_display", "duration_display", "purpose_public", "plan_public",
    "risks_public", "legal_entity_public", "economics_badge", "image_path", "image_alt",
    "image_caption", "verified_at",
  ]);

  const clean = (value, limit = 1600) => String(value ?? "").trim().slice(0, limit);
  const emit = (name, publicId = "") => document.dispatchEvent(new CustomEvent("adtc:analytics", {
    detail: { name, params: publicId ? { public_id: publicId } : {} },
  }));

  function safeProject(raw) {
    if (!raw || typeof raw !== "object" || Object.keys(raw).some((key) => !fields.has(key))) return null;
    const project = Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, key === "plan_public" ? value : clean(value)]));
    if (!uuidPattern.test(project.public_id) || !project.public_title || !project.public_description || !project.stage_label) return null;
    project.plan_public = Array.isArray(raw.plan_public)
      ? raw.plan_public.map((step) => clean(step, 240)).filter(Boolean).slice(0, 10)
      : [];
    return project;
  }

  function safeImage(value) {
    const path = clean(value, 500);
    return /^\/assets\/images\/projects\/[a-zA-Z0-9._/-]+\.(?:avif|webp|png|jpe?g)$/i.test(path) ? path : "";
  }

  function setText(card, selector, value, wrapSelector = "") {
    const node = card.querySelector(selector);
    const wrap = wrapSelector ? card.querySelector(wrapSelector) : node;
    const text = clean(value);
    if (node) node.textContent = text;
    if (wrap) wrap.hidden = !text;
  }

  function render(raw, section) {
    const project = safeProject(raw);
    if (!project || !template?.content) return null;
    const fragment = template.content.cloneNode(true);
    const card = fragment.querySelector("[data-project-card]");
    card.dataset.publicId = project.public_id;
    setText(card, "[data-project-stage]", project.stage_label);
    setText(card, "[data-project-region]", project.public_region);
    setText(card, "[data-project-title]", project.public_title);
    setText(card, "[data-project-description]", project.public_description);
    setText(card, "[data-project-economics]", project.economics_badge);
    setText(card, "[data-project-budget-label]", project.budget_label || ui.budget);
    setText(card, "[data-project-budget]", project.budget_display, "[data-project-budget-wrap]");
    setText(card, "[data-project-duration]", project.duration_display, "[data-project-duration-wrap]");
    setText(card, "[data-project-purpose]", project.purpose_public, '[data-project-field="purpose_public"]');
    setText(card, "[data-project-entity]", project.legal_entity_public, '[data-project-field="legal_entity_public"]');
    setText(card, "[data-project-risks]", project.risks_public, '[data-project-field="risks_public"]');
    setText(card, "[data-project-date]", project.verified_at, '[data-project-field="verified_at"]');
    setText(card, "[data-project-image-caption]", project.image_caption);
    setText(card, "[data-project-category-short]", project.category || ui.project);

    if (project.plan_public.length) {
      const list = card.querySelector("[data-project-plan]");
      project.plan_public.forEach((step) => {
        const item = document.createElement("li");
        item.textContent = step;
        list.appendChild(item);
      });
      card.querySelector("[data-project-plan-wrap]").hidden = false;
    }
    const image = safeImage(project.image_path);
    if (image) {
      const img = card.querySelector("[data-project-image]");
      img.src = image;
      img.alt = project.image_alt || project.public_title;
      img.hidden = false;
      card.querySelector("[data-project-placeholder]").hidden = true;
    }
    const action = card.querySelector("[data-project-action]");
    action.dataset.publicId = project.public_id;
    action.dataset.publicTitle = project.public_title;
    action.textContent = section === "discussion" ? ui.discussProject : ui.notifyProject;
    return fragment;
  }

  function updateSections(payload) {
    if (payload?.schema_version !== 2 || !payload.sections || !Array.isArray(payload.sections.discussion) || !Array.isArray(payload.sections.development)) return false;
    let total = 0;
    for (const section of ["discussion", "development"]) {
      const projects = payload.sections[section].map((raw) => ({ raw, safe: safeProject(raw) })).filter(({ safe }) => safe);
      const list = root.querySelector(`[data-project-list="${section}"]`);
      const sectionNode = root.querySelector(`[data-project-section="${section}"]`);
      if (!list || !sectionNode) continue;
      if (projects.length) list.replaceChildren(...projects.map(({ raw }) => render(raw, section)).filter(Boolean));
      sectionNode.hidden = projects.length === 0;
      total += projects.length;
    }
    const empty = root.querySelector("[data-project-empty-all]");
    if (empty) empty.hidden = total > 0;
    bindProjectTracking();
    return true;
  }

  function selectProject(link) {
    const form = document.querySelector("#investor-lead-form");
    const publicId = clean(link.dataset.publicId, 80);
    const title = clean(link.dataset.publicTitle, 240);
    if (form) {
      form.elements.public_id.value = uuidPattern.test(publicId) ? publicId : "";
      const selected = form.querySelector("[data-selected-project]");
      if (selected) {
        selected.textContent = title ? `${ui.selectedProject} ${title}` : "";
        selected.hidden = !title;
      }
    }
    const direct = document.querySelector("[data-direct-project-contact]");
    if (direct) {
      const topic = title ? `${ui.investorTopic}: ${title}` : ui.investorTopic;
      const whatsapp = direct.querySelector("[data-direct-whatsapp]");
      const email = direct.querySelector("[data-direct-email]");
      if (whatsapp) whatsapp.href = `https://wa.me/77077807804?text=${encodeURIComponent(`${ui.greeting} ${topic}.`)}`;
      if (email) email.href = `mailto:info@adtc.kz?subject=${encodeURIComponent(`ADTC — ${topic}`)}`;
    }
  }

  function bindProjectTracking() {
    root.querySelectorAll("[data-project-card]").forEach((card) => {
      if (card.dataset.trackingReady === "true") return;
      card.dataset.trackingReady = "true";
      emit("investor_project_view", card.dataset.publicId || "");
      card.querySelector("[data-project-details]")?.addEventListener("toggle", (event) => {
        if (event.currentTarget.open) emit("investor_project_expand", card.dataset.publicId || "");
      });
    });
  }

  root.addEventListener("click", (event) => {
    const projectAction = event.target.closest("[data-project-action]");
    if (projectAction) selectProject(projectAction);
    if (event.target.closest("[data-future-project]")) {
      const form = document.querySelector("#investor-lead-form");
      if (form?.elements.public_id) form.elements.public_id.value = "";
      const direct = document.querySelector("[data-direct-project-contact]");
      const whatsapp = direct?.querySelector("[data-direct-whatsapp]");
      const email = direct?.querySelector("[data-direct-email]");
      if (whatsapp) whatsapp.href = `https://wa.me/77077807804?text=${encodeURIComponent(`${ui.greeting} ${ui.investorTopic}.`)}`;
      if (email) email.href = `mailto:info@adtc.kz?subject=${encodeURIComponent(`ADTC — ${ui.investorTopic}`)}`;
    }
  });

  bindProjectTracking();
  fetch(endpoint, { headers: { Accept: "application/json" }, credentials: "same-origin", cache: "no-store" })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error("cache_unavailable")))
    .then((payload) => {
      if (!updateSections(payload)) throw new Error("invalid_cache");
      if (statusNode) {
        const count = payload.sections.discussion.length + payload.sections.development.length;
        statusNode.hidden = false;
        if (payload.source_status === "unavailable") statusNode.textContent = ui.cacheUnavailable;
        else if (payload.source_status === "read_ok" && count) statusNode.textContent = ui.cacheVerified;
        else if (count) statusNode.textContent = ui.cacheSaved;
        else {
          statusNode.textContent = "";
          statusNode.hidden = true;
        }
      }
    })
    .catch(() => {
      if (statusNode) {
        statusNode.hidden = false;
        statusNode.textContent = ui.cacheUnavailable;
      }
    });
})();
