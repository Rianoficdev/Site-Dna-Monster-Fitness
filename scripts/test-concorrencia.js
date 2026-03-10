#!/usr/bin/env node

const http = require("http");
const bcrypt = require("bcryptjs");
const { prisma } = require("../src/config/prisma");
const { createApp } = require("../src/app");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function requestJson({ port, method = "GET", path = "/", token = "", body = null }) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: "127.0.0.1",
        port,
        path,
        method,
        headers: {
          ...(payload ? { "Content-Type": "application/json" } : {}),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
        });
        res.on("end", () => {
          let bodyJson = null;
          try {
            bodyJson = raw ? JSON.parse(raw) : null;
          } catch (_error) {
            bodyJson = null;
          }
          resolve({
            status: Number(res.statusCode) || 0,
            body: bodyJson,
            raw,
          });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function createPhone(prefix = "9") {
  const randomBlock = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-8);
  return `+55119${prefix}${randomBlock}`;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Number(sorted[index].toFixed(2));
}

async function runConcurrentScenario({
  name,
  totalRequests,
  concurrency,
  requestFactory,
  expectedStatuses,
}) {
  const statusCount = {};
  const durations = [];
  let networkErrors = 0;
  let nextIndex = 0;
  const startedAt = Date.now();

  async function worker() {
    while (true) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      if (currentIndex >= totalRequests) return;

      const requestStarted = process.hrtime.bigint();
      try {
        const result = await requestFactory(currentIndex);
        const elapsedMs = Number(process.hrtime.bigint() - requestStarted) / 1e6;
        durations.push(elapsedMs);
        const statusKey = String(Number(result && result.status) || 0);
        statusCount[statusKey] = Number(statusCount[statusKey] || 0) + 1;
      } catch (_error) {
        const elapsedMs = Number(process.hrtime.bigint() - requestStarted) / 1e6;
        durations.push(elapsedMs);
        networkErrors += 1;
      }
    }
  }

  const workers = Array.from({ length: Math.max(1, Number(concurrency) || 1) }, () => worker());
  await Promise.all(workers);

  const elapsedSeconds = Math.max(0.001, (Date.now() - startedAt) / 1000);
  const successCount = Object.entries(statusCount).reduce((acc, [status, count]) => {
    return expectedStatuses.has(Number(status)) ? acc + Number(count || 0) : acc;
  }, 0);
  const failedCount = totalRequests - successCount;
  const errorRate = totalRequests > 0 ? failedCount / totalRequests : 1;

  return {
    name,
    totalRequests,
    concurrency,
    elapsedSeconds: Number(elapsedSeconds.toFixed(2)),
    requestsPerSecond: Number((totalRequests / elapsedSeconds).toFixed(2)),
    statusCount,
    networkErrors,
    successCount,
    failedCount,
    errorRate: Number((errorRate * 100).toFixed(2)),
    latencyMs: {
      min: Number((durations.length ? Math.min(...durations) : 0).toFixed(2)),
      avg: Number(
        (
          durations.reduce((acc, value) => acc + value, 0) /
          Math.max(1, durations.length)
        ).toFixed(2)
      ),
      p50: percentile(durations, 50),
      p95: percentile(durations, 95),
      p99: percentile(durations, 99),
      max: Number((durations.length ? Math.max(...durations) : 0).toFixed(2)),
    },
  };
}

