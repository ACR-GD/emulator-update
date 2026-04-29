const I18N = {
  fr: {
    title: "Emulator Update Radar",
    subtitle: "Suivi communautaire des releases GitHub (stable + nightly)",
    latestHeading: "Dernieres versions par emulateur",
    recentHeading: "Fil recent",
    updatedAt: "Maj",
    refresh: "Refresh",
    minutes: "min",
    noData: "Aucune donnee",
    loadError: "Impossible de charger le dashboard.",
    stable: "Stable",
    nightly: "Nightly",
    tagSuffix: "(tag)",
    toggle: "FR -> EN"
  },
  en: {
    title: "Emulator Update Radar",
    subtitle: "Community tracking for GitHub releases (stable + nightly)",
    latestHeading: "Latest builds per emulator",
    recentHeading: "Recent feed",
    updatedAt: "Updated",
    refresh: "Refresh",
    minutes: "min",
    noData: "No data yet",
    loadError: "Unable to load dashboard.",
    stable: "Stable",
    nightly: "Nightly",
    tagSuffix: "(tag)",
    toggle: "EN -> FR"
  }
};

let lang = localStorage.getItem("dashboard_lang") === "en" ? "en" : "fr";

function t(key) {
  return I18N[lang][key];
}

function applyStaticTranslations() {
  document.documentElement.lang = lang;
  document.title = t("title");
  document.getElementById("title").textContent = t("title");
  document.getElementById("subtitle").textContent = t("subtitle");
  document.getElementById("latestHeading").textContent = t("latestHeading");
  document.getElementById("recentHeading").textContent = t("recentHeading");
  document.getElementById("langToggle").textContent = t("toggle");
}

function formatDate(value) {
  if (!value) return "n/a";
  const locale = lang === "en" ? "en-US" : "fr-FR";
  return new Date(value).toLocaleString(locale);
}

function cleanTagName(tagName) {
  const tagSuffix = t("tagSuffix");
  return tagName.endsWith(` ${tagSuffix}`) ? tagName.slice(0, -1 * (` ${tagSuffix}`).length) : tagName;
}

function releaseLine(channel, entry) {
  const chipClass = channel === "stable" ? "stable" : "nightly";
  const label = channel === "stable" ? t("stable") : t("nightly");

  if (!entry) {
    return `
      <div class="release-line">
        <span class="chip ${chipClass}">${label}</span>
        <span class="muted">${t("noData")}</span>
      </div>
    `;
  }

  return `
    <div class="release-line">
      <span class="chip ${chipClass}">${label}</span>
      <a href="${entry.htmlUrl}" target="_blank" rel="noreferrer">${cleanTagName(entry.tagName)}</a>
      <span class="release-date">${formatDate(entry.publishedAt)}</span>
    </div>
  `;
}

function renderRepoCard(repo) {
  return `
    <article class="card">
      <h3>${repo.label}</h3>
      <div class="muted">${repo.repoFullName}</div>
      ${releaseLine("stable", repo.stable)}
      ${releaseLine("nightly", repo.nightly)}
    </article>
  `;
}

function renderRecentRow(item) {
  const channel = item.channel === "stable" ? t("stable") : t("nightly");
  return `
    <li>
      <div>
        <strong>${item.repoLabel}</strong>
        <span class="muted">(${channel})</span>
        - <a href="${item.htmlUrl}" target="_blank" rel="noreferrer">${cleanTagName(item.tagName)}</a>
      </div>
      <span class="release-date">${formatDate(item.firstSeenAt)}</span>
    </li>
  `;
}

async function loadOverview() {
  const res = await fetch("/api/overview");
  if (!res.ok) {
    throw new Error(t("loadError"));
  }

  return res.json();
}

async function render() {
  applyStaticTranslations();
  try {
    const data = await loadOverview();
    document.getElementById("updatedAt").textContent = `${t("updatedAt")}: ${formatDate(data.updatedAt)}`;
    document.getElementById("pollInterval").textContent = `${t("refresh")}: ${data.pollIntervalMinutes} ${t("minutes")}`;
    document.getElementById("repoGrid").innerHTML = data.repos.map(renderRepoCard).join("");
    document.getElementById("recentList").innerHTML = data.recent.map(renderRecentRow).join("");
  } catch (error) {
    const message = error instanceof Error ? error.message : t("loadError");
    document.getElementById("repoGrid").innerHTML = `<p class="muted">${message}</p>`;
  }
}

document.getElementById("langToggle").addEventListener("click", () => {
  lang = lang === "fr" ? "en" : "fr";
  localStorage.setItem("dashboard_lang", lang);
  render();
});

render();
setInterval(render, 30000);
