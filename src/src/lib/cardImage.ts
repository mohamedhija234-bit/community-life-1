import { createCanvas, loadImage } from "@napi-rs/canvas";

// ─── shared palette ────────────────────────────────────────────────────────
export const C = {
  bg0: "#0d0f1a",
  bg1: "#131625",
  bg2: "#1a1d2e",
  border: "rgba(255,255,255,0.07)",
  muted: "rgba(255,255,255,0.35)",
  text: "#e8eaf6",
  accent: "#5865F2",
  green: "#57F287",
  yellow: "#FEE75C",
  red: "#ED4245",
  pink: "#EB459E",
  blurple: "#5865F2",
};

export type AccentKey = "blurple" | "green" | "yellow" | "red" | "pink" | "grey";
const ACCENT_MAP: Record<AccentKey, string> = {
  blurple: C.blurple, green: C.green, yellow: C.yellow,
  red: C.red, pink: C.pink, grey: "#99aab5",
};

// ─── helpers ──────────────────────────────────────────────────────────────
type Ctx = CanvasRenderingContext2D;

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

export function drawBackground(ctx: Ctx, w: number, h: number, accentHex: string) {
  // Clip to rounded card
  roundRect(ctx, 0, 0, w, h, 20);
  ctx.clip();

  // Dark base
  const bg = ctx.createLinearGradient(0, 0, w, h);
  bg.addColorStop(0, C.bg0);
  bg.addColorStop(1, C.bg2);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle top-left glow
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, h * 1.2);
  glow.addColorStop(0, accentHex + "28");
  glow.addColorStop(1, "transparent");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, w, h);

  // Top border accent
  const border = ctx.createLinearGradient(0, 0, w, 0);
  border.addColorStop(0, "transparent");
  border.addColorStop(0.5, accentHex + "cc");
  border.addColorStop(1, "transparent");
  ctx.fillStyle = border;
  ctx.fillRect(0, 0, w, 2);
}

export function drawLeftAccentBar(ctx: Ctx, accentHex: string, h: number, pad: number) {
  const barGrad = ctx.createLinearGradient(0, pad, 0, h - pad);
  barGrad.addColorStop(0, accentHex + "00");
  barGrad.addColorStop(0.5, accentHex);
  barGrad.addColorStop(1, accentHex + "00");
  ctx.fillStyle = barGrad;
  ctx.fillRect(pad, pad, 3, h - pad * 2);
}

export function progressBar(
  ctx: Ctx, x: number, y: number, w: number, h: number,
  pct: number, startHex: string, endHex: string,
) {
  // Track
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = "rgba(255,255,255,0.10)";
  ctx.fill();

  // Fill
  const fillW = Math.max(h, w * Math.min(1, Math.max(0, pct)));
  roundRect(ctx, x, y, fillW, h, h / 2);
  const grad = ctx.createLinearGradient(x, 0, x + fillW, 0);
  grad.addColorStop(0, startHex);
  grad.addColorStop(1, endHex);
  ctx.fillStyle = grad;
  ctx.fill();

  // Shine
  roundRect(ctx, x, y, fillW, h, h / 2);
  const shine = ctx.createLinearGradient(x, y, x, y + h);
  shine.addColorStop(0, "rgba(255,255,255,0.18)");
  shine.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = shine;
  ctx.fill();
}

export function statPill(
  ctx: Ctx, x: number, y: number, w: number, h: number,
  label: string, value: string, valueColor: string,
) {
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fill();
  ctx.strokeStyle = C.border;
  ctx.lineWidth = 1;
  ctx.stroke();

  const cx = x + w / 2;
  ctx.textAlign = "center";
  ctx.font = `bold 18px sans-serif`;
  ctx.fillStyle = valueColor;
  ctx.fillText(value, cx, y + h * 0.52);

  ctx.font = `10px sans-serif`;
  ctx.fillStyle = C.muted;
  ctx.fillText(label.toUpperCase(), cx, y + h * 0.82);
}

// ─── RESULT CARD ────────────────────────────────────────────────────────────
// Generic one-shot result card: emoji + title + optional subtitle + stat pills + optional progress + footer

export interface ResultField { label: string; value: string; color?: string }
export interface ProgressData { label: string; current: number; max: number; pctText?: string }

export interface ResultCardOptions {
  accent?: AccentKey;
  emoji?: string;           // large emoji shown centre-top
  title: string;
  subtitle?: string;
  fields?: ResultField[];   // stat pills (max 4 shown per row)
  progress?: ProgressData;
  bodyLines?: string[];     // plain text lines shown below subtitle
  footer?: string;
}

