const navButton = document.querySelector("[data-menu-toggle]");
const navLinks = document.querySelector("[data-nav-links]");

if (navButton && navLinks) {
  navButton.addEventListener("click", () => {
    navLinks.classList.toggle("open");
    navButton.setAttribute("aria-expanded", String(navLinks.classList.contains("open")));
  });
}

const lazyHeroVideo = document.querySelector("[data-lazy-video]");

if (lazyHeroVideo) {
  const loadHeroVideo = () => {
    const sources = lazyHeroVideo.querySelectorAll("source[data-src]");
    sources.forEach((source) => {
      source.src = source.dataset.src;
      source.removeAttribute("data-src");
    });
    lazyHeroVideo.load();
    lazyHeroVideo.play().catch(() => {});
  };

  if ("requestIdleCallback" in window) {
    window.addEventListener("load", () => window.requestIdleCallback(loadHeroVideo, { timeout: 2500 }), { once: true });
  } else {
    window.addEventListener("load", () => window.setTimeout(loadHeroVideo, 1200), { once: true });
  }
}

const stressForm = document.querySelector("[data-stress-form]");
const resultBox = document.querySelector("[data-result-box]");

const WEB3FORMS_ENDPOINT = "https://api.web3forms.com/submit";
const WEB3FORMS_ACCESS_KEY = "e3bd0a5c-a8e0-4a8a-923c-72fa5dee4d47";
const LEAD_FALLBACK_EMAIL = "hello@hsstrategiccfo.com";
const riskFields = ["ownership", "cashflow", "rates", "tax", "exit", "docs", "concentration"];

const labels = {
  real_estate_investor: "Real estate investor / owner",
  developer_builder: "Developer / builder",
  business_owner: "Business owner needing Strategic CFO support",
  acquisition_buyer: "Acquisition buyer",
  exit_seller: "Owner preparing for exit or sale",
  buy: "Buy / underwrite a property",
  develop: "Develop / build / reposition",
  hold: "Hold / improve cash flow",
  refinance: "Refinance / renew debt",
  sell: "Sell / transfer / exit",
  acquire_business: "Acquire a business",
  strategic_finance: "Improve finance function or forecast"
};

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function optionLabel(value) {
  return labels[value] || value || "Not provided";
}

function recommendationFor(clientType, projectStage) {
  if (clientType === "acquisition_buyer" || clientType === "exit_seller" || projectStage === "acquire_business") {
    return {
      title: "Transaction Decision Review",
      service: "Acquisition & Exit Advisory",
      href: "acquisition-exit-advisory.html",
      summary: "The next review should focus on normalized earnings, working capital, tax structure, financing capacity, owner dependency, and the risk points that should be settled before terms are final."
    };
  }

  if (clientType === "business_owner" || projectStage === "strategic_finance") {
    return {
      title: "Strategic Finance Review",
      service: "Strategic CFO Advisory",
      href: "business-growth-cfo.html",
      summary: "The next review should focus on forecast quality, cash conversion, tax leakage, financing needs, reporting discipline, and whether the finance function supports the next major decision."
    };
  }

  if (clientType === "developer_builder" || projectStage === "develop") {
    return {
      title: "Development Feasibility Review",
      service: "Real Estate Advisory",
      href: "real-estate-advisory.html",
      summary: "The next review should focus on land basis, zoning or entitlement assumptions, buildable area, hard and soft costs, financing, presale or lease-up risk, tax, and exit value."
    };
  }

  return {
    title: "Real Estate Investment Review",
    service: "Real Estate Advisory",
    href: "real-estate-advisory.html",
    summary: "The next review should focus on after-tax cash flow, debt renewal pressure, ownership structure, repair reserves, documentation, concentration risk, and the decision to buy, hold, refinance, or exit."
  };
}

function buildEmailBody(payload) {
  return [
    `Name: ${payload.leadName}`,
    `Email: ${payload.leadEmail}`,
    `Phone: ${payload.leadPhone || "Not provided"}`,
    `Role: ${payload.clientTypeLabel}`,
    `Current decision: ${payload.projectStageLabel}`,
    `Stress score: ${payload.percentage}%`,
    `Risk level: ${payload.resultTitle}`,
    `Recommended review: ${payload.recommendationTitle}`,
    `Context: ${payload.projectNotes || "Not provided"}`,
    "",
    "I would like to discuss this result and the next decision."
  ].join("\n");
}

function mailtoHref(payload) {
  return `mailto:${LEAD_FALLBACK_EMAIL}?subject=${encodeURIComponent(payload.recommendationTitle)}&body=${encodeURIComponent(buildEmailBody(payload))}`;
}

