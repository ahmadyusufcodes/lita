const OWNER = "ahmadyusufcodes";
const REPO = "lita";
const WORKFLOW_FILE = "build-artifacts.yml";

const WORKFLOW_URL = `https://github.com/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}`;
const API_URL = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW_FILE}/runs?branch=main&status=completed&per_page=20`;

const statusEl = document.querySelector("#download-status");
const latestRunLink = document.querySelector("#latest-run-link");
const downloadButtons = document.querySelectorAll("a[data-artifact]");

const setStatus = (message) => {
  if (statusEl) {
    statusEl.textContent = message;
  }
};

const setFallback = (message) => {
  downloadButtons.forEach((button) => {
    button.classList.remove("disabled");
    button.setAttribute("aria-disabled", "false");
    button.textContent = "Open Build Workflow";
    button.href = WORKFLOW_URL;
    button.target = "_blank";
    button.rel = "noreferrer";
  });
  setStatus(message);
};

const nightlyArtifactUrl = (runId, artifactName) =>
  `https://nightly.link/${OWNER}/${REPO}/actions/runs/${runId}/${artifactName}.zip`;

const hydrateLatestBuildButtons = async () => {
  try {
    const response = await fetch(API_URL, {
      headers: { Accept: "application/vnd.github+json" },
    });

    if (!response.ok) {
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const data = await response.json();
    const runs = Array.isArray(data.workflow_runs) ? data.workflow_runs : [];
    const latestSuccess = runs.find((run) => run.conclusion === "success");

    if (!latestSuccess) {
      setFallback("No successful build found yet. Use workflow page to check pending runs.");
      return;
    }

    const runId = latestSuccess.id;
    if (latestRunLink) {
      latestRunLink.href = latestSuccess.html_url;
      latestRunLink.textContent = `Latest successful run #${latestSuccess.run_number}`;
    }

    downloadButtons.forEach((button) => {
      const artifactName = button.dataset.artifact;
      if (!artifactName) {
        return;
      }

      button.href = nightlyArtifactUrl(runId, artifactName);
      button.classList.remove("disabled");
      button.setAttribute("aria-disabled", "false");
      button.textContent = "Download .zip";
      button.target = "_blank";
      button.rel = "noreferrer";
    });

    setStatus(
      `Downloads are linked to successful run #${latestSuccess.run_number}.`,
    );
  } catch (error) {
    console.error(error);
    setFallback("Could not resolve latest build automatically. Open workflow runs.");
  }
};

void hydrateLatestBuildButtons();
