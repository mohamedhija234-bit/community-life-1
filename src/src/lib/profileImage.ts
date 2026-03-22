import { createCanvas, loadImage, GlobalFonts } from "@napi-rs/canvas";

interface ProfileData {
  username: string;
  discriminator?: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpIntoLevel: number;
  xpNeeded: number;
  coins: number;
  inventoryCount: number;
  achievementCount: number;
  memberSince: string;
  rank?: number;
}

// ─── constants ───────────────────────────────────────────────────────────────
const W = 940;
const H = 300;
const PADDING = 30;
const AVATAR_SIZE = 160;
const AVATAR_X = PADDING + 10;
const AVATAR_Y = (H - AVATAR_SIZE) / 2;

// Accent colours
const ACCENT = "#5865F2";        // Discord blurple
const ACCENT2 = "#7289DA";
const BAR_BG = "rgba(255,255,255,0.12)";
const BAR_FILL_START = "#5865F2";
const BAR_FILL_END = "#EB459E";

// ─── helpers ─────────────────────────────────────────────────────────────────
function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
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

function clipCircle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
}

// ─── main export ─────────────────────────────────────────────────────────────
export async function generateProfileCard(data: ProfileData): Promise<Buffer> {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d") as unknown as CanvasRenderingContext2D;

  // ── 1. Background: dark card with gradient overlay ──────────────────────
  roundRect(ctx, 0, 0, W, H, 24);
  ctx.clip();

  // Base dark background
  const bgGrad = ctx.createLinearGradient(0, 0, W, H);
  bgGrad.addColorStop(0, "#0f1117");
  bgGrad.addColorStop(0.55, "#1a1d2e");
  bgGrad.addColorStop(1, "#0f1117");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle top accent glow
  const glowGrad = ctx.createRadialGradient(W * 0.65, 0, 0, W * 0.65, 0, H * 1.2);
  glowGrad.addColorStop(0, "rgba(88,101,242,0.22)");
  glowGrad.addColorStop(1, "rgba(88,101,242,0)");
  ctx.fillStyle = glowGrad;
  ctx.fillRect(0, 0, W, H);

  // Decorative right-side vertical stripe
  const stripeGrad = ctx.createLinearGradient(W - 6, 0, W, 0);
  stripeGrad.addColorStop(0, "rgba(88,101,242,0)");
  stripeGrad.addColorStop(0.5, "rgba(88,101,242,0.7)");
  stripeGrad.addColorStop(1, "rgba(88,101,242,0)");
  ctx.fillStyle = stripeGrad;
  ctx.fillRect(W - 4, 20, 4, H - 40);

  // Thin top border glow
  const topGrad = ctx.createLinearGradient(0, 0, W, 0);
  topGrad.addColorStop(0, "rgba(88,101,242,0)");
  topGrad.addColorStop(0.5, "rgba(88,101,242,0.6)");
  topGrad.addColorStop(1, "rgba(88,101,242,0)");
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, 2);

  // ── 2. Avatar ───────────────────────────────────────────────────────────
  const avatarCX = AVATAR_X + AVATAR_SIZE / 2;
  const avatarCY = AVATAR_Y + AVATAR_SIZE / 2;
  const avatarR = AVATAR_SIZE / 2;

  // Outer glow ring
  const ringGrad = ctx.createRadialGradient(avatarCX, avatarCY, avatarR - 4, avatarCX, avatarCY, avatarR + 8);
  ringGrad.addColorStop(0, ACCENT);
  ringGrad.addColorStop(1, "rgba(88,101,242,0)");
  ctx.fillStyle = ringGrad;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR + 8, 0, Math.PI * 2);
  ctx.fill();

  // White ring
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.15)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(avatarCX, avatarCY, avatarR + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  // Avatar image (clipped circle)
  ctx.save();
  clipCircle(ctx, avatarCX, avatarCY, avatarR);
  try {
    const avatarImg = await loadImage(data.avatarUrl + "?size=256");
    ctx.drawImage(avatarImg as unknown as Parameters<typeof ctx.drawImage>[0], AVATAR_X, AVATAR_Y, AVATAR_SIZE, AVATAR_SIZE);
  } catch {
    // Fallback: filled circle with initials
    ctx.fillStyle = ACCENT;
    ctx.fillRect(AVATAR_X, AVATAR_Y, AVATAR_SIZE, AVATAR_SIZE);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 60px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(data.username.charAt(0).toUpperCase(), avatarCX, avatarCY);
  }
  ctx.restore();

  // ── 3. Level badge (bottom of avatar) ──────────────────────────────────
  const badgeR = 22;
  const badgeCX = AVATAR_X + AVATAR_SIZE - 4;
  const badgeCY = AVATAR_Y + AVATAR_SIZE - 4;

  const badgeGrad = ctx.createLinearGradient(badgeCX - badgeR, badgeCY - badgeR, badgeCX + badgeR, badgeCY + badgeR);
  badgeGrad.addColorStop(0, BAR_FILL_START);
  badgeGrad.addColorStop(1, BAR_FILL_END);
  ctx.fillStyle = badgeGrad;
  ctx.beginPath();
  ctx.arc(badgeCX, badgeCY, badgeR + 3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#0f1117";
  ctx.beginPath();
  ctx.arc(badgeCX, badgeCY, badgeR + 1, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = badgeGrad;
  ctx.beginPath();
  ctx.arc(badgeCX, badgeCY, badgeR, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${data.level >= 100 ? "11" : "13"}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(`${data.level}`, badgeCX, badgeCY + 1);

  // ── 4. Text content area ─────────────────────────────────────────────────
  const textX = AVATAR_X + AVATAR_SIZE + PADDING * 1.2;
  const contentW = W - textX - PADDING;

  // Username
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  ctx.font = `bold 34px sans-serif`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(data.username, textX, 80);

  // Rank tag (if available)
  if (data.rank !== undefined) {
    const rankText = `#${data.rank}`;
    ctx.font = `bold 14px sans-serif`;
    ctx.fillStyle = ACCENT;
    ctx.fillText(rankText, textX, 104);
  }

  // ── 5. Stats row ─────────────────────────────────────────────────────────
  const statsY = 130;

  const stats = [
    { label: "LEVEL",  value: `${data.level}`,  color: ACCENT },
    { label: "XP",     value: `${data.xp.toLocaleString()}`, color: "#57F287" },
    { label: "COINS",  value: `${data.coins.toLocaleString()}`, color: "#FEE75C" },
    { label: "ITEMS",  value: `${data.inventoryCount}`, color: "#EB459E" },
  ];

  const statBlockW = contentW / stats.length;
  for (let i = 0; i < stats.length; i++) {
    const s = stats[i];
    const sx = textX + i * statBlockW;

    // Pill background
    roundRect(ctx, sx, statsY - 18, statBlockW - 10, 52, 10);
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Value
    ctx.font = `bold 20px sans-serif`;
    ctx.fillStyle = s.color;
    ctx.textAlign = "center";
    ctx.fillText(s.value, sx + (statBlockW - 10) / 2, statsY + 6);

    // Label
    ctx.font = `11px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.fillText(s.label, sx + (statBlockW - 10) / 2, statsY + 24);
  }

  // ── 6. XP Progress bar ────────────────────────────────────────────────────
  const barY = 205;
  const barH = 18;
  const barW = contentW;
  const progress = data.xpNeeded > 0 ? Math.max(0, Math.min(1, data.xpIntoLevel / data.xpNeeded)) : 1;

  // Label row
  ctx.textAlign = "left";
  ctx.font = `bold 12px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.fillText(`XP PROGRESS  ·  Level ${data.level} → ${data.level + 1}`, textX, barY - 8);

  ctx.textAlign = "right";
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.fillText(`${data.xpIntoLevel.toLocaleString()} / ${data.xpNeeded.toLocaleString()} XP`, textX + barW, barY - 8);

  // Track
  roundRect(ctx, textX, barY, barW, barH, barH / 2);
  ctx.fillStyle = BAR_BG;
  ctx.fill();

  // Fill
  const fillW = Math.max(barH, barW * progress);
  roundRect(ctx, textX, barY, fillW, barH, barH / 2);
  const fillGrad = ctx.createLinearGradient(textX, 0, textX + fillW, 0);
  fillGrad.addColorStop(0, BAR_FILL_START);
  fillGrad.addColorStop(1, BAR_FILL_END);
  ctx.fillStyle = fillGrad;
  ctx.fill();

  // Shine overlay
  const shineGrad = ctx.createLinearGradient(textX, barY, textX, barY + barH);
  shineGrad.addColorStop(0, "rgba(255,255,255,0.18)");
  shineGrad.addColorStop(0.5, "rgba(255,255,255,0.04)");
  shineGrad.addColorStop(1, "rgba(255,255,255,0)");
  roundRect(ctx, textX, barY, fillW, barH, barH / 2);
  ctx.fillStyle = shineGrad;
  ctx.fill();

  // Percentage label inside bar (if enough room)
  if (progress > 0.12) {
    ctx.textAlign = "right";
    ctx.font = `bold 11px sans-serif`;
    ctx.fillStyle = "rgba(255,255,255,0.9)";
    ctx.fillText(`${Math.round(progress * 100)}%`, textX + fillW - 8, barY + 13);
  }

  // ── 7. Footer ─────────────────────────────────────────────────────────────
  ctx.textAlign = "left";
  ctx.font = `12px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.fillText(
    `🏆 ${data.achievementCount} achievement${data.achievementCount !== 1 ? "s" : ""}   ·   Member since ${data.memberSince}`,
    textX,
    H - 22
  );

  // ── 8. Encode ─────────────────────────────────────────────────────────────
  return canvas.toBuffer("image/png");
}
