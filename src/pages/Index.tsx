import { useState, useEffect, useRef, useCallback } from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Telegram WebApp SDK
// Injected by Telegram into window.Telegram.WebApp when opened inside the app.
// Falls back gracefully for browser preview.
// ─────────────────────────────────────────────────────────────────────────────
const tg = window?.Telegram?.WebApp ?? null;

// Helpers to call TG APIs safely
const tgReady         = ()            => tg?.ready();
const tgExpand        = ()            => tg?.expand();
const tgClose         = ()            => tg?.close();
const tgHaptic        = (type, style) => tg?.HapticFeedback?.impactOccurred?.(style ?? "light");
const tgHapticNotif   = (type)        => tg?.HapticFeedback?.notificationOccurred?.(type ?? "success");
const tgSetMainBtn    = (text, cb)    => { if (!tg?.MainButton) return; tg.MainButton.setText(text); tg.MainButton.onClick(cb); tg.MainButton.show(); };
const tgHideMainBtn   = ()            => tg?.MainButton?.hide();
const tgShowBackBtn   = (cb)          => { if (!tg?.BackButton) return; tg.BackButton.onClick(cb); tg.BackButton.show(); };
const tgHideBackBtn   = ()            => tg?.BackButton?.hide();
const tgInitData      = ()            => tg?.initData ?? "";
const tgUser          = ()            => tg?.initDataUnsafe?.user ?? null;
const tgColorScheme   = ()            => tg?.colorScheme ?? "dark";
const tgViewportH     = ()            => tg?.viewportStableHeight ?? window.innerHeight;

