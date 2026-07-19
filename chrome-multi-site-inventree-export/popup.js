const els = {
  inventreeUrl: document.getElementById("inventreeUrl"),
  inventreeToken: document.getElementById("inventreeToken"),
  inventreeEndpointPath: document.getElementById("inventreeEndpointPath"),
  sourceMode: document.getElementById("sourceMode"),
  crawlLinkedPages: document.getElementById("crawlLinkedPages"),
  maxLinkedPages: document.getElementById("maxLinkedPages"),
  previewLinksBtn: document.getElementById("previewLinksBtn"),
  selectAllLinksBtn: document.getElementById("selectAllLinksBtn"),
  selectFilteredLinksBtn: document.getElementById("selectFilteredLinksBtn"),
  clearFilteredLinksBtn: document.getElementById("clearFilteredLinksBtn"),
  invertFilteredLinksBtn: document.getElementById("invertFilteredLinksBtn"),
  clearAllLinksBtn: document.getElementById("clearAllLinksBtn"),
  linkedPagesFilter: document.getElementById("linkedPagesFilter"),
  linkedPagesSummary: document.getElementById("linkedPagesSummary"),
  linkedPagesList: document.getElementById("linkedPagesList"),
  nameHeaderHint: document.getElementById("nameHeaderHint"),
  descriptionHeaderHint: document.getElementById("descriptionHeaderHint"),
  mpnHeaderHint: document.getElementById("mpnHeaderHint"),
  supplierPnHeaderHint: document.getElementById("supplierPnHeaderHint"),
  imageHeaderHint: document.getElementById("imageHeaderHint"),
  partImageUploadPath: document.getElementById("partImageUploadPath"),
  partIdResponsePath: document.getElementById("partIdResponsePath"),
  existingMatchStrategy: document.getElementById("existingMatchStrategy"),
  includeImageUrls: document.getElementById("includeImageUrls"),
  uploadImagesIfSupported: document.getElementById("uploadImagesIfSupported"),
  testPathBtn: document.getElementById("testPathBtn"),
  saveSettingsBtn: document.getElementById("saveSettingsBtn"),
  captureBtn: document.getElementById("captureBtn"),
  sendBtn: document.getElementById("sendBtn"),
  jsonBtn: document.getElementById("jsonBtn"),
  csvBtn: document.getElementById("csvBtn"),
  captureMeta: document.getElementById("captureMeta"),
  preview: document.getElementById("preview"),
  status: document.getElementById("status")
};

let lastCapture = null;
let previewLinkedPages = [];
let itemLabels = {};
const selectedLinkedPages = new Set();

function setStatus(message, kind = "") {
  els.status.textContent = message;
  els.status.className = `status ${kind}`.trim();
}

