import React, { useState, useRef, useEffect } from "react";
import {
  Gavel,
  Sparkles,
  RefreshCw,
  Check,
  Loader2,
  Crown,
  Undo2,
  AlertCircle,
  Coins,
  ChevronRight,
  ChevronDown,
  Trophy,
  Plus,
  X,
  Wifi,
  Users,
  Copy,
  EyeOff,
} from "lucide-react";
import { sGet, sSet } from "./firebase";

/* ─────────────────────────────────────────────────────────────
   Paleta: noche de remate — violeta escenario, oro, carmín, menta
   ───────────────────────────────────────────────────────────── */
const C = {
  night: "#170726",
  night2: "#210b36",
  panel: "#2b0f45",
  panel2: "#371459",
  border: "#4a2270",
  gold: "#ffc857",
  goldDeep: "#c98f1f",
  crimson: "#ff3d68",
  mint: "#35e0a1",
  paper: "#f7edd9",
  paperEdge: "#dccdaf",
  ivory: "#f6f1ff",
  mute: "#a892c4",
};

const DISPLAY = "Georgia, 'Times New Roman', serif";
const MONO = "'SF Mono', 'Roboto Mono', Menlo, Consolas, monospace";
const BODY = "'Helvetica Neue', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

/* ───────────────────────────── Juez (Gemini vía Netlify) ───────────────────────────── */
async function ask(prompt, system) {
  const res = await fetch("/.netlify/functions/juez", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, system }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "El juez no contestó. Probá de nuevo.");
  return data.texto || "";
}

function parseJSON(text) {
  const clean = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch (e) {
    const first = clean.search(/[[{]/);
    const last = Math.max(clean.lastIndexOf("}"), clean.lastIndexOf("]"));
    if (first === -1 || last === -1) throw new Error("El juez habló raro. Reintentá.");
    return JSON.parse(clean.slice(first, last + 1));
  }
}

const SYS =
  "Sos el Game Master y Juez Supremo de 'La Subasta', un juego de remate y duelos. " +
  "Hablás en español rioplatense, breve y con datos duros. Nunca declarás empates. " +
  "Respondés SIEMPRE y ÚNICAMENTE con JSON válido, sin preámbulo ni backticks.";

/* ─────────────────────── Sala compartida (Firebase) ─────────────────────── */
const K = (code, quien) => `subasta/${code}/${quien}`;

const nuevoCodigo = () => {
  const L = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 4 }, () => L[Math.floor(Math.random() * L.length)]).join("");
};

/* ─────────────────────────── UI base ─────────────────────────── */
function Boton({ children, onClick, disabled, variant = "gold", icon: Icon, full, size = "md" }) {
  const v = {
    gold: { bg: C.gold, fg: "#2a1500", bd: C.gold },
    ghost: { bg: "transparent", fg: C.gold, bd: C.border },
    crimson: { bg: C.crimson, fg: "#2a0009", bd: C.crimson },
    paper: { bg: C.paper, fg: C.night, bd: C.paper },
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`sb-btn inline-flex items-center justify-center gap-2 rounded-sm ${
        size === "sm" ? "px-3 py-2" : "px-5 py-3"
      } ${full ? "w-full" : ""}`}
      style={{
        background: v.bg,
        color: v.fg,
        border: `1px solid ${v.bd}`,
        fontFamily: MONO,
        fontSize: size === "sm" ? 11 : 12.5,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        opacity: disabled ? 0.32 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {Icon ? <Icon size={size === "sm" ? 13 : 15} strokeWidth={1.9} /> : null}
      {children}
    </button>
  );
}

function Eyebrow({ children, color = C.gold }) {
  return (
    <div
      className="text-xs"
      style={{ fontFamily: MONO, color, letterSpacing: "0.3em", textTransform: "uppercase" }}
    >
      {children}
    </div>
  );
}

function Campo({ value, onChange, placeholder, onEnter, tipo = "text", ...rest }) {
  return (
    <input
      type={tipo}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
      placeholder={placeholder}
      className="w-full rounded-sm px-4 py-3"
      style={{
        background: C.night,
        border: `1px solid ${C.border}`,
        color: C.ivory,
        fontFamily: DISPLAY,
        fontSize: 17,
      }}
      {...rest}
    />
  );
}

function Ficha({ lote, size = "md", apagado }) {
  return (
    <div
      className="relative overflow-hidden rounded-sm"
      style={{
        background: apagado ? C.panel2 : C.paper,
        color: apagado ? C.ivory : C.night,
        border: `1px solid ${apagado ? C.border : C.paperEdge}`,
        boxShadow: apagado ? "none" : "0 14px 30px rgba(0,0,0,0.45)",
        padding: size === "sm" ? "12px 14px" : "20px 20px 18px",
      }}
    >
      <div
        className="absolute left-0 right-0 top-0"
        style={{
          height: 5,
          backgroundImage: `radial-gradient(circle at 4px -1px, ${C.night} 0 3px, transparent 3.5px)`,
          backgroundSize: "11px 5px",
          opacity: apagado ? 0.25 : 0.7,
        }}
      />
      <div className="pt-1">
        <div
          className="text-xs"
          style={{ fontFamily: MONO, color: apagado ? C.gold : C.crimson, letterSpacing: "0.2em" }}
        >
          LOTE {String(lote.n).padStart(2, "0")}
        </div>
        <div
          className="mt-1 break-words"
          style={{
            fontFamily: DISPLAY,
            fontWeight: 700,
            fontSize: size === "sm" ? 16 : size === "xl" ? 34 : 22,
            lineHeight: 1.12,
          }}
        >
          {lote.nombre}
        </div>
        <div
          className="mt-1 text-xs"
          style={{ color: apagado ? C.mute : "#6f6449", fontFamily: BODY, lineHeight: 1.5 }}
        >
          {lote.detalle}
        </div>
      </div>
    </div>
  );
}

function Cargando({ texto }) {
  return (
    <div className="flex items-center gap-3 py-2" style={{ color: C.mute, fontFamily: MONO }}>
      <Loader2 size={16} className="sb-spin" />
      <span className="text-xs" style={{ letterSpacing: "0.16em" }}>
        {texto.toUpperCase()}
      </span>
    </div>
  );
}

function Aviso({ texto, onRetry }) {
  if (!texto) return null;
  return (
    <div
      className="mt-4 flex flex-wrap items-center gap-3 rounded-sm p-3"
      style={{ border: `1px solid ${C.crimson}`, background: "rgba(255,61,104,0.12)" }}
    >
      <AlertCircle size={16} style={{ color: C.crimson }} />
      <span className="text-sm" style={{ color: C.ivory }}>
        {texto}
      </span>
      {onRetry ? (
        <button
          onClick={onRetry}
          className="text-xs underline"
          style={{ color: C.gold, fontFamily: MONO, letterSpacing: "0.1em" }}
        >
          REINTENTAR
        </button>
      ) : null}
    </div>
  );
}

function Espera({ texto }) {
  return (
    <div
      className="mt-6 rounded-sm p-6 text-center"
      style={{ background: C.panel, border: `1px dashed ${C.border}` }}
    >
      <Loader2 size={18} className="sb-spin mx-auto" style={{ color: C.gold }} />
      <p className="mt-3" style={{ fontFamily: DISPLAY, fontSize: 18, color: C.ivory }}>
        {texto}
      </p>
    </div>
  );
}

/* ───────────────── Hero: escenario del remate ───────────────── */
function Escenario() {
  return (
    <svg viewBox="0 0 620 300" className="w-full" style={{ display: "block" }} aria-hidden="true">
      <defs>
        <linearGradient id="sbCono" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.gold} stopOpacity="0.42" />
          <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sbMadera" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f0c274" />
          <stop offset="100%" stopColor="#a9711f" />
        </linearGradient>
        <radialGradient id="sbHalo">
          <stop offset="0%" stopColor={C.gold} stopOpacity="0.5" />
          <stop offset="100%" stopColor={C.gold} stopOpacity="0" />
        </radialGradient>
      </defs>

      <polygon points="310,-10 505,270 115,270" fill="url(#sbCono)" />
      <ellipse cx="310" cy="268" rx="150" ry="20" fill="url(#sbHalo)" />

      {[
        [96, 74, 2.6, 0],
        [138, 176, 1.8, 1.4],
        [486, 108, 2.2, 0.7],
        [524, 186, 1.6, 2.1],
        [196, 52, 1.5, 1.9],
        [438, 62, 2, 0.4],
      ].map(([x, y, r, d], k) => (
        <circle
          key={k}
          className="sb-chispa"
          cx={x}
          cy={y}
          r={r}
          fill={C.gold}
          style={{ animationDelay: `${d}s` }}
        />
      ))}

      <rect x="252" y="238" width="116" height="16" rx="4" fill="#5a2a12" />
      <rect x="264" y="230" width="92" height="10" rx="3" fill="url(#sbMadera)" />
      <circle className="sb-impacto" cx="310" cy="232" r="6" fill={C.gold} opacity="0" />

      <g className="sb-martillo">
        <g transform="translate(310 196)">
          <rect x="-58" y="-108" width="116" height="40" rx="9" fill="url(#sbMadera)" />
          <rect x="-58" y="-108" width="116" height="12" rx="6" fill="#ffe0a3" opacity="0.5" />
          <rect x="-9" y="-72" width="18" height="86" rx="6" fill="#8a5a1c" />
          <rect x="-9" y="-72" width="6" height="86" rx="3" fill="#c08a34" />
          <rect x="-15" y="8" width="30" height="16" rx="6" fill="#5a2a12" />
        </g>
      </g>
    </svg>
  );
}

