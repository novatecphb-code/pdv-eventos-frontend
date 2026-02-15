import { useEffect, useMemo, useState } from "react";
import axios from "axios";

// Na nuvem: configure VITE_API_URL no Render (Static Site)
// Ex: https://SEU_BACKEND.onrender.com/api
const API = import.meta.env.VITE_API_URL || "http://localhost:3001/api";
console.log("API URL:", API);

// IDs fixos
const BEER_ID = 1; // Cerveja lata
const WATER_ID = 2; // Água
const STELLA_ID = 3; // Stella Long Neck

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function getStock(stockArr, productId) {
  const it = stockArr.find((x) => x.id === productId);
  return it ? Number(it.stock_now) : 0;
}

export default function App() {
  const [dayId, setDayId] = useState(null);
  const [dayDate, setDayDate] = useState(todayISO());
  const [stock, setStock] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // abrir dia (estoque inicial)
  const [openBeer, setOpenBeer] = useState(60);
  const [openWater, setOpenWater] = useState(17);
  const [openStella, setOpenStella] = useState(6);

  // venda
  const [productId, setProductId] = useState(null);
  const [payment, setPayment] = useState("CASH");
  const [qty, setQty] = useState(1);

  // resumo
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);

  const beerStock = useMemo(() => getStock(stock, BEER_ID), [stock]);
  const waterStock = useMemo(() => getStock(stock, WATER_ID), [stock]);
  const stellaStock = useMemo(() => getStock(stock, STELLA_ID), [stock]);

  async function loadStock(id = dayId) {
    if (!id) return;
    const { data } = await axios.get(`${API}/day/${id}/stock`);
    setStock(data);
  }

  // recuperar dia salvo (caso recarregue no celular)
  useEffect(() => {
    const savedId = localStorage.getItem("pdv_day_id");
    const savedDate = localStorage.getItem("pdv_day_date");

    if (savedId) {
      const id = Number(savedId);
      if (id) {
        setDayId(id);
        if (savedDate) setDayDate(savedDate);
        setPayment("CASH");
        setQty(1);
        loadStock(id);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function openDay() {
    setMsg("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/day/open`, {
        day_date: dayDate,
        opening: [
          { product_id: BEER_ID, qty: Number(openBeer) },
          { product_id: WATER_ID, qty: Number(openWater) },
          { product_id: STELLA_ID, qty: Number(openStella) },
        ],
      });

      setDayId(data.event_day_id);

      localStorage.setItem("pdv_day_id", String(data.event_day_id));
      localStorage.setItem("pdv_day_date", String(dayDate));

      await loadStock(data.event_day_id);

      setProductId(null);
      setPayment("CASH");
      setQty(1);

      setMsg(data.already_open ? "✅ Dia já aberto" : "✅ Dia aberto");
    } catch (e) {
      setMsg("❌ " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(""), 1800);
    }
  }

  async function finalize() {
    if (!dayId) return setMsg("❌ Abra o dia");
    if (!productId) return setMsg("❌ Escolha o produto");
    if (!payment) return setMsg("❌ Escolha o pagamento");

    const available = getStock(stock, productId);
    if (available < qty) return setMsg("❌ Sem estoque");

    setMsg("");
    setLoading(true);
    try {
      await axios.post(`${API}/sale`, {
        event_day_id: dayId,
        product_id: productId,
        qty,
        payment_method: payment,
      });

      await loadStock(dayId);

      setProductId(null);
      setQty(1);
      setMsg("✅ OK");
    } catch (e) {
      setMsg("❌ " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(""), 1000);
    }
  }

  async function loadSummary() {
    if (!dayId) return setMsg("❌ Abra o dia");
    try {
      const { data } = await axios.get(`${API}/day/${dayId}/summary`);
      setSummary(data);
      setShowSummary(true);
    } catch (e) {
      setMsg("❌ " + (e.response?.data?.error || e.message));
    }
  }

  async function closeDay() {
    if (!dayId) return;

    const confirmText = prompt("Para FECHAR o dia, digite: FECHAR");
    if (confirmText !== "FECHAR") return;

    setMsg("");
    setLoading(true);
    try {
      await axios.post(`${API}/day/${dayId}/close`);

      localStorage.removeItem("pdv_day_id");
      localStorage.removeItem("pdv_day_date");

      setShowSummary(false);
      setSummary(null);

      setDayId(null);
      setStock([]);
      setProductId(null);
      setQty(1);

      setMsg("✅ Dia fechado!");
    } catch (e) {
      setMsg("❌ " + (e.response?.data?.error || e.message));
    } finally {
      setLoading(false);
      setTimeout(() => setMsg(""), 2000);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={{ minWidth: 0 }}>
          <div style={styles.title}>PDV</div>
          <div style={styles.sub}>
            {dayId ? `Dia: ${dayDate} (ID ${dayId})` : `Dia: ${dayDate}`}
          </div>
        </div>

        <div style={styles.rightTop}>
          <button
            style={styles.smallBtn}
            onClick={() => loadStock()}
            disabled={!dayId || loading}
          >
            ↻ Estoque
          </button>

          <button
            style={styles.smallBtn}
            onClick={loadSummary}
            disabled={!dayId || loading}
          >
            📊 Resumo
          </button>

          <div style={styles.msg}>{msg}</div>
        </div>
      </div>

      {!dayId ? (
        // -------- ABRIR DIA --------
        <div style={styles.card}>
          <div style={styles.cardTitle}>Abrir dia</div>

          <div style={styles.grid3}>
            <Field label="Data">
              <input
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
                style={styles.input}
              />
            </Field>

            <Field label="🍺 Cerveja lata (inicial)">
              <input
                value={openBeer}
                onChange={(e) => setOpenBeer(e.target.value)}
                style={styles.input}
                inputMode="numeric"
              />
            </Field>

            <Field label="💧 Água (inicial)">
              <input
                value={openWater}
                onChange={(e) => setOpenWater(e.target.value)}
                style={styles.input}
                inputMode="numeric"
              />
            </Field>

            <Field label="🍺 Stella Long Neck (inicial)">
              <input
                value={openStella}
                onChange={(e) => setOpenStella(e.target.value)}
                style={styles.input}
                inputMode="numeric"
              />
            </Field>
          </div>

          <button style={styles.primary} onClick={openDay} disabled={loading}>
            ✅ ABRIR DIA
          </button>

          <div style={styles.hint}>Depois de abrir, você só vende. Simples.</div>
        </div>
      ) : (
        // -------- TELA VENDAS --------
        <div style={styles.pdv}>
          <div style={styles.stockBar}>
            <div style={styles.stockBox}>
              <div style={styles.stockLabel}>🍺 Cerveja lata</div>
              <div style={styles.stockValue}>{beerStock}</div>
            </div>

            <div style={styles.stockBox}>
              <div style={styles.stockLabel}>🍺 Stella Long Neck</div>
              <div style={styles.stockValue}>{stellaStock}</div>
            </div>

            <div style={styles.stockBox}>
              <div style={styles.stockLabel}>💧 Água</div>
              <div style={styles.stockValue}>{waterStock}</div>
            </div>

            {/* Botões rápidos (topo) */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button
                style={styles.ghostBtn}
                onClick={loadSummary}
                disabled={loading}
              >
                📊 Resumo
              </button>

              <button
                style={styles.ghostBtn}
                onClick={closeDay}
                disabled={loading}
              >
                🔒 Fechar dia
              </button>
            </div>
          </div>

          <div style={styles.bigGrid}>
            <BigChoice
              active={productId === BEER_ID}
              disabled={beerStock <= 0 || loading}
              onClick={() => setProductId(BEER_ID)}
              title="🍺 Cerveja lata"
              sub="Toque para selecionar"
            />

            <BigChoice
              active={productId === STELLA_ID}
              disabled={stellaStock <= 0 || loading}
              onClick={() => setProductId(STELLA_ID)}
              title="🍺 Stella Long Neck"
              sub="Toque para selecionar"
            />

            <BigChoice
              active={productId === WATER_ID}
              disabled={waterStock <= 0 || loading}
              onClick={() => setProductId(WATER_ID)}
              title="💧 Água"
              sub="Toque para selecionar"
            />
          </div>

          <div style={styles.row}>
            <div style={styles.block}>
              <div style={styles.blockTitle}>Pagamento</div>
              <div style={styles.payRow}>
                <Pill active={payment === "CASH"} onClick={() => setPayment("CASH")}>
                  Dinheiro
                </Pill>
                <Pill active={payment === "PIX"} onClick={() => setPayment("PIX")}>
                  PIX
                </Pill>
                <Pill active={payment === "CARD"} onClick={() => setPayment("CARD")}>
                  Cartão
                </Pill>
              </div>
            </div>

            <div style={styles.block}>
              <div style={styles.blockTitle}>Quantidade</div>
              <div style={styles.payRow}>
                <Pill active={qty === 1} onClick={() => setQty(1)}>1</Pill>
                <Pill active={qty === 2} onClick={() => setQty(2)}>2</Pill>
                <Pill active={qty === 3} onClick={() => setQty(3)}>3</Pill>
                <Pill active={qty === 6} onClick={() => setQty(6)}>6</Pill>
              </div>
            </div>
          </div>

          <button
            style={{ ...styles.finalize, opacity: loading ? 0.6 : 1 }}
            onClick={finalize}
            disabled={loading}
          >
            ✅ FINALIZAR VENDA
          </button>

          {/* ✅ MELHORIA: Botão grande e sempre visível */}
          <button
            style={{ ...styles.closeBig, opacity: loading ? 0.6 : 1 }}
            onClick={closeDay}
            disabled={loading}
          >
            🔒 FINALIZAR DIA
          </button>

          <div style={styles.summaryLine}>
            Produto:{" "}
            <b>
              {productId === BEER_ID
                ? "Cerveja lata"
                : productId === STELLA_ID
                ? "Stella Long Neck"
                : productId === WATER_ID
                ? "Água"
                : "-"}
            </b>
            {"  |  "} Pagamento: <b>{payment || "-"}</b>
            {"  |  "} Qtde: <b>{qty}</b>
          </div>
        </div>
      )}

      {/* OVERLAY RESUMO */}
      {showSummary && summary && (
        <div style={styles.overlay} onClick={() => setShowSummary(false)}>
          <div style={styles.summaryCard} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <h2 style={{ margin: 0 }}>📊 Resumo do Dia</h2>
              <button style={styles.smallBtn} onClick={() => setShowSummary(false)}>
                ✕
              </button>
            </div>

            <div style={styles.summaryGrid}>
              <Item label="Faturamento" value={summary.faturamento} />
              <Item label="Custo" value={summary.custo} />
              <Item label="Lucro Bruto" value={summary.lucro_bruto} />
              <Item label="Comissão" value={summary.comissao} />
              <Item label="Lucro Líquido" value={summary.lucro_liquido} highlight />
            </div>

            <h3 style={{ marginTop: 14 }}>Por pagamento</h3>
            {(summary.por_pagamento || []).map((p) => (
              <div key={p.payment_method} style={styles.payLine}>
                <span>{p.payment_method}</span>
                <b>R$ {Number(p.total).toFixed(2)}</b>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
      <div style={{ opacity: 0.85, fontSize: 13 }}>{label}</div>
      {children}
    </div>
  );
}

function BigChoice({ active, disabled, onClick, title, sub }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        ...styles.bigBtn,
        border: active ? "2px solid #fff" : "1px solid #3a3a3a",
        opacity: disabled ? 0.45 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      <div style={{ fontSize: 30, fontWeight: 900 }}>{title}</div>
      <div style={{ opacity: 0.8 }}>{sub}</div>
    </button>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        ...styles.pill,
        border: active ? "2px solid #fff" : "1px solid #4a4a4a",
      }}
    >
      {children}
    </button>
  );
}

function Item({ label, value, highlight }) {
  return (
    <div
      style={{
        background: highlight ? "#ffffff" : "#1a1a1a",
        color: highlight ? "#000" : "#fff",
        border: "1px solid #2f2f2f",
        borderRadius: 14,
        padding: 12,
      }}
    >
      <div style={{ opacity: 0.8, fontSize: 13 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 900 }}>R$ {Number(value || 0).toFixed(2)}</div>
    </div>
  );
}

const styles = {
  page: { background: "#121212", minHeight: "100vh", color: "#fff", padding: 16 },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
    flexWrap: "wrap",
  },

  title: { fontSize: 34, fontWeight: 900, letterSpacing: -1 },
  sub: { opacity: 0.8, marginTop: 2 },

  rightTop: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },

  smallBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #3a3a3a",
    background: "#1c1c1c",
    color: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  msg: { minWidth: 110, textAlign: "right", fontWeight: 800, opacity: 0.95 },

  card: {
    marginTop: 16,
    background: "#1a1a1a",
    border: "1px solid #2f2f2f",
    borderRadius: 16,
    padding: 16,
  },

  cardTitle: { fontSize: 22, fontWeight: 800, marginBottom: 12 },

  grid3: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))",
    gap: 12,
  },

  input: {
    width: "100%",
    padding: 12,
    borderRadius: 12,
    border: "1px solid #3a3a3a",
    background: "#111",
    color: "#fff",
    fontSize: 16,
    minWidth: 0,
  },

  primary: {
    marginTop: 14,
    width: "100%",
    padding: 16,
    fontSize: 20,
    fontWeight: 900,
    borderRadius: 14,
    border: "none",
    background: "#fff",
    color: "#000",
    cursor: "pointer",
  },

  hint: { marginTop: 10, opacity: 0.8 },

  pdv: { marginTop: 16 },

  stockBar: {
    display: "flex",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },

  stockBox: {
    background: "#1a1a1a",
    border: "1px solid #2f2f2f",
    borderRadius: 16,
    padding: 12,
    flex: "1 1 160px",
    minWidth: 160,
  },

  stockLabel: { opacity: 0.8 },
  stockValue: { fontSize: 36, fontWeight: 900 },

  ghostBtn: {
    padding: "10px 12px",
    borderRadius: 12,
    border: "1px solid #3a3a3a",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },

  bigGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginTop: 14,
  },

  bigBtn: {
    padding: 20,
    borderRadius: 18,
    background: "#1a1a1a",
    color: "#fff",
    textAlign: "left",
    minHeight: 120,
  },

  row: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: 14,
    marginTop: 14,
  },

  block: {
    background: "#1a1a1a",
    border: "1px solid #2f2f2f",
    borderRadius: 16,
    padding: 14,
  },

  blockTitle: { fontWeight: 800, marginBottom: 10 },
  payRow: { display: "flex", gap: 10, flexWrap: "wrap" },

  pill: {
    padding: "12px 14px",
    borderRadius: 999,
    background: "#111",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 800,
    minWidth: 90,
  },

  finalize: {
    marginTop: 14,
    width: "100%",
    padding: 18,
    fontSize: 24,
    fontWeight: 900,
    borderRadius: 18,
    border: "none",
    background: "#fff",
    color: "#000",
    cursor: "pointer",
  },

  // ✅ NOVO: botão grande "Finalizar dia" fixo abaixo do finalizar venda
  closeBig: {
    marginTop: 10,
    width: "100%",
    padding: 16,
    fontSize: 18,
    fontWeight: 900,
    borderRadius: 18,
    border: "1px solid #3a3a3a",
    background: "transparent",
    color: "#fff",
    cursor: "pointer",
  },

  summaryLine: { marginTop: 10, opacity: 0.85 },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-end",
    padding: 12,
  },

  summaryCard: {
    width: "100%",
    maxWidth: 720,
    background: "#121212",
    border: "1px solid #2f2f2f",
    borderRadius: 18,
    padding: 14,
    boxShadow: "0 20px 60px rgba(0,0,0,.55)",
    maxHeight: "85vh",
    overflow: "auto",
  },

  summaryGrid: {
    marginTop: 12,
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
    gap: 12,
  },

  payLine: {
    display: "flex",
    justifyContent: "space-between",
    padding: "10px 0",
    borderBottom: "1px solid #2a2a2a",
  },
};
