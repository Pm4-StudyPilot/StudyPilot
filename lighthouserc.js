module.exports = {
  ci: {
    collect: {
      url: ["http://localhost:5173/login"],
      startServerCommand:
        "cd frontend && npx vite preview --port 5173",
      startServerReadyPattern: "Local",
      numberOfRuns: 1,
    },
    assert: {
      assertions: {
        "categories:performance": ["warn", { minScore: 0.6 }],
        "categories:accessibility": ["warn", { minScore: 0.7 }],
        "categories:best-practices": ["warn", { minScore: 0.7 }],
        "categories:seo": ["warn", { minScore: 0.7 }],
      },
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci",
    },
  },
};
