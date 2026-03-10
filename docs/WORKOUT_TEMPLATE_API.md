# API - Templates e Treinos Personalizados

Base: `/api`

## 1) Criar template
`POST /workouts/templates`

Permissao: `INSTRUTOR`, `ADMIN_GERAL`

Request:
```json
{
  "name": "Template Hipertrofia A",
  "description": "Modelo para alunos iniciantes",
  "isActive": true
}
```

Response `201`:
```json
{
  "message": "Modelo de treino criado com sucesso.",
  "template": {
    "id": 1,
    "name": "Template Hipertrofia A",
    "description": "Modelo para alunos iniciantes",
    "createdBy": 12,
    "isActive": true,
    "createdAt": "2026-02-25T10:00:00.000Z",
    "updatedAt": "2026-02-25T10:00:00.000Z"
  }
}
```

## 2) Listar templates
`GET /workouts/templates`

Query opcional:
- `includeInactive=true` (somente para gestao)

Response `200`:
```json
{
  "templates": [
    {
      "id": 1,
      "name": "Template Hipertrofia A",
      "description": "Modelo para alunos iniciantes",
      "createdBy": 12,
      "isActive": true,
      "exercisesCount": 6,
      "createdAt": "2026-02-25T10:00:00.000Z",
      "updatedAt": "2026-02-25T10:00:00.000Z"
    }
  ]
}
```

## 3) Atualizar template
`PATCH /workouts/templates/:templateId`

Permissao: `INSTRUTOR`, `ADMIN_GERAL`

Request:
```json
{
  "name": "Template Hipertrofia A (Atualizado)",
  "description": "Versao revisada para fase 2",
  "isActive": true
}
```

Response `200`:
```json
{
  "message": "Modelo de treino atualizado com sucesso.",
  "template": {
    "id": 1,
    "name": "Template Hipertrofia A (Atualizado)",
    "description": "Versao revisada para fase 2",
    "createdBy": 12,
    "isActive": true,
    "exercisesCount": 6,
    "createdAt": "2026-02-25T10:00:00.000Z",
    "updatedAt": "2026-02-25T12:20:00.000Z"
  }
}
```

## 4) Vincular exercicio ao template
`POST /workouts/templates/:templateId/exercises`

Permissao: `INSTRUTOR`, `ADMIN_GERAL`

Request:
```json
{
  "exerciseId": 41,
  "order": 1,
  "series": 4,
  "reps": 12,
  "defaultLoad": 20,
  "restTime": 60
}
```

Response `201`:
```json
{
  "message": "Exercicio vinculado ao modelo com sucesso.",
  "templateExercise": {
    "id": 8,
    "templateId": 1,
    "exerciseId": 41,
    "order": 1,
    "series": 4,
    "reps": 12,
    "defaultLoad": 20,
    "restTime": 60,
    "createdAt": "2026-02-25T10:10:00.000Z",
    "updatedAt": "2026-02-25T10:10:00.000Z"
  }
}
```

## 5) Listar exercicios do template
`GET /workouts/templates/:templateId/exercises`

Response `200`:
```json
{
  "templateExercises": [
    {
      "id": 8,
      "templateId": 1,
      "exerciseId": 41,
      "order": 1,
      "series": 4,
      "reps": 12,
      "defaultLoad": 20,
      "restTime": 60,
      "exercise": {
        "id": 41,
        "name": "Supino reto",
        "muscleGroup": "peito",
        "description": "Supino com barra"
      }
    }
  ]
}
```

## 6) Criar treino do aluno a partir do template
`POST /workout/from-template`

Alias suportado: `POST /workouts/from-template`

Permissao: `INSTRUTOR`, `ADMIN_GERAL`

Request:
```json
{
  "templateId": 1,
  "studentId": 33,
  "instructorId": 12,
  "name": "Treino Aluno 33 - Semana 1",
  "weekDays": ["Seg", "Qua", "Sex"],
  "startDate": "2026-02-26",
  "endDate": "2026-03-26",
  "isActive": true
}
```

Regra:
- O backend cria um novo workout e duplica os exercicios do template para `WorkoutExercise`.
- O template nunca e usado diretamente no treino do aluno.

Response `201`:
```json
{
  "message": "Treino criado a partir do modelo com sucesso.",
  "workout": {
    "id": 99,
    "name": "Treino Aluno 33 - Semana 1",
    "title": "Treino Aluno 33 - Semana 1",
    "studentId": 33,
    "createdBy": 12,
    "instructorId": 12,
    "originTemplateId": 1,
    "isActive": true,
    "startDate": "2026-02-26T00:00:00.000Z",
    "endDate": "2026-03-26T00:00:00.000Z",
    "weekDays": ["Seg", "Qua", "Sex"],
    "totalExercises": 6,
    "completedExercises": 0,
    "progressPercent": 0
  },
  "exercises": [
    {
      "id": 501,
      "workoutId": 99,
      "exerciseId": 41,
      "order": 1,
      "series": 4,
      "reps": 12,
      "load": 20,
      "restTime": 60,
      "completed": false
    }
  ],
  "template": {
    "id": 1,
    "name": "Template Hipertrofia A"
  }
}
```

## 7) Marcar exercicio do treino como concluido
`PATCH /workouts/:workoutId/exercises/:workoutExerciseId/completed`

Permissao:
- `ALUNO` (do proprio treino)
- `INSTRUTOR`
- `ADMIN_GERAL`

Request:
```json
{
  "completed": true
}
```

Response `200`:
```json
{
  "message": "Status de conclusao atualizado com sucesso.",
  "exercise": {
    "id": 501,
    "completed": true
  },
  "progress": {
    "totalExercises": 6,
    "completedExercises": 1,
    "progressPercent": 17
  }
}
```

## 8) Substituir exercicio de um treino personalizado
`PATCH /workouts/:workoutId/exercises/:workoutExerciseId/substitute`

Permissao: `INSTRUTOR`, `ADMIN_GERAL`

Request:
```json
{
  "exerciseId": 44
}
```

Comportamento:
- Atualiza apenas o `exerciseId`.
- Mantem `series`, `reps`, `load`, `restTime`.
- Preenche `replacedFromExerciseId` para historico.

## 9) Alterar carga do exercicio personalizado
`PATCH /workouts/:workoutId/exercises/:workoutExerciseId/load`

Permissao: `INSTRUTOR`, `ADMIN_GERAL`

Request:
```json
{
  "load": 27.5
}
```

Response `200`:
```json
{
  "message": "Carga atualizada com sucesso.",
  "exercise": {
    "id": 501,
    "load": 27.5
  }
}
```