async function main() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const rawPassword = "Teste@123";
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  let adminUser = null;
  let instructorUser = null;
  let studentUser = null;
  let server = null;
  let port = 0;
  let adminToken = "";
  let instructorToken = "";
  let studentToken = "";

  const supportSubjectPrefix = `[LOAD TEST ${suffix}]`;

  try {
    console.log("[test:concorrencia] criando usuarios temporarios");
    adminUser = await prisma.user.create({
      data: {
        name: `Admin Concorrencia ${suffix}`,
        email: `admin.concorrencia.${suffix}@example.com`,
        phone: createPhone("6"),
        password: passwordHash,
        role: "ADMIN_GERAL",
        isEnabled: true,
      },
      select: { id: true, email: true },
    });

    instructorUser = await prisma.user.create({
      data: {
        name: `Instrutor Concorrencia ${suffix}`,
        email: `instrutor.concorrencia.${suffix}@example.com`,
        phone: createPhone("7"),
        password: passwordHash,
        role: "INSTRUTOR",
        isEnabled: true,
      },
      select: { id: true, email: true },
    });

    studentUser = await prisma.user.create({
      data: {
        name: `Aluno Concorrencia ${suffix}`,
        email: `aluno.concorrencia.${suffix}@example.com`,
        phone: createPhone("8"),
        password: passwordHash,
        role: "ALUNO",
        isEnabled: true,
      },
      select: { id: true, email: true },
    });

    const app = createApp();
    server = app.listen(0);
    await new Promise((resolve, reject) => {
      server.once("listening", resolve);
      server.once("error", reject);
    });
    const address = server.address();
    port = address && typeof address === "object" ? Number(address.port) || 0 : 0;
    assert(port > 0, "porta de teste invalida");

    console.log("[test:concorrencia] login inicial");
    const [adminLogin, instructorLogin, studentLogin] = await Promise.all([
      requestJson({
        port,
        method: "POST",
        path: "/api/auth/login",
        body: { email: adminUser.email, password: rawPassword },
      }),
      requestJson({
        port,
        method: "POST",
        path: "/api/auth/login",
        body: { email: instructorUser.email, password: rawPassword },
      }),
      requestJson({
        port,
        method: "POST",
        path: "/api/auth/login",
        body: { email: studentUser.email, password: rawPassword },
      }),
    ]);

    assert(adminLogin.status === 200, "falha no login inicial do admin");
    assert(instructorLogin.status === 200, "falha no login inicial do instrutor");
    assert(studentLogin.status === 200, "falha no login inicial do aluno");

    adminToken = String(adminLogin.body && adminLogin.body.token ? adminLogin.body.token : "").trim();
    instructorToken = String(
      instructorLogin.body && instructorLogin.body.token ? instructorLogin.body.token : ""
    ).trim();
    studentToken = String(studentLogin.body && studentLogin.body.token ? studentLogin.body.token : "").trim();

    assert(adminToken, "token admin vazio");
    assert(instructorToken, "token instrutor vazio");
    assert(studentToken, "token aluno vazio");

    console.log("[test:concorrencia] executando cenarios de concorrencia");
    const scenarios = [
      await runConcurrentScenario({
        name: "health_public",
        totalRequests: 400,
        concurrency: 40,
        expectedStatuses: new Set([200]),
        requestFactory: () => requestJson({ port, method: "GET", path: "/health" }),
      }),
      await runConcurrentScenario({
        name: "auth_login_aluno",
        totalRequests: 80,
        concurrency: 10,
        expectedStatuses: new Set([200]),
        requestFactory: () =>
          requestJson({
            port,
            method: "POST",
            path: "/api/auth/login",
            body: { email: studentUser.email, password: rawPassword },
          }),
      }),
      await runConcurrentScenario({
        name: "instructor_list_students",
        totalRequests: 200,
        concurrency: 25,
        expectedStatuses: new Set([200]),
        requestFactory: () =>
          requestJson({
            port,
            method: "GET",
            path: "/api/users/students",
            token: instructorToken,
          }),
      }),
      await runConcurrentScenario({
        name: "student_list_workouts",
        totalRequests: 200,
        concurrency: 25,
        expectedStatuses: new Set([200]),
        requestFactory: () =>
          requestJson({
            port,
            method: "GET",
            path: "/api/student/workouts",
            token: studentToken,
          }),
      }),
      await runConcurrentScenario({
        name: "admin_overview",
        totalRequests: 80,
        concurrency: 10,
        expectedStatuses: new Set([200]),
        requestFactory: () =>
          requestJson({
            port,
            method: "GET",
            path: "/api/admin/overview",
            token: adminToken,
          }),
      }),
      await runConcurrentScenario({
        name: "student_create_support_ticket",
        totalRequests: 60,
        concurrency: 10,
        expectedStatuses: new Set([201]),
        requestFactory: (index) =>
          requestJson({
            port,
            method: "POST",
            path: "/api/support/tickets",
            token: studentToken,
            body: {
              type: "GENERAL_SUPPORT",
              subject: `${supportSubjectPrefix} #${index + 1}`,
              description: "Teste de concorrencia para validacao pre-lancamento.",
            },
          }),
      }),
    ];

    const globalFailures = scenarios.reduce((acc, scenario) => acc + Number(scenario.failedCount || 0), 0);
    const worstP95 = scenarios.reduce((acc, scenario) => {
      return Math.max(acc, Number(scenario.latencyMs && scenario.latencyMs.p95 ? scenario.latencyMs.p95 : 0));
    }, 0);

    const qualityGatesByScenario = {
      health_public: { maxErrorRate: 0, maxP95Ms: 200 },
      auth_login_aluno: { maxErrorRate: 0, maxP95Ms: 12000, warningP95Ms: 5000 },
      instructor_list_students: { maxErrorRate: 0, maxP95Ms: 1000 },
      student_list_workouts: { maxErrorRate: 0, maxP95Ms: 800 },
      admin_overview: { maxErrorRate: 0, maxP95Ms: 1200 },
      student_create_support_ticket: { maxErrorRate: 0, maxP95Ms: 1200 },
    };

    const failedGates = [];
    const warnings = [];
    scenarios.forEach((scenario) => {
      const gate = qualityGatesByScenario[scenario.name];
      if (!gate) return;

      if (Number(scenario.errorRate) > Number(gate.maxErrorRate)) {
        failedGates.push(
          `${scenario.name}: errorRate ${scenario.errorRate}% > ${gate.maxErrorRate}%`
        );
      }

      const scenarioP95 = Number(scenario.latencyMs && scenario.latencyMs.p95 ? scenario.latencyMs.p95 : 0);
      if (scenarioP95 > Number(gate.maxP95Ms)) {
        failedGates.push(`${scenario.name}: p95 ${scenarioP95}ms > ${gate.maxP95Ms}ms`);
      } else if (gate.warningP95Ms && scenarioP95 > Number(gate.warningP95Ms)) {
        warnings.push(`${scenario.name}: p95 alto (${scenarioP95}ms), monitorar e escalar se necessário.`);
      }
    });

    const report = {
      generatedAt: new Date().toISOString(),
      totals: {
        requests: scenarios.reduce((acc, scenario) => acc + Number(scenario.totalRequests || 0), 0),
        failures: globalFailures,
        worstP95Ms: Number(worstP95.toFixed(2)),
      },
      quality: {
        failedGates,
        warnings,
      },
      scenarios,
    };

    console.log(JSON.stringify(report, null, 2));

    assert(globalFailures === 0, `foram detectadas ${globalFailures} falhas de requisicao`);
    assert(failedGates.length === 0, `quality gates falharam: ${failedGates.join(" | ")}`);
    console.log("[ok] teste de concorrencia validado");
  } finally {
    try {
      await prisma.supportTicket.deleteMany({
        where: {
          subject: {
            startsWith: supportSubjectPrefix,
          },
        },
      });
    } catch (_error) {
      // noop
    }

    if (server) {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    }

    if (adminUser && adminUser.id) {
      try {
        await prisma.user.delete({ where: { id: Number(adminUser.id) } });
      } catch (_error) {
        // noop
      }
    }
    if (instructorUser && instructorUser.id) {
      try {
        await prisma.user.delete({ where: { id: Number(instructorUser.id) } });
      } catch (_error) {
        // noop
      }
    }
    if (studentUser && studentUser.id) {
      try {
        await prisma.user.delete({ where: { id: Number(studentUser.id) } });
      } catch (_error) {
        // noop
      }
    }

    await prisma.$disconnect();
  }
}

main().catch((error) => {
  const message = error && error.message ? error.message : String(error);
  console.error(`[fail] ${message}`);
  process.exit(1);
});
