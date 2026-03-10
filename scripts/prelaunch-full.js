#!/usr/bin/env node

const path = require("path");
const { spawnSync } = require("child_process");

function quoteCmdArg(value) {
  const safe = String(value || "");
  if (!safe) return '""';
  if (!/[\s"&|<>^]/.test(safe)) return safe;
  return `"${safe.replace(/"/g, '\\"')}"`;
}

function runStep(step) {
  const [command, ...args] = step.command;
  const label = step.label || `${command} ${args.join(" ")}`.trim();

  console.log(`\n[prelaunch] ${label}`);
  let result = null;

  if (process.platform === "win32" && /\.cmd$/i.test(String(command || ""))) {
    const commandLine = [command, ...args].map(quoteCmdArg).join(" ");
    result = spawnSync("cmd.exe", ["/d", "/s", "/c", commandLine], {
      cwd: path.resolve(process.cwd()),
      stdio: "inherit",
      shell: false,
      env: process.env,
    });
  } else {
    result = spawnSync(command, args, {
      cwd: path.resolve(process.cwd()),
      stdio: "inherit",
      shell: false,
      env: process.env,
    });
  }

  if (result.error) {
    throw result.error;
  }

  if (Number(result.status) !== 0) {
    throw new Error(`etapa falhou: ${label} (exit ${result.status})`);
  }
}

function shouldSkipConcurrency() {
  const raw = String(process.env.SKIP_CONCURRENCY_TEST || "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

function shouldSkipDesignacao() {
  const raw = String(process.env.SKIP_DESIGNACAO_TEST || "")
    .trim()
    .toLowerCase();
  return ["1", "true", "yes", "on"].includes(raw);
}

function main() {
  const isWin = process.platform === "win32";
  const npmCommand = isWin ? "npm.cmd" : "npm";

  const steps = [
    {
      label: "Aplicando migracoes SQL",
      command: [npmCommand, "run", "db:migrate:sql"],
    },
    {
      label: "Check de rotina (sintaxe, prisma, smoke)",
      command: [npmCommand, "run", "check:rotina"],
    },
  ];

  if (!shouldSkipDesignacao()) {
    steps.push({
      label: "Teste de designacao de treino",
      command: [npmCommand, "run", "test:designacao"],
    });
  } else {
    console.log("[prelaunch] SKIP_DESIGNACAO_TEST ativo: teste de designacao foi ignorado");
  }

  if (!shouldSkipConcurrency()) {
    steps.push({
      label: "Teste de concorrencia",
      command: [npmCommand, "run", "test:concorrencia"],
    });
  } else {
    console.log("[prelaunch] SKIP_CONCURRENCY_TEST ativo: teste de concorrencia foi ignorado");
  }

  steps.forEach(runStep);
  console.log("\n[prelaunch][ok] checklist completo");
}

try {
  main();
} catch (error) {
  const message = error && error.message ? error.message : String(error);
  console.error(`\n[prelaunch][fail] ${message}`);
  process.exit(1);
}
