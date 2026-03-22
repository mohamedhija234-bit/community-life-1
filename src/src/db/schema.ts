import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes("railway") || process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : false,
});

export async function query(sql: string, params?: unknown[]) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result;
  } finally {
    client.release();
  }
}

export async function initDatabase() {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      discord_id VARCHAR(32) UNIQUE NOT NULL,
      guild_id VARCHAR(32) NOT NULL,
      username VARCHAR(128) NOT NULL,
      xp INTEGER DEFAULT 0,
      level INTEGER DEFAULT 1,
      coins INTEGER DEFAULT 100,
      last_daily TIMESTAMP,
      last_xp_gain TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(discord_id, guild_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS inventory (
      id BIGSERIAL PRIMARY KEY,
      discord_id VARCHAR(32) NOT NULL,
      guild_id VARCHAR(32) NOT NULL,
      item_name VARCHAR(64) NOT NULL,
      quantity INTEGER DEFAULT 1,
      UNIQUE(discord_id, guild_id, item_name)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS achievements (
      id BIGSERIAL PRIMARY KEY,
      discord_id VARCHAR(32) NOT NULL,
      guild_id VARCHAR(32) NOT NULL,
      achievement_name VARCHAR(128) NOT NULL,
      earned_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(discord_id, guild_id, achievement_name)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS quests (
      id BIGSERIAL PRIMARY KEY,
      discord_id VARCHAR(32) NOT NULL,
      guild_id VARCHAR(32) NOT NULL,
      quest_name VARCHAR(128) NOT NULL,
      progress INTEGER DEFAULT 0,
      goal INTEGER NOT NULL,
      reward_xp INTEGER DEFAULT 0,
      reward_coins INTEGER DEFAULT 0,
      completed BOOLEAN DEFAULT FALSE,
      assigned_at TIMESTAMP DEFAULT NOW(),
      completed_at TIMESTAMP,
      UNIQUE(discord_id, guild_id, quest_name, assigned_at)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id BIGSERIAL PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      event_name VARCHAR(128) NOT NULL,
      description TEXT,
      started_by VARCHAR(32) NOT NULL,
      active BOOLEAN DEFAULT TRUE,
      participants INTEGER DEFAULT 0,
      started_at TIMESTAMP DEFAULT NOW(),
      ended_at TIMESTAMP
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS event_participants (
      id BIGSERIAL PRIMARY KEY,
      event_id BIGINT REFERENCES events(id),
      discord_id VARCHAR(32) NOT NULL,
      guild_id VARCHAR(32) NOT NULL,
      joined_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(event_id, discord_id)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS perks (
      id BIGSERIAL PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      level_required INTEGER NOT NULL,
      role_id VARCHAR(32) NOT NULL,
      UNIQUE(guild_id, level_required)
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS trades (
      id BIGSERIAL PRIMARY KEY,
      guild_id VARCHAR(32) NOT NULL,
      from_user VARCHAR(32) NOT NULL,
      to_user VARCHAR(32) NOT NULL,
      item_name VARCHAR(64) NOT NULL,
      quantity INTEGER DEFAULT 1,
      status VARCHAR(16) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);

  console.log("✅ Database initialized");
}

export default pool;
