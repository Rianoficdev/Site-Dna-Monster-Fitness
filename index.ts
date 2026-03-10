import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL nao configurada.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  // --------------------
  // CREATE
  // --------------------
  const uniqueEmail = `rian.${Date.now()}@example.com`;

  const user = await prisma.user.create({
    data: {
      name: "Rian",
      email: uniqueEmail,
      treinos: {
        create: [
          { titulo: "Treino A", descricao: "Peito e Biceps" },
          { titulo: "Treino B", descricao: "Costas e Triceps" },
        ],
      },
      objetivos: {
        create: [
          { titulo: "Perder 2kg" },
          { titulo: "Correr 5km" },
        ],
      },
    },
    include: {
      treinos: true,
      objetivos: true,
    },
  });
  console.log("Usuario criado:", user);

  // --------------------
  // READ
  // --------------------
  const allUsers = await prisma.user.findMany({
    include: { treinos: true, objetivos: true },
  });
  console.log("Todos usuarios:", allUsers);

  // --------------------
  // UPDATE
  // --------------------
  const updatedUser = await prisma.user.update({
    where: { id: user.id },
    data: {
      name: "Rian Araujo",
      objetivos: {
        update: {
          where: { id: user.objetivos[0].id },
          data: { concluido: true },
        },
      },
    },
    include: { treinos: true, objetivos: true },
  });
  console.log("Usuario atualizado:", updatedUser);

  // --------------------
  // DELETE (opcional)
  // --------------------
  // await prisma.user.delete({ where: { id: user.id } });
  // console.log("Usuario deletado!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
