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

function findWorkoutById(response, workoutId) {
  const workouts =
    response &&
    response.body &&
    Array.isArray(response.body.workouts)
      ? response.body.workouts
      : [];
  return workouts.find((workout) => Number(workout && workout.id) === Number(workoutId)) || null;
}

function getRevisionValue(response) {
  return String(
    response &&
    response.body &&
    response.body.revision &&
    response.body.revision.revision
      ? response.body.revision.revision
      : ""
  ).trim();
}

async function main() {
  const suffix = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const rawPassword = "Teste@123";
  const passwordHash = await bcrypt.hash(rawPassword, 12);

  let instructor = null;
  let student = null;
  let adminGeneral = null;
  let server = null;
  let port = 0;
  let createdWorkoutId = 0;
  let instructorToken = "";

  try {
    console.log("[test:designacao] criando usuarios de teste");
    instructor = await prisma.user.create({
      data: {
        name: `Instrutor Teste ${suffix}`,
        email: `instrutor.teste.${suffix}@example.com`,
        phone: buildUniquePhone("7"),
        password: passwordHash,
        role: "INSTRUTOR",
        isEnabled: true,
      },
      select: { id: true, email: true },
    });

    student = await prisma.user.create({
      data: {
        name: `Aluno Teste ${suffix}`,
        email: `aluno.teste.${suffix}@example.com`,
        phone: buildUniquePhone("8"),
        password: passwordHash,
        role: "ALUNO",
        isEnabled: true,
      },
      select: { id: true, email: true },
    });

    adminGeneral = await prisma.user.create({
      data: {
        name: `Admin Geral Teste ${suffix}`,
        email: `admin.geral.teste.${suffix}@example.com`,
        phone: buildUniquePhone("9"),
        password: passwordHash,
        role: "ADMIN_GERAL",
        isEnabled: true,
      },
      select: { id: true, email: true, name: true },
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

    console.log("[test:designacao] login instrutor e aluno");
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

    const studentLogin = await requestJson({
      port,
      method: "POST",
      path: "/api/auth/login",
      body: {
        email: student.email,
        password: rawPassword,
      },
    });
    assert(studentLogin.status === 200, `login aluno falhou (${studentLogin.status})`);
    const studentToken = String(studentLogin.body && studentLogin.body.token ? studentLogin.body.token : "").trim();
    assert(studentToken, "token do aluno vazio");

    const adminGeneralLogin = await requestJson({
      port,
      method: "POST",
      path: "/api/auth/login",
      body: {
        email: adminGeneral.email,
        password: rawPassword,
      },
    });
    assert(
      adminGeneralLogin.status === 200,
      `login admin geral falhou (${adminGeneralLogin.status})`
    );
    const adminGeneralToken = String(
      adminGeneralLogin.body && adminGeneralLogin.body.token ? adminGeneralLogin.body.token : ""
    ).trim();
    assert(adminGeneralToken, "token do admin geral vazio");

    console.log("[test:designacao] aluno consulta revisão inicial");
    const initialRevisionResponse = await requestJson({
      port,
      method: "GET",
      path: "/api/student/workouts/revision",
      token: studentToken,
    });
    assert(
      initialRevisionResponse.status === 200,
      `revisao inicial do aluno falhou (${initialRevisionResponse.status})`
    );
    const initialRevision = getRevisionValue(initialRevisionResponse);
    assert(initialRevision, "revisao inicial vazia");

    console.log("[test:designacao] instrutor cria treino com dias Seg e Qua");
    const createResponse = await requestJson({
      port,
      method: "POST",
      path: "/api/instructor/workouts",
      token: instructorToken,
      body: {
        name: `Teste Designacao ${suffix}`,
        objective: "Hipertrofia",
        description: "Teste automatizado de designacao de treino",
        studentId: student.id,
        weekDays: ["Seg", "Qua"],
      },
    });
    assert(createResponse.status === 201, `criacao de treino falhou (${createResponse.status})`);
    createdWorkoutId = Number(createResponse.body && createResponse.body.workout && createResponse.body.workout.id) || 0;
    assert(createdWorkoutId > 0, "id do treino criado invalido");

    console.log("[test:designacao] aluno visualiza treino criado");
    const studentListBeforeUpdate = await requestJson({
      port,
      method: "GET",
      path: "/api/student/workouts",
      token: studentToken,
    });
    assert(
      studentListBeforeUpdate.status === 200,
      `listagem do aluno falhou (${studentListBeforeUpdate.status})`
    );
    const studentWorkoutBeforeUpdate = findWorkoutById(studentListBeforeUpdate, createdWorkoutId);
    assert(studentWorkoutBeforeUpdate, "treino criado nao apareceu para o aluno");
    const initialWeekDays = Array.isArray(studentWorkoutBeforeUpdate.weekDays)
      ? studentWorkoutBeforeUpdate.weekDays.join(",")
      : "";
    assert(initialWeekDays === "Seg,Qua", `dias iniciais inesperados: ${initialWeekDays}`);

    const revisionAfterCreateResponse = await requestJson({
      port,
      method: "GET",
      path: "/api/student/workouts/revision",
      token: studentToken,
    });
    assert(
      revisionAfterCreateResponse.status === 200,
      `revisao apos criacao falhou (${revisionAfterCreateResponse.status})`
    );
    const revisionAfterCreate = getRevisionValue(revisionAfterCreateResponse);
    assert(
      revisionAfterCreate && revisionAfterCreate !== initialRevision,
      "revisao do aluno nao mudou apos criacao do treino"
    );

    console.log("[test:designacao] admin geral visualiza designacao com aluno/instrutor");
    const adminInstructorWorkoutsResponse = await requestJson({
      port,
      method: "GET",
      path: "/api/instructor/workouts",
      token: adminGeneralToken,
    });
    assert(
      adminInstructorWorkoutsResponse.status === 200,
      `listagem de treinos para admin geral falhou (${adminInstructorWorkoutsResponse.status})`
    );
    const adminWorkoutView = findWorkoutById(adminInstructorWorkoutsResponse, createdWorkoutId);
    assert(adminWorkoutView, "admin geral nao visualizou o treino criado");
    assert(
      String(adminWorkoutView.studentName || "").trim() === `Aluno Teste ${suffix}`,
      "admin geral nao recebeu o nome do aluno na listagem de treinos"
    );
    assert(
      String(adminWorkoutView.instructorName || "").trim() === `Instrutor Teste ${suffix}`,
      "admin geral nao recebeu o nome do instrutor na listagem de treinos"
    );
    assert(
      Array.isArray(adminWorkoutView.weekDays) &&
        adminWorkoutView.weekDays.join(",") === "Seg,Qua",
      "admin geral nao recebeu os dias corretos do treino"
    );

    const adminOverviewResponse = await requestJson({
      port,
      method: "GET",
      path: "/api/admin/overview",
      token: adminGeneralToken,
    });
    assert(
      adminOverviewResponse.status === 200,
      `painel do admin geral falhou (${adminOverviewResponse.status})`
    );
    const overviewWorkouts =
      adminOverviewResponse &&
      adminOverviewResponse.body &&
      adminOverviewResponse.body.overview &&
      Array.isArray(adminOverviewResponse.body.overview.workouts)
        ? adminOverviewResponse.body.overview.workouts
        : [];
    const overviewWorkout =
      overviewWorkouts.find((workout) => Number(workout && workout.id) === createdWorkoutId) || null;
    assert(overviewWorkout, "treino nao apareceu no painel do admin geral");
    assert(
      String(overviewWorkout.studentName || "").trim() === `Aluno Teste ${suffix}`,
      "painel do admin geral nao mostrou o aluno correto"
    );
    assert(
      String(overviewWorkout.instructorName || "").trim() === `Instrutor Teste ${suffix}`,
      "painel do admin geral nao mostrou o instrutor correto"
    );
    assert(
      String(overviewWorkout.objective || "").trim() === "Hipertrofia",
      "painel do admin geral nao mostrou o objetivo correto"
    );
    assert(
      Array.isArray(overviewWorkout.weekDays) &&
        overviewWorkout.weekDays.join(",") === "Seg,Qua",
      "painel do admin geral nao mostrou os dias corretos"
    );

    console.log("[test:designacao] instrutor atualiza dias para Ter, Qui e Sex");
    const updateResponse = await requestJson({
      port,
      method: "PATCH",
      path: `/api/instructor/workouts/${createdWorkoutId}`,
      token: instructorToken,
      body: {
        weekDays: ["Ter", "Qui", "Sex"],
      },
    });
    assert(updateResponse.status === 200, `atualizacao de treino falhou (${updateResponse.status})`);

    const studentListAfterUpdate = await requestJson({
      port,
      method: "GET",
      path: "/api/student/workouts",
      token: studentToken,
    });
    assert(
      studentListAfterUpdate.status === 200,
      `listagem do aluno apos update falhou (${studentListAfterUpdate.status})`
    );
    const studentWorkoutAfterUpdate = findWorkoutById(studentListAfterUpdate, createdWorkoutId);
    assert(studentWorkoutAfterUpdate, "treino atualizado nao apareceu para o aluno");
    const updatedWeekDays = Array.isArray(studentWorkoutAfterUpdate.weekDays)
      ? studentWorkoutAfterUpdate.weekDays.join(",")
      : "";
    assert(updatedWeekDays === "Ter,Qui,Sex", `dias atualizados inesperados: ${updatedWeekDays}`);

    const revisionAfterUpdateResponse = await requestJson({
      port,
      method: "GET",
      path: "/api/student/workouts/revision",
      token: studentToken,
    });
    assert(
      revisionAfterUpdateResponse.status === 200,
      `revisao apos update falhou (${revisionAfterUpdateResponse.status})`
    );
    const revisionAfterUpdate = getRevisionValue(revisionAfterUpdateResponse);
    assert(
      revisionAfterUpdate && revisionAfterUpdate !== revisionAfterCreate,
      "revisao do aluno nao mudou apos atualizacao do treino"
    );

    console.log("[test:designacao] instrutor remove treino e aluno deixa de ver");
    const deleteResponse = await requestJson({
      port,
      method: "DELETE",
      path: `/api/instructor/workouts/${createdWorkoutId}`,
      token: instructorToken,
    });
    assert(
      deleteResponse.status === 200,
      `exclusao falhou (${deleteResponse.status})`
    );
    const studentListAfterDelete = await requestJson({
      port,
      method: "GET",
      path: "/api/student/workouts",
      token: studentToken,
    });
    assert(
      studentListAfterDelete.status === 200,
      `listagem do aluno apos exclusao falhou (${studentListAfterDelete.status})`
    );
    const studentWorkoutAfterDelete = findWorkoutById(studentListAfterDelete, createdWorkoutId);
    assert(!studentWorkoutAfterDelete, "treino excluido ainda aparece para o aluno");
    createdWorkoutId = 0;

    const revisionAfterDeleteResponse = await requestJson({
      port,
      method: "GET",
      path: "/api/student/workouts/revision",
      token: studentToken,
    });
    assert(
      revisionAfterDeleteResponse.status === 200,
      `revisao apos exclusao falhou (${revisionAfterDeleteResponse.status})`
    );
    const revisionAfterDelete = getRevisionValue(revisionAfterDeleteResponse);
    assert(
      revisionAfterDelete && revisionAfterDelete !== revisionAfterUpdate,
      "revisao do aluno nao mudou apos exclusao do treino"
    );

    console.log("[ok] fluxo de designacao validado com sucesso");
  } finally {
    if (createdWorkoutId && port > 0 && instructorToken) {
      try {
        await requestJson({
          port,
          method: "DELETE",
          path: `/api/instructor/workouts/${createdWorkoutId}`,
          token: instructorToken,
        });
      } catch (_error) {
        // noop
      }
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

    if (adminGeneral && adminGeneral.id) {
      try {
        await prisma.user.delete({ where: { id: Number(adminGeneral.id) } });
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
