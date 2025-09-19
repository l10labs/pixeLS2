import { defineConfig } from "vite";

export default defineConfig(() => {
  const repoName = process.env.GITHUB_REPOSITORY?.split("/")[1];
  const isGitHubPages = process.env.GITHUB_PAGES === "true" && repoName;

  return {
    base: isGitHubPages ? `/${repoName}/` : "/",
  };
});