async function submitLead(payload) {
  if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === "PASTE_WEB3FORMS_ACCESS_KEY_HERE") {
    return { ok: false, reason: "missing-access-key" };
  }

  const submission = {
    access_key: WEB3FORMS_ACCESS_KEY,
    subject: `Website lead: ${payload.recommendationTitle}`,
    from_name: "HS Strategic CFO Website",
    botcheck: false,
    name: payload.leadName,
    email: payload.leadEmail,
    phone: payload.leadPhone || "Not provided",
    role: payload.clientTypeLabel,
    current_decision: payload.projectStageLabel,
    stress_score: `${payload.percentage}%`,
    risk_level: payload.resultTitle,
    recommended_review: payload.recommendationTitle,
    context: payload.projectNotes || "Not provided",
    source_page: window.location.href
  };

  try {
    const response = await fetch(WEB3FORMS_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(submission)
    });
    const json = await response.json().catch(() => ({}));

    if (!response.ok || json.success === false) {
      return { ok: false, reason: json.message || "bad-response" };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: "network-error" };
  }
}

function renderSubmissionStatus(status, payload) {
  const statusBox = document.querySelector("[data-lead-status]");
  if (!statusBox) return;

  if (status === "pending") {
    statusBox.className = "lead-status pending";
    statusBox.innerHTML = "Submitting your result...";
    return;
  }

  if (status === "success") {
    statusBox.className = "lead-status success";
    statusBox.innerHTML = "Your result has been submitted. I will review the score and context before replying.";
    return;
  }

  statusBox.className = "lead-status warning";
  statusBox.innerHTML = `The score is ready, but the form service did not confirm delivery. <a href="${mailtoHref(payload)}">Email this result instead</a>.`;
}

if (stressForm && resultBox) {
  stressForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const submitButton = stressForm.querySelector('button[type="submit"]');
    const data = new FormData(stressForm);
    let score = 0;

    for (const field of riskFields) {
      const parsed = Number(data.get(field));
      if (!Number.isNaN(parsed)) score += parsed;
    }

    const maxScore = 21;
    const percentage = Math.round((score / maxScore) * 100);
    const clientType = String(data.get("clientType") || "");
    const projectStage = String(data.get("projectStage") || "");
    const leadName = String(data.get("leadName") || "").trim();
    const leadEmail = String(data.get("leadEmail") || "").trim();
    const leadPhone = String(data.get("leadPhone") || "").trim();
    const projectNotes = String(data.get("projectNotes") || "").trim();
    const recommendation = recommendationFor(clientType, projectStage);

    let level = "green";
    let title = "Green: broadly under control";
    let summary = "Your answers suggest the investment is not showing obvious stress signals. The next step is to verify assumptions with actual tax, debt, vacancy, reserve, documentation, and exit-cost data.";

    if (percentage >= 40 && percentage < 70) {
      level = "yellow";
      title = "Yellow: hidden risk likely exists";
      summary = "Your answers suggest there may be tax, refinancing, cash-flow, documentation, concentration, or exit risks that are not visible in a simple rent-minus-mortgage calculation.";
    }

    if (percentage >= 70) {
      level = "red";
      title = "Red: the investment may be less profitable than it looks";
      summary = "Your answers suggest the investment could be exposed to tax leakage, rate pressure, repair reserves, ownership-structure problems, documentation gaps, concentration risk, or exit costs that materially change the return.";
    }

    const payload = {
      leadName,
      leadEmail,
      leadPhone,
      clientType,
      clientTypeLabel: optionLabel(clientType),
      projectStage,
      projectStageLabel: optionLabel(projectStage),
      projectNotes,
      percentage,
      resultTitle: title,
      recommendationTitle: recommendation.title
    };

    resultBox.className = "result-box show";
    resultBox.innerHTML = `
      <span class="score-badge ${level}">${percentage}% stress score</span>
      <h2 style="margin-top:16px">${title}</h2>
      <p>${summary}</p>
      <div class="result-grid">
        <div>
          <strong>Best-fit next step</strong>
          <h3>${recommendation.title}</h3>
          <p>${recommendation.summary}</p>
        </div>
        <div class="lead-summary">
          <strong>Lead profile</strong>
          <dl>
            <dt>Role</dt><dd>${escapeHtml(optionLabel(clientType))}</dd>
            <dt>Decision</dt><dd>${escapeHtml(optionLabel(projectStage))}</dd>
            <dt>Name</dt><dd>${escapeHtml(leadName)}</dd>
            <dt>Email</dt><dd>${escapeHtml(leadEmail)}</dd>
          </dl>
        </div>
      </div>
      <p><strong>What happens in the review:</strong> actual numbers, documents, tax exposure, financing pressure, and decision scenarios are translated into a short action memo.</p>
      <div data-lead-status class="lead-status pending">Submitting your result...</div>
      <div class="actions">
        <a class="button" href="${mailtoHref(payload)}">Email a copy</a>
        <a class="button light" href="${recommendation.href}">Review ${recommendation.service}</a>
      </div>
    `;
    resultBox.scrollIntoView({ behavior: "smooth", block: "start" });

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Result calculated";
    }

    renderSubmissionStatus("pending", payload);
    const submission = await submitLead(payload);
    renderSubmissionStatus(submission.ok ? "success" : "warning", payload);

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.textContent = "Recalculate my stress score";
    }
  });
}