/* ─────────────────────────── Juego ─────────────────────────── */
export default function LaSubasta() {
  const [fase, setFase] = useState("portada");
  const [modo, setModo] = useState("local"); // local | online
  const [rol, setRol] = useState("host"); // host | invitado
  const [sala, setSala] = useState("");
  const [codigoInput, setCodigoInput] = useState("");
  const [conectado, setConectado] = useState(false);

  const [presupuesto, setPresupuesto] = useState(20);
  const [nombres, setNombres] = useState(["Jugador 1", "Jugador 2"]);

  const [tema, setTema] = useState("");
  const [temaCandidato, setTemaCandidato] = useState(null);
  const [temaManual, setTemaManual] = useState("");
  const [descartadas, setDescartadas] = useState([]);

  const [categorias, setCategorias] = useState([]);
  const [catInput, setCatInput] = useState("");

  const [lotes, setLotes] = useState([]);
  const [registro, setRegistro] = useState([]);

  // local
  const [ganador, setGanador] = useState(null);
  const [precio, setPrecio] = useState("");
  const [catElegida, setCatElegida] = useState("");

  // online
  const [ofertaHost, setOfertaHost] = useState(null);
  const [ofertaTexto, setOfertaTexto] = useState("");
  const [accionJ2, setAccionJ2] = useState(null);
  const [pendiente, setPendiente] = useState(null); // {jugador, precio, loteId}
  const [ultimaPuja, setUltimaPuja] = useState(null); // {a,b,ganador}

  const [veredictos, setVeredictos] = useState({});
  const [ronda, setRonda] = useState(0);
  const [cierre, setCierre] = useState(null);

  const [flash, setFlash] = useState(null);
  const [hudAbierto, setHudAbierto] = useState(false);
  const [cargando, setCargando] = useState("");
  const [error, setError] = useState("");
  const [reintento, setReintento] = useState(null);
  const tope = useRef(null);

  const online = modo === "online";
  const invitado = online && rol === "invitado";
  const anfitrion = !online || rol === "host";

  useEffect(() => {
    if (tope.current) tope.current.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [fase, registro.length, ronda]);

  const correr = async (etiqueta, fn) => {
    setError("");
    setCargando(etiqueta);
    setReintento(() => () => correr(etiqueta, fn));
    try {
      await fn();
    } catch (e) {
      setError(e.message || "Se cortó la conexión con el juez.");
    } finally {
      setCargando("");
    }
  };

  /* ── Dinero ── */
  const gastado = (i) => registro.filter((r) => r.jugador === i).reduce((s, r) => s + r.precio, 0);
  const plata = (i) => presupuesto - gastado(i);
  const vacias = (i) =>
    categorias.filter((c) => !registro.some((r) => r.jugador === i && r.categoria === c));
  const maximo = (i) => {
    const v = vacias(i).length;
    if (v === 0) return 0;
    return Math.max(0, plata(i) - (v - 1));
  };
  const habilitado = (i) => vacias(i).length > 0 && maximo(i) >= 1;
  const loteActual = lotes[registro.length];
  const piezaDe = (i, cat) => {
    const r = registro.find((x) => x.jugador === i && x.categoria === cat);
    if (!r) return null;
    const l = lotes.find((x) => x.id === r.loteId);
    return l ? { ...l, precio: r.precio } : null;
  };
  const puntos = (i) =>
    categorias.filter((c) => veredictos[c]?.fallo === (i === 0 ? "A" : "B")).length;

  /* ── Sincronización ── */
  useEffect(() => {
    if (!online || rol !== "host" || !sala) return;
    sSet(K(sala, "estado"), {
      fase,
      tema,
      categorias,
      lotes,
      registro,
      veredictos,
      ronda,
      nombres,
      presupuesto,
      pendiente,
      hostOferto: ofertaHost != null,
      ultimaPuja,
      cierre,
      t: Date.now(),
    });
  }, [
    online,
    rol,
    sala,
    fase,
    tema,
    categorias,
    lotes,
    registro,
    veredictos,
    ronda,
    nombres,
    presupuesto,
    pendiente,
    ofertaHost,
    ultimaPuja,
    cierre,
  ]);

  useEffect(() => {
    if (!online || rol !== "invitado" || !sala) return;
    let vivo = true;
    const tick = async () => {
      const e = await sGet(K(sala, "estado"));
      if (!vivo || !e) return;
      setConectado(true);
      setFase(e.fase);
      setTema(e.tema);
      setCategorias(e.categorias || []);
      setLotes(e.lotes || []);
      setRegistro(e.registro || []);
      setVeredictos(e.veredictos || {});
      setRonda(e.ronda || 0);
      setPresupuesto(e.presupuesto || 20);
      setPendiente(e.pendiente || null);
      setUltimaPuja(e.ultimaPuja || null);
      setCierre(e.cierre || null);
      setNombres((n) => [e.nombres?.[0] || n[0], n[1]]);
    };
    tick();
    const id = setInterval(tick, 1800);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [online, rol, sala]);

  useEffect(() => {
    if (!online || rol !== "host" || !sala) return;
    let vivo = true;
    const tick = async () => {
      const a = await sGet(K(sala, "j2"));
      if (!vivo || !a) return;
      setAccionJ2(a);
      if (a.nombre) {
        setConectado(true);
        setNombres((n) => (n[1] === a.nombre ? n : [n[0], a.nombre]));
      }
    };
    tick();
    const id = setInterval(tick, 1800);
    return () => {
      vivo = false;
      clearInterval(id);
    };
  }, [online, rol, sala]);

  const escribirJ2 = (parcial) => {
    const base = { nombre: nombres[1], ...(accionJ2 || {}), ...parcial };
    setAccionJ2(base);
    sSet(K(sala, "j2"), base);
  };

  /* ── Adjudicar (común) ── */
  const cerrarLote = (jugador, monto, categoria, loteId) => {
    const l = lotes.find((x) => x.id === loteId);
    setFlash({ lote: l?.nombre, jugador: nombres[jugador], precio: monto, cat: categoria });
    setRegistro((r) => [...r, { loteId, jugador, precio: monto, categoria }]);
    setGanador(null);
    setPrecio("");
    setCatElegida("");
    setOfertaHost(null);
    setOfertaTexto("");
    setPendiente(null);
  };

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 1150);
    return () => clearTimeout(t);
  }, [flash]);

  /* ── Resolución de la puja a ciegas (host) ── */
  useEffect(() => {
    if (!online || rol !== "host" || fase !== "remate" || !loteActual || pendiente) return;
    const soloHost = habilitado(0) && !habilitado(1);
    const soloJ2 = habilitado(1) && !habilitado(0);
    const oj2 = accionJ2?.oferta?.lote === loteActual.id ? accionJ2.oferta.monto : null;

    let gan = null;
    let monto = null;
    if (soloHost && ofertaHost != null) {
      gan = 0;
      monto = ofertaHost;
    } else if (soloJ2 && oj2 != null) {
      gan = 1;
      monto = oj2;
    } else if (ofertaHost != null && oj2 != null) {
      if (ofertaHost !== oj2) gan = ofertaHost > oj2 ? 0 : 1;
      else if (plata(0) !== plata(1)) gan = plata(0) < plata(1) ? 0 : 1;
      else gan = loteActual.n % 2 === 1 ? 0 : 1;
      monto = gan === 0 ? ofertaHost : oj2;
      setUltimaPuja({ a: ofertaHost, b: oj2, ganador: gan, lote: loteActual.id });
    }
    if (gan == null) return;
    const libres = vacias(gan);
    if (libres.length === 1) cerrarLote(gan, monto, libres[0], loteActual.id);
    else setPendiente({ jugador: gan, precio: monto, loteId: loteActual.id });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online, rol, fase, ofertaHost, accionJ2, registro, pendiente]);

  useEffect(() => {
    if (!online || rol !== "host" || !pendiente || pendiente.jugador !== 1) return;
    const c = accionJ2?.categoria;
    if (c && c.lote === pendiente.loteId && vacias(1).includes(c.cat)) {
      cerrarLote(1, pendiente.precio, c.cat, pendiente.loteId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accionJ2, pendiente]);

  /* ── Temática ── */
  const tirarTema = () =>
    correr("buscando temática", async () => {
      const t = parseJSON(
        await ask(
          `Proponé UNA temática jugable para un remate por categorías (países, superhéroes, autos, bandas, videojuegos, animales, comidas, actores, marcas, etc.).
Evitá estas: ${descartadas.join(", ") || "ninguna"}. Semilla: ${Math.random().toString(36).slice(2)}.
JSON: {"tema":"...","descripcion":"máximo 12 palabras"}`,
          SYS
        )
      );
      setTemaCandidato(t);
    });

  const fijarTema = (t) => {
    setTema(t);
    setTemaCandidato(null);
    setFase("categorias");
  };

  const tirarCategorias = () =>
    correr("pensando categorías", async () => {
      const arr = parseJSON(
        await ask(
          `Temática: "${tema}".
Proponé 5 categorías de comparación para pelear elemento contra elemento: variadas, jugables, de 1 a 3 palabras. Mezclá alguna obvia con alguna lateral y divertida.
Semilla: ${Math.random().toString(36).slice(2)}.
JSON: ["...","...","...","...","..."]`,
          SYS
        )
      );
      setCategorias(arr.slice(0, 6));
    });

  const agregarCat = () => {
    const v = catInput.trim();
    if (!v || categorias.length >= 6 || categorias.includes(v)) return;
    setCategorias((c) => [...c, v]);
    setCatInput("");
  };

  const abrirRemate = () =>
    correr("armando el catálogo", async () => {
      const total = categorias.length * 2;
      const arr = parseJSON(
        await ask(
          `Temática: "${tema}". Categorías en juego: ${categorias.join(", ")}.
Armá un pool de exactamente ${total} elementos al azar de esa temática. Balanceado: cada categoría con al menos un candidato fuerte, pero que ningún elemento gane en todo. Mezclá íconos, opciones intermedias y alguna rareza.
Semilla: ${Math.random().toString(36).slice(2)}.
JSON: [{"nombre":"...","detalle":"dato clave, máximo 8 palabras"}] con ${total} objetos distintos.`,
          SYS
        )
      );
      setLotes(arr.slice(0, total).map((x, i) => ({ ...x, n: i + 1, id: i })));
      setRegistro([]);
      setFase("remate");
    });

  /* ── Local: adjudicación manual ── */
  const montoValido = () => {
    const p = parseInt(precio, 10);
    if (ganador === null || !catElegida) return false;
    return Number.isInteger(p) && p >= 1 && p <= maximo(ganador);
  };
  const adjudicarLocal = () => {
    if (!montoValido()) return;
    cerrarLote(ganador, parseInt(precio, 10), catElegida, loteActual.id);
  };
  const deshacer = () => {
    setRegistro((r) => r.slice(0, -1));
    setGanador(null);
    setPrecio("");
    setCatElegida("");
    setOfertaHost(null);
    setOfertaTexto("");
    setPendiente(null);
    setUltimaPuja(null);
  };

  /* ── Veredictos ── */
  const pedirVeredicto = () =>
    correr("el juez delibera", async () => {
      const cat = categorias[ronda];
      const a = piezaDe(0, cat);
      const b = piezaDe(1, cat);
      const v = parseJSON(
        await ask(
          `Temática: "${tema}". Categoría en disputa: "${cat}".
A) ${a.nombre} (${a.detalle}) — lo compró ${nombres[0]} por $${a.precio}.
B) ${b.nombre} (${b.detalle}) — lo compró ${nombres[1]} por $${b.precio}.
Evaluá sólo dentro de esa categoría, con datos duros. Prohibido el empate.
JSON: {"ganador":"A" o "B","motivo":"una línea contundente, máximo 18 palabras","puntosA":["fortaleza con dato duro","debilidad frente al rival"],"puntosB":["fortaleza con dato duro","debilidad frente al rival"]}`,
          SYS
        )
      );
      setVeredictos((vs) => ({ ...vs, [cat]: v }));
    });

  const fallar = (lado) => {
    const cat = categorias[ronda];
    setVeredictos((vs) => ({ ...vs, [cat]: { ...vs[cat], fallo: lado } }));
    if (ronda + 1 < categorias.length) setRonda(ronda + 1);
    else setFase("final");
  };

  useEffect(() => {
    if (fase !== "final" || cierre || cargando || invitado) return;
    correr("redactando el acta", async () => {
      const detalle = categorias
        .map((c) => {
          const a = piezaDe(0, c);
          const b = piezaDe(1, c);
          const g = veredictos[c]?.fallo === "A" ? nombres[0] : nombres[1];
          return `${c}: ${a.nombre} ($${a.precio}) vs ${b.nombre} ($${b.precio}) → ganó ${g}`;
        })
        .join("\n");
      const p1 = puntos(0);
      const p2 = puntos(1);
      const r = parseJSON(
        await ask(
          `Temática: "${tema}". Resultado: ${nombres[0]} ${p1} - ${p2} ${nombres[1]}.
Plata sin gastar: ${nombres[0]} $${plata(0)}, ${nombres[1]} $${plata(1)}.
Rondas:
${detalle}
${p1 === p2 ? "HAY EMPATE EN DUELOS: desempatá vos, priorizando quién administró mejor la plata y quién ganó de forma más dominante." : ""}
JSON: {"campeon":"nombre exacto del campeón","conclusion":"3 o 4 oraciones: coroná al campeón, señalá su mejor compra y el error de gestión del rival"}`,
          SYS
        )
      );
      setCierre(r);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fase]);

  const reiniciar = () => {
    setFase("portada");
    setModo("local");
    setRol("host");
    setSala("");
    setConectado(false);
    setTema("");
    setTemaCandidato(null);
    setTemaManual("");
    setDescartadas([]);
    setCategorias([]);
    setCatInput("");
    setLotes([]);
    setRegistro([]);
    setGanador(null);
    setPrecio("");
    setCatElegida("");
    setOfertaHost(null);
    setOfertaTexto("");
    setAccionJ2(null);
    setPendiente(null);
    setUltimaPuja(null);
    setVeredictos({});
    setRonda(0);
    setCierre(null);
    setFlash(null);
    setError("");
  };

  /* ── HUD compacto ── */
  const hud = (mod) => {
    const pct =
      mod === "remate"
        ? (registro.length / Math.max(1, lotes.length)) * 100
        : (ronda / Math.max(1, categorias.length)) * 100;
    const ultimo = registro[registro.length - 1];
    return (
      <div
        className="sb-hud sticky top-0 z-20 -mx-4 mb-6 px-4 pb-2 pt-2 sm:-mx-6 sm:px-6"
        style={{ background: "rgba(23,7,38,0.95)", borderBottom: `1px solid ${C.border}` }}
      >
        <div className="flex items-center justify-between gap-3">
          <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.32em", color: C.gold }}>
            {online ? `SALA ${sala}` : "LA SUBASTA"}
          </span>
          <button
            onClick={() => setHudAbierto((h) => !h)}
            className="flex items-center gap-1"
            style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.18em", color: C.mute }}
          >
            {mod === "remate"
              ? `LOTE ${Math.min(registro.length + 1, lotes.length)}/${lotes.length}`
              : `DUELO ${ronda + 1}/${categorias.length}`}
            <ChevronDown
              size={12}
              style={{ transform: hudAbierto ? "rotate(180deg)" : "none", transition: "transform .2s" }}
            />
          </button>
        </div>
        <div className="mt-1.5 w-full" style={{ height: 2, background: C.panel }}>
          <div style={{ height: "100%", width: `${pct}%`, background: C.gold, transition: "width .45s ease" }} />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2">
          {[0, 1].map((i) => {
            const fuera = mod === "remate" && !habilitado(i);
            const yo = online && ((rol === "host" && i === 0) || (rol === "invitado" && i === 1));
            return (
              <div key={i} style={{ opacity: fuera ? 0.5 : 1 }}>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate" style={{ fontFamily: DISPLAY, fontSize: 14 }}>
                    {nombres[i]}
                    {yo ? <span style={{ color: C.gold, fontSize: 10 }}> · vos</span> : null}
                  </span>
                  {mod === "remate" ? (
                    <span style={{ fontFamily: MONO, fontSize: 13, color: C.mint }}>${plata(i)}</span>
                  ) : (
                    <span style={{ fontFamily: DISPLAY, fontSize: 17, color: C.gold, lineHeight: 1 }}>
                      {puntos(i)}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-1">
                  {categorias.map((cat) => {
                    const p = piezaDe(i, cat);
                    const reciente = ultimo && ultimo.jugador === i && ultimo.categoria === cat;
                    const enDisputa = mod === "duelos" && categorias[ronda] === cat;
                    const gano = mod === "duelos" && veredictos[cat]?.fallo === (i === 0 ? "A" : "B");
                    return (
                      <span
                        key={cat}
                        title={`${cat}${p ? `: ${p.nombre} ($${p.precio})` : ": vacío"}`}
                        className={`rounded-sm px-1.5 py-0.5 ${reciente ? "sb-nuevo" : ""}`}
                        style={{
                          fontFamily: MONO,
                          fontSize: 8.5,
                          letterSpacing: "0.08em",
                          color: gano ? C.mint : p ? C.ivory : C.mute,
                          border: `1px ${p ? "solid" : "dashed"} ${
                            enDisputa ? C.gold : gano ? C.mint : p ? C.border : "#43206b"
                          }`,
                          background: enDisputa ? "rgba(255,200,87,0.12)" : "transparent",
                        }}
                      >
                        {cat.slice(0, 3).toUpperCase()}
                        {p ? ` $${p.precio}` : ""}
                      </span>
                    );
                  })}
                </div>
                {hudAbierto ? (
                  <div className="mt-1.5 flex flex-col gap-0.5">
                    {categorias.map((cat) => {
                      const p = piezaDe(i, cat);
                      return (
                        <div key={cat} className="flex items-baseline justify-between gap-2">
                          <span style={{ fontFamily: MONO, fontSize: 8, color: C.gold }}>
                            {cat.toUpperCase()}
                          </span>
                          <span
                            className="truncate"
                            style={{ fontFamily: DISPLAY, fontSize: 12, color: p ? C.ivory : C.mute }}
                          >
                            {p ? p.nombre : "—"}
                          </span>
                        </div>
                      );
                    })}
                    {mod === "remate" ? (
                      <div style={{ fontFamily: MONO, fontSize: 8, color: C.mute }}>
                        {fuera ? "COMPLETO" : `TOPE $${maximo(i)}`}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const Tablero = ({ i }) => (
    <div className="rounded-sm p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
      <div className="flex items-baseline justify-between gap-2">
        <span className="truncate" style={{ fontFamily: DISPLAY, fontSize: 19 }}>
          {nombres[i]}
        </span>
        <span className="flex items-center gap-1" style={{ fontFamily: MONO, fontSize: 18, color: C.mint }}>
          <Coins size={13} />${plata(i)}
        </span>
      </div>
      <div className="mt-3 flex flex-col gap-2">
        {categorias.map((cat) => {
          const p = piezaDe(i, cat);
          return (
            <div
              key={cat}
              className="flex items-center justify-between gap-3 rounded-sm px-3 py-2"
              style={{ background: C.panel2, border: `1px solid ${C.border}` }}
            >
              <div className="min-w-0">
                <div style={{ fontFamily: MONO, fontSize: 9, color: C.gold, letterSpacing: "0.12em" }}>
                  {cat.toUpperCase()}
                </div>
                <div className="truncate" style={{ fontFamily: DISPLAY, fontSize: 16 }}>
                  {p ? p.nombre : "—"}
                </div>
              </div>
              {p ? <span style={{ fontFamily: MONO, fontSize: 13, color: C.mint }}>${p.precio}</span> : null}
            </div>
          );
        })}
      </div>
      <div
        className="mt-3 pt-3 text-xs"
        style={{ borderTop: `1px solid ${C.border}`, fontFamily: MONO, color: C.mute }}
      >
        GASTÓ ${gastado(i)} · LE QUEDÓ ${plata(i)}
      </div>
    </div>
  );

  /* ─────────────────────────── Render ─────────────────────────── */
  const miTope = invitado ? maximo(1) : maximo(0);
  const yaOferte = invitado
    ? accionJ2?.oferta?.lote === loteActual?.id
    : ofertaHost != null;
  const ofertaValida = () => {
    const n = parseInt(ofertaTexto, 10);
    return Number.isInteger(n) && n >= 1 && n <= miTope;
  };

  return (
    <div
      className="min-h-screen w-full"
      style={{
        background: C.night,
        backgroundImage: `radial-gradient(1100px 520px at 50% -8%, rgba(255,200,87,0.16), transparent 68%), radial-gradient(700px 400px at 10% 100%, rgba(255,61,104,0.12), transparent 70%)`,
        color: C.ivory,
        fontFamily: BODY,
      }}
    >
      <style>{`
        .sb-btn { transition: transform .18s ease, filter .18s ease; }
        .sb-btn:hover:not(:disabled) { transform: translateY(-2px); filter: brightness(1.09); }
        .sb-card { transition: transform .2s ease, border-color .2s ease; }
        .sb-card:hover { transform: translateY(-3px); }
        .sb-in { animation: sbIn .45s ease both; }
        @keyframes sbIn { from { opacity:0; transform: translateY(12px);} to {opacity:1; transform:none;} }
        .sb-stamp { animation: sbStamp .55s cubic-bezier(.2,1.4,.4,1) both; }
        @keyframes sbStamp { 0%{opacity:0;transform:scale(1.3) rotate(-3deg);filter:blur(4px);} 60%{opacity:1;transform:scale(.98) rotate(.6deg);filter:blur(0);} 100%{transform:scale(1) rotate(0);} }
        .sb-spin { animation: sbSpin 1s linear infinite; }
        @keyframes sbSpin { to { transform: rotate(360deg);} }
        .sb-martillo { transform-origin: 310px 210px; animation: sbGolpe 3.6s cubic-bezier(.5,0,.4,1) infinite; }
        @keyframes sbGolpe { 0%,55%{transform:rotate(-26deg);} 68%{transform:rotate(4deg);} 74%{transform:rotate(-6deg);} 82%,100%{transform:rotate(-26deg);} }
        .sb-impacto { animation: sbImpacto 3.6s linear infinite; transform-origin: 310px 232px; }
        @keyframes sbImpacto { 0%,66%{opacity:0;transform:scale(.4);} 69%{opacity:.9;transform:scale(1);} 78%,100%{opacity:0;transform:scale(3);} }
        .sb-chispa { animation: sbChispa 3.6s ease-in-out infinite; }
        @keyframes sbChispa { 0%,100%{opacity:.15;transform:translateY(0);} 50%{opacity:.85;transform:translateY(-10px);} }
        .sb-flash { animation: sbFlash 1.15s cubic-bezier(.2,1.3,.4,1) both; }
        @keyframes sbFlash { 0%{opacity:0;transform:scale(1.7) rotate(-7deg);filter:blur(6px);} 22%{opacity:1;transform:scale(1) rotate(-3deg);filter:blur(0);} 72%{opacity:1;transform:scale(1) rotate(-3deg);} 100%{opacity:0;transform:scale(1.06) rotate(-3deg);} }
        .sb-nuevo { animation: sbNuevo 1.2s ease both; }
        @keyframes sbNuevo { 0%{background:${C.gold};color:#2a1500;} 100%{background:transparent;} }
        .sb-hud { backdrop-filter: blur(10px); }
        .sb-latido { animation: sbLatido 1.6s ease-in-out infinite; }
        @keyframes sbLatido { 0%,100%{opacity:1;} 50%{opacity:.45;} }
        input:focus-visible, button:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }
      `}</style>

      {flash ? (
        <div className="pointer-events-none fixed inset-0 z-30 flex items-center justify-center px-6">
          <div
            className="sb-flash rounded-sm px-8 py-6 text-center"
            style={{
              background: C.paper,
              color: C.night,
              border: `2px solid ${C.goldDeep}`,
              boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
              maxWidth: 420,
            }}
          >
            <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.32em", color: C.crimson }}>
              ADJUDICADO
            </div>
            <div className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 30, lineHeight: 1.1 }}>
              {flash.lote}
            </div>
            <div className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 18 }}>
              {flash.jugador} · <span style={{ fontFamily: MONO }}>${flash.precio}</span>
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: "#6f6449" }}>
              {flash.cat?.toUpperCase()}
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6" ref={tope}>
        {/* ── PORTADA ── */}
        {fase === "portada" ? (
          <section className="sb-in">
            <div className="overflow-hidden rounded-sm" style={{ background: C.night2, border: `1px solid ${C.border}` }}>
              <div className="px-6 pt-8 sm:px-10">
                <Eyebrow>Remate en vivo · dos paletas · un martillo</Eyebrow>
                <h1
                  className="mt-3"
                  style={{
                    fontFamily: DISPLAY,
                    fontSize: 58,
                    lineHeight: 0.95,
                    letterSpacing: "0.1em",
                    color: C.gold,
                    textShadow: "0 6px 30px rgba(255,200,87,0.35)",
                  }}
                >
                  LA
                  <br />
                  SUBASTA
                </h1>
                <p className="mt-4 max-w-md" style={{ fontSize: 16, lineHeight: 1.6 }}>
                  Salen lotes al azar. Ustedes pujan con plata contada y los acomodan en sus
                  categorías. Al final, se comparan cara a cara.
                </p>
              </div>
              <div className="-mt-6 sm:-mt-16">
                <Escenario />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ["Eligen el universo", "Países, actores, autos, bandas. Lo escriben ustedes o lo tira el juez."],
                ["Definen las categorías", "Cinco frentes de batalla: potencia, salud, tecnología, lo que quieran."],
                ["Sale un lote y se puja", "Aparece un elemento al azar y se pelea con plata contada."],
                ["La plata se cuida", "Arrancan con $20 y siempre tienen que dejar $1 por cada categoría vacía."],
                ["Baja el martillo", "Categoría por categoría, el juez compara y ustedes confirman o lo anulan."],
              ].map(([t, d], i) => (
                <div key={t} className="sb-card rounded-sm p-4" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                  <span style={{ fontFamily: MONO, fontSize: 11, color: C.crimson, letterSpacing: "0.2em" }}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="mt-1" style={{ fontFamily: DISPLAY, fontSize: 19 }}>
                    {t}
                  </div>
                  <p className="mt-1 text-sm" style={{ color: C.mute, lineHeight: 1.5 }}>
                    {d}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-7">
              <Boton icon={ChevronRight} onClick={() => setFase("modo")}>
                Empezar
              </Boton>
            </div>
          </section>
        ) : null}

        {/* ── MODO ── */}
        {fase === "modo" ? (
          <section className="sb-in">
            <Eyebrow>Paso 1 — dónde juegan</Eyebrow>
            <h2 className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 30 }}>
              ¿Un solo aparato o cada uno con el suyo?
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <button
                onClick={() => {
                  setModo("local");
                  setRol("host");
                  setFase("sala");
                }}
                className="sb-card rounded-sm p-6 text-left"
                style={{ background: C.panel, border: `1px solid ${C.border}`, cursor: "pointer" }}
              >
                <Users size={26} style={{ color: C.gold }} strokeWidth={1.5} />
                <div className="mt-3" style={{ fontFamily: DISPLAY, fontSize: 24 }}>
                  Modo local
                </div>
                <p className="mt-2 text-sm" style={{ color: C.mute, lineHeight: 1.55 }}>
                  Pujan hablando, cara a cara, y cargan en la app quién se llevó el lote y por
                  cuánto. Un solo teléfono en la mesa.
                </p>
              </button>

              <button
                onClick={() => {
                  setModo("online");
                  setRol("host");
                  setSala(nuevoCodigo());
                  setFase("sala");
                }}
                className="sb-card rounded-sm p-6 text-left"
                style={{ background: C.panel, border: `1px solid ${C.gold}`, cursor: "pointer" }}
              >
                <Wifi size={26} style={{ color: C.gold }} strokeWidth={1.5} />
                <div className="mt-3" style={{ fontFamily: DISPLAY, fontSize: 24 }}>
                  Modo online
                </div>
                <p className="mt-2 text-sm" style={{ color: C.mute, lineHeight: 1.55 }}>
                  Cada uno en su pantalla, con código de sala. Las ofertas son{" "}
                  <span style={{ color: C.gold }}>a ciegas</span>: cargan el número y se revelan
                  juntos.
                </p>
              </button>
            </div>

            <div className="mt-5 rounded-sm p-5" style={{ background: C.night2, border: `1px solid ${C.border}` }}>
              <Eyebrow color={C.mute}>Ya tenés un código</Eyebrow>
              <div className="mt-3 flex flex-wrap gap-2">
                <div className="min-w-0 flex-1">
                  <Campo
                    value={codigoInput}
                    onChange={(v) => setCodigoInput(v.toUpperCase().slice(0, 4))}
                    placeholder="ABCD"
                  />
                </div>
                <Boton
                  icon={ChevronRight}
                  disabled={codigoInput.length !== 4}
                  onClick={() => {
                    setModo("online");
                    setRol("invitado");
                    setSala(codigoInput);
                    setFase("unirse");
                  }}
                >
                  Entrar
                </Boton>
              </div>
            </div>
          </section>
        ) : null}

        {/* ── UNIRSE (invitado) ── */}
        {fase === "unirse" ? (
          <section className="sb-in">
            <Eyebrow>Sala {sala}</Eyebrow>
            <h2 className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 30 }}>
              ¿Con qué nombre entrás?
            </h2>
            <div className="mt-5 max-w-sm">
              <Campo
                value={nombres[1]}
                onChange={(v) => setNombres((n) => [n[0], v])}
                placeholder="Tu nombre"
                onEnter={() => escribirJ2({ nombre: nombres[1] })}
              />
            </div>
            <div className="mt-5">
              <Boton
                icon={Check}
                disabled={!nombres[1].trim()}
                onClick={() => escribirJ2({ nombre: nombres[1].trim() })}
              >
                Levantar la paleta
              </Boton>
            </div>
            {accionJ2?.nombre ? (
              <Espera texto={`Listo, ${accionJ2.nombre}. Esperando a que el anfitrión arme la partida…`} />
            ) : null}
          </section>
        ) : null}

        {/* ── SALA (anfitrión) ── */}
        {fase === "sala" ? (
          invitado ? (
            <section className="sb-in">
              <Eyebrow>Sala {sala}</Eyebrow>
              <Espera texto={`Ya te uniste como ${nombres[1]}. Esperando a que ${nombres[0] || "el anfitrión"} termine de configurar la partida…`} />
            </section>
          ) : (
          <section className="sb-in">
            {online ? (
              <div
                className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-sm p-5"
                style={{ background: C.panel, border: `1px solid ${C.gold}` }}
              >
                <div>
                  <Eyebrow color={C.mute}>Código de la sala</Eyebrow>
                  <div style={{ fontFamily: DISPLAY, fontSize: 46, letterSpacing: "0.2em", color: C.gold }}>
                    {sala}
                  </div>
                  <p className="text-xs" style={{ color: C.mute }}>
                    Pasáselo al otro jugador. Cualquiera con el código entra a la sala.
                  </p>
                </div>
                <div className="text-right">
                  <div
                    className={accionJ2?.nombre ? "" : "sb-latido"}
                    style={{ fontFamily: MONO, fontSize: 11, color: accionJ2?.nombre ? C.mint : C.mute }}
                  >
                    {accionJ2?.nombre ? `● ${accionJ2.nombre.toUpperCase()} CONECTADO` : "○ ESPERANDO PALETA 2"}
                  </div>
                </div>
              </div>
            ) : null}

            <Eyebrow>Paso 2 — las paletas</Eyebrow>
            <h2 className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 30 }}>
              {online ? "Tu nombre y la plata inicial" : "¿Quiénes rematan hoy?"}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {(online ? [0] : [0, 1]).map((i) => (
                <div key={i}>
                  <Eyebrow color={C.mute}>Paleta {String(i + 1).padStart(2, "0")}</Eyebrow>
                  <div className="mt-2">
                    <Campo
                      value={nombres[i]}
                      onChange={(v) => setNombres((ns) => ns.map((x, k) => (k === i ? v : x)))}
                      placeholder={`Jugador ${i + 1}`}
                    />
                  </div>
                </div>
              ))}
              <div>
                <Eyebrow color={C.mute}>Plata inicial de cada uno</Eyebrow>
                <div className="mt-2">
                  <Campo
                    tipo="number"
                    value={presupuesto}
                    onChange={(v) => setPresupuesto(Math.max(5, Math.min(200, parseInt(v || "0", 10) || 0)))}
                  />
                </div>
              </div>
            </div>
            <div className="mt-7">
              <Boton
                icon={ChevronRight}
                disabled={nombres.some((n) => !n.trim()) || (online && !accionJ2?.nombre)}
                onClick={() => setFase("tematica")}
              >
                {online && !accionJ2?.nombre ? "Falta la paleta 2" : "Siguiente"}
              </Boton>
            </div>
          </section>
          )
        ) : null}

        {/* ── TEMÁTICA ── */}
        {fase === "tematica" ? (
          invitado ? (
            <section className="sb-in">
              <Eyebrow>Sala {sala}</Eyebrow>
              <Espera texto={`${nombres[0]} está eligiendo la temática…`} />
            </section>
          ) : (
            <section className="sb-in">
              <Eyebrow>Paso 3 — el universo</Eyebrow>
              <h2 className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 30 }}>
                ¿Sobre qué se remata?
              </h2>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="rounded-sm p-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                  <Eyebrow color={C.mute}>La eligen ustedes</Eyebrow>
                  <div className="mt-3">
                    <Campo
                      value={temaManual}
                      onChange={setTemaManual}
                      onEnter={() => temaManual.trim() && fijarTema(temaManual.trim())}
                      placeholder="Países, actores, autos, bandas…"
                    />
                  </div>
                  <div className="mt-4">
                    <Boton variant="paper" icon={Check} disabled={!temaManual.trim()} onClick={() => fijarTema(temaManual.trim())}>
                      Usar esta
                    </Boton>
                  </div>
                </div>
                <div className="rounded-sm p-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                  <Eyebrow color={C.mute}>La tira el juez</Eyebrow>
                  {temaCandidato ? (
                    <div className="sb-stamp mt-3">
                      <div style={{ fontFamily: DISPLAY, fontSize: 26, color: C.gold }}>{temaCandidato.tema}</div>
                      <div className="mt-1 text-sm" style={{ color: C.mute }}>
                        {temaCandidato.descripcion}
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-sm" style={{ color: C.mute }}>
                      Rechacen las que quieran. Sale otra al toque.
                    </p>
                  )}
                  {cargando ? <Cargando texto={cargando} /> : null}
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Boton
                      variant="ghost"
                      icon={temaCandidato ? RefreshCw : Sparkles}
                      disabled={!!cargando}
                      onClick={() => {
                        if (temaCandidato) setDescartadas((d) => [...d, temaCandidato.tema]);
                        tirarTema();
                      }}
                    >
                      {temaCandidato ? "Otra" : "Tirar temática"}
                    </Boton>
                    {temaCandidato ? (
                      <Boton icon={Check} onClick={() => fijarTema(temaCandidato.tema)}>
                        Jugamos con esta
                      </Boton>
                    ) : null}
                  </div>
                </div>
              </div>
              <Aviso texto={error} onRetry={reintento} />
            </section>
          )
        ) : null}

        {/* ── CATEGORÍAS ── */}
        {fase === "categorias" ? (
          invitado ? (
            <section className="sb-in">
              <Eyebrow>Sala {sala} · {tema}</Eyebrow>
              <Espera texto="Se están definiendo las categorías…" />
              {categorias.length ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {categorias.map((c) => (
                    <span
                      key={c}
                      className="rounded-sm px-3 py-2"
                      style={{ background: C.gold, color: "#2a1500", fontFamily: MONO, fontSize: 12 }}
                    >
                      {c.toUpperCase()}
                    </span>
                  ))}
                </div>
              ) : null}
            </section>
          ) : (
            <section className="sb-in">
              <Eyebrow>Paso 4 — los frentes de batalla</Eyebrow>
              <h2 className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 30 }}>
                {tema}
              </h2>
              <p className="mt-2 text-sm" style={{ color: C.mute }}>
                Entre 3 y 6 categorías. Cada una es un duelo al final y cada jugador tiene que
                llenarlas todas.
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <div className="rounded-sm p-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                  <Eyebrow color={C.mute}>Las escriben ustedes</Eyebrow>
                  <div className="mt-3 flex gap-2">
                    <Campo value={catInput} onChange={setCatInput} onEnter={agregarCat} placeholder="Ej: potencia mundial" />
                    <Boton icon={Plus} onClick={agregarCat} disabled={categorias.length >= 6}>
                      Sumar
                    </Boton>
                  </div>
                </div>
                <div className="rounded-sm p-5" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                  <Eyebrow color={C.mute}>Las tira el juez</Eyebrow>
                  <p className="mt-3 text-sm" style={{ color: C.mute }}>
                    Cinco categorías hechas a medida de la temática.
                  </p>
                  {cargando ? <Cargando texto={cargando} /> : null}
                  <div className="mt-4">
                    <Boton
                      variant="ghost"
                      icon={categorias.length ? RefreshCw : Sparkles}
                      disabled={!!cargando}
                      onClick={tirarCategorias}
                    >
                      {categorias.length ? "Rehacer las 5" : "Tirar categorías"}
                    </Boton>
                  </div>
                </div>
              </div>

              {categorias.length ? (
                <div className="mt-6 flex flex-wrap gap-2">
                  {categorias.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-2 rounded-sm px-3 py-2"
                      style={{ background: C.gold, color: "#2a1500", fontFamily: MONO, fontSize: 12 }}
                    >
                      {c.toUpperCase()}
                      <button onClick={() => setCategorias((cs) => cs.filter((x) => x !== c))}>
                        <X size={13} />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}

              {categorias.length >= 3 ? (
                <div className="mt-7">
                  <p className="mb-3 text-sm" style={{ color: C.mute }}>
                    Salen {categorias.length * 2} lotes. Cada uno arranca con ${presupuesto} y el tope de
                    la primera oferta es ${presupuesto - (categorias.length - 1)}.
                  </p>
                  <Boton icon={Gavel} disabled={!!cargando} onClick={abrirRemate}>
                    Abrir el remate
                  </Boton>
                </div>
              ) : null}
              <Aviso texto={error} onRetry={reintento} />
            </section>
          )
        ) : null}

        {/* ── REMATE ── */}
        {fase === "remate" ? (
          <section>
            {hud("remate")}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <Eyebrow>
                  {online ? "Puja a ciegas" : "Remate"} · {tema}
                </Eyebrow>
                <h2 className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 26 }}>
                  {loteActual ? `Lote ${registro.length + 1} de ${lotes.length}` : "Remate cerrado"}
                </h2>
              </div>
              {registro.length && anfitrion ? (
                <Boton variant="ghost" size="sm" icon={Undo2} onClick={deshacer}>
                  Deshacer último
                </Boton>
              ) : null}
            </div>

            {loteActual ? (
              <div className="mt-6 flex flex-col gap-5">
                <div key={loteActual.id} className="sb-stamp">
                  <Ficha lote={loteActual} size="xl" />
                </div>

                {/* ONLINE: puja a ciegas */}
                {online ? (
                  pendiente ? (
                    (invitado && pendiente.jugador === 1) || (anfitrion && pendiente.jugador === 0) ? (
                      <div className="rounded-sm p-5" style={{ background: C.panel, border: `1px solid ${C.gold}` }}>
                        <Eyebrow>Te lo llevaste por ${pendiente.precio}</Eyebrow>
                        <p className="mt-2 text-sm" style={{ color: C.mute }}>
                          ¿En qué categoría lo ponés?
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {vacias(pendiente.jugador).map((c) => (
                            <button
                              key={c}
                              onClick={() =>
                                pendiente.jugador === 0
                                  ? cerrarLote(0, pendiente.precio, c, pendiente.loteId)
                                  : escribirJ2({ categoria: { lote: pendiente.loteId, cat: c } })
                              }
                              className="sb-btn rounded-sm px-3 py-2"
                              style={{
                                background: "transparent",
                                color: C.ivory,
                                border: `1px solid ${C.border}`,
                                fontFamily: MONO,
                                fontSize: 11,
                                letterSpacing: "0.1em",
                                cursor: "pointer",
                              }}
                            >
                              {c.toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <Espera
                        texto={`${nombres[pendiente.jugador]} se lo llevó por $${pendiente.precio}. Está eligiendo categoría…`}
                      />
                    )
                  ) : !habilitado(invitado ? 1 : 0) ? (
                    <Espera texto="Ya completaste tus categorías. Mirá cómo se lo llevan." />
                  ) : yaOferte ? (
                    <div
                      className="rounded-sm p-5 text-center"
                      style={{ background: C.panel, border: `1px solid ${C.border}` }}
                    >
                      <EyeOff size={20} className="mx-auto" style={{ color: C.gold }} />
                      <p className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 20 }}>
                        Oferta cargada. Sobre cerrado.
                      </p>
                      <p className="sb-latido mt-1 text-xs" style={{ fontFamily: MONO, color: C.mute }}>
                        ESPERANDO AL RIVAL
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-sm p-5" style={{ background: C.panel, border: `1px solid ${C.gold}` }}>
                      <Eyebrow>Tu oferta — nadie la ve hasta que ofertan los dos</Eyebrow>
                      <div className="mt-3 flex items-center gap-3">
                        <span style={{ fontFamily: DISPLAY, fontSize: 26, color: C.mint }}>$</span>
                        <Campo tipo="number" value={ofertaTexto} onChange={setOfertaTexto} placeholder={`1 a ${miTope}`} />
                        <Boton
                          icon={Gavel}
                          disabled={!ofertaValida()}
                          onClick={() => {
                            const n = parseInt(ofertaTexto, 10);
                            if (invitado) escribirJ2({ oferta: { lote: loteActual.id, monto: n } });
                            else setOfertaHost(n);
                          }}
                        >
                          Ofertar
                        </Boton>
                      </div>
                      <div className="mt-2 text-xs" style={{ fontFamily: MONO, color: C.mute }}>
                        TOPE ${miTope} · RESERVÁS ${Math.max(0, vacias(invitado ? 1 : 0).length - 1)} PARA LAS OTRAS
                      </div>
                    </div>
                  )
                ) : (
                  /* LOCAL: carga manual */
                  <div className="rounded-sm p-5" style={{ background: C.panel, border: `1px solid ${C.gold}` }}>
                    <Eyebrow>¿Quién se lo llevó?</Eyebrow>
                    <div className="mt-3 flex flex-wrap gap-3">
                      {[0, 1].map((i) => (
                        <button
                          key={i}
                          disabled={!habilitado(i)}
                          onClick={() => {
                            setGanador(i);
                            setCatElegida("");
                          }}
                          className="sb-btn rounded-sm px-4 py-3"
                          style={{
                            background: ganador === i ? C.gold : "transparent",
                            color: ganador === i ? "#2a1500" : C.ivory,
                            border: `1px solid ${ganador === i ? C.gold : C.border}`,
                            fontFamily: DISPLAY,
                            fontSize: 17,
                            opacity: habilitado(i) ? 1 : 0.35,
                            cursor: habilitado(i) ? "pointer" : "not-allowed",
                          }}
                        >
                          {nombres[i]} <span style={{ fontFamily: MONO, fontSize: 12 }}>· tope ${maximo(i)}</span>
                        </button>
                      ))}
                    </div>

                    {ganador !== null ? (
                      <div className="sb-in mt-5 grid gap-4 sm:grid-cols-2">
                        <div>
                          <Eyebrow color={C.mute}>¿Cuánto pagó?</Eyebrow>
                          <div className="mt-2 flex items-center gap-3">
                            <span style={{ fontFamily: DISPLAY, fontSize: 26, color: C.mint }}>$</span>
                            <Campo tipo="number" value={precio} onChange={setPrecio} placeholder={`1 a ${maximo(ganador)}`} />
                          </div>
                          <div className="mt-2 text-xs" style={{ fontFamily: MONO, color: C.mute }}>
                            TIENE ${plata(ganador)} · RESERVA ${Math.max(0, vacias(ganador).length - 1)}
                          </div>
                        </div>
                        <div>
                          <Eyebrow color={C.mute}>¿En qué categoría lo pone?</Eyebrow>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {vacias(ganador).map((c) => (
                              <button
                                key={c}
                                onClick={() => setCatElegida(c)}
                                className="sb-btn rounded-sm px-3 py-2"
                                style={{
                                  background: catElegida === c ? C.crimson : "transparent",
                                  color: catElegida === c ? "#2a0009" : C.ivory,
                                  border: `1px solid ${catElegida === c ? C.crimson : C.border}`,
                                  fontFamily: MONO,
                                  fontSize: 11,
                                  letterSpacing: "0.1em",
                                  cursor: "pointer",
                                }}
                              >
                                {c.toUpperCase()}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="mt-5">
                      <Boton icon={Gavel} disabled={!montoValido()} onClick={adjudicarLocal}>
                        Adjudicado
                      </Boton>
                      {ganador !== null && precio && !montoValido() ? (
                        <p className="mt-3 text-sm" style={{ color: C.crimson }}>
                          {!catElegida ? "Falta elegir la categoría." : `La oferta va de $1 a $${maximo(ganador)}.`}
                        </p>
                      ) : null}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-6">
                <p style={{ fontFamily: DISPLAY, fontSize: 20 }}>Todos los lotes tienen dueño. Que pase el juez.</p>
                {anfitrion ? (
                  <div className="mt-4">
                    <Boton icon={Gavel} onClick={() => setFase("duelos")}>
                      Ir a los duelos
                    </Boton>
                  </div>
                ) : (
                  <Espera texto="Esperando al anfitrión…" />
                )}
              </div>
            )}

            {ultimaPuja && online ? (
              <div
                className="mt-5 rounded-sm px-4 py-3 text-center"
                style={{ border: `1px solid ${C.border}`, fontFamily: MONO, fontSize: 12, color: C.mute }}
              >
                ÚLTIMA PUJA REVELADA · {nombres[0].toUpperCase()} ${ultimaPuja.a} vs{" "}
                {nombres[1].toUpperCase()} ${ultimaPuja.b} → {nombres[ultimaPuja.ganador].toUpperCase()}
              </div>
            ) : null}

            {registro.length ? (
              <div className="mt-8">
                <Eyebrow color={C.mute}>Cartelera</Eyebrow>
                <div className="mt-3 flex flex-col gap-2">
                  {[...registro].reverse().map((r, k) => {
                    const l = lotes.find((x) => x.id === r.loteId);
                    return (
                      <div
                        key={r.loteId}
                        className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-sm px-4 py-2"
                        style={{
                          border: `1px solid ${k === 0 ? C.gold : C.border}`,
                          background: k === 0 ? "rgba(255,200,87,0.07)" : "transparent",
                        }}
                      >
                        <span style={{ fontFamily: MONO, fontSize: 11, color: C.crimson }}>
                          {String(l.n).padStart(2, "0")}
                        </span>
                        <span style={{ fontFamily: DISPLAY, fontSize: 17 }}>{l.nombre}</span>
                        <span style={{ fontFamily: MONO, fontSize: 10, color: C.mute, letterSpacing: "0.1em" }}>
                          {r.categoria.toUpperCase()}
                        </span>
                        <span className="ml-auto" style={{ fontFamily: DISPLAY, fontSize: 15, color: C.gold }}>
                          {nombres[r.jugador]}
                        </span>
                        <span style={{ fontFamily: MONO, fontSize: 14, color: C.mint }}>${r.precio}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}

        {/* ── DUELOS ── */}
        {fase === "duelos" ? (
          (() => {
            const cat = categorias[ronda];
            const a = piezaDe(0, cat);
            const b = piezaDe(1, cat);
            const v = veredictos[cat];
            if (!a || !b) return null;
            const nomGanaIA = v ? (v.ganador === "A" ? a.nombre : b.nombre) : "";
            const nomOtro = v ? (v.ganador === "A" ? b.nombre : a.nombre) : "";
            return (
              <section>
                {hud("duelos")}
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <Eyebrow>
                      Duelo {ronda + 1} de {categorias.length}
                    </Eyebrow>
                    <h2 className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 30 }}>
                      {cat}
                    </h2>
                  </div>
                </div>

                <div className="mt-6 grid gap-5 sm:grid-cols-2">
                  {[
                    { lado: "A", pieza: a, jugador: nombres[0] },
                    { lado: "B", pieza: b, jugador: nombres[1] },
                  ].map(({ lado, pieza, jugador }) => {
                    const gana = v && v.ganador === lado;
                    return (
                      <div key={lado}>
                        <div className="flex items-baseline justify-between">
                          <Eyebrow color={C.mute}>{jugador}</Eyebrow>
                          <span style={{ fontFamily: MONO, fontSize: 12, color: C.mint }}>pagó ${pieza.precio}</span>
                        </div>
                        <div
                          className="mt-2 rounded-sm"
                          style={{ outline: gana ? `2px solid ${C.gold}` : "none", outlineOffset: 3 }}
                        >
                          <Ficha lote={pieza} apagado={v && !gana} />
                        </div>
                        {v ? (
                          <ul className="mt-3 flex flex-col gap-2">
                            {(lado === "A" ? v.puntosA : v.puntosB).map((p, k) => (
                              <li key={k} className="text-sm" style={{ color: gana ? C.ivory : C.mute, lineHeight: 1.5 }}>
                                <span style={{ color: C.gold }}>— </span>
                                {p}
                              </li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {!v ? (
                  anfitrion ? (
                    <div className="mt-7">
                      {cargando ? (
                        <Cargando texto={cargando} />
                      ) : (
                        <Boton icon={Gavel} onClick={pedirVeredicto}>
                          Pedir el veredicto
                        </Boton>
                      )}
                      <Aviso texto={error} onRetry={reintento} />
                    </div>
                  ) : (
                    <Espera texto="El juez está por hablar…" />
                  )
                ) : (
                  <div className="sb-in mt-7 rounded-sm p-6" style={{ background: C.panel, border: `1px solid ${C.gold}` }}>
                    <Eyebrow>Acta del martillo — sugerencia</Eyebrow>
                    <div className="mt-2" style={{ fontFamily: DISPLAY, fontSize: 26, color: C.gold }}>
                      Gana {nomGanaIA}
                    </div>
                    <p className="mt-2" style={{ lineHeight: 1.55 }}>
                      {v.motivo}
                    </p>
                    <div className="mt-5 pt-5" style={{ borderTop: `1px solid ${C.border}` }}>
                      {anfitrion ? (
                        <>
                          <p className="text-sm" style={{ color: C.mute }}>
                            La última palabra es de ustedes.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-3">
                            <Boton icon={Check} onClick={() => fallar(v.ganador)}>
                              Confirmar: gana {nomGanaIA}
                            </Boton>
                            <Boton variant="crimson" icon={Undo2} onClick={() => fallar(v.ganador === "A" ? "B" : "A")}>
                              Anular: gana {nomOtro}
                            </Boton>
                          </div>
                        </>
                      ) : (
                        <p className="sb-latido text-sm" style={{ color: C.mute, fontFamily: MONO }}>
                          ESPERANDO EL FALLO DE LA MESA…
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            );
          })()
        ) : null}

        {/* ── FINAL ── */}
        {fase === "final" ? (
          (() => {
            const p = [puntos(0), puntos(1)];
            const campeonIdx =
              p[0] !== p[1]
                ? p[0] > p[1]
                  ? 0
                  : 1
                : cierre?.campeon
                ? Math.max(0, nombres.findIndex((n) => n.toLowerCase() === String(cierre.campeon).toLowerCase()))
                : plata(0) >= plata(1)
                ? 0
                : 1;
            const orden = campeonIdx === 1 ? [1, 0] : [0, 1];
            return (
              <section className="sb-in">
                <div className="flex items-center gap-3">
                  <Crown size={22} style={{ color: C.gold }} strokeWidth={1.6} />
                  <Eyebrow>Jornada cerrada · {tema}</Eyebrow>
                </div>

                <div
                  className="sb-stamp mt-5 rounded-sm p-7"
                  style={{ background: C.paper, color: C.night, border: `1px solid ${C.paperEdge}` }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: "0.28em", color: C.crimson }}>
                    TABLA FINAL
                  </div>
                  <div className="mt-3 flex items-center gap-3" style={{ fontFamily: DISPLAY, fontSize: 38, lineHeight: 1.05 }}>
                    <Trophy size={30} strokeWidth={1.6} />
                    {nombres[campeonIdx]}
                  </div>
                  <div className="mt-6 flex flex-col gap-3">
                    {orden.map((i, pos) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-4 pb-3"
                        style={{ borderBottom: `1px solid ${C.paperEdge}` }}
                      >
                        <div className="flex items-center gap-3">
                          <span style={{ fontSize: 18 }}>{pos === 0 ? "🥇" : "🥈"}</span>
                          <span style={{ fontFamily: DISPLAY, fontSize: 20 }}>{nombres[i]}</span>
                        </div>
                        <div style={{ fontFamily: MONO, fontSize: 12, color: "#6f6449" }}>
                          {p[i]} DUELOS · GASTÓ ${gastado(i)} · LE QUEDÓ ${plata(i)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 rounded-sm p-6" style={{ background: C.panel, border: `1px solid ${C.border}` }}>
                  <Eyebrow>Conclusión del juez</Eyebrow>
                  {!cierre ? (
                    <div className="mt-3">
                      <Cargando texto={cargando || "esperando el acta"} />
                    </div>
                  ) : (
                    <p className="mt-3" style={{ lineHeight: 1.65, fontSize: 16 }}>
                      {cierre.conclusion}
                    </p>
                  )}
                  <Aviso texto={error} onRetry={reintento} />
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <Tablero i={0} />
                  <Tablero i={1} />
                </div>

                {anfitrion ? (
                  <div className="mt-7">
                    <Boton icon={RefreshCw} onClick={reiniciar}>
                      Nueva jornada
                    </Boton>
                  </div>
                ) : null}
              </section>
            );
          })()
        ) : null}
      </div>
    </div>
  );
}
