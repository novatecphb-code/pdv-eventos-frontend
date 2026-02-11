import { useMemo, useState } from "react";
import axios from "axios";

const API = "https://pdv-eventos-backend.onrender.com/api";
const BEER_ID = 1;
const WATER_ID = 2;

function todayISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function App() {
  const [dayId, setDayId] = useState(null);
  const [dayDate, setDayDate] = useState(todayISO());
  const [stock, setStock] = useState([]);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // abrir dia
  const [openBeer, setOpenBeer] = useState(80);
  const [openWater, setOpenWater] = useState(40);

  // venda
  const [productId, setProductId] = useState(null);
  const [payment, setPayment] = useState(null);
  const [qty, setQty] = useState(1);

  // resumo
  const [showSummary, setShowSummary] = useState(false);
  const [summary, setSummary] = useState(null);

  const beerStock = useMemo(() => getStock(stock, BEER_ID), [stock]);
  const waterStock = useMemo(() => getStock(stock, WATER_ID), [stock]);

  async function loadStock(id = dayId) {
    if (!id) return;
    const { data } = await axios.get(`${API}/day/${id}/stock`);
    setStock(data);
  }

  async function openDay() {
    setMsg("");
    setLoading(true);
    try {
      const { data } = await axios.post(`${API}/day/open`, {
        day_date: dayDate,
        opening: [
          { product_id: BEER_ID, qty: Number(openBeer) },
          { product_id: WATER_ID, qty: Number(openWater) },
        ],
      });

      setDayId(data.event_day_id);
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
    if (!dayId) return;
    setMsg("");
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

    const ok = confirm("Tem certeza que deseja FECHAR o dia? Depois disso não dá pra vender nesse dia.");
    if (!ok) return;

    setLoading(true);
    setMsg("");
    try {
      await axios.post(`${API}/day/${dayId}/close`);
      setMsg("✅ Dia fechado!");

      setShowSummary(false);
      setSummary(null);

      // volta pro início (abrir dia)
      setDayId(null);
      setProductId(null);
      setPayment(null);
      setQty(1);
      setStock([]);
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
        <div>
          <div style={styles.title}>PDV </div>
          <div style={styles.sub}>
            {dayId ? `Dia: ${dayDate} (ID ${dayId})` : `Dia: ${dayDate}`}
          </div>
        </div>

        <div style={styles.rightTop}>
          <button style={styles.smallBtn} onClick={() => loadStock()} disabled={!dayId}>
            ↻ Estoque
          </button>

          <button style={styles.smallBtn} onClick={loadSummary} disabled={!dayId}>
            📊 Resumo do Dia
          </button>

          <div style={styles.msg}>{msg}</div>
        </div>
      </div>

      {!dayId ? (
        <div style={styles.card}>
          <div style={styles.cardTitle}>Abrir dia</div>

          <div style={styles.grid3}>
            <Field label="Data">
              <input value={dayDate} onChange={(e) => setDayDate(e.target.value)} style={styles.input} />
            </Field>

            <Field label="🍺 Cerveja (inicial)">
              <input value={openBeer} onChange={(e) => setOpenBeer(e.target.value)} style={styles.input} />
            </Field>

            <Field label="💧 Água (inicial)">
              <input value={openWater} onChange={(e) => setOpenWater(e.target.value)} style={styles.input} />
            </Field>
          </div>

          <button style={styles.primary} onClick={openDay} disabled={loading}>
            ✅ ABRIR DIA
          </button>

          <div style={styles.hint}>Depois de abrir, você só vende. Simples.</div>
        </div>
      ) : (
        <div style={styles.pdv}>
          <div style={styles.stockBar}>
            <div style={styles.stockBox}>
              <div style={styles.stockLabel}>🍺 Cerveja</div>
              <div style={styles.stockValue}>{beerStock}</div>
            </div>
            <div style={styles.stockBox}>
              <div style={styles.stockLabel}>💧 Água</div>
              <div style={styles.stockValue}>{waterStock}</div>
            </div>

            <button
              style={styles.ghostBtn}
              onClick={() => {
                setDayId(null);
                setProductId(null);
                setPayment(null);
                setQty(1);
                setShowSummary(false);
                setSummary(null);
              }}
            >
              Trocar dia
            </button>
          </div>

          <div style={styles.bigGrid}>
            <BigChoice
              active={productId === BEER_ID}
              disabled={beerStock <= 0}
              onClick={() => setProductId(BEER_ID)}
              title="🍺 Cerveja"
              sub="Toque para selecionar"
            />
            <BigChoice
              active={productId === WATER_ID}
              disabled={waterStock <= 0}
              onClick={() => setProductId(WATER_ID)}
              title="💧 Água"
              sub="Toque para selecionar"
            />
          </div>

          <div style={styles.row}>
            <div style={styles.block}>
              <div style={styles.blockTitle}>Pagamento</div>
              <div style={styles.payRow}>
                <Pill active={payment === "CASH"} onClick={() => setPayment("CASH")}>Dinheiro</Pill>
                <Pill active={payment === "PIX"} onClick={() => setPayment("PIX")}>PIX</Pill>
                <Pill active={payment === "CARD"} onClick={() => setPayment("CARD")}>Cartão</Pill>
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

          <div style={styles.summaryLine}>
            Produto: <b>{productId === BEER_ID ? "Cerveja" : productId === WATER_ID ? "Água" : "-"}</b>
            {"  |  "} Pagamento: <b>{payment || "-"}</b>
            {"  |  "} Qtde: <b>{qty}</b>
          </div>
        </div>
      )}

      {/* OVERLAY RESUMO */}
      {showSummary && summary && (
        <div style={styles.overlay}>
          <div style={styles.summaryCard}>
            <h2 style={{ marginTop: 0 }}>📊 Resumo do Dia</h2>

            <div style={styles.summaryGrid}>
              <Item label="Faturamento" value={summary.faturamento} />
              <Item label="Custo" value={summary.custo} />
              <Item label="Lucro Bruto" value={summary.lucro_bruto} />
              <Item label="Comissão" value={summary.comissao} />
              <Item label="Lucro Líquido" value={summary.lucro_liquido} highlight />
            </div>

            <h3 style={{ marginBottom: 8 }}>Por pagamento</h3>
            {summary.por_pagamento.map((p) => (
              <div key={p.payment_method} style={styles.payLine}>
                <span>{p.payment_method}</span>
                <b>R$ {Number(p.total).toFixed(2)}</b>
              </div>
            ))}

            <button
              onClick={closeDay}
              style={{
                ...styles.finalize,
                background: "#ff3b3b",
                color: "#fff",
                marginTop: 10,
              }}
            >
              ⛔ Fechar Dia
            </button>

            <button style={styles.finalize} onClick={() => setShowSummary(false)}>
              ❌ Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
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
      <div style={{ fontSize: 34, fontWeight: 800 }}>{title}</div>
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
        padding: 12,
        borderRadius: 12,
        background: highlight ? "#fff" : "#1a1a1a",
        color: highlight ? "#000" : "#fff",
        fontWeight: 800,
        border: highlight ? "none" : "1px solid #2f2f2f",
      }}
    >
      <div style={{ opacity: 0.7 }}>{label}</div>
      <div style={{ fontSize: 22 }}>R$ {Number(value).toFixed(2)}</div>
    </div>
  );
}

function getStock(stockArr, productId) {
  const it = stockArr.find((x) => x.id === productId);
  return it ? Number(it.stock_now) : 0;
}

const styles = {
  page: { background: "#121212", minHeight: "100vh", color: "#fff", padding: 18 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16 },
  title: { fontSize: 44, fontWeight: 900, letterSpacing: -1 },
  sub: { opacity: 0.8, marginTop: 2 },
  rightTop: { display: "flex", alignItems: "center", gap: 12 },
  smallBtn: {
    padding: "10px 12px",
    borderRadius: 10,
    border: "1px solid #3a3a3a",
    background: "#1c1c1c",
    color: "#fff",
    cursor: "pointer",
  },
  msg: { minWidth: 120, textAlign: "right", fontWeight: 700 },

  card: {
    marginTop: 18,
    background: "#1a1a1a",
    border: "1px solid #2f2f2f",
    borderRadius: 16,
    padding: 16,
  },
  cardTitle: { fontSize: 22, fontWeight: 800, marginBottom: 12 },
  grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 },
  input: {
    padding: 12,
    borderRadius: 12,
    border: "1px solid #3a3a3a",
    background: "#111",
    color: "#fff",
    fontSize: 16,
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
    minWidth: 180,
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
  },

  bigGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 },
  bigBtn: {
    padding: 22,
    borderRadius: 18,
    background: "#1a1a1a",
    color: "#fff",
    textAlign: "left",
    minHeight: 140,
  },

  row: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 14 },
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
    padding: 20,
    fontSize: 26,
    fontWeight: 900,
    borderRadius: 18,
    border: "none",
    background: "#fff",
    color: "#000",
    cursor: "pointer",
  },
  summaryLine: { marginTop: 10, opacity: 0.85 },

  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    padding: 12,
  },
  summaryCard: {
    background: "#121212",
    borderRadius: 20,
    padding: 20,
    width: "100%",
    maxWidth: 560,
    border: "1px solid #2f2f2f",
  },
  summaryGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 12,
    marginBottom: 14,
  },
  payLine: {
    display: "flex",
    justifyContent: "space-between",
    padding: "6px 0",
    borderBottom: "1px solid #222",
  },
};
