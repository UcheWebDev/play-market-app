import { useState, useEffect, useCallback } from "react";

const tg = window?.Telegram?.WebApp ?? null;
const tgReady = () => tg?.ready();
const tgExpand = () => tg?.expand();
const tgHaptic = (type, style) => tg?.HapticFeedback?.impactOccurred?.(style ?? "light");
const tgHapticNotif = (type) => tg?.HapticFeedback?.notificationOccurred?.(type ?? "success");
const tgHideMainBtn = () => tg?.MainButton?.hide();
const tgShowBackBtn = (cb) => { if (!tg?.BackButton) return; tg.BackButton.onClick(cb); tg.BackButton.show(); };
const tgHideBackBtn = () => tg?.BackButton?.hide();
const tgInitData = () => tg?.initData ?? "";

const API_BASE = import.meta.env.VITE_API_BASE;
const ANON_KEY = import.meta.env.VITE_ANON_KEY;

async function api(path, opts = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${ANON_KEY}`,
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

const PRECISION = 100_000_000;
const NGN_RATE = 1580;

const fmtUSD = (n) => `$${Number(n).toFixed(2)}`;
const fmtNGN = (n) => `₦${Math.round(n * NGN_RATE).toLocaleString()}`;
const fmtShares = (n) => (n / PRECISION).toFixed(2);
const fmtChange = (n) => `${n >= 0 ? "+" : ""}${Number(n).toFixed(1)}%`;
const fmtVol = (n) =>
  n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;

function generateSparkline(basePrice, change, points = 20) {
  const data = [];
  let price = basePrice * (1 - change / 100);
  for (let i = 0; i < points; i++) {
    const noise = (Math.random() - 0.48) * basePrice * 0.02;
    price += noise + ((change / 100) * basePrice) / points;
    data.push(Math.max(0, price));
  }
  data[data.length - 1] = basePrice;
  return data;
}

/* ─── Skeleton primitives ─── */
function Skel({ w, h, r = 8, style = {} }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      background: "rgba(255,255,255,0.07)",
      animation: "pulse 1.4s ease-in-out infinite",
      flexShrink: 0, ...style,
    }} />
  );
}

function PlayerCardSkeleton() {
  return (
    <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <Skel w={44} h={44} r={12} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <Skel w="55%" h={14} />
        <Skel w="38%" h={11} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <Skel w={64} h={26} />
        <Skel w={48} h={14} />
        <Skel w={44} h={18} r={99} />
      </div>
    </div>
  );
}

function PortfolioHeaderSkeleton() {
  return (
    <div style={{ margin: "18px 18px 0", padding: "22px", borderRadius: 16, background: "#111", border: "1px solid rgba(255,255,255,0.08)" }}>
      <Skel w={130} h={11} style={{ marginBottom: 10 }} />
      <Skel w={180} h={34} r={6} style={{ marginBottom: 8 }} />
      <Skel w={100} h={12} style={{ marginBottom: 22 }} />
      <div style={{ display: "flex", gap: 16 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Skel w={60} h={11} />
          <Skel w={110} h={15} />
        </div>
        <div style={{ width: 1, background: "rgba(255,255,255,0.07)" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <Skel w={70} h={11} />
          <Skel w={80} h={15} />
        </div>
      </div>
    </div>
  );
}

function PortfolioCardSkeleton() {
  return (
    <div style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12 }}>
      <Skel w={42} h={42} r={12} />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 7 }}>
        <Skel w="50%" h={14} />
        <Skel w="70%" h={12} />
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
        <Skel w={60} h={14} />
        <Skel w={80} h={12} />
      </div>
    </div>
  );
}

function PlayerDetailSkeleton() {
  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto" }}>
        {/* Hero skeleton */}
        <div style={{ height: 260, background: "rgba(255,255,255,0.04)", animation: "pulse 1.4s ease-in-out infinite", position: "relative" }}>
          <div style={{ position: "absolute", top: 14, left: 18, display: "flex", gap: 10 }}>
            <Skel w={36} h={36} r={10} />
          </div>
          <div style={{ position: "absolute", bottom: 16, left: 18 }}>
            <Skel w={180} h={24} r={6} style={{ marginBottom: 8 }} />
            <Skel w={110} h={12} r={4} />
          </div>
        </div>
        <div style={{ padding: "0 18px 20px" }}>
          <div style={{ marginBottom: 16 }}>
            <Skel w={140} h={34} r={6} style={{ marginBottom: 8 }} />
            <Skel w={120} h={22} r={99} />
          </div>
          <div style={{ margin: "0 -18px 16px", height: 100, background: "rgba(255,255,255,0.04)", animation: "pulse 1.4s ease-in-out infinite" }} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 13 }}>
            {[1,2,3,4].map(i => (
              <div key={i} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "11px 12px" }}>
                <Skel w="50%" h={11} style={{ marginBottom: 8 }} />
                <Skel w="70%" h={14} />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ padding: "11px 18px 22px", borderTop: "1px solid rgba(255,255,255,0.06)", background: "#0A0A0A", display: "flex", gap: 9 }}>
        <Skel w="100%" h={50} r={12} />
      </div>
    </div>
  );
}

function LeaderboardSkeleton() {
  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 9, marginBottom: 20, height: 110 }}>
        {[86, 110, 70].map((h, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <Skel w={20} h={20} r={99} style={{ marginBottom: 6 }} />
            <Skel w="100%" h={h} r="9px 9px 0 0" />
          </div>
        ))}
      </div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "13px 14px", display: "flex", alignItems: "center", gap: 11, marginBottom: 7 }}>
          <Skel w={30} h={30} r={8} />
          <Skel w="45%" h={13} style={{ flex: 1 }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
            <Skel w={70} h={14} />
            <Skel w={40} h={11} />
          </div>
        </div>
      ))}
    </>
  );
}

function SparklineSVG({ data, positive, width = 80, height = 32 }) {
  if (!data?.length) return null;
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * height}`).join(" ");
  const color = positive ? "#00FF87" : "#FF4444";
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayerAvatar({ player, size = 48 }) {
  const [imgError, setImgError] = useState(false);
  const hue = (player.id * 47) % 360;
  const base = { width: size, height: size, borderRadius: size * 0.28, flexShrink: 0, border: "1px solid rgba(255,255,255,0.08)", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" };
  if (player.image_url && !imgError) {
    return (
      <div style={{ ...base, background: `hsl(${hue},60%,12%)` }}>
        <img src={player.image_url} alt={player.name} onError={() => setImgError(true)} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
      </div>
    );
  }
  return (
    <div style={{ ...base, background: `hsl(${hue},40%,16%)`, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: size * 0.28, color: `hsl(${hue},80%,75%)`, letterSpacing: "-0.02em" }}>
      {player.symbol.slice(0, 3)}
    </div>
  );
}

function FormBadge({ rps }) {
  const grade = rps >= 90 ? "S" : rps >= 80 ? "A" : rps >= 70 ? "B" : "C";
  const colors = { S: "#F5C842", A: "#00FF87", B: "#4ECDC4", C: "#888" };
  const c = colors[grade];
  return (
    <div style={{ width: 20, height: 20, borderRadius: 5, background: `${c}18`, border: `1px solid ${c}44`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 10, color: c }}>
      {grade}
    </div>
  );
}

function PlayerCard({ player, onClick, holding }) {
  const [sparkData] = useState(() => generateSparkline(player.price_apt, player.price_change_24h));
  const positive = player.price_change_24h >= 0;
  const hasHolding = holding?.token_amount > 0;
  return (
    <div
      onClick={() => { tgHaptic("impact", "light"); onClick(player); }}
      style={{ background: "#111", border: `1px solid ${hasHolding ? "rgba(0,255,135,0.2)" : player.category_blocked ? "rgba(245,200,66,0.15)" : "rgba(255,255,255,0.07)"}`, borderRadius: 14, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "transform 0.1s ease", position: "relative", overflow: "hidden", WebkitTapHighlightColor: "transparent", opacity: player.category_blocked ? 0.7 : 1 }}
      onTouchStart={(e) => (e.currentTarget.style.transform = "scale(0.985)")}
      onTouchEnd={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {hasHolding && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: "linear-gradient(90deg, #00FF87, transparent)" }} />}
      {player.category_blocked && !hasHolding && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1.5, background: "linear-gradient(90deg, #F5C842, transparent)" }} />}
      <PlayerAvatar player={player} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", letterSpacing: "-0.01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player.name}</span>
          {player.rps != null && <FormBadge rps={player.rps} />}
        </div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.35)", display: "flex", gap: 5 }}>
          <span>{player.symbol}</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <span>{player.team}</span>
          <span style={{ color: "rgba(255,255,255,0.15)" }}>·</span>
          <span style={{ color: "rgba(255,255,255,0.2)" }}>{player.league}</span>
        </div>
        {hasHolding && <div style={{ marginTop: 4, fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", color: "#00FF87", fontWeight: 600 }}>{fmtShares(holding.token_amount)} shares held</div>}
        {player.category_blocked && !hasHolding && (
          <div style={{ marginTop: 4, fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", color: "#F5C842", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
            <i className="ri-lock-line" style={{ fontSize: 11 }} /> Hold {player.category_blocked_player_symbol} — sell first
          </div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
        <SparklineSVG data={sparkData} positive={positive} width={64} height={26} />
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff", letterSpacing: "-0.02em" }}>{fmtUSD(player.price_apt)}</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: positive ? "#00FF87" : "#FF4444", background: positive ? "rgba(0,255,135,0.08)" : "rgba(255,68,68,0.08)", padding: "2px 7px", borderRadius: 99 }}>
          {fmtChange(player.price_change_24h)}
        </div>
      </div>
    </div>
  );
}

function TradeSheet({ player, holding, balance, onClose, onTrade, onToast }) {
  const [mode, setMode] = useState("buy");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const price = player.price_apt;
  const amountNum = parseFloat(amount) || 0;
  const tokensGet = mode === "buy" ? amountNum / price : 0;
  const vusdGet = mode === "sell" ? amountNum * price : 0;
  const fee = amountNum * 0.01;
  const holdingHuman = holding ? holding.token_amount / PRECISION : 0;
  const presets = mode === "buy" ? [10, 25, 50, 100] : [25, 50, 75, 100];
  const buyBlocked = mode === "buy" && player.category_blocked;
  const canTrade = buyBlocked ? false : mode === "buy" ? amountNum > 0 && amountNum <= balance : amountNum > 0 && amountNum <= holdingHuman;
  const handlePreset = (val) => { tgHaptic("impact", "light"); setAmount(mode === "buy" ? String(val) : ((holdingHuman * val) / 100).toFixed(4)); };
  const handleTrade = async () => {
    if (!canTrade) return;
    setError(null); setBusy(true); tgHaptic("impact", "medium");
    try {
      const result = await api("/trade", { method: "POST", body: JSON.stringify({ player_id: player.id, type: mode, amount: Math.floor(amountNum * PRECISION) }) }).catch(() => null);
      tgHapticNotif("success");
      onTrade({ mode, amount: amountNum, player, result });
      onClose();
    } catch (e) { tgHapticNotif("error"); setError(e.message ?? "Trade failed. Please try again."); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "#111", borderRadius: "20px 20px 0 0", border: "1px solid rgba(255,255,255,0.09)", borderBottom: "none", padding: "0 0 32px", animation: "slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0 0" }}>
          <div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.12)" }} />
        </div>
        <div style={{ padding: "14px 18px 0", display: "flex", alignItems: "center", gap: 11 }}>
          <PlayerAvatar player={player} size={42} />
          <div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 16, color: "#fff", letterSpacing: "-0.02em" }}>{player.name}</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>{fmtUSD(player.price_apt)} · {fmtNGN(player.price_apt)}</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 99, width: 30, height: 30, color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ri-close-line" style={{ fontSize: 16 }} />
          </button>
        </div>
        <div style={{ margin: "16px 18px 0", display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: 3 }}>
          {["buy", "sell"].map((m) => (
            <button key={m} onClick={() => { tgHaptic("impact", "light"); setMode(m); setAmount(""); setError(null); }}
              style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, transition: "all 0.15s", background: mode === m ? (m === "buy" ? "#00FF87" : "#FF4444") : "transparent", color: mode === m ? (m === "buy" ? "#000" : "#fff") : "rgba(255,255,255,0.35)" }}>
              {m === "buy" ? "Buy" : "Sell"}
            </button>
          ))}
        </div>
        {buyBlocked && (
          <div style={{ margin: "12px 18px 0", padding: "11px 13px", background: "rgba(245,200,66,0.07)", borderRadius: 10, border: "1px solid rgba(245,200,66,0.2)", display: "flex", alignItems: "flex-start", gap: 9 }}>
            <i className="ri-lock-line" style={{ fontSize: 16, color: "#F5C842", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>
              You hold <span style={{ color: "#F5C842", fontWeight: 700 }}>{player.category_blocked_player_name} ({player.category_blocked_player_symbol})</span> in this group. Sell those shares first before buying here.
            </div>
          </div>
        )}
        <div style={{ margin: "12px 18px 0", background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "9px 13px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", color: "rgba(255,255,255,0.35)" }}>{mode === "buy" ? "Available" : "Your shares"}</span>
          <span style={{ fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#00FF87" }}>{mode === "buy" ? `$${balance.toFixed(2)} vUSD` : `${holdingHuman.toFixed(4)} shares`}</span>
        </div>
        <div style={{ margin: "10px 18px 0", position: "relative", opacity: buyBlocked ? 0.4 : 1 }}>
          <div style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.2)" }}>
            <i className={mode === "buy" ? "ri-coin-line" : "ri-football-line"} style={{ fontSize: 18 }} />
          </div>
          <input type="number" inputMode="decimal" value={amount} onChange={(e) => !buyBlocked && setAmount(e.target.value)} disabled={buyBlocked} placeholder={mode === "buy" ? "0.00" : "0.0000"}
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${canTrade ? "rgba(0,255,135,0.25)" : "rgba(255,255,255,0.08)"}`, borderRadius: 10, padding: "13px 13px 13px 38px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 20, color: "#fff", outline: "none", transition: "border-color 0.15s" }} />
          {amount && !buyBlocked && (
            <div style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>
              {mode === "buy" ? `≈ ${tokensGet.toFixed(4)} shares` : `≈ $${vusdGet.toFixed(2)}`}
            </div>
          )}
        </div>
        {!buyBlocked && (
          <div style={{ margin: "9px 18px 0", display: "flex", gap: 7 }}>
            {presets.map((p) => (
              <button key={p} onClick={() => handlePreset(p)} style={{ flex: 1, padding: "8px 4px", borderRadius: 9, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>
                {mode === "sell" ? `${p}%` : `$${p}`}
              </button>
            ))}
          </div>
        )}
        {amountNum > 0 && !buyBlocked && (
          <div style={{ margin: "10px 18px 0", padding: "10px 13px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.07)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>Fee (1%)</span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>-${fee.toFixed(4)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif" }}>You receive</span>
              <span style={{ fontSize: 13, color: "#00FF87", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700 }}>{mode === "buy" ? `${(tokensGet * 0.99).toFixed(4)} shares` : `$${(vusdGet * 0.99).toFixed(2)}`}</span>
            </div>
          </div>
        )}
        {error && (
          <div style={{ margin: "9px 18px 0", padding: "9px 13px", background: "rgba(255,68,68,0.08)", borderRadius: 10, border: "1px solid rgba(255,68,68,0.2)", fontSize: 13, color: "#FF4444", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: 7 }}>
            <i className="ri-error-warning-line" style={{ fontSize: 16, flexShrink: 0 }} /> {error}
          </div>
        )}
        <div style={{ margin: "14px 18px 0" }}>
          <button onClick={handleTrade} disabled={!canTrade || busy}
            style={{ width: "100%", padding: "15px 0", borderRadius: 12, border: "none", cursor: canTrade && !busy ? "pointer" : "not-allowed", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 15, letterSpacing: "-0.01em", transition: "all 0.15s", background: busy ? "rgba(255,255,255,0.06)" : !canTrade ? "rgba(255,255,255,0.05)" : mode === "buy" ? "#00FF87" : "#FF4444", color: busy || !canTrade ? "rgba(255,255,255,0.2)" : mode === "buy" ? "#000" : "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {busy ? (<><i className="ri-loader-4-line" style={{ fontSize: 16 }} /> Processing…</>) : buyBlocked ? (<><i className="ri-lock-line" style={{ fontSize: 16 }} /> Sell {player.category_blocked_player_symbol} first</>) : canTrade ? (<><i className={mode === "buy" ? "ri-arrow-up-circle-line" : "ri-arrow-down-circle-line"} style={{ fontSize: 16 }} /> {mode === "buy" ? "Buy" : "Sell"} {player.symbol}</>) : (<><i className="ri-hand-coin-line" style={{ fontSize: 16 }} /> {mode === "buy" ? "Enter amount" : holdingHuman === 0 ? "No shares to sell" : "Enter amount"}</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Player Detail — movie-style: image bleeds behind the entire top
      including the status-bar / back-button row ─── */
function PlayerDetail({ player, holding, balance, onBack, onTrade, onToast }) {
  const [showTrade, setShowTrade] = useState(false);
  const [tradeMode, setTradeMode] = useState("buy");
  const [chartData] = useState(() => generateSparkline(player.price_apt, player.price_change_24h, 40));
  const positive = player.price_change_24h >= 0;
  const holdingHuman = holding ? holding.token_amount / PRECISION : 0;
  const holdingValue = holdingHuman * player.price_apt;
  const pnl = holding ? holdingHuman * (player.price_apt - holding.avg_buy_apt) : 0;
  const pnlPct = holding?.avg_buy_apt > 0 ? ((player.price_apt - holding.avg_buy_apt) / holding.avg_buy_apt) * 100 : 0;

  useEffect(() => { tgShowBackBtn(onBack); return () => tgHideBackBtn(); }, [onBack]);

  const W = 340, H = 100;
  const min = Math.min(...chartData), max = Math.max(...chartData), range = max - min || 1;
  const pts = chartData.map((v, i) => `${(i / (chartData.length - 1)) * W},${H - ((v - min) / range) * (H - 10) - 5}`).join(" ");
  const openTrade = (mode) => { tgHaptic("impact", "medium"); setTradeMode(mode); setShowTrade(true); };

  /* The hero spans the FULL top including where a status bar sits.
     The back button floats on top of the image with a blurred pill. */
  const HERO_H = 320;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flex: 1, overflowY: "auto", position: "relative" }}>

        {/* ── HERO: full-bleed, no top gap ── */}
        <div style={{ position: "relative", height: HERO_H, flexShrink: 0 }}>

          {/* Background image — fills the entire block incl. status-bar area */}
          {player.image_url ? (
            <img src={player.image_url} alt={player.name}
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center" }} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: `hsl(${(player.id * 47) % 360},30%,14%)` }}>
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 900, fontSize: 130, color: `hsla(${(player.id * 47) % 360},60%,60%,0.1)`, letterSpacing: "-0.04em", userSelect: "none" }}>
                {player.symbol.slice(0, 3)}
              </div>
            </div>
          )}

          {/* Strong top scrim so the back btn stays readable over any image */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 110, background: "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, transparent 100%)", pointerEvents: "none" }} />

          {/* Bottom scrim fades into page bg */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 140, background: "linear-gradient(to bottom, transparent 0%, #0A0A0A 100%)", pointerEvents: "none" }} />

          {/* Back button + live badge — float directly on image, no separate header bg */}
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, padding: "52px 18px 0", display: "flex", alignItems: "center", zIndex: 10 }}>
            <button onClick={() => { tgHaptic("impact", "light"); onBack(); }}
              style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, width: 36, height: 36, cursor: "pointer", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <i className="ri-arrow-left-line" style={{ fontSize: 18 }} />
            </button>
            <div style={{ flex: 1 }} />
            <div style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(10px)", border: `1px solid ${player.tradeable ? "rgba(0,255,135,0.4)" : "rgba(255,68,68,0.4)"}`, borderRadius: 99, padding: "4px 10px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, color: player.tradeable ? "#00FF87" : "#FF4444", display: "flex", alignItems: "center", gap: 5 }}>
              <i className={player.tradeable ? "ri-radio-button-line" : "ri-pause-circle-line"} style={{ fontSize: 11 }} />
              {player.tradeable ? "LIVE" : "PAUSED"}
            </div>
          </div>

          {/* Name + team pinned at bottom of hero */}
          <div style={{ position: "absolute", bottom: 18, left: 18, right: 18, zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 26, color: "#fff", letterSpacing: "-0.03em", lineHeight: 1.1, textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}>{player.name}</div>
              {player.rps != null && <FormBadge rps={player.rps} />}
            </div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", fontFamily: "'Space Grotesk', sans-serif", textShadow: "0 1px 6px rgba(0,0,0,0.9)" }}>{player.team} · {player.league}</div>
          </div>
        </div>

        {/* ── Content below hero ── */}
        <div style={{ padding: "0 18px 20px" }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 34, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1 }}>{fmtUSD(player.price_apt)}</div>
            <div style={{ marginTop: 5, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: positive ? "#00FF87" : "#FF4444", background: positive ? "rgba(0,255,135,0.08)" : "rgba(255,68,68,0.08)", padding: "3px 10px", borderRadius: 99, display: "flex", alignItems: "center", gap: 4 }}>
                <i className={positive ? "ri-arrow-up-line" : "ri-arrow-down-line"} style={{ fontSize: 12 }} /> {fmtChange(player.price_change_24h)} today
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "'Space Grotesk', sans-serif" }}>{fmtNGN(player.price_apt)}</span>
            </div>
          </div>
          <div style={{ margin: "0 -18px 16px" }}>
            <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ display: "block" }}>
              <polyline points={pts} fill="none" stroke={positive ? "#00FF87" : "#FF4444"} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, marginBottom: 13 }}>
            {[
              { label: "Form", value: player.rps != null ? `${player.rps}/100` : "—", color: player.rps >= 85 ? "#00FF87" : player.rps >= 70 ? "#F5C842" : "#888", icon: "ri-bar-chart-line" },
              { label: "24h Volume", value: fmtVol(player.volume_apt), color: "#fff", icon: "ri-exchange-dollar-line" },
              { label: "24h Change", value: fmtChange(player.price_change_24h), color: positive ? "#00FF87" : "#FF4444", icon: "ri-line-chart-line" },
              { label: "League", value: player.league, color: "rgba(255,255,255,0.6)", icon: "ri-trophy-line" },
            ].map((s) => (
              <div key={s.label} style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "11px 12px", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 5, display: "flex", alignItems: "center", gap: 5 }}>
                  <i className={s.icon} style={{ fontSize: 12 }} /> {s.label}
                </div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          {holdingHuman > 0 && (
            <div style={{ padding: "15px", borderRadius: 14, background: "rgba(0,255,135,0.05)", border: "1px solid rgba(0,255,135,0.15)" }}>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.1em", display: "flex", alignItems: "center", gap: 5 }}>
                <i className="ri-pie-chart-2-line" style={{ fontSize: 12 }} /> Your position
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[{ label: "Shares", value: holdingHuman.toFixed(2) }, { label: "Worth", value: fmtUSD(holdingValue) }, { label: "P&L", value: `${pnl >= 0 ? "+" : ""}${fmtUSD(pnl)}`, color: pnl >= 0 ? "#00FF87" : "#FF4444" }].map((item) => (
                  <div key={item.label}>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 3 }}>{item.label}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: item.color ?? "#fff" }}>{item.value}</div>
                  </div>
                ))}
              </div>
              {pnl !== 0 && (
                <div style={{ marginTop: 9, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: pnl >= 0 ? "#00FF87" : "#FF4444", display: "flex", alignItems: "center", gap: 4 }}>
                  <i className={pnl >= 0 ? "ri-arrow-up-line" : "ri-arrow-down-line"} style={{ fontSize: 12 }} /> {Math.abs(pnlPct).toFixed(1)}% vs avg {fmtUSD(holding.avg_buy_apt)}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trade buttons */}
      <div style={{ padding: "11px 18px 22px", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", flexDirection: "column", gap: 9, background: "#0A0A0A" }}>
        {player.category_blocked && (
          <div style={{ padding: "11px 14px", borderRadius: 11, background: "rgba(245,200,66,0.07)", border: "1px solid rgba(245,200,66,0.2)", display: "flex", alignItems: "flex-start", gap: 9 }}>
            <i className="ri-error-warning-line" style={{ fontSize: 16, color: "#F5C842", flexShrink: 0, marginTop: 1 }} />
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "rgba(255,255,255,0.6)", lineHeight: 1.5 }}>You already hold <span style={{ color: "#F5C842", fontWeight: 700 }}>{player.category_blocked_player_name} ({player.category_blocked_player_symbol})</span> shares in this group. Sell them first.</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 9 }}>
          {player.tradeable && !player.category_blocked ? (
            <>
              <button onClick={() => openTrade("buy")} style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "none", background: "#00FF87", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 15, color: "#000", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                <i className="ri-arrow-up-circle-fill" style={{ fontSize: 16 }} /> Buy
              </button>
              {holdingHuman > 0 && (
                <button onClick={() => openTrade("sell")} style={{ flex: 1, padding: "14px 0", borderRadius: 12, border: "1px solid rgba(255,68,68,0.3)", background: "rgba(255,68,68,0.08)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 15, color: "#FF4444", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
                  <i className="ri-arrow-down-circle-line" style={{ fontSize: 16 }} /> Sell
                </button>
              )}
            </>
          ) : player.category_blocked ? (
            <div style={{ flex: 1, padding: "14px 0", borderRadius: 12, background: "rgba(245,200,66,0.06)", border: "1px solid rgba(245,200,66,0.2)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "#F5C842", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <i className="ri-lock-line" style={{ fontSize: 15 }} /> Buy locked — sell {player.category_blocked_player_symbol} first
            </div>
          ) : (
            <div style={{ flex: 1, padding: "14px 0", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.25)", textAlign: "center", display: "flex", alignItems: "center", justifyContent: "center", gap: 7 }}>
              <i className="ri-pause-circle-line" style={{ fontSize: 15 }} /> Not yet tradeable
            </div>
          )}
        </div>
      </div>

      {showTrade && <TradeSheet player={player} holding={holding} balance={balance} onClose={() => setShowTrade(false)} onTrade={onTrade} onToast={onToast} />}
    </div>
  );
}

function MarketTab({ players, portfolio, onSelect, loading }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const leagues = ["all", ...new Set(players.map((p) => p.league))];
  const holdingMap = Object.fromEntries(portfolio.map((p) => [p.player_id, p]));
  const filtered = players.filter((p) => {
    const q = search.toLowerCase();
    return (!q || p.name.toLowerCase().includes(q) || p.symbol.toLowerCase().includes(q) || p.team.toLowerCase().includes(q)) && (filter === "all" || p.league === filter);
  });
  const topGainers = [...players].sort((a, b) => b.price_change_24h - a.price_change_24h).slice(0, 3);

  return (
    <div style={{ height: "100%", overflowY: "auto" }}>
      <div style={{ padding: "18px 18px 0" }}>
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: "-0.04em" }}>Market</div>
          {loading ? (
            <Skel w={160} h={12} style={{ marginTop: 6 }} />
          ) : (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif", display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
              <i className="ri-radio-button-line" style={{ fontSize: 11, color: "#00FF87" }} /> {players.filter((p) => p.tradeable).length} players trading live
            </div>
          )}
        </div>
        <div style={{ position: "relative", marginBottom: 11 }}>
          <i className="ri-search-line" style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", fontSize: 15, color: "rgba(255,255,255,0.25)" }} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search players, teams…"
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "10px 12px 10px 36px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "#fff", outline: "none" }} />
        </div>
        {loading ? (
          <div style={{ display: "flex", gap: 7, marginBottom: 16 }}>{[60, 80, 70].map((w, i) => <Skel key={i} w={w} h={28} r={99} />)}</div>
        ) : (
          <div style={{ display: "flex", gap: 7, overflowX: "auto", paddingBottom: 4, marginBottom: 16 }}>
            {leagues.map((l) => (
              <button key={l} onClick={() => { tgHaptic("impact", "light"); setFilter(l); }}
                style={{ flexShrink: 0, padding: "5px 13px", borderRadius: 99, border: `1px solid ${filter === l ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.07)"}`, background: filter === l ? "rgba(255,255,255,0.1)" : "transparent", color: filter === l ? "#fff" : "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 12, cursor: "pointer", whiteSpace: "nowrap" }}>
                {l === "all" ? "All Leagues" : l}
              </button>
            ))}
          </div>
        )}
        {/* Top gainers */}
        {!search && filter === "all" && (
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 9, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="ri-fire-line" style={{ fontSize: 13, color: "#FF6B35" }} /> Top Gainers
            </div>
            {loading ? (
              <div style={{ display: "flex", gap: 9 }}>{[1,2,3].map((i) => (
                <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 10px", display: "flex", flexDirection: "column", gap: 7 }}>
                  <Skel w="60%" h={11} /><Skel w="80%" h={14} /><Skel w="50%" h={11} />
                </div>
              ))}</div>
            ) : (
              <div style={{ display: "flex", gap: 9 }}>
                {topGainers.map((p) => (
                  <button key={p.id} onClick={() => onSelect(p)} style={{ flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, padding: "11px 10px", cursor: "pointer", textAlign: "left" }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, color: "rgba(255,255,255,0.5)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.symbol}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 14, color: "#fff" }}>{fmtUSD(p.price_apt)}</div>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 11, color: "#00FF87", marginTop: 2 }}>{fmtChange(p.price_change_24h)}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 9 }}>All Players</div>
      </div>
      <div style={{ padding: "0 18px 100px", display: "flex", flexDirection: "column", gap: 7 }}>
        {loading ? Array.from({ length: 5 }).map((_, i) => <PlayerCardSkeleton key={i} />) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.25)", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>No players found</div>
        ) : filtered.map((p) => <PlayerCard key={p.id} player={p} onClick={onSelect} holding={holdingMap[p.id]} />)}
      </div>
    </div>
  );
}

function PortfolioTab({ portfolio, players, balance, onSelect, loading }) {
  const playerMap = Object.fromEntries(players.map((p) => [p.id, p]));
  const totalValue = portfolio.reduce((s, pos) => s + (pos.token_amount / PRECISION) * (playerMap[pos.player_id]?.price_apt ?? pos.avg_buy_apt), 0);
  const totalCost = portfolio.reduce((s, pos) => s + (pos.token_amount / PRECISION) * pos.avg_buy_apt, 0);
  const totalPnl = totalValue - totalCost;
  const totalPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  if (loading) {
    return (
      <div style={{ height: "100%", overflowY: "auto", padding: "0 0 100px" }}>
        <PortfolioHeaderSkeleton />
        <div style={{ padding: "18px 18px 0" }}>
          <Skel w={80} h={12} style={{ marginBottom: 12 }} />
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>{[1,2].map((i) => <PortfolioCardSkeleton key={i} />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "0 0 100px" }}>
      <div style={{ margin: "18px 18px 0", padding: "22px", borderRadius: 16, background: "#111", border: "1px solid rgba(255,255,255,0.08)", position: "relative", overflow: "hidden" }}>
        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.08em" }}>Total Portfolio Value</div>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 34, color: "#fff", letterSpacing: "-0.04em", lineHeight: 1, marginBottom: 4 }}>{fmtUSD(totalValue + balance)}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 18 }}>{fmtNGN(totalValue + balance)}</div>
        <div style={{ display: "flex", gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>Open P&L</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: totalPnl >= 0 ? "#00FF87" : "#FF4444" }}>{totalPnl >= 0 ? "+" : ""}{fmtUSD(totalPnl)} ({fmtChange(totalPct)})</div>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.07)" }} />
          <div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>vUSD Balance</div>
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "#fff" }}>{fmtUSD(balance)}</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "18px 18px 0" }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.35)", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>Holdings</div>
        {portfolio.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
            <i className="ri-football-line" style={{ fontSize: 36, color: "rgba(255,255,255,0.15)" }} />
            <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 15, color: "rgba(255,255,255,0.3)" }}>No positions yet</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.18)", fontFamily: "'Space Grotesk', sans-serif" }}>Head to Market to buy your first shares</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {portfolio.map((pos) => {
              const player = playerMap[pos.player_id];
              if (!player) return null;
              const tokens = pos.token_amount / PRECISION;
              const value = tokens * (pos.current_price ?? player.price_apt);
              const cost = tokens * pos.avg_buy_apt;
              const pnl = value - cost;
              const pct = cost > 0 ? (pnl / cost) * 100 : 0;
              return (
                <div key={pos.player_id} onClick={() => { tgHaptic("impact", "light"); onSelect(player); }}
                  style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 14, padding: "13px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
                  <PlayerAvatar player={player} size={42} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>{player.name}</div>
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>{tokens.toFixed(2)} shares · avg {fmtUSD(pos.avg_buy_apt)}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>{fmtUSD(value)}</div>
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

function LeaderboardTab({ entries, loading }) {
  const podiumIcons = ["ri-medal-2-line", "ri-medal-line", "ri-award-line"];
  const podiumColors = ["#F5C842", "#C0C0C0", "#CD7F32"];
  if (loading) {
    return (
      <div style={{ height: "100%", overflowY: "auto", padding: "18px 18px 100px" }}>
        <div style={{ marginBottom: 18 }}>
          <Skel w={140} h={22} r={6} style={{ marginBottom: 8 }} />
          <Skel w={200} h={12} />
        </div>
        <LeaderboardSkeleton />
      </div>
    );
  }
  return (
    <div style={{ height: "100%", overflowY: "auto", padding: "18px 18px 100px" }}>
      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 22, color: "#fff", letterSpacing: "-0.04em" }}>Leaderboard</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif", marginTop: 2 }}>Season rankings by P&L</div>
      </div>
      {entries.length > 0 && (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 9, marginBottom: 20, height: 110 }}>
          {[1, 0, 2].map((i) => {
            const e = entries[i];
            if (!e) return null;
            const h = [86, 110, 70][[1, 0, 2].indexOf(i)];
            return (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                <i className={podiumIcons[i]} style={{ fontSize: 18, color: podiumColors[i], marginBottom: 4 }} />
                <div style={{ width: "100%", height: h, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "9px 9px 0 0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "6px 4px" }}>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 10, color: "rgba(255,255,255,0.6)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", padding: "0 6px" }}>{e.username.replace(/_/g, " ")}</div>
                  <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 12, color: "#00FF87", marginTop: 4 }}>+{fmtUSD(e.pnl_apt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {entries.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "rgba(255,255,255,0.25)", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14 }}>No rankings yet</div>
        ) : entries.map((e, i) => (
          <div key={i} style={{ background: "#111", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "13px 14px", display: "flex", alignItems: "center", gap: 11 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(255,255,255,0.05)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              {i < 3 ? <i className={podiumIcons[i]} style={{ fontSize: 15, color: podiumColors[i] }} /> : <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 12, color: "rgba(255,255,255,0.35)" }}>#{e.rank}</span>}
            </div>
            <div style={{ flex: 1, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: "#fff" }}>@{e.username}</div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 14, color: "#00FF87" }}>+{fmtUSD(e.pnl_apt)}</div>
              <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: "rgba(255,255,255,0.3)" }}>+{e.pnl_pct.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DepositSheet({ onClose }) {
  const currencies = [
    { id: "usdt", label: "USDT", network: "TRC20", icon: "ri-exchange-dollar-line" },
    { id: "usdc", label: "USDC", network: "Polygon", icon: "ri-coin-line" },
    { id: "apt", label: "APT", network: "Aptos", icon: "ri-swap-line" },
    { id: "btc", label: "BTC", network: "Bitcoin", icon: "ri-bit-coin-line" },
    { id: "eth", label: "ETH", network: "Ethereum", icon: "ri-money-dollar-circle-line" },
    { id: "sol", label: "SOL", network: "Solana", icon: "ri-sun-line" },
  ];
  const handleSelect = (currency) => { tgHaptic("impact", "medium"); if (tg?.sendData) tg.sendData(JSON.stringify({ action: "deposit", currency: currency.id })); onClose(); };
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)" }} />
      <div style={{ position: "relative", zIndex: 1, background: "#111", borderRadius: "20px 20px 0 0", border: "1px solid rgba(255,255,255,0.09)", borderBottom: "none", padding: "0 18px 36px", animation: "slideUp 0.28s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <div style={{ display: "flex", justifyContent: "center", padding: "12px 0" }}><div style={{ width: 36, height: 4, borderRadius: 99, background: "rgba(255,255,255,0.12)" }} /></div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 19, color: "#fff" }}>Add Funds</div>
          <button onClick={onClose} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 99, width: 30, height: 30, color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="ri-close-line" style={{ fontSize: 16 }} />
          </button>
        </div>
        <div style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "'Space Grotesk', sans-serif", marginBottom: 15 }}>Credited as <span style={{ color: "#fff", fontWeight: 700 }}>vUSD</span> — always worth exactly $1.</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {currencies.map((c) => (
            <button key={c.id} onClick={() => handleSelect(c)} style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "13px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 12, textAlign: "left" }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <i className={c.icon} style={{ fontSize: 18, color: "rgba(255,255,255,0.6)" }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, fontSize: 14, color: "#fff" }}>{c.label}</div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "'Space Grotesk', sans-serif" }}>{c.network}</div>
              </div>
              <i className="ri-arrow-right-s-line" style={{ fontSize: 18, color: "rgba(255,255,255,0.2)" }} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BottomNav({ active, onChange, onDeposit }) {
  const tabs = [
    { id: "market", icon: "ri-line-chart-line", label: "Market" },
    { id: "portfolio", icon: "ri-briefcase-4-line", label: "Portfolio" },
    { id: "leaderboard", icon: "ri-trophy-line", label: "Ranks" },
  ];
  return (
    <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(10,10,10,0.97)", backdropFilter: "blur(16px)", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", padding: "8px 18px 24px", zIndex: 500, gap: 4 }}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => { tgHaptic("impact", "light"); onChange(t.id); }} style={{ flex: 1, background: "none", border: "none", cursor: "pointer", padding: "7px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
          <i className={t.icon} style={{ fontSize: 21, color: active === t.id ? "#fff" : "rgba(255,255,255,0.25)" }} />
          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 11, color: active === t.id ? "#fff" : "rgba(255,255,255,0.25)" }}>{t.label}</span>
          {active === t.id && <div style={{ width: 4, height: 4, borderRadius: 99, background: "#00FF87", marginTop: -2 }} />}
        </button>
      ))}
      <button onClick={() => { tgHaptic("impact", "medium"); onDeposit(); }}
        style={{ background: "#fff", border: "none", borderRadius: 12, padding: "10px 18px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 800, fontSize: 13, color: "#000", cursor: "pointer", flexShrink: 0, marginLeft: 8, display: "flex", alignItems: "center", gap: 6 }}>
        <i className="ri-add-line" style={{ fontSize: 16 }} /> Add
      </button>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("market");
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [players, setPlayers] = useState([]);
  const [portfolio, setPortfolio] = useState([]);
  const [balance, setBalance] = useState(0);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [toasts, setToasts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { tgReady(); tgExpand(); tg?.lockOrientation?.(); }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const [playersRes, portfolioRes, balanceRes, lbRes] = await Promise.allSettled([
          api("/players"), api("/portfolio"), api("/balance"), api("/leaderboard"),
        ]);
        if (cancelled) return;
        /* No fallbacks — render empty states if API fails */
        if (playersRes.status === "fulfilled") setPlayers(playersRes.value);
        if (portfolioRes.status === "fulfilled") setPortfolio(portfolioRes.value);
        if (balanceRes.status === "fulfilled") setBalance(balanceRes.value?.balance_vusd ?? 0);
        if (lbRes.status === "fulfilled") setLeaderboard(lbRes.value);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  const addToast = useCallback((msg, type = "ok") => {
    const id = Date.now();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  const handleTrade = useCallback(({ mode, amount, player, result }) => {
    if (mode === "buy") {
      const fee = amount * 0.01;
      const tokens = Math.floor(((amount - fee) / player.price_apt) * PRECISION);
      setBalance((b) => b - amount);
      setPortfolio((p) => {
        const existing = p.find((x) => x.player_id === player.id);
        if (existing) return p.map((x) => x.player_id === player.id ? { ...x, token_amount: x.token_amount + tokens } : x);
        return [...p, { player_id: player.id, player_name: player.name, player_symbol: player.symbol, token_amount: tokens, avg_buy_apt: player.price_apt, current_price: player.price_apt }];
      });
      addToast(`Bought ${(tokens / PRECISION).toFixed(2)} ${player.symbol} shares`);
    } else {
      const vusd = amount * player.price_apt * 0.99;
      setBalance((b) => b + vusd);
      setPortfolio((p) => p.map((x) => {
        if (x.player_id !== player.id) return x;
        const remaining = x.token_amount - Math.floor(amount * PRECISION);
        return remaining <= 0 ? null : { ...x, token_amount: remaining };
      }).filter(Boolean));
      addToast(`Sold ${Number(amount).toFixed(2)} ${player.symbol} shares`);
    }
  }, [addToast]);

  const holdingMap = Object.fromEntries(portfolio.map((p) => [p.player_id, p]));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&display=swap');
        @import url('https://cdn.jsdelivr.net/npm/remixicon@4.2.0/fonts/remixicon.css');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        body { background: #0A0A0A; color: #fff; overflow: hidden; }
        input { color: #fff; font-family: 'Space Grotesk', sans-serif; }
        input::placeholder { color: rgba(255,255,255,0.2); }
        input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none; }
        button { font-family: 'Space Grotesk', sans-serif; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
      `}</style>
      <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0A0A0A", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden" }}>
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          {selectedPlayer ? (
            loading ? <PlayerDetailSkeleton /> :
            <PlayerDetail player={selectedPlayer} holding={holdingMap[selectedPlayer.id]} balance={balance} onBack={() => setSelectedPlayer(null)} onTrade={handleTrade} onToast={addToast} />
          ) : (
            <>
              {tab === "market" && <MarketTab players={players} portfolio={portfolio} onSelect={setSelectedPlayer} loading={loading} />}
              {tab === "portfolio" && <PortfolioTab players={players} portfolio={portfolio} balance={balance} onSelect={setSelectedPlayer} loading={loading} />}
              {tab === "leaderboard" && <LeaderboardTab entries={leaderboard} loading={loading} />}
            </>
          )}
        </div>
        {!selectedPlayer && <BottomNav active={tab} onChange={setTab} onDeposit={() => setShowDeposit(true)} />}
        {showDeposit && <DepositSheet onClose={() => setShowDeposit(false)} />}
        <div style={{ position: "fixed", top: 16, left: 18, right: 18, zIndex: 9999, display: "flex", flexDirection: "column", gap: 7, pointerEvents: "none" }}>
          {toasts.map((t) => (
            <div key={t.id} style={{ background: t.type === "error" ? "rgba(255,68,68,0.1)" : "rgba(255,255,255,0.07)", border: `1px solid ${t.type === "error" ? "rgba(255,68,68,0.2)" : "rgba(255,255,255,0.1)"}`, borderRadius: 10, padding: "11px 14px", fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, fontSize: 13, color: t.type === "error" ? "#FF4444" : "#fff", animation: "fadeIn 0.2s ease", display: "flex", alignItems: "center", gap: 8 }}>
              <i className={t.type === "error" ? "ri-error-warning-line" : "ri-check-line"} style={{ fontSize: 15 }} /> {t.msg}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}