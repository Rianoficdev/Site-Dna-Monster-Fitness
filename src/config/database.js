function getDatabaseConfig() {
  return {
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME || "dna_monster_fitness",
    user: process.env.DB_USER || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
  };
}

function initializeDatabase() {
  const config = getDatabaseConfig();

  // Future integration point:
  // Here you can initialize pg.Pool and export query helpers.
  return {
    connected: false,
    config,
  };
}

module.exports = {
  getDatabaseConfig,
  initializeDatabase,
};
