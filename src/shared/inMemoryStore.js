const fs = require("fs");
const path = require("path");

const STORE_FILE_PATH = path.resolve(process.cwd(), "data", "in-memory-store.json");

function buildDefaultSiteTeamMembers() {
  return [
    {
      id: 1,
      name: "Ailton",
      role: "Educador Fisico",
      description:
        "Especialista em hipertrofia e condicionamento, com atendimento individual e foco total na execucao correta.",
      photoUrl:
        "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: 2,
      name: "Rogerio Filho",
      role: "Personal Trainer",
      description:
        "Treinos de forca e periodizacao estrategica para ganho de performance, evolucao consistente e seguranca.",
      photoUrl:
        "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: 3,
      name: "Hanne",
      role: "Personal Trainer",
      description:
        "Acompanhamento dinamico com foco em mobilidade, resistencia e melhoria da capacidade fisica no dia a dia.",
      photoUrl:
        "https://images.unsplash.com/photo-1518310383802-640c2de311b2?auto=format&fit=crop&w=900&q=80",
    },
    {
      id: 4,
      name: "Jessica",
      role: "Personal Trainer",
      description:
        "Aulas energeticas e acessiveis para todos os niveis, com atencao ao ritmo, motivacao e gasto calorico.",
      photoUrl:
        "https://images.unsplash.com/photo-1548690312-e3b507d8c110?auto=format&fit=crop&w=900&q=80",
    },
  ];
}

function buildDefaultSiteContent() {
  return {
    teamMembers: buildDefaultSiteTeamMembers(),
  };
}

function createEmptyStore() {
  return {
    users: [],
    workouts: [],
    exercises: [],
    libraryExercises: [],
    supportTickets: [],
    workoutTemplates: [],
    workoutTemplateExercises: [],
    progressRecords: [],
    siteContent: buildDefaultSiteContent(),
    sequence: {
      user: 1,
      workout: 1,
      exercise: 1,
      libraryExercise: 1,
      supportTicket: 1,
      workoutTemplate: 1,
      workoutTemplateExercise: 1,
      progress: 1,
    },
  };
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeSiteTeamMembers(value, fallbackMembers = []) {
  const defaults = normalizeArray(fallbackMembers);
  const source = normalizeArray(value);
  const hasProvidedMembers = Array.isArray(value);
  const targetLength = hasProvidedMembers
    ? Math.max(source.length, 1)
    : Math.max(defaults.length, 1);

  return Array.from({ length: targetLength }, (_, index) => {
    const fallbackItem = defaults[index] || defaults[defaults.length - 1] || {};
    const sourceItem = source[index] || {};
    const resolvedId = Number(sourceItem.id) || Number(fallbackItem.id) || index + 1;
    const resolvedName = String(sourceItem.name || fallbackItem.name || `Membro ${index + 1}`).trim();
    const resolvedRole = String(sourceItem.role || fallbackItem.role || "Personal Trainer").trim();
    const resolvedDescription = String(
      sourceItem.description ||
        fallbackItem.description ||
        "Profissional qualificado para acompanhar sua evolucao."
    ).trim();
    const resolvedPhotoUrl = String(sourceItem.photoUrl || fallbackItem.photoUrl || "").trim();

    return {
      id: resolvedId,
      name: resolvedName,
      role: resolvedRole,
      description: resolvedDescription,
      photoUrl: resolvedPhotoUrl,
    };
  });
}

function nextSequenceFromArray(items) {
  const maxId = normalizeArray(items).reduce((max, item) => {
    const id = Number(item && item.id);
    if (!Number.isFinite(id) || id <= 0) return max;
    return id > max ? id : max;
  }, 0);

  return maxId + 1;
}

function hydrateStore(rawStore) {
  const base = createEmptyStore();
  const raw = rawStore && typeof rawStore === "object" ? rawStore : {};
  const rawSequence = raw.sequence && typeof raw.sequence === "object" ? raw.sequence : {};
  const rawSiteContent =
    raw.siteContent && typeof raw.siteContent === "object" ? raw.siteContent : {};

  const hydrated = {
    users: normalizeArray(raw.users),
    workouts: normalizeArray(raw.workouts),
    exercises: normalizeArray(raw.exercises),
    libraryExercises: normalizeArray(raw.libraryExercises),
    supportTickets: normalizeArray(raw.supportTickets),
    workoutTemplates: normalizeArray(raw.workoutTemplates),
    workoutTemplateExercises: normalizeArray(raw.workoutTemplateExercises),
    progressRecords: normalizeArray(raw.progressRecords),
    siteContent: {
      teamMembers: normalizeSiteTeamMembers(
        rawSiteContent.teamMembers,
        base.siteContent.teamMembers
      ),
    },
    sequence: {
      user: Math.max(Number(rawSequence.user) || 1, nextSequenceFromArray(raw.users || base.users)),
      workout: Math.max(
        Number(rawSequence.workout) || 1,
        nextSequenceFromArray(raw.workouts || base.workouts)
      ),
      exercise: Math.max(
        Number(rawSequence.exercise) || 1,
        nextSequenceFromArray(raw.exercises || base.exercises)
      ),
      libraryExercise: Math.max(
        Number(rawSequence.libraryExercise) || 1,
        nextSequenceFromArray(raw.libraryExercises || base.libraryExercises)
      ),
      supportTicket: Math.max(
        Number(rawSequence.supportTicket) || 1,
        nextSequenceFromArray(raw.supportTickets || base.supportTickets)
      ),
      workoutTemplate: Math.max(
        Number(rawSequence.workoutTemplate) || 1,
        nextSequenceFromArray(raw.workoutTemplates || base.workoutTemplates)
      ),
      workoutTemplateExercise: Math.max(
        Number(rawSequence.workoutTemplateExercise) || 1,
        nextSequenceFromArray(raw.workoutTemplateExercises || base.workoutTemplateExercises)
      ),
      progress: Math.max(
        Number(rawSequence.progress) || 1,
        nextSequenceFromArray(raw.progressRecords || base.progressRecords)
      ),
    },
  };

  return hydrated;
}

function readPersistedStore() {
  try {
    if (!fs.existsSync(STORE_FILE_PATH)) return null;
    const raw = fs.readFileSync(STORE_FILE_PATH, "utf8");
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (_error) {
    return null;
  }
}

function persistInMemoryStore(store) {
  try {
    const hydrated = hydrateStore(store);
    fs.mkdirSync(path.dirname(STORE_FILE_PATH), { recursive: true });
    fs.writeFileSync(STORE_FILE_PATH, JSON.stringify(hydrated, null, 2), "utf8");
  } catch (_error) {
    // noop
  }
}

function createInMemoryStore() {
  const persisted = readPersistedStore();
  return hydrateStore(persisted);
}

module.exports = {
  createInMemoryStore,
  persistInMemoryStore,
  STORE_FILE_PATH,
};
