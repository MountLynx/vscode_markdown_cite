(function () {
  const vscode = acquireVsCodeApi();

  let mode = "library";
  let entries = [];
  let documentCitekeys = new Set();
  let loaded = false;

  const btnLibrary = document.getElementById("btn-library");
  const btnReference = document.getElementById("btn-reference");
  const searchInput = document.getElementById("search-input");
  const locatorType = document.getElementById("locator-type");
  const locatorValue = document.getElementById("locator-value");
  const entryList = document.getElementById("entry-list");
  const loadingMsg = document.getElementById("loading-msg");
  const emptyMsg = document.getElementById("empty-msg");
  const noBibMsg = document.getElementById("no-bib-msg");
  const btnExport = document.getElementById("btn-export");

  function hideAllMessages() {
    loadingMsg.classList.add("hidden");
    emptyMsg.classList.add("hidden");
    noBibMsg.classList.add("hidden");
  }

  function normalize(text) {
    return text.toLowerCase().replace(/\s+/g, "");
  }

  function filterEntries(query) {
    const q = normalize(query);
    if (!q) return entries;
    return entries.filter(function (e) {
      return [e.key, e.title, e.authors, e.year].some(function (f) {
        return normalize(f).includes(q);
      });
    });
  }

  function formatPrimary(entry) {
    var parts = [];
    if (entry.authors) {
      var authors = entry.authors.split(";").map(function (a) { return a.trim(); });
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
    if (!loaded) return;
    hideAllMessages();
    entryList.innerHTML = "";

    if (entries.length === 0) {
      noBibMsg.classList.remove("hidden");
      return;
    }

    var visible = entries;
    if (mode === "reference") {
      visible = entries.filter(function (e) { return documentCitekeys.has(e.key); });
    }
    var filtered = filterEntries(searchInput.value);

    if (filtered.length === 0) {
      emptyMsg.classList.remove("hidden");
      return;
    }

    for (var i = 0; i < filtered.length; i++) {
      var entry = filtered[i];
      var li = document.createElement("li");
      li.className = "entry-item";

      var primary = document.createElement("div");
      primary.className = "entry-primary";
      primary.textContent = formatPrimary(entry);

      var secondary = document.createElement("div");
      secondary.className = "entry-secondary";
      secondary.textContent = entry.title;

      li.appendChild(primary);
      li.appendChild(secondary);

      (function (e) {
        li.addEventListener("click", function () {
          var locator = composeLocator();
          vscode.postMessage({ command: "insert", citekey: e.key, locator: locator });
        });
      })(entry);

      entryList.appendChild(li);
    }
  }

  function composeLocator() {
    var val = locatorValue.value.trim();
    if (!val) return "";
    var type = locatorType.value;
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
    var msg = event.data;
    switch (msg.command) {
      case "setEntries":
        loaded = true;
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
