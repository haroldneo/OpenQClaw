const FALLBACK_RELEASE = {
  tagName: "v0.1.4",
  publishedAt: "2026-03-12T13:19:34Z",
  htmlUrl: "https://github.com/haroldneo/OpenQClaw/releases/tag/v0.1.4",
  assets: {
    arm64: "https://github.com/haroldneo/OpenQClaw/releases/download/v0.1.4/OpenQClaw-0.1.4-arm64.app.zip",
    x64: "https://github.com/haroldneo/OpenQClaw/releases/download/v0.1.4/OpenQClaw-0.1.4-x64.app.zip",
  },
};

const REPO_RELEASE_API = "https://api.github.com/repos/haroldneo/OpenQClaw/releases/latest";

function applyReleaseData(release) {
  const version = release.tagName || FALLBACK_RELEASE.tagName;
  const releasePage = release.htmlUrl || FALLBACK_RELEASE.htmlUrl;
  const publishedAt = formatDate(release.publishedAt || FALLBACK_RELEASE.publishedAt);

  document.querySelectorAll("[data-release-version]").forEach((node) => {
    node.textContent = version;
  });

  document.querySelectorAll("[data-release-date]").forEach((node) => {
    node.textContent = publishedAt;
  });

  document.querySelectorAll("[data-release-page]").forEach((node) => {
    node.href = releasePage;
  });

  document.querySelectorAll("[data-release-link]").forEach((node) => {
    node.href = releasePage;
  });

  for (const [assetType, href] of Object.entries(release.assets || {})) {
    document.querySelectorAll(`[data-asset="${assetType}"]`).forEach((node) => {
      node.href = href;
    });
  }
}

function formatDate(value) {
  try {
    return new Intl.DateTimeFormat("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date(value));
  } catch {
    return "2026-03-12";
  }
}

async function loadLatestRelease() {
  applyReleaseData(FALLBACK_RELEASE);

  try {
    const response = await fetch(REPO_RELEASE_API, {
      headers: {
        Accept: "application/vnd.github+json",
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub API returned ${response.status}`);
    }

    const payload = await response.json();
    const assets = {};

    for (const asset of payload.assets || []) {
      if (/arm64/i.test(asset.name)) {
        assets.arm64 = asset.browser_download_url;
      } else if (/(x64|intel)/i.test(asset.name)) {
        assets.x64 = asset.browser_download_url;
      }
    }

    applyReleaseData({
      tagName: payload.tag_name,
      publishedAt: payload.published_at,
      htmlUrl: payload.html_url,
      assets,
    });
  } catch (error) {
    console.warn("Failed to refresh release links, fallback kept.", error);
  }
}

function setupReveal() {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.18 }
  );

  document.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
}

function setupHeaderState() {
  const header = document.querySelector(".site-header");
  if (!header) {
    return;
  }

  const sync = () => {
    header.classList.toggle("scrolled", window.scrollY > 24);
  };

  sync();
  window.addEventListener("scroll", sync, { passive: true });
}

function setupDownloadMenus() {
  const menus = document.querySelectorAll(".download-menu");

  menus.forEach((menu) => {
    const trigger = menu.querySelector("button");

    if (!trigger) {
      return;
    }

    trigger.addEventListener("click", (event) => {
      event.preventDefault();
      const nextState = !menu.classList.contains("is-open");

      menus.forEach((item) => {
        item.classList.remove("is-open");
        const button = item.querySelector("button");
        if (button) {
          button.setAttribute("aria-expanded", "false");
        }
      });

      if (nextState) {
        menu.classList.add("is-open");
        trigger.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", (event) => {
    menus.forEach((menu) => {
      if (menu.contains(event.target)) {
        return;
      }

      menu.classList.remove("is-open");
      const trigger = menu.querySelector("button");
      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") {
      return;
    }

    menus.forEach((menu) => {
      menu.classList.remove("is-open");
      const trigger = menu.querySelector("button");
      if (trigger) {
        trigger.setAttribute("aria-expanded", "false");
      }
    });
  });
}

function syncYear() {
  document.querySelectorAll("[data-current-year]").forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });
}

setupReveal();
setupHeaderState();
setupDownloadMenus();
syncYear();
loadLatestRelease();
