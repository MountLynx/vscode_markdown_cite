(function () {
  const vscode = acquireVsCodeApi();

  let mode = "library";
  let entries = [];
  let documentCitekeys = new Set();

  const btnLibrary = document.getElementById("btn-library");
  const btnReference = document.getElementById("btn-reference");
  const searchInput = document.getElementById("search-input");
  const locatorType = document.getElementById("locator-type");
  const locatorValue = document.getElementById("locator-value");
  const entryList = document.getElementById("entry-list");
  const emptyMsg = document.getElementById("empty-msg");
  const btnExport = document.getElementById("btn-export");

  function normalize(text) {
    return text.toLowerCase().replace(/\s+/g, "");
  }

  function filterEntries(query) {
    const q = normalize(query);
    if (!q) return entries;
    return entries.filter((e) =>
      [e.key, e.title, e.authors, e.year].some((f) => normalize(f).includes(q))
    );
  }

  function formatPrimary(entry) {
    const parts = [];
    if (entry.authors) {
      const authors = entry.authors.split(";").map((a) => a.trim());
      if (authors.length === 1) {
        parts.push(authors[0]);
      } else if (authors.length === 2) {
        parts.push(authors[0].split(",")[0].trim() + " and " + authors[1].split(",")[0].trim());
      } else {
        parts.push(authors[0].split(",")[0].trim() + " et al.");
      }
    }
    if (entry.year) parts.push("(" + entry.year + ")");
    if (entry.journal) parts.push(entry.journal.replace(/<[^>]+>/g, "").trim());
    return parts.join(" · ");
  }

  function render() {
    let visible = entries;
    if (mode === "reference") {
      visible = entries.filter((e) => documentCitekeys.has(e.key));
    }
    const filtered = filterEntries(searchInput.value);
    entryList.innerHTML = "";

    if (filtered.length === 0) {
      emptyMsg.classList.remove("hidden");
      return;
    }

    emptyMsg.classList.add("hidden");
    for (const entry of filtered) {
      const li = document.createElement("li");
      li.className = "entry-item";

      const primary = document.createElement("div");
      primary.className = "entry-primary";
      primary.textContent = formatPrimary(entry);

      const secondary = document.createElement("div");
      secondary.className = "entry-secondary";
      secondary.textContent = entry.title;

      li.appendChild(primary);
      li.appendChild(secondary);

      li.addEventListener("click", function () {
        const locator = composeLocator();
        vscode.postMessage({ command: "insert", citekey: entry.key, locator: locator });
      });

      entryList.appendChild(li);
    }
  }

  function composeLocator() {
    const val = locatorValue.value.trim();
    if (!val) return "";
    const type = locatorType.value;
    return type ? type + " " + val : val;
  }

  btnLibrary.addEventListener("click", function () {
    mode = "library";
    btnLibrary.classList.add("active");
    btnReference.classList.remove("active");
    render();
  });

  btnReference.addEventListener("click", function () {
    mode = "reference";
    btnReference.classList.add("active");
    btnLibrary.classList.remove("active");
    render();
  });

  searchInput.addEventListener("input", render);

  btnExport.addEventListener("click", function () {
    btnExport.disabled = true;
    btnExport.textContent = "\u23F3 Exporting...";
    vscode.postMessage({ command: "export-docx" });
  });

  window.addEventListener("message", function (event) {
    const msg = event.data;
    switch (msg.command) {
      case "setEntries":
        entries = msg.entries || [];
        documentCitekeys = new Set(msg.documentCitekeys || []);
        render();
        break;
      case "exportDone":
        btnExport.disabled = false;
        btnExport.textContent = "\uD83D\uDCE6 Export DOCX";
        break;
      case "exportError":
        btnExport.disabled = false;
        btnExport.textContent = "\uD83D\uDCE6 Export DOCX";
        break;
    }
  });

  vscode.postMessage({ command: "ready" });
})();
