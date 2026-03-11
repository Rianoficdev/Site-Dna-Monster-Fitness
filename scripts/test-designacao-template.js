#!/usr/bin/env node

const http = require("http");
const bcrypt = require("bcryptjs");
const { prisma } = require("../src/config/prisma");
const { createApp } = require("../src/app");

function assert(condition, message) {
  if (!condition) throw new Error(message);
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
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...(payload ? { "Content-Length": Buffer.byteLength(payload) } : {}),
        },
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          let json = null;
          try {
            json = data ? JSON.parse(data) : null;
          } catch (_error) {
            json = null;
          }
          resolve({
            status: Number(res.statusCode) || 0,
            body: json,
            raw: data,
          });
        });
      }
    );

    req.on("error", reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function buildUniquePhone(prefixDigit) {
  const randomBlock = String(Date.now()).slice(-8);
  return `+55119${prefixDigit}${randomBlock}`;
}

function getResponseList(response, key) {
  return response && response.body && Array.isArray(response.body[key]) ? response.body[key] : [];
}

function findWorkoutByTemplateAndDays(workouts, templateId, days) {
  const expectedDays = Array.isArray(days) ? days.join(",") : "";
  return (Array.isArray(workouts) ? workouts : []).find((workout) => {
    const originTemplateId = Number(workout && workout.originTemplateId) || 0;
    const weekDays = Array.isArray(workout && workout.weekDays) ? workout.weekDays.join(",") : "";
    return originTemplateId === Number(templateId) && weekDays === expectedDays;
  }) || null;
}

async function safeDeleteTemplate(port, token, templateId) {
  if (!templateId) return;
  try {
    await requestJson({
      port,
      method: "PATCH",
      path: `/api/workouts/templates/${templateId}`,
      token,
      body: { isActive: false },
    });
  } catch (_error) {
    // noop
  }
  try {
    await requestJson({
      port,
      method: "DELETE",
      path: `/api/workouts/templates/${templateId}`,
      token,
    });
  } catch (_error) {
    // noop
  }
}

async function safeDeleteWorkout(port, token, workoutId) {
  if (!workoutId) return;
  try {
    await requestJson({
      port,
      method: "PATCH",
      path: `/api/instructor/workouts/${workoutId}/deactivate`,
      token,
    });
  } catch (_error) {
    // noop
  }
  try {
    await requestJson({
      port,
      method: "DELETE",
      path: `/api/instructor/workouts/${workoutId}`,
      token,
    });
  } catch (_error) {
    // noop
  }
}

async function main() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const rawPassword = "Teste@123";
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  let instructor = null;
  let student = null;
  let server = null;
  let port = 0;
  let instructorToken = "";
  const createdWorkoutIds = [];
  const createdTemplateIds = [];

  try {
    console.log("[test:designacao-template] criando usuarios de teste");
    instructor = await prisma.user.create({
      data: {
        name: `Instrutor Template ${suffix}`,
        email: `instrutor.template.${suffix}@example.com`,
        phone: buildUniquePhone("5"),
        password: passwordHash,
        role: "INSTRUTOR",
        isEnabled: true,
      },
      select: { id: true, email: true },
    });

    student = await prisma.user.create({
      data: {
        name: `Aluno Template ${suffix}`,
        email: `aluno.template.${suffix}@example.com`,
        phone: buildUniquePhone("6"),
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

    console.log("[test:designacao-template] login instrutor");
    const instructorLogin = await requestJson({
      port,
      method: "POST",
      path: "/api/auth/login",
      body: {
        email: instructor.email,
        password: rawPassword,
      },
    });
    assert(instructorLogin.status === 200, `login instrutor falhou (${instructorLogin.status})`);
    instructorToken = String(instructorLogin.body && instructorLogin.body.token ? instructorLogin.body.token : "").trim();
    assert(instructorToken, "token do instrutor vazio");

    console.log("[test:designacao-template] carregando biblioteca");
    const libraryResponse = await requestJson({
      port,
      method: "GET",
      path: "/api/library/exercises",
      token: instructorToken,
    });
    assert(libraryResponse.status === 200, `biblioteca falhou (${libraryResponse.status})`);
    const libraryExercises = getResponseList(libraryResponse, "exercises").filter(
      (exercise) => Number(exercise && exercise.id) > 0
    );
    assert(libraryExercises.length >= 2, "biblioteca precisa ter ao menos 2 exercícios para o teste");

    const firstExerciseId = Number(libraryExercises[0].id);
    const secondExerciseId = Number(libraryExercises[1].id);

    console.log("[test:designacao-template] criando nomeclaturas A e B");
    const templateAResponse = await requestJson({
      port,
      method: "POST",
      path: "/api/workouts/templates",
      token: instructorToken,
      body: {
        name: `Treino A ${suffix}`,
        description: "Template A",
        isActive: true,
      },
    });
    assert(templateAResponse.status === 201, `criacao do template A falhou (${templateAResponse.status})`);
    const templateAId = Number(templateAResponse.body && templateAResponse.body.template && templateAResponse.body.template.id) || 0;
    assert(templateAId > 0, "template A invalido");
    createdTemplateIds.push(templateAId);

    const templateBResponse = await requestJson({
      port,
      method: "POST",
      path: "/api/workouts/templates",
      token: instructorToken,
      body: {
        name: `Treino B ${suffix}`,
        description: "Template B",
        isActive: true,
      },
    });
    assert(templateBResponse.status === 201, `criacao do template B falhou (${templateBResponse.status})`);
    const templateBId = Number(templateBResponse.body && templateBResponse.body.template && templateBResponse.body.template.id) || 0;
    assert(templateBId > 0, "template B invalido");
    createdTemplateIds.push(templateBId);

    console.log("[test:designacao-template] vinculando exercícios distintos a cada nomeclatura");
    const addExerciseAToTemplate = await requestJson({
      port,
      method: "POST",
      path: `/api/workouts/templates/${templateAId}/exercises`,
      token: instructorToken,
      body: {
        exerciseId: firstExerciseId,
        order: 1,
        series: 3,
        reps: 12,
        defaultLoad: 0,
        restTime: 30,
      },
    });
    assert(addExerciseAToTemplate.status === 201, `vinculo do template A falhou (${addExerciseAToTemplate.status})`);

    const addExerciseBToTemplate = await requestJson({
      port,
      method: "POST",
      path: `/api/workouts/templates/${templateBId}/exercises`,
      token: instructorToken,
      body: {
        exerciseId: secondExerciseId,
        order: 1,
        series: 4,
        reps: 10,
        defaultLoad: 0,
        restTime: 45,
      },
    });
    assert(addExerciseBToTemplate.status === 201, `vinculo do template B falhou (${addExerciseBToTemplate.status})`);

    const templateAExercisesResponse = await requestJson({
      port,
      method: "GET",
      path: `/api/workouts/templates/${templateAId}/exercises`,
      token: instructorToken,
    });
    assert(templateAExercisesResponse.status === 200, `listagem do template A falhou (${templateAExercisesResponse.status})`);
    const templateAExercises = getResponseList(templateAExercisesResponse, "templateExercises");
    assert(templateAExercises.length === 1, `template A deveria ter 1 exercício e retornou ${templateAExercises.length}`);

    const templateBExercisesResponse = await requestJson({
      port,
      method: "GET",
      path: `/api/workouts/templates/${templateBId}/exercises`,
      token: instructorToken,
    });
    assert(templateBExercisesResponse.status === 200, `listagem do template B falhou (${templateBExercisesResponse.status})`);
    const templateBExercises = getResponseList(templateBExercisesResponse, "templateExercises");
    assert(templateBExercises.length === 1, `template B deveria ter 1 exercício e retornou ${templateBExercises.length}`);

    console.log("[test:designacao-template] criando treino do aluno a partir do template A");
    const assignAResponse = await requestJson({
      port,
      method: "POST",
      path: "/api/workout/from-template",
      token: instructorToken,
      body: {
        templateId: templateAId,
        studentId: student.id,
        name: `Aluno ${suffix} - Seg`,
        objective: "Hipertrofia",
        status: "ATIVO",
        weekDays: ["Seg"],
      },
    });
    assert(assignAResponse.status === 201, `designacao do template A falhou (${assignAResponse.status})`);
    const workoutAId = Number(assignAResponse.body && assignAResponse.body.workout && assignAResponse.body.workout.id) || 0;
    assert(workoutAId > 0, "treino criado a partir do template A invalido");
    createdWorkoutIds.push(workoutAId);

    console.log("[test:designacao-template] criando treino do aluno a partir do template B");
    const assignBResponse = await requestJson({
      port,
      method: "POST",
      path: "/api/workout/from-template",
      token: instructorToken,
      body: {
        templateId: templateBId,
        studentId: student.id,
        name: `Aluno ${suffix} - Ter`,
        objective: "Hipertrofia",
        status: "ATIVO",
        weekDays: ["Ter"],
      },
    });
    assert(assignBResponse.status === 201, `designacao do template B falhou (${assignBResponse.status})`);
    const workoutBId = Number(assignBResponse.body && assignBResponse.body.workout && assignBResponse.body.workout.id) || 0;
    assert(workoutBId > 0, "treino criado a partir do template B invalido");
    createdWorkoutIds.push(workoutBId);

    console.log("[test:designacao-template] validando exercícios copiados em cada treino");
    const workoutAExercisesResponse = await requestJson({
      port,
      method: "GET",
      path: `/api/workouts/${workoutAId}/exercises`,
      token: instructorToken,
    });
    assert(workoutAExercisesResponse.status === 200, `listagem do treino A falhou (${workoutAExercisesResponse.status})`);
    const workoutAExercises = getResponseList(workoutAExercisesResponse, "exercises");
    assert(workoutAExercises.length === 1, `treino A deveria ter 1 exercício e retornou ${workoutAExercises.length}`);
    assert(
      Number(workoutAExercises[0] && workoutAExercises[0].exerciseId) === firstExerciseId,
      "treino A recebeu exercício incorreto"
    );

    const workoutBExercisesResponse = await requestJson({
      port,
      method: "GET",
      path: `/api/workouts/${workoutBId}/exercises`,
      token: instructorToken,
    });
    assert(workoutBExercisesResponse.status === 200, `listagem do treino B falhou (${workoutBExercisesResponse.status})`);
    const workoutBExercises = getResponseList(workoutBExercisesResponse, "exercises");
    assert(workoutBExercises.length === 1, `treino B deveria ter 1 exercício e retornou ${workoutBExercises.length}`);
    assert(
      Number(workoutBExercises[0] && workoutBExercises[0].exerciseId) === secondExerciseId,
      "treino B recebeu exercício incorreto"
    );

    console.log("[test:designacao-template] validando treinos do instrutor");
    const workoutsResponse = await requestJson({
      port,
      method: "GET",
      path: "/api/instructor/workouts",
      token: instructorToken,
    });
    assert(workoutsResponse.status === 200, `listagem de treinos do instrutor falhou (${workoutsResponse.status})`);
    const instructorWorkouts = getResponseList(workoutsResponse, "workouts");
    const workoutA = findWorkoutByTemplateAndDays(instructorWorkouts, templateAId, ["Seg"]);
    const workoutB = findWorkoutByTemplateAndDays(instructorWorkouts, templateBId, ["Ter"]);
    assert(workoutA, "treino A nao apareceu corretamente vinculado ao template A");
    assert(workoutB, "treino B nao apareceu corretamente vinculado ao template B");

    console.log("[ok] fluxo de template por dia validado com sucesso");
  } finally {
    for (const workoutId of createdWorkoutIds.reverse()) {
      await safeDeleteWorkout(port, instructorToken, workoutId);
    }

    for (const templateId of createdTemplateIds.reverse()) {
      await safeDeleteTemplate(port, instructorToken, templateId);
    }

    if (server) {
      await new Promise((resolve) => {
        server.close(() => resolve());
      });
    }

    if (instructor && instructor.id) {
      try {
        await prisma.user.delete({ where: { id: Number(instructor.id) } });
      } catch (_error) {
        // noop
      }
    }

    if (student && student.id) {
      try {
        await prisma.user.delete({ where: { id: Number(student.id) } });
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