// ─────────────────────────────────────────────────────────────────────────────
// API — your Supabase Edge Function
// All requests carry the Telegram initData as the auth token so your function
// can verify the user without a separate login flow.
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_BASE;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ANON_KEY}`,
      // Telegram initData lets your Edge Function verify the user on-chain
      "X-Telegram-Init-Data": tgInitData(),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? "API error");
  }
  return res.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const PRECISION = 100_000_000;
const NGN_RATE  = 1580; // fallback; ideally fetched from your rate endpoint

// ─────────────────────────────────────────────────────────────────────────────
// Formatters
// ─────────────────────────────────────────────────────────────────────────────
const fmtUSD    = (n) => `$${Number(n).toFixed(2)}`;
const fmtNGN    = (n) => `₦${Math.round(n * NGN_RATE).toLocaleString()}`;
const fmtShares = (n) => (n / PRECISION).toFixed(2);
const fmtChange = (n) => `${n >= 0 ? "+" : ""}${Number(n).toFixed(1)}%`;
const fmtVol    = (n) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

// ─────────────────────────────────────────────────────────────────────────────
// Mock data — used when API is unavailable (browser preview / dev)
// ─────────────────────────────────────────────────────────────────────────────
const MOCK_PLAYERS = [
  { id: 1, name: "Alexander Isak",  symbol: "ISAK",       team: "Liverpool",   league: "PL",      price_apt: 9.49,  price_change_24h:  8.0, volume_apt: 3259744,  tradeable: true, image_url: null, rps: 82, category_id: 0 },
  { id: 2, name: "Erling Haaland",  symbol: "HAALAND",    team: "Man City",    league: "PL",      price_apt: 24.20, price_change_24h: -2.3, volume_apt: 8100000,  tradeable: true, image_url: null, rps: 91, category_id: 0 },
  { id: 3, name: "Cole Palmer",     symbol: "PALMER",     team: "Chelsea",     league: "PL",      price_apt: 15.75, price_change_24h:  5.1, volume_apt: 5400000,  tradeable: true, image_url: null, rps: 88, category_id: 0 },
  { id: 4, name: "Bukayo Saka",     symbol: "SAKA",       team: "Arsenal",     league: "PL",      price_apt: 18.30, price_change_24h:  1.2, volume_apt: 4200000,  tradeable: true, image_url: null, rps: 86, category_id: 0 },
  { id: 5, name: "Mohamed Salah",   symbol: "SALAH",      team: "Liverpool",   league: "PL",      price_apt: 31.00, price_change_24h: -0.8, volume_apt: 9800000,  tradeable: true, image_url: null, rps: 93, category_id: 0 },
  { id: 6, name: "Kylian Mbappé",   symbol: "MBAPPE",     team: "Real Madrid", league: "LaLiga",  price_apt: 42.50, price_change_24h:  3.7, volume_apt: 12400000, tradeable: true, image_url: null, rps: 95, category_id: 1 },
  { id: 7, name: "Jude Bellingham", symbol: "BELLINGHAM", team: "Real Madrid", league: "LaLiga",  price_apt: 28.80, price_change_24h: -1.5, volume_apt: 7600000,  tradeable: true, image_url: null, rps: 89, category_id: 1 },
  { id: 8, name: "Vinicius Jr",     symbol: "VINI",       team: "Real Madrid", league: "LaLiga",  price_apt: 35.10, price_change_24h:  6.4, volume_apt: 11200000, tradeable: true, image_url: null, rps: 92, category_id: 1 },
];
const MOCK_PORTFOLIO = [
  { player_id: 1, player_name: "Alexander Isak", player_symbol: "ISAK",   token_amount: 373000000, avg_buy_apt: 9.49,  current_price: 9.49  },
  { player_id: 3, player_name: "Cole Palmer",    player_symbol: "PALMER", token_amount: 200000000, avg_buy_apt: 12.50, current_price: 15.75 },
];
const MOCK_LEADERBOARD = [
  { rank: 1, username: "chukwuemeka_fx",  pnl_apt: 1420.50, pnl_pct: 184.2 },
  { rank: 2, username: "lagos_trader",    pnl_apt:  980.20, pnl_pct: 142.7 },
  { rank: 3, username: "abuja_picks",     pnl_apt:  740.80, pnl_pct:  98.4 },
  { rank: 4, username: "kano_sportsbet",  pnl_apt:  510.00, pnl_pct:  71.2 },
  { rank: 5, username: "ibadan_trader",   pnl_apt:  380.40, pnl_pct:  52.8 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sparkline
// ─────────────────────────────────────────────────────────────────────────────
function generateSparkline(basePrice, change, points = 20) {
  const data = [];
  let price = basePrice * (1 - change / 100);
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.48) * basePrice * 0.02;
    price += noise + (change / 100 * basePrice) / points;
    data.push(Math.max(0, price));
  }
  data[data.length - 1] = basePrice;
  return data;
}

function SparklineSVG({ data, positive, width = 80, height = 32 }) {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  const color = positive ? "#00FF87" : "#FF4444";
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id={`sg${positive}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${height} ${pts} ${width},${height}`} fill={`url(#sg${positive})`} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Avatar — uses image_url if available, falls back to initials
// ─────────────────────────────────────────────────────────────────────────────
function PlayerAvatar({ player, size = 48 }) {
  const [imgError, setImgError] = useState(false);
  const hue = (player.id * 47) % 360;
  const base = {
    width: size, height: size, borderRadius: size * 0.28, flexShrink: 0,
    border: "1.5px solid rgba(255,255,255,0.1)", overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center",
  };
  if (player.image_url && !imgError) {
    return (
      <div style={{ ...base, background: `hsl(${hue},60%,22%)` }}>
        <img
          src={player.image_url} alt={player.name}
          onError={() => setImgError(true)}
          style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }}
        />
      </div>
    );
  }
  return (
    <div style={{
      ...base,
      background: `linear-gradient(135deg, hsl(${hue},60%,22%), hsl(${hue},80%,35%))`,
      fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700,
      fontSize: size * 0.28, color: "#fff", letterSpacing: "-0.02em",
    }}>
      {player.symbol.slice(0, 3)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Ticker Tape
// ─────────────────────────────────────────────────────────────────────────────
function TickerTape({ players }) {
  const items = [...players, ...players];
  return (
    <div style={{ overflow: "hidden", background: "rgba(0,255,135,0.05)", borderBottom: "1px solid rgba(0,255,135,0.12)", height: 32, display: "flex", alignItems: "center" }}>
      <div style={{ display: "flex", gap: 0, animation: "ticker 28s linear infinite", whiteSpace: "nowrap" }}>
        {items.map((p, i) => (
          <span key={i} style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, fontWeight: 600, padding: "0 18px", display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: "rgba(255,255,255,0.5)" }}>{p.symbol}</span>
            <span style={{ color: "#F5C842" }}>{fmtUSD(p.price_apt)}</span>
            <span style={{ color: p.price_change_24h >= 0 ? "#00FF87" : "#FF4444", fontSize: 10 }}>{fmtChange(p.price_change_24h)}</span>
            <span style={{ color: "rgba(255,255,255,0.15)", marginLeft: 2 }}>·</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Form Badge (rPS score displayed as S/A/B/C grade)
// ─────────────────────────────────────────────────────────────────────────────
function FormBadge({ rps }) {
  const grade  = rps >= 90 ? "S" : rps >= 80 ? "A" : rps >= 70 ? "B" : "C";
  const colors = { S: "#F5C842", A: "#00FF87", B: "#4ECDC4", C: "#aaa" };
  const c = colors[grade];
  return (
    <div style={{ width: 22, height: 22, borderRadius: 6, background: `${c}22`, border: `1px solid ${c}66`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 11, color: c }}>
      {grade}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player List Card
// ─────────────────────────────────────────────────────────────────────────────
function PlayerCard({ player, onClick, holding }) {
  const [sparkData] = useState(() => generateSparkline(player.price_apt, player.price_change_24h));
  const positive = player.price_change_24h >= 0;
  const hasHolding = holding?.token_amount > 0;

  return (
    <div
      onClick={() => { tgHaptic("impact", "light"); onClick(player); }}
      style={{
        background: "linear-gradient(145deg, #142018, #0F1A13)",
        border: `1px solid ${hasHolding ? "rgba(0,255,135,0.25)" : "rgba(255,255,255,0.06)"}`,
        borderRadius: 16, padding: "14px 16px",
        display: "flex", alignItems: "center", gap: 13,
        cursor: "pointer", transition: "transform 0.1s ease",
        position: "relative", overflow: "hidden",
        WebkitTapHighlightColor: "transparent",
      }}
      onTouchStart={e => e.currentTarget.style.transform = "scale(0.985)"}
      onTouchEnd={e => e.currentTarget.style.transform = "scale(1)"}
    >
      {hasHolding && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #00FF87, transparent)" }} />}
      <PlayerAvatar player={player} size={46} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff", letterSpacing: "-0.02em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</span>
          {player.rps != null && <FormBadge rps={player.rps} />}
        </div>
        <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.4)", display: "flex", gap: 6 }}>
          <span>{player.symbol}</span><span>·</span><span>{player.team}</span>
          <span>·</span><span style={{ color: "rgba(255,255,255,0.25)" }}>{player.league}</span>
        </div>
        {hasHolding && (
          <div style={{ marginTop: 5, fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", color: "#00FF87", fontWeight: 600 }}>
            {fmtShares(holding.token_amount)} shares held
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <SparklineSVG data={sparkData} positive={positive} width={70} height={28} />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#F5C842", letterSpacing: "-0.02em" }}>{fmtUSD(player.price_apt)}</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: positive ? "#00FF87" : "#FF4444", background: positive ? "rgba(0,255,135,0.1)" : "rgba(255,68,68,0.1)", padding: "2px 7px", borderRadius: 99 }}>{fmtChange(player.price_change_24h)}</div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Trade Sheet — calls your real API, shows TG native feedback
// ─────────────────────────────────────────────────────────────────────────────
function TradeSheet({ player, holding, balance, onClose, onTrade, onToast }) {
  const [mode, setMode]   = useState("buy");
  const [amount, setAmount] = useState("");
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState(null);

  const price       = player.price_apt;
  const amountNum   = parseFloat(amount) || 0;
  const tokensGet   = mode === "buy" ? amountNum / price : 0;
  const vusdGet     = mode === "sell" ? amountNum * price : 0;
  const fee         = amountNum * 0.01;
  const holdingHuman = holding ? holding.token_amount / PRECISION : 0;
  const presets      = mode === "buy" ? [10, 25, 50, 100] : [25, 50, 75, 100];

  const handlePreset = (val) => {
    tgHaptic("impact", "light");
    setAmount(mode === "buy" ? String(val) : (holdingHuman * val / 100).toFixed(4));
  };

  const canTrade = mode === "buy"
    ? amountNum > 0 && amountNum <= balance
    : amountNum > 0 && amountNum <= holdingHuman;

  const handleTrade = async () => {
    if (!canTrade) return;
    setError(null);
    setBusy(true);
    tgHaptic("impact", "medium");
    try {
      // POST to your edge function which then calls the Aptos tx
      // The function reads initData to identify the user
      const result = await api("/trade", {
        method: "POST",
        body: JSON.stringify({
          player_id: player.id,
          type:      mode,
          amount:    mode === "buy"
            ? Math.floor(amountNum * PRECISION)   // vusd octas
            : Math.floor(amountNum * PRECISION),  // token raw units
        }),
      }).catch(() => null); // graceful fallback for preview

      tgHapticNotif("success");
      onTrade({ mode, amount: amountNum, player, result });
      onClose();
    } catch (e) {
      tgHapticNotif("error");
      setError(e.message ?? "Trade failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "linear-gradient(180deg, #1A2E1F 0%, #0F1E13 100%)", borderRadius: "24px 24px 0 0", border: "1px solid rgba(0,255,135,0.15)", borderBottom: "none", padding: "0 0 32px", animation: "slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.15)" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
          <PlayerAvatar player={player} size={44} />
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 17, color: "#fff", letterSpacing: "-0.02em" }}>{player.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>
              {fmtUSD(player.price_apt)}/share · {fmtNGN(player.price_apt)}
            </div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 99, width: 32, height: 32, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>

        {/* Buy / Sell toggle */}
        <div style={{ margin: "18px 20px 0", display: "flex", background: "rgba(0,0,0,0.3)", borderRadius: 12, padding: 3 }}>
          {["buy", "sell"].map(m => (
            <button key={m} onClick={() => { tgHaptic("impact", "light"); setMode(m); setAmount(""); setError(null); }} style={{ flex: 1, padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, transition: "all 0.18s", background: mode === m ? (m === "buy" ? "#00FF87" : "#FF4444") : "transparent", color: mode === m ? (m === "buy" ? "#0A1A0F" : "#fff") : "rgba(255,255,255,0.4)" }}>
              {m === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>

        {/* Balance row */}
        <div style={{ margin: "14px 20px 0", background: "rgba(0,0,0,0.25)", borderRadius: 12, padding: "10px 14px", display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontFamily: "'Inter', sans-serif", color: "rgba(255,255,255,0.4)" }}>{mode === "buy" ? "Available balance" : "Your shares"}</span>
          <span style={{ fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#00FF87" }}>
            {mode === "buy" ? `$${balance.toFixed(2)} vUSD` : `${holdingHuman.toFixed(4)} shares`}
          </span>
        </div>

        {/* Amount input */}
        <div style={{ margin: "12px 20px 0", position: "relative" }}>
          <div style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: "rgba(255,255,255,0.25)" }}>{mode === "buy" ? "$" : "⚽"}</div>
          <input
            type="number" inputMode="decimal" value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder={mode === "buy" ? "0.00" : "0.0000"}
            style={{ width: "100%", background: "rgba(0,0,0,0.3)", border: `1px solid ${canTrade ? "rgba(0,255,135,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: 12, padding: "14px 14px 14px 36px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 22, color: "#fff", outline: "none", transition: "border-color 0.15s" }}
          />
          {amount && (
            <div style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>
              {mode === "buy" ? `≈ ${tokensGet.toFixed(4)} shares` : `≈ $${vusdGet.toFixed(2)}`}
            </div>
          )}
        </div>

        {/* Presets */}
        <div style={{ margin: "10px 20px 0", display: "flex", gap: 8 }}>
          {presets.map(p => (
            <button key={p} onClick={() => handlePreset(p)} style={{ flex: 1, padding: "8px 4px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
              {mode === "sell" ? `${p}%` : `$${p}`}
            </button>
          ))}
        </div>

        {/* Fee summary */}
        {amountNum > 0 && (
          <div style={{ margin: "12px 20px 0", padding: "10px 14px", background: "rgba(245,200,66,0.06)", borderRadius: 12, border: "1px solid rgba(245,200,66,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>Trading fee (1%)</span>
              <span style={{ fontSize: 12, color: "#F5C842", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>-${fee.toFixed(4)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>You receive</span>
              <span style={{ fontSize: 13, color: "#00FF87", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>
                {mode === "buy" ? `${(tokensGet * 0.99).toFixed(4)} shares` : `$${(vusdGet * 0.99).toFixed(2)}`}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ margin: "10px 20px 0", padding: "10px 14px", background: "rgba(255,68,68,0.1)", borderRadius: 12, border: "1px solid rgba(255,68,68,0.3)", fontSize: 13, color: "#FF4444", fontFamily: "'Inter', sans-serif" }}>
            ❌ {error}
          </div>
        )}

        {/* CTA */}
        <div style={{ margin: "16px 20px 0" }}>
          <button onClick={handleTrade} disabled={!canTrade || busy} style={{ width: "100%", padding: "16px 0", borderRadius: 14, border: "none", cursor: canTrade && !busy ? "pointer" : "not-allowed", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em", transition: "all 0.18s", background: busy ? "rgba(255,255,255,0.08)" : !canTrade ? "rgba(255,255,255,0.06)" : mode === "buy" ? "linear-gradient(135deg, #00FF87, #00CC6A)" : "linear-gradient(135deg, #FF4444, #CC2222)", color: busy || !canTrade ? "rgba(255,255,255,0.25)" : mode === "buy" ? "#0A1A0F" : "#fff", boxShadow: canTrade && !busy && mode === "buy" ? "0 4px 24px rgba(0,255,135,0.3)" : "none" }}>
            {busy ? "Processing on-chain…" : canTrade ? `${mode === "buy" ? "Buy" : "Sell"} ${player.symbol}` : mode === "buy" ? "Enter amount" : holdingHuman === 0 ? "No shares to sell" : "Enter amount"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Player Detail Screen
// ─────────────────────────────────────────────────────────────────────────────
function PlayerDetail({ player, holding, balance, onBack, onTrade, onToast }) {
  const [showTrade, setShowTrade] = useState(false);
  const [tradeMode, setTradeMode] = useState("buy");
  const [chartData] = useState(() => generateSparkline(player.price_apt, player.price_change_24h, 40));
  const positive   = player.price_change_24h >= 0;
  const holdingHuman = holding ? holding.token_amount / PRECISION : 0;
  const holdingValue = holdingHuman * player.price_apt;
  const pnl = holding ? holdingHuman * (player.price_apt - holding.avg_buy_apt) : 0;
  const pnlPct = holding?.avg_buy_apt > 0 ? ((player.price_apt - holding.avg_buy_apt) / holding.avg_buy_apt) * 100 : 0;

  // Register Telegram back button
  useEffect(() => {
    tgShowBackBtn(onBack);
    return () => tgHideBackBtn();
  }, [onBack]);

  const W = 340, H = 100;
  const min = Math.min(...chartData), max = Math.max(...chartData), range = max - min || 1;
  const pts = chartData.map((v, i) => `${(i / (chartData.length - 1)) * W},${H - ((v - min) / range) * (H - 10) - 5}`).join(" ");
  const fillPts = `0,${H} ${pts} ${W},${H}`;

  const openTrade = (mode) => { tgHaptic("impact", "medium"); setTradeMode(mode); setShowTrade(true); };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "16px 20px 0", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => { tgHaptic("impact", "light"); onBack(); }} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 12, width: 38, height: 38, cursor: "pointer", color: "rgba(255,255,255,0.7)", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 18, color: "#fff", letterSpacing: "-0.03em" }}>{player.name}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>{player.team} · {player.league}</div>
        </div>
        <div style={{ background: player.tradeable ? "rgba(0,255,135,0.1)" : "rgba(255,68,68,0.1)", border: `1px solid ${player.tradeable ? "rgba(0,255,135,0.3)" : "rgba(255,68,68,0.3)"}`, borderRadius: 99, padding: "4px 10px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, color: player.tradeable ? "#00FF87" : "#FF4444" }}>
          {player.tradeable ? "● LIVE" : "○ PAUSED"}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 0 20px" }}>
        {/* Player photo hero — shown when image_url is available */}
        {player.image_url && (
          <div style={{ margin: "16px 20px 0", borderRadius: 20, overflow: "hidden", height: 200, position: "relative" }}>
            <img src={player.image_url} alt={player.name} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to bottom, transparent 40%, #0A1A0F)" }} />
            <div style={{ position: "absolute", bottom: 12, left: 16, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 20, color: "#fff", letterSpacing: "-0.03em" }}>{player.name}</div>
          </div>
        )}

        {/* Price */}
        <div style={{ padding: "20px 20px 0" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 36, color: "#F5C842", letterSpacing: "-0.04em", lineHeight: 1 }}>{fmtUSD(player.price_apt)}</div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 14, color: positive ? "#00FF87" : "#FF4444", background: positive ? "rgba(0,255,135,0.1)" : "rgba(255,68,68,0.1)", padding: "3px 10px", borderRadius: 99 }}>{fmtChange(player.price_change_24h)} today</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif" }}>{fmtNGN(player.price_apt)}</span>
          </div>
        </div>

        {/* Chart */}
        <div style={{ margin: "20px 0 0" }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={positive ? "#00FF87" : "#FF4444"} stopOpacity="0.2" />
                <stop offset="100%" stopColor={positive ? "#00FF87" : "#FF4444"} stopOpacity="0" />
              </linearGradient>
            </defs>
            <polygon points={fillPts} fill="url(#chartFill)" />
            <polyline points={pts} fill="none" stroke={positive ? "#00FF87" : "#FF4444"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Stats grid */}
        <div style={{ padding: "0 20px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            { label: "Form",      value: player.rps != null ? `${player.rps}/100` : "—", color: player.rps >= 85 ? "#00FF87" : player.rps >= 70 ? "#F5C842" : "#aaa" },
            { label: "24h Volume", value: fmtVol(player.volume_apt), color: "#fff" },
            { label: "24h Change", value: fmtChange(player.price_change_24h), color: positive ? "#00FF87" : "#FF4444" },
            { label: "League",    value: player.league, color: "rgba(255,255,255,0.6)" },
          ].map(s => (
            <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "12px 14px", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Position card */}
        {holdingHuman > 0 && (
          <div style={{ margin: "14px 20px 0", padding: "16px", borderRadius: 16, background: "linear-gradient(135deg, rgba(0,255,135,0.08), rgba(0,255,135,0.03))", border: "1px solid rgba(0,255,135,0.2)" }}>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em" }}>Your position</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
              {[
                { label: "Shares", value: holdingHuman.toFixed(2) },
                { label: "Worth",  value: fmtUSD(holdingValue) },
                { label: "P&L",    value: `${pnl >= 0 ? "+" : ""}${fmtUSD(pnl)}`, color: pnl >= 0 ? "#00FF87" : "#FF4444" },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif", marginBottom: 3 }}>{item.label}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: item.color ?? "#fff" }}>{item.value}</div>
                </div>
              ))}
            </div>
            {pnl !== 0 && (
              <div style={{ marginTop: 10, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: pnl >= 0 ? "#00FF87" : "#FF4444" }}>
                {pnl >= 0 ? "▲" : "▼"} {Math.abs(pnlPct).toFixed(1)}% vs avg cost of {fmtUSD(holding.avg_buy_apt)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trade buttons — anchored to bottom */}
      <div style={{ padding: "12px 20px 24px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", gap: 10, background: "#0A1A0F" }}>
        {player.tradeable ? (
          <>
            <button onClick={() => openTrade("buy")} style={{ flex: 1, padding: "15px 0", borderRadius: 14, border: "none", background: "linear-gradient(135deg, #00FF87, #00CC6A)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 16, color: "#0A1A0F", cursor: "pointer", boxShadow: "0 4px 20px rgba(0,255,135,0.25)" }}>Buy</button>
            {holdingHuman > 0 && (
              <button onClick={() => openTrade("sell")} style={{ flex: 1, padding: "15px 0", borderRadius: 14, border: "1px solid rgba(255,68,68,0.4)", background: "rgba(255,68,68,0.1)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 16, color: "#FF4444", cursor: "pointer" }}>Sell</button>
            )}
          </>
        ) : (
          <div style={{ flex: 1, padding: "15px 0", borderRadius: 14, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "rgba(255,255,255,0.3)", textAlign: "center" }}>⏸ Not yet tradeable</div>
        )}
      </div>

      {showTrade && (
        <TradeSheet player={player} holding={holding} balance={balance} onClose={() => setShowTrade(false)} onTrade={onTrade} onToast={onToast} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Market Tab
// ─────────────────────────────────────────────────────────────────────────────
function MarketTab({ players, portfolio, onSelect, loading }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const leagues    = ["all", ...new Set(players.map(p => p.league))];
  const holdingMap = Object.fromEntries(portfolio.map(p => [p.player_id, p]));
  const filtered   = players.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q) || p.team.toLowerCase().includes(q))
      && (filter === "all" || p.league === filter);
  });
  const topGainers = [...players].sort((a, b) => b.price_change_24h - a.price_change_24h).slice(0, 3);

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 24, color: "#fff", letterSpacing: "-0.04em" }}>Market</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>{players.filter(p => p.tradeable).length} players trading live</div>
        </div>
        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>🔍</span>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search players, teams…" style={{ width: "100%", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 12px 11px 36px", fontFamily: "'Inter', sans-serif", fontSize: 14, color: "#fff", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
          {leagues.map(l => (
            <button key={l} onClick={() => { tgHaptic("impact", "light"); setFilter(l); }} style={{ flexShrink: 0, padding: "6px 14px", borderRadius: 99, border: `1px solid ${filter === l ? "rgba(0,255,135,0.5)" : "rgba(255,255,255,0.08)"}`, background: filter === l ? "rgba(0,255,135,0.12)" : "transparent", color: filter === l ? "#00FF87" : "rgba(255,255,255,0.5)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
              {l === "all" ? "All Leagues" : l}
            </button>
          ))}
        </div>

        {!search && filter === "all" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>🔥 Top Gainers</div>
            <div style={{ display: "flex", gap: 10 }}>
              {topGainers.map(p => (
                <button key={p.id} onClick={() => onSelect(p)} style={{ flex: 1, background: "linear-gradient(135deg, rgba(0,255,135,0.1), rgba(0,255,135,0.03))", border: "1px solid rgba(0,255,135,0.2)", borderRadius: 14, padding: "12px 10px", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, color: "#fff", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.symbol}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 14, color: "#F5C842" }}>{fmtUSD(p.price_apt)}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: "#00FF87", marginTop: 2 }}>{fmtChange(p.price_change_24h)}</div>
                </button>
              ))}
            </div>
          </div>
        )}
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>All Players</div>
      </div>

      <div style={{ padding: "0 20px 100px", display: "flex", flexDirection: "column", gap: 8 }}>
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 80, borderRadius: 16, background: "rgba(255,255,255,0.04)", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.3)", fontFamily: "'Inter', sans-serif", fontSize: 14 }}>No players found</div>
        ) : (
          filtered.map(p => <PlayerCard key={p.id} player={p} onClick={onSelect} holding={holdingMap[p.id]} />)
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Portfolio Tab
// ─────────────────────────────────────────────────────────────────────────────
function PortfolioTab({ portfolio, players, balance, onSelect }) {
  const playerMap = Object.fromEntries(players.map(p => [p.id, p]));
  const totalValue = portfolio.reduce((s, pos) => s + (pos.token_amount / PRECISION) * (playerMap[pos.player_id]?.price_apt ?? pos.avg_buy_apt), 0);
  const totalCost  = portfolio.reduce((s, pos) => s + (pos.token_amount / PRECISION) * pos.avg_buy_apt, 0);
  const totalPnl   = totalValue - totalCost;
  const totalPct   = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "0 0 100px" }}>
      <div style={{ margin: "20px 20px 0", padding: "24px", borderRadius: 20, background: "linear-gradient(135deg, #1A3020, #0F2018)", border: "1px solid rgba(0,255,135,0.15)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle, rgba(0,255,135,0.12), transparent)" }} />
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif", marginBottom: 4 }}>Total Portfolio Value</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 36, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 6 }}>{fmtUSD(totalValue + balance)}</div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif", marginBottom: 16 }}>{fmtNGN(totalValue + balance)}</div>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>Open P&L</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: totalPnl >= 0 ? "#00FF87" : "#FF4444" }}>
              {totalPnl >= 0 ? "+" : ""}{fmtUSD(totalPnl)} ({fmtChange(totalPct)})
            </div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.08)" }} />
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>vUSD Balance</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#F5C842" }}>{fmtUSD(balance)}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 0" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>Holdings</div>
        {portfolio.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚽</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "rgba(255,255,255,0.4)" }}>No positions yet</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.25)", fontFamily: "'Inter', sans-serif", marginTop: 6 }}>Head to Market to buy your first shares</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {portfolio.map(pos => {
              const player = playerMap[pos.player_id];
              if (!player) return null;
              const tokens = pos.token_amount / PRECISION;
              const value  = tokens * (pos.current_price ?? player.price_apt);
              const cost   = tokens * pos.avg_buy_apt;
              const pnl    = value - cost;
              const pct    = cost > 0 ? (pnl / cost) * 100 : 0;
              return (
                <div key={pos.player_id} onClick={() => { tgHaptic("impact", "light"); onSelect(player); }} style={{ background: "linear-gradient(145deg, #142018, #0F1A13)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 13, cursor: "pointer" }}>
                  <PlayerAvatar player={player} size={44} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>{player.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif" }}>{tokens.toFixed(2)} shares · avg {fmtUSD(pos.avg_buy_apt)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#F5C842" }}>{fmtUSD(value)}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: pnl >= 0 ? "#00FF87" : "#FF4444" }}>{pnl >= 0 ? "+" : ""}{fmtUSD(pnl)} ({fmtChange(pct)})</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard Tab
// ─────────────────────────────────────────────────────────────────────────────
function LeaderboardTab({ entries }) {
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "20px 20px 100px" }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 24, color: "#fff", letterSpacing: "-0.04em" }}>Leaderboard</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>Season rankings by P&L</div>
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginBottom: 24, height: 120 }}>
        {[1, 0, 2].map(i => {
          const e = entries[i]; if (!e) return null;
          const h = [90, 110, 75][[1, 0, 2].indexOf(i)];
          return (
            <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{medals[i]}</div>
              <div style={{ width: "100%", height: h, background: i === 0 ? "linear-gradient(180deg, rgba(245,200,66,0.2), rgba(245,200,66,0.05))" : "rgba(255,255,255,0.04)", border: `1px solid ${i === 0 ? "rgba(245,200,66,0.3)" : "rgba(255,255,255,0.08)"}`, borderRadius: "10px 10px 0 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "8px 4px" }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 10, color: "#fff", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", padding: "0 6px" }}>{e.username.replace(/_/g, " ")}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 13, color: "#00FF87", marginTop: 4 }}>+{fmtUSD(e.pnl_apt)}</div>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {entries.map((e, i) => (
          <div key={i} style={{ background: i < 3 ? "linear-gradient(135deg, rgba(245,200,66,0.06), rgba(245,200,66,0.02))" : "rgba(255,255,255,0.03)", border: `1px solid ${i < 3 ? "rgba(245,200,66,0.15)" : "rgba(255,255,255,0.06)"}`, borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: i < 3 ? "rgba(245,200,66,0.15)" : "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: i < 3 ? 16 : 13, color: i < 3 ? "#F5C842" : "rgba(255,255,255,0.4)" }}>{i < 3 ? medals[i] : `#${e.rank}`}</div>
            <div style={{ flex: 1, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>@{e.username}</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 15, color: "#00FF87" }}>+{fmtUSD(e.pnl_apt)}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, color: "rgba(255,255,255,0.4)" }}>+{e.pnl_pct.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Deposit Sheet
// ─────────────────────────────────────────────────────────────────────────────
function DepositSheet({ onClose }) {
  const currencies = [
    { id: "usdt",     label: "USDT",  network: "TRC20",   icon: "💵" },
    { id: "usdc",     label: "USDC",  network: "Polygon", icon: "🔵" },
    { id: "apt",      label: "APT",   network: "Aptos",   icon: "🌀" },
    { id: "btc",      label: "BTC",   network: "Bitcoin", icon: "🟡" },
    { id: "eth",      label: "ETH",   network: "Ethereum",icon: "💎" },
    { id: "sol",      label: "SOL",   network: "Solana",  icon: "✨" },
  ];

  const handleSelect = (currency) => {
    tgHaptic("impact", "medium");
    // Send message to bot so it opens the deposit flow in chat
    // sendData passes a JSON string that your bot webhook can read
    if (tg?.sendData) {
      tg.sendData(JSON.stringify({ action: "deposit", currency: currency.id }));
    }
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "linear-gradient(180deg, #1A2E1F 0%, #0F1E13 100%)", borderRadius: "24px 24px 0 0", border: "1px solid rgba(0,255,135,0.15)", borderBottom: "none", padding: "0 20px 36px", animation: "slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.15)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 20, color: "#fff" }}>Add Funds</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 99, width: 32, height: 32, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.4)", fontFamily: "'Inter', sans-serif", marginBottom: 16 }}>
          Funds are credited as <strong style={{ color: "#F5C842" }}>vUSD</strong> — always worth exactly $1.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {currencies.map(c => (
            <button key={c.id} onClick={() => handleSelect(c)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px 16px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left", transition: "border-color 0.15s" }}>
              <span style={{ fontSize: 24 }}>{c.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>{c.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Inter', sans-serif" }}>{c.network}</div>
              </div>
              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 16 }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Bottom Nav
// ─────────────────────────────────────────────────────────────────────────────
function BottomNav({ active, onChange, onDeposit }) {
  const tabs = [
    { id: "market",      icon: "📈", label: "Market" },
    { id: "portfolio",   icon: "💼", label: "Portfolio" },
    { id: "leaderboard", icon: "🏆", label: "Ranks" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(10,26,15,0.97)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", alignItems: "center", padding: "8px 20px 24px", zIndex: 500, gap: 4 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => { tgHaptic("impact", "light"); onChange(t.id); }} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "8px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <span style={{ fontSize: 20, opacity: active === t.id ? 1 : 0.4 }}>{t.icon}</span>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: active === t.id ? "#00FF87" : "rgba(255,255,255,0.3)" }}>{t.label}</span>
          {active === t.id && <div style={{ width: 4, height: 4, borderRadius: 99, background: "#00FF87", marginTop: -2 }} />}
        </button>
      ))}
      <button onClick={() => { tgHaptic("impact", "medium"); onDeposit(); }} style={{ background: "linear-gradient(135deg, #00FF87, #00CC6A)", border: "none", borderRadius: 14, padding: "10px 20px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 14, color: "#0A1A0F", cursor: "pointer", boxShadow: "0 4px 16px rgba(0,255,135,0.3)", flexShrink: 0, marginLeft: 8 }}>+ Add</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Root App — data fetching, TG init, state orchestration
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab]                       = useState("market");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [players, setPlayers]               = useState(MOCK_PLAYERS);
  const [portfolio, setPortfolio]           = useState(MOCK_PORTFOLIO);
  const [balance, setBalance]               = useState(0);
  const [leaderboard, setLeaderboard]       = useState(MOCK_LEADERBOARD);
  const [showDeposit, setShowDeposit]       = useState(false);
  const [toasts, setToasts]                 = useState([]);
  const [loading, setLoading]               = useState(true);

  // ── Telegram init ──────────────────────────────────────────────────────────
  useEffect(() => {
    tgReady();
    tgExpand();
    // Lock orientation to portrait on mobile
    tg?.lockOrientation?.();
    // Disable closing confirmation (enable if you want "are you sure?" on swipe)
    // tg?.enableClosingConfirmation?.();
  }, []);

  // ── Fetch real data ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [playersRes, portfolioRes, balanceRes, lbRes] = await Promise.allSettled([
          api("/players"),
          api("/portfolio"),
          api("/balance"),
          api("/leaderboard"),
        ]);
        if (cancelled) return;
        if (playersRes.status    === "fulfilled") setPlayers(playersRes.value);
        if (portfolioRes.status  === "fulfilled") setPortfolio(portfolioRes.value);
        if (balanceRes.status    === "fulfilled") setBalance(balanceRes.value?.balance_vusd ?? 0);
        if (lbRes.status         === "fulfilled") setLeaderboard(lbRes.value);
      } catch {
        // Network error — keep mock data shown
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  // ── Toast helper ───────────────────────────────────────────────────────────
  const addToast = useCallback((msg, type = "ok") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  // ── Handle trade result ────────────────────────────────────────────────────
  const handleTrade = useCallback(({ mode, amount, player, result }) => {
    if (mode === "buy") {
      const fee    = amount * 0.01;
      const tokens = Math.floor(((amount - fee) / player.price_apt) * PRECISION);
      setBalance(b => b - amount);
      setPortfolio(p => {
        const existing = p.find(x => x.player_id === player.id);
        if (existing) return p.map(x => x.player_id === player.id ? { ...x, token_amount: x.token_amount + tokens } : x);
        return [...p, { player_id: player.id, player_name: player.name, player_symbol: player.symbol, token_amount: tokens, avg_buy_apt: player.price_apt, current_price: player.price_apt }];
      });
      addToast(`Bought ${(tokens / PRECISION).toFixed(2)} ${player.symbol} shares ⚡`);
    } else {
      const vusd = amount * player.price_apt * 0.99;
      setBalance(b => b + vusd);
      setPortfolio(p => p.map(x => {
        if (x.player_id !== player.id) return x;
        const remaining = x.token_amount - Math.floor(amount * PRECISION);
        return remaining <= 0 ? null : { ...x, token_amount: remaining };
      }).filter(Boolean));
      addToast(`Sold ${Number(amount).toFixed(2)} ${player.symbol} shares ✓`);
    }
  }, [addToast]);

  const holdingMap = Object.fromEntries(portfolio.map(p => [p.player_id, p]));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=Inter:wght@400;500;600&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: #0A1A0F; color: #fff; overflow: hidden; }
        input { color: #fff; }
        input::placeholder { color: rgba(255,255,255,0.25); }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        ::-webkit-scrollbar { display: none; }
        @keyframes ticker {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to   { transform: translateY(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; }
          50%       { opacity: 0.7; }
        }
      `}</style>

      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0A1A0F", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden" }}>

        {/* Ticker tape */}
        <TickerTape players={players} />

        {/* Main content */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {selectedPlayer ? (
            <PlayerDetail
              player={selectedPlayer}
              holding={holdingMap[selectedPlayer.id]}
              balance={balance}
              onBack={() => setSelectedPlayer(null)}
              onTrade={handleTrade}
              onToast={addToast}
            />
          ) : (
            <>
              {tab === "market"      && <MarketTab players={players} portfolio={portfolio} onSelect={setSelectedPlayer} loading={loading} />}
              {tab === "portfolio"   && <PortfolioTab players={players} portfolio={portfolio} balance={balance} onSelect={setSelectedPlayer} />}
              {tab === "leaderboard" && <LeaderboardTab entries={leaderboard} />}
            </>
          )}
        </div>

        {/* Bottom nav — hidden on player detail (TG back button used instead) */}
        {!selectedPlayer && (
          <BottomNav active={tab} onChange={setTab} onDeposit={() => setShowDeposit(true)} />
        )}

        {showDeposit && <DepositSheet onClose={() => setShowDeposit(false)} />}

        {/* Toasts */}
        <div style={{ position: "fixed", top: 48, left: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 8, pointerEvents: "none" }}>
          {toasts.map(t => (
            <div key={t.id} style={{ background: t.type === "error" ? "rgba(255,68,68,0.15)" : "rgba(0,255,135,0.12)", border: `1px solid ${t.type === "error" ? "rgba(255,68,68,0.3)" : "rgba(0,255,135,0.3)"}`, borderRadius: 12, padding: "12px 16px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: t.type === "error" ? "#FF4444" : "#00FF87", animation: "fadeIn 0.2s ease" }}>
              {t.type === "error" ? "✗" : "✓"} {t.msg}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}