export async function buildResultCard(opts: ResultCardOptions): Promise<Buffer> {
  const W = 720;
  const PAD = 28;
  const accent = ACCENT_MAP[opts.accent ?? "blurple"];

  // Measure dynamic height
  let contentH = 0;
  if (opts.emoji) contentH += 68;
  contentH += 38;                               // title
  if (opts.subtitle) contentH += 24;
  if (opts.bodyLines?.length) contentH += opts.bodyLines.length * 22 + 10;
  if (opts.fields?.length) contentH += 72;      // pill row
  if (opts.progress) contentH += 54;
  if (opts.footer) contentH += 28;
  const H = Math.max(220, contentH + PAD * 2 + 20);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as Ctx;

  drawBackground(ctx, W, H, accent);
  drawLeftAccentBar(ctx, accent, H, PAD);

  let y = PAD + 16;

  // Big emoji
  if (opts.emoji) {
    ctx.font = `52px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = C.text;
    ctx.fillText(opts.emoji, W / 2, y + 44);
    y += 68;
  }

  // Title
  ctx.font = `bold 28px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = C.text;
  ctx.fillText(opts.title, W / 2, y + 24);
  y += 38;

  // Subtitle
  if (opts.subtitle) {
    ctx.font = `15px sans-serif`;
    ctx.fillStyle = C.muted;
    ctx.fillText(opts.subtitle, W / 2, y + 14);
    y += 24;
  }

  // Body lines
  if (opts.bodyLines?.length) {
    y += 8;
    for (const line of opts.bodyLines) {
      ctx.font = `14px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillStyle = C.text;
      ctx.fillText(line, W / 2, y + 14);
      y += 22;
    }
    y += 4;
  }

  // Stat pills
  if (opts.fields?.length) {
    y += 10;
    const cols = Math.min(4, opts.fields.length);
    const pillW = (W - PAD * 2 - (cols - 1) * 10) / cols;
    const pillH = 56;
    opts.fields.slice(0, 4).forEach((f, i) => {
      statPill(ctx, PAD + i * (pillW + 10), y, pillW, pillH, f.label, f.value, f.color ?? accent);
    });
    y += pillH + 12;
  }

  // Progress bar
  if (opts.progress) {
    y += 4;
    const { label, current, max, pctText } = opts.progress;
    const pct = max > 0 ? current / max : 1;

    ctx.font = `bold 11px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillStyle = C.muted;
    ctx.fillText(label, PAD, y);
    ctx.textAlign = "right";
    ctx.fillText(pctText ?? `${current} / ${max}`, W - PAD, y);
    y += 14;

    progressBar(ctx, PAD, y, W - PAD * 2, 16, pct, accent, C.pink);
    y += 16 + 8;
  }

  // Footer
  if (opts.footer) {
    y += 4;
    ctx.font = `11px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    ctx.fillText(opts.footer, W / 2, y + 10);
  }

  return canvas.toBuffer("image/png");
}

// ─── QUEST CARD ─────────────────────────────────────────────────────────────
export interface QuestRow {
  name: string;
  emoji: string;
  progress: number;
  goal: number;
  rewardXp: number;
  rewardCoins: number;
  completed: boolean;
}

export async function buildQuestCard(username: string, quests: QuestRow[]): Promise<Buffer> {
  const W = 720;
  const PAD = 28;
  const ROW_H = 76;
  const H = Math.max(200, PAD * 2 + 50 + quests.length * (ROW_H + 10) + 10);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as Ctx;
  drawBackground(ctx, W, H, C.blurple);
  drawLeftAccentBar(ctx, C.blurple, H, PAD);

  // Header
  ctx.font = `bold 22px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillStyle = C.text;
  ctx.fillText(`📋  Daily Quests`, PAD + 12, PAD + 22);

  ctx.font = `13px sans-serif`;
  ctx.fillStyle = C.muted;
  ctx.textAlign = "right";
  ctx.fillText(username, W - PAD, PAD + 22);

  let y = PAD + 46;

  for (const q of quests) {
    const rowAccent = q.completed ? C.green : C.blurple;
    // Row bg
    roundRect(ctx, PAD, y, W - PAD * 2, ROW_H - 4, 12);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.strokeStyle = q.completed ? C.green + "44" : C.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Emoji + name
    ctx.font = `22px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillStyle = C.text;
    ctx.fillText(q.emoji, PAD + 12, y + 26);

    ctx.font = `bold 14px sans-serif`;
    ctx.fillText((q.completed ? "✅ " : "") + q.name, PAD + 44, y + 26);

    // Reward
    ctx.font = `11px sans-serif`;
    ctx.fillStyle = C.muted;
    ctx.textAlign = "right";
    ctx.fillText(`+${q.rewardXp} XP  +${q.rewardCoins} 💰`, W - PAD - 8, y + 26);

    // Progress bar
    const pct = Math.min(1, q.progress / q.goal);
    const barX = PAD + 44;
    const barW = W - PAD * 2 - 44 - 8;
    progressBar(ctx, barX, y + 36, barW, 12, pct,
      q.completed ? C.green : rowAccent, q.completed ? C.green : C.pink);

    ctx.font = `10px sans-serif`;
    ctx.textAlign = "right";
    ctx.fillStyle = C.muted;
    ctx.fillText(
      q.completed ? "COMPLETE" : `${q.progress}/${q.goal}`,
      barX + barW, y + 60,
    );

    y += ROW_H + 10;
  }

  return canvas.toBuffer("image/png");
}

// ─── LEADERBOARD CARD ───────────────────────────────────────────────────────
export interface LeaderRow { rank: number; username: string; value: string }

export async function buildLeaderboardCard(
  title: string, rows: LeaderRow[], accentKey: AccentKey = "blurple"
): Promise<Buffer> {
  const W = 640;
  const PAD = 28;
  const ROW_H = 46;
  const H = PAD * 2 + 52 + rows.length * (ROW_H + 6) + 16;
  const accent = ACCENT_MAP[accentKey];

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as Ctx;
  drawBackground(ctx, W, H, accent);
  drawLeftAccentBar(ctx, accent, H, PAD);

  ctx.font = `bold 22px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillStyle = C.text;
  ctx.fillText(title, PAD + 12, PAD + 24);

  const MEDALS = ["🥇", "🥈", "🥉"];
  let y = PAD + 46;

  for (const row of rows) {
    const isTop3 = row.rank <= 3;
    roundRect(ctx, PAD, y, W - PAD * 2, ROW_H, 10);
    ctx.fillStyle = isTop3 ? accent + "18" : "rgba(255,255,255,0.03)";
    ctx.fill();
    ctx.strokeStyle = isTop3 ? accent + "55" : C.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Medal or number
    ctx.font = isTop3 ? `20px sans-serif` : `bold 13px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillStyle = isTop3 ? C.text : C.muted;
    ctx.fillText(
      isTop3 ? MEDALS[row.rank - 1] : `${row.rank}.`,
      PAD + 10, y + ROW_H / 2 + 6,
    );

    // Username
    ctx.font = `bold 14px sans-serif`;
    ctx.fillStyle = isTop3 ? C.text : "rgba(255,255,255,0.75)";
    ctx.fillText(row.username, PAD + 44, y + ROW_H / 2 + 5);

    // Value
    ctx.textAlign = "right";
    ctx.font = `bold 14px sans-serif`;
    ctx.fillStyle = accent;
    ctx.fillText(row.value, W - PAD - 10, y + ROW_H / 2 + 5);

    y += ROW_H + 6;
  }

  return canvas.toBuffer("image/png");
}

// ─── INVENTORY CARD ──────────────────────────────────────────────────────────
export interface InventoryItem { name: string; emoji: string; quantity: number }

export async function buildInventoryCard(
  username: string, avatarUrl: string, items: InventoryItem[], coins: number
): Promise<Buffer> {
  const W = 780;
  const PAD = 28;
  const COLS = 4;
  const CELL = 160;
  const CELL_H = 80;
  const rows = Math.max(1, Math.ceil(items.length / COLS));
  const H = PAD * 2 + 80 + rows * (CELL_H + 10) + 10;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as Ctx;
  drawBackground(ctx, W, H, C.blurple);
  drawLeftAccentBar(ctx, C.blurple, H, PAD);

  // Avatar small circle
  const AVT = 44;
  ctx.save();
  ctx.beginPath();
  ctx.arc(PAD + 12 + AVT / 2, PAD + 12 + AVT / 2, AVT / 2, 0, Math.PI * 2);
  ctx.clip();
  try {
    const img = await loadImage(avatarUrl + "?size=64");
    ctx.drawImage(img as unknown as Parameters<typeof ctx.drawImage>[0], PAD + 12, PAD + 12, AVT, AVT);
  } catch {
    ctx.fillStyle = C.blurple;
    ctx.fillRect(PAD + 12, PAD + 12, AVT, AVT);
  }
  ctx.restore();

  // Header text
  ctx.font = `bold 20px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillStyle = C.text;
  ctx.fillText(`${username}'s Inventory`, PAD + 12 + AVT + 12, PAD + 28);
  ctx.font = `13px sans-serif`;
  ctx.fillStyle = C.yellow;
  ctx.fillText(`💰 ${coins.toLocaleString()} coins`, PAD + 12 + AVT + 12, PAD + 48);

  ctx.textAlign = "right";
  ctx.font = `12px sans-serif`;
  ctx.fillStyle = C.muted;
  ctx.fillText(`${items.length} item type${items.length !== 1 ? "s" : ""}`, W - PAD, PAD + 28);

  let y = PAD + 80;

  if (items.length === 0) {
    ctx.font = `15px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = C.muted;
    ctx.fillText("Your inventory is empty — visit /shop to get started!", W / 2, y + 30);
  } else {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const idx = r * COLS + c;
        if (idx >= items.length) break;
        const item = items[idx];
        const cx = PAD + c * (CELL + 8);
        const cy = y;

        roundRect(ctx, cx, cy, CELL, CELL_H, 10);
        ctx.fillStyle = "rgba(255,255,255,0.05)";
        ctx.fill();
        ctx.strokeStyle = C.border;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Emoji
        ctx.font = `28px sans-serif`;
        ctx.textAlign = "center";
        ctx.fillStyle = C.text;
        ctx.fillText(item.emoji, cx + CELL / 2, cy + 30);

        // Name (truncate long names)
        const maxLen = 14;
        const displayName = item.name.length > maxLen ? item.name.slice(0, maxLen - 1) + "…" : item.name;
        ctx.font = `bold 11px sans-serif`;
        ctx.fillStyle = C.text;
        ctx.fillText(displayName, cx + CELL / 2, cy + 50);

        // Quantity badge
        roundRect(ctx, cx + CELL - 30, cy + 4, 26, 18, 9);
        ctx.fillStyle = C.blurple + "cc";
        ctx.fill();
        ctx.font = `bold 10px sans-serif`;
        ctx.fillStyle = "#fff";
        ctx.fillText(`x${item.quantity}`, cx + CELL - 17, cy + 16);
      }
      y += CELL_H + 10;
    }
  }

  return canvas.toBuffer("image/png");
}

// ─── SHOP CARD ───────────────────────────────────────────────────────────────
export interface ShopEntry { name: string; emoji: string; price: number; description: string; sellPrice: number }

export async function buildShopCard(items: ShopEntry[]): Promise<Buffer> {
  const W = 760;
  const PAD = 28;
  const ROW_H = 54;
  const H = PAD * 2 + 56 + items.length * (ROW_H + 6) + 10;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as Ctx;
  drawBackground(ctx, W, H, C.yellow);
  drawLeftAccentBar(ctx, C.yellow, H, PAD);

  ctx.font = `bold 24px sans-serif`;
  ctx.textAlign = "left";
  ctx.fillStyle = C.text;
  ctx.fillText("🛒  Server Shop", PAD + 12, PAD + 24);
  ctx.font = `12px sans-serif`;
  ctx.fillStyle = C.muted;
  ctx.fillText("Use  /buy <item>  to purchase  ·  /sell <item>  to sell", PAD + 12, PAD + 44);

  let y = PAD + 56;
  for (const item of items) {
    roundRect(ctx, PAD, y, W - PAD * 2, ROW_H, 10);
    ctx.fillStyle = "rgba(255,255,255,0.04)";
    ctx.fill();
    ctx.strokeStyle = C.border;
    ctx.lineWidth = 1;
    ctx.stroke();

    // Emoji
    ctx.font = `24px sans-serif`;
    ctx.textAlign = "left";
    ctx.fillStyle = C.text;
    ctx.fillText(item.emoji, PAD + 10, y + ROW_H / 2 + 8);

    // Name + desc
    ctx.font = `bold 13px sans-serif`;
    ctx.fillStyle = C.text;
    ctx.fillText(item.name, PAD + 48, y + ROW_H / 2 - 4);
    ctx.font = `11px sans-serif`;
    ctx.fillStyle = C.muted;
    const truncDesc = item.description.length > 46 ? item.description.slice(0, 44) + "…" : item.description;
    ctx.fillText(truncDesc, PAD + 48, y + ROW_H / 2 + 12);

    // Price
    ctx.textAlign = "right";
    ctx.font = `bold 14px sans-serif`;
    ctx.fillStyle = C.yellow;
    ctx.fillText(`💰 ${item.price}`, W - PAD - 10, y + ROW_H / 2 - 4);
    ctx.font = `10px sans-serif`;
    ctx.fillStyle = C.muted;
    ctx.fillText(`sell: ${item.sellPrice}`, W - PAD - 10, y + ROW_H / 2 + 12);

    y += ROW_H + 6;
  }

  return canvas.toBuffer("image/png");
}

// ─── DUEL CARD ────────────────────────────────────────────────────────────────
export interface DuelResultData {
  challenger: { username: string; avatarUrl: string; roll: number };
  opponent:   { username: string; avatarUrl: string; roll: number };
  winner: string;  // username of winner
  bet: number;
  xpWinner: number;
  xpLoser: number;
}

export async function buildDuelCard(data: DuelResultData): Promise<Buffer> {
  const W = 720;
  const H = 280;
  const PAD = 28;
  const AVT = 80;

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as Ctx;
  drawBackground(ctx, W, H, C.red);
  drawLeftAccentBar(ctx, C.red, H, PAD);

  // Title
  ctx.font = `bold 22px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = C.text;
  ctx.fillText("⚔️  Duel Result", W / 2, PAD + 22);

  const drawPlayer = async (
    side: "left" | "right",
    name: string, avatarUrl: string, roll: number, isWinner: boolean
  ) => {
    const cx = side === "left" ? PAD + AVT / 2 + 16 : W - PAD - AVT / 2 - 16;
    const top = 70;

    // Glow ring for winner
    if (isWinner) {
      ctx.save();
      ctx.strokeStyle = C.yellow;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, top + AVT / 2, AVT / 2 + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Avatar
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, top + AVT / 2, AVT / 2, 0, Math.PI * 2);
    ctx.clip();
    try {
      const img = await loadImage(avatarUrl + "?size=128");
      ctx.drawImage(img as unknown as Parameters<typeof ctx.drawImage>[0], cx - AVT / 2, top, AVT, AVT);
    } catch {
      ctx.fillStyle = C.blurple;
      ctx.fillRect(cx - AVT / 2, top, AVT, AVT);
    }
    ctx.restore();

    // Crown
    if (isWinner) {
      ctx.font = `20px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("👑", cx, top - 4);
    }

    // Name
    ctx.font = `bold 14px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = isWinner ? C.yellow : C.text;
    ctx.fillText(name.length > 12 ? name.slice(0, 11) + "…" : name, cx, top + AVT + 20);

    // Roll number
    ctx.font = `bold 28px sans-serif`;
    ctx.fillStyle = isWinner ? C.yellow : C.muted;
    ctx.fillText(`${Math.max(0, roll)}`, cx, top + AVT + 50);

    ctx.font = `10px sans-serif`;
    ctx.fillStyle = C.muted;
    ctx.fillText("ROLL", cx, top + AVT + 65);
  };

  await drawPlayer("left", data.challenger.username, data.challenger.avatarUrl, data.challenger.roll, data.winner === data.challenger.username);
  await drawPlayer("right", data.opponent.username, data.opponent.avatarUrl, data.opponent.roll, data.winner === data.opponent.username);

  // VS badge in centre
  roundRect(ctx, W / 2 - 22, 110, 44, 44, 22);
  ctx.fillStyle = C.red + "dd";
  ctx.fill();
  ctx.font = `bold 16px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = C.text;
  ctx.fillText("VS", W / 2, 138);

  // Footer
  const footParts: string[] = [];
  if (data.bet > 0) footParts.push(`Bet: 💰 ${data.bet} each`);
  footParts.push(`Winner: +${data.xpWinner} XP`);
  footParts.push(`Loser: +${data.xpLoser} XP`);
  ctx.font = `11px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = C.muted;
  ctx.fillText(footParts.join("   ·   "), W / 2, H - 14);

  return canvas.toBuffer("image/png");
}

// ─── Attachment helper ──────────────────────────────────────────────────────
import { AttachmentBuilder } from "discord.js";

export function toAttachment(buf: Buffer, name = "card.png"): AttachmentBuilder {
  return new AttachmentBuilder(buf, { name });
}