function sendMessage(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

function getHints() {
  return {
    nameHeaderHint: els.nameHeaderHint.value.trim(),
    descriptionHeaderHint: els.descriptionHeaderHint.value.trim(),
    mpnHeaderHint: els.mpnHeaderHint.value.trim(),
    supplierPnHeaderHint: els.supplierPnHeaderHint.value.trim(),
    imageHeaderHint: els.imageHeaderHint.value.trim(),
    includeImageUrls: Boolean(els.includeImageUrls.checked),
    uploadImagesIfSupported: Boolean(els.uploadImagesIfSupported.checked),
    partImageUploadPath: els.partImageUploadPath.value.trim() || "/api/part/{id}/upload/",
    partIdResponsePath: els.partIdResponsePath.value.trim(),
    existingMatchStrategy: els.existingMatchStrategy.value === "update" ? "update" : "skip",
    sourceMode: ["auto", "mcmaster", "boltdepot", "amazon"].includes(els.sourceMode.value) ? els.sourceMode.value : "auto",
    crawlLinkedPages: Boolean(els.crawlLinkedPages.checked),
    maxLinkedPages: Number(els.maxLinkedPages.value || 20)
  };
}

function applySettings(settings) {
  els.inventreeUrl.value = settings.inventreeUrl || "";
  els.inventreeToken.value = settings.inventreeToken || "";
  els.inventreeEndpointPath.value = settings.inventreeEndpointPath || "/api/plugin/product-import/";
  els.sourceMode.value = ["auto", "mcmaster", "boltdepot", "amazon"].includes(settings.sourceMode) ? settings.sourceMode : "auto";
  els.crawlLinkedPages.checked = Boolean(settings.crawlLinkedPages);
  els.maxLinkedPages.value = String(settings.maxLinkedPages || 20);
  els.nameHeaderHint.value = settings.nameHeaderHint || "";
  els.descriptionHeaderHint.value = settings.descriptionHeaderHint || "";
  els.mpnHeaderHint.value = settings.mpnHeaderHint || "";
  els.supplierPnHeaderHint.value = settings.supplierPnHeaderHint || "";
  els.imageHeaderHint.value = settings.imageHeaderHint || "";
  els.partImageUploadPath.value = settings.partImageUploadPath || "/api/part/{id}/upload/";
  els.partIdResponsePath.value = settings.partIdResponsePath || "";
  els.existingMatchStrategy.value = settings.existingMatchStrategy === "update" ? "update" : "skip";
  els.includeImageUrls.checked = Boolean(settings.includeImageUrls);
  els.uploadImagesIfSupported.checked = Boolean(settings.uploadImagesIfSupported);
}

function collectSettingsFromForm() {
  return {
    inventreeUrl: els.inventreeUrl.value.trim(),
    inventreeToken: els.inventreeToken.value.trim(),
    inventreeEndpointPath: els.inventreeEndpointPath.value.trim() || "/api/plugin/product-import/",
    ...getHints()
  };
}

function renderLinkedPagesSelection() {
  const filter = String(els.linkedPagesFilter?.value || "").trim().toLowerCase();

  function getLabelForUrl(url) {
    return itemLabels[url] || url;
  }

  const visibleLinks = filter
    ? previewLinkedPages.filter((url) => {
        const label = getLabelForUrl(url);
        return url.toLowerCase().includes(filter) || label.toLowerCase().includes(filter);
      })
    : previewLinkedPages;

  const total = previewLinkedPages.length;
  const selectedCount = Array.from(selectedLinkedPages).filter((url) => previewLinkedPages.includes(url)).length;
  els.linkedPagesSummary.textContent = `Items/pages: ${total}. Visible: ${visibleLinks.length}. Selected: ${selectedCount}.`;

  if (total === 0) {
    els.linkedPagesList.innerHTML = "<div style=\"font-size:11px;color:#51646b;padding:4px;\">No items or linked pages discovered yet.</div>";
    return;
  }

  if (visibleLinks.length === 0) {
    els.linkedPagesList.innerHTML = "<div style=\"font-size:11px;color:#51646b;padding:4px;\">No items match the current filter.</div>";
    return;
  }

  const html = visibleLinks
    .map((url) => {
      const checked = selectedLinkedPages.has(url) ? "checked" : "";
      const label = getLabelForUrl(url);
      const displayText = label !== url
        ? `${escapeHtml(label)}<br><span style="color:#697c85;font-size:10px;word-break:break-all;">${escapeHtml(url)}</span>`
        : escapeHtml(url);
      return `<label class="link-item"><input data-link-url="${encodeURIComponent(url)}" type="checkbox" ${checked} /><span>${displayText}</span></label>`;
    })
    .join("");
  els.linkedPagesList.innerHTML = html;

  const checkboxes = Array.from(els.linkedPagesList.querySelectorAll("input[type='checkbox'][data-link-url]"));
  for (const checkbox of checkboxes) {
    checkbox.addEventListener("change", () => {
      const encoded = checkbox.getAttribute("data-link-url") || "";
      const url = decodeURIComponent(encoded);
      if (!url) return;
      if (checkbox.checked) {
        selectedLinkedPages.add(url);
      } else {
        selectedLinkedPages.delete(url);
      }
      renderLinkedPagesSelection();
    });
  }
}

function selectedLinkedPageList() {
  return previewLinkedPages.filter((url) => selectedLinkedPages.has(url));
}

function getVisibleLinkedPages() {
  const filter = String(els.linkedPagesFilter?.value || "").trim().toLowerCase();
  return filter
    ? previewLinkedPages.filter((url) => {
        const label = itemLabels[url] || url;
        return url.toLowerCase().includes(filter) || label.toLowerCase().includes(filter);
      })
    : [...previewLinkedPages];
}

async function saveSettings() {
  setStatus("Saving settings...");
  const response = await sendMessage({
    type: "saveSettings",
    settings: collectSettingsFromForm()
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Failed to save settings");
  }
  setStatus("Settings saved.", "ok");
}

function renderCapture(capture) {
  if (!capture || !Array.isArray(capture.rows)) {
    els.captureMeta.textContent = "No capture yet.";
    els.preview.innerHTML = "";
    return;
  }

  const lines = [
    `Source: ${capture.source || "-"}`,
    `Title: ${capture.pageTitle || "-"}`,
    `URL: ${capture.pageUrl || "-"}`,
    `Rows: ${capture.rows.length}`,
    `Columns: ${capture.headers?.length || 0}`,
    `Pages Scraped: ${capture.pagesScraped || 1}`,
    `Captured At: ${capture.capturedAt || "-"}`
  ];
  els.captureMeta.textContent = lines.join("\n");

  const previewRows = capture.rows.slice(0, 5);
  const previewHeaders = capture.headers.slice(0, 6);

  if (previewHeaders.length === 0 || previewRows.length === 0) {
    els.preview.innerHTML = "<div style=\"padding:8px;\">No rows found in the selected table.</div>";
    return;
  }

  const headerHtml = previewHeaders.map((h) => `<th>${escapeHtml(h)}</th>`).join("");
  const bodyHtml = previewRows
    .map((row) => {
      const cells = previewHeaders.map((h) => `<td>${escapeHtml(row[h] || "")}</td>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  els.preview.innerHTML = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function capturePage() {
  setStatus("Capturing product table from current page...");
  const response = await sendMessage({
    type: "capturePage",
    settings: collectSettingsFromForm(),
    selectedChildLinks: selectedLinkedPageList()
  });
  if (!response?.ok) {
    throw new Error(response?.error || "Capture failed");
  }

  lastCapture = response.capture;
  renderCapture(lastCapture);
  setStatus(`Captured ${lastCapture.rows.length} rows.`, "ok");
}

async function previewLinkedPagesForCurrentPage() {
  setStatus("Discovering linked pages from current tab...");
  const response = await sendMessage({
    type: "previewLinkedPages",
    settings: collectSettingsFromForm()
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Could not preview linked pages");
  }

  previewLinkedPages = Array.isArray(response.links) ? response.links : [];
  itemLabels = (response.itemLabels && typeof response.itemLabels === "object") ? response.itemLabels : {};
  selectedLinkedPages.clear();
  for (const url of previewLinkedPages) {
    selectedLinkedPages.add(url);
  }
  renderLinkedPagesSelection();
  setStatus(`Linked page preview loaded (${previewLinkedPages.length} found).`, "ok");
}

async function exportData(format) {
  if (!lastCapture || !lastCapture.rows?.length) {
    throw new Error("No captured rows. Capture a page first.");
  }

  setStatus(`Preparing ${format.toUpperCase()} download...`);
  const response = await sendMessage({
    type: "downloadExport",
    format,
    capture: lastCapture,
    settings: collectSettingsFromForm()
  });

  if (!response?.ok) {
    throw new Error(response?.error || `Could not export ${format}`);
  }

  setStatus(`Downloaded ${response.filename}`, "ok");
}

async function sendToInventree() {
  if (!lastCapture || !lastCapture.rows?.length) {
    throw new Error("No captured rows. Capture a page first.");
  }

  await saveSettings();
  setStatus("Sending payload to InvenTree endpoint...");

  const response = await sendMessage({
    type: "sendToInventree",
    capture: lastCapture,
    settings: collectSettingsFromForm()
  });

  if (!response?.ok) {
    throw new Error(response?.error || "InvenTree request failed");
  }

  const imageMsg = response.uploadedImages || response.skippedImages
    ? ` Images uploaded: ${response.uploadedImages || 0}, skipped: ${response.skippedImages || 0}.`
    : "";
  const matchMsg = ` Existing matches -> skipped: ${response.skippedExisting || 0}, marked for update: ${response.matchedForUpdate || 0}.`;
  const note = response.imageUploadNote ? ` ${response.imageUploadNote}` : "";
  const msg = `Sent ${response.sentCount} item(s). HTTP ${response.status}.${matchMsg}${imageMsg}${note}`;
  setStatus(msg, "ok");
}

async function testPartIdPath() {
  setStatus("Testing part ID response path against last response...");
  const response = await sendMessage({
    type: "testPartIdPath",
    settings: collectSettingsFromForm()
  });

  if (!response?.ok) {
    throw new Error(response?.error || "Path test failed");
  }

  const ids = Array.isArray(response.partIds) ? response.partIds : [];
  const preview = ids.slice(0, 8).join(", ") || "none";
  const msg = `Path test: found ${ids.length} part ID(s). Sample: ${preview}`;
  setStatus(msg, ids.length > 0 ? "ok" : "");
}

async function loadState() {
  const response = await sendMessage({ type: "getState" });
  if (!response?.ok) {
    throw new Error(response?.error || "Could not load extension state");
  }
  applySettings(response.settings || {});
  lastCapture = response.lastCapture || null;
  renderCapture(lastCapture);
}

function wireEvents() {
  els.saveSettingsBtn.addEventListener("click", async () => {
    try {
      await saveSettings();
    } catch (error) {
      setStatus(String(error.message || error), "error");
    }
  });

  els.captureBtn.addEventListener("click", async () => {
    try {
      await capturePage();
    } catch (error) {
      setStatus(String(error.message || error), "error");
    }
  });

  els.jsonBtn.addEventListener("click", async () => {
    try {
      await exportData("json");
    } catch (error) {
      setStatus(String(error.message || error), "error");
    }
  });

  els.csvBtn.addEventListener("click", async () => {
    try {
      await exportData("csv");
    } catch (error) {
      setStatus(String(error.message || error), "error");
    }
  });

  els.sendBtn.addEventListener("click", async () => {
    try {
      await sendToInventree();
    } catch (error) {
      setStatus(String(error.message || error), "error");
    }
  });

  els.testPathBtn.addEventListener("click", async () => {
    try {
      await testPartIdPath();
    } catch (error) {
      setStatus(String(error.message || error), "error");
    }
  });

  els.previewLinksBtn.addEventListener("click", async () => {
    try {
      await previewLinkedPagesForCurrentPage();
    } catch (error) {
      setStatus(String(error.message || error), "error");
    }
  });

  els.selectAllLinksBtn.addEventListener("click", () => {
    for (const url of previewLinkedPages) {
      selectedLinkedPages.add(url);
    }
    renderLinkedPagesSelection();
    setStatus(`Selected ${selectedLinkedPages.size} linked page(s).`);
  });

  els.selectFilteredLinksBtn.addEventListener("click", () => {
    const visible = getVisibleLinkedPages();
    for (const url of visible) {
      selectedLinkedPages.add(url);
    }
    renderLinkedPagesSelection();
    setStatus(`Selected ${visible.length} filtered linked page(s).`);
  });

  els.clearFilteredLinksBtn.addEventListener("click", () => {
    const visible = getVisibleLinkedPages();
    for (const url of visible) {
      selectedLinkedPages.delete(url);
    }
    renderLinkedPagesSelection();
    setStatus(`Cleared ${visible.length} filtered linked page(s).`);
  });

  els.invertFilteredLinksBtn.addEventListener("click", () => {
    const visible = getVisibleLinkedPages();
    for (const url of visible) {
      if (selectedLinkedPages.has(url)) {
        selectedLinkedPages.delete(url);
      } else {
        selectedLinkedPages.add(url);
      }
    }
    renderLinkedPagesSelection();
    setStatus(`Inverted selection for ${visible.length} visible linked page(s).`);
  });

  els.clearAllLinksBtn.addEventListener("click", () => {
    selectedLinkedPages.clear();
    renderLinkedPagesSelection();
    setStatus("Cleared linked-page selection.");
  });

  els.linkedPagesFilter.addEventListener("input", () => {
    renderLinkedPagesSelection();
  });
}

wireEvents();
renderLinkedPagesSelection();
loadState().catch((error) => {
  setStatus(String(error.message || error), "error");
});
