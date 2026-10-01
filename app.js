/* Alpha Blendz, San Juan TX.
   Shop data comes from his own TikTok bio, Facebook page, and Booksy menu. */

const SHOP = {
  hours: {
    0: [10, 17],
    1: [10, 19],
    2: [10, 19],
    3: [10, 19],
    4: [10, 19],
    5: [10, 19],
    6: [10, 17],
  },
  services: [
    { id: "haircut", name: "Male haircut", price: 35, minutes: 45, note: "Cut, lined, and finished." },
    { id: "kids", name: "Kids cut", price: 25, minutes: 45, note: "For the younger chairs." },
    { id: "beard", name: "Beard shaping", price: 20, minutes: 30, note: "Hot towel included." },
    { id: "cut-beard", name: "Cut and beard", price: 45, minutes: 60, note: "The usual pairing." },
    { id: "shave", name: "Head shave", price: 30, minutes: 30, note: "Clean, even, and close." },
    { id: "vip", name: "VIP service", price: 100, minutes: 60, note: "Cut, beard, facial, brows, and a wash." },
  ],
  barbers: [
    { id: "any", name: "First open chair", note: "Whoever is free soonest." },
    { id: "javi", name: "Javi", note: "Listens, then lines it up." },
    { id: "jeremy", name: "Jeremy", note: "The chair people ask for." },
    { id: "louise", name: "Louise", note: "Clean lines, calm shop." },
  ],
};

const STORE = "alphablendz-holds-v2";
const LANG_KEY = "alphablendz-lang";
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const browserLang = (navigator.language || "en").toLowerCase().startsWith("es") ? "es" : "en";
let savedLang = null;
try { savedLang = localStorage.getItem(LANG_KEY); } catch { savedLang = null; }
const queryLang = new URLSearchParams(location.search).get("lang");
let lang = queryLang === "en" || queryLang === "es"
  ? queryLang
  : (savedLang === "en" || savedLang === "es" ? savedLang : browserLang);
let menuPriced = false;

function copy(key) {
  const pack = I18N[lang] || I18N.en;
  return pack[key] === undefined ? (I18N.en[key] ?? key) : pack[key];
}

function fill(key, vars) {
  return String(copy(key)).replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? ""));
}

function dayName(index) {
  return (I18N[lang].days || I18N.en.days)[index];
}

function dayShort(index) {
  return (I18N[lang].daysShort || I18N.en.daysShort)[index];
}

function svcName(item) { return copy(`svc.${item.id}.name`); }
function svcNote(item) { return copy(`svc.${item.id}.note`); }
function barberName(item) { return copy(`barber.${item.id}.name`); }
function barberNote(item) { return copy(`barber.${item.id}.note`); }

/* ---------------- helpers ---------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function ymd(date) {
  const z = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${z(date.getMonth() + 1)}-${z(date.getDate())}`;
}

function fromYmd(value) {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function clock(totalMinutes) {
  const h24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const suffix = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 || 12;
  return `${h12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function service(id) {
  return SHOP.services.find((item) => item.id === id);
}

function barber(id) {
  return SHOP.barbers.find((item) => item.id === id);
}

function loadHolds() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

let holds = loadHolds();

function saveHolds() {
  try {
    localStorage.setItem(STORE, JSON.stringify(holds));
  } catch {
    /* private mode */
  }
}

function openSlots(serviceId, barberId, dateIso) {
  const svc = service(serviceId);
  if (!svc || !dateIso) return [];
  const window_ = SHOP.hours[fromYmd(dateIso).getDay()];
  if (!window_) return [];
  const now = new Date();
  const isToday = ymd(now) === dateIso;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const chairs = barberId === "any"
    ? SHOP.barbers.filter((item) => item.id !== "any").map((item) => item.id)
    : [barberId];

  const out = [];
  for (let start = window_[0] * 60; start + svc.minutes <= window_[1] * 60; start += 30) {
    if (isToday && start <= nowMinutes + 15) continue;
    const end = start + svc.minutes;
    const free = chairs.filter((chair) => !holds.some((hold) => (
      hold.barberId === chair && hold.date === dateIso && hold.start < end && hold.end > start
    )));
    if (free.length) out.push({ start, end, label: clock(start), free });
  }
  return out;
}

function nextDays(count = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(today);
    date.setDate(date.getDate() + i);
    return {
      iso: ymd(date),
      short: dayShort(date.getDay()),
      num: date.getDate(),
      closed: !SHOP.hours[date.getDay()],
    };
  });
}

/* ---------------- intro, nav, live state ---------------- */

function bootIntro() {
  const curtain = $("#curtain");
  document.body.classList.add("ready");
  if (!curtain) return;
  if (reduceMotion) {
    curtain.classList.add("off");
    return;
  }
  requestAnimationFrame(() => curtain.classList.add("gone"));
  setTimeout(() => curtain.classList.add("off"), 1400);
}

function bootNav() {
  const nav = $("#nav");
  const burger = $("#burger");
  const links = $("#navlinks");

  const onScroll = () => nav.classList.toggle("stuck", window.scrollY > 12);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  burger.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    burger.setAttribute("aria-expanded", open ? "true" : "false");
  });
  links.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      links.classList.remove("open");
      burger.setAttribute("aria-expanded", "false");
    }
  });
}

function bootStatus() {
  const el = $("#status");
  const now = new Date();
  const window_ = SHOP.hours[now.getDay()];
  const minutes = now.getHours() * 60 + now.getMinutes();
  const isOpen = window_ && minutes >= window_[0] * 60 && minutes < window_[1] * 60;

  if (isOpen) {
    el.innerHTML = `<i></i>San Juan, Texas <b>${esc(fill("status.open", { time: clock(window_[1] * 60) }))}</b>`;
    return;
  }
  const days = nextDays(8);
  const upcoming = days.find((day, index) => {
    if (day.closed) return false;
    if (index === 0) return minutes < SHOP.hours[now.getDay()][0] * 60;
    return true;
  });
  const opensAt = upcoming ? SHOP.hours[fromYmd(upcoming.iso).getDay()][0] * 60 : null;
  const when = upcoming && upcoming.iso === ymd(now) ? copy("today") : upcoming ? upcoming.short : "";
  const label = opensAt === null
    ? copy("status.closed")
    : fill("status.opens", { when, time: clock(opensAt) });
  el.innerHTML = `<i></i>San Juan, Texas <b>${esc(label)}</b>`;
}

function bootHours() {
  const list = $("#hours");
  const today = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  list.innerHTML = order.map((day) => {
    const window_ = SHOP.hours[day];
    const text = window_
      ? `${clock(window_[0] * 60)} ${copy("hours.to")} ${clock(window_[1] * 60)}`
      : copy("hours.closed");
    const mark = day === today ? ' class="today"' : "";
    const value = day === today ? `<b>${esc(text)}</b>` : esc(text);
    return `<li${mark}><span>${esc(dayName(day))}</span><span>${value}</span></li>`;
  }).join("");
}

/* ---------------- menu slices ---------------- */

function bootMenu() {
  const list = $("#slices");
  list.innerHTML = SHOP.services.map((svc, index) => `
    <li>
      <button class="slice" type="button" data-service="${svc.id}">
        <span class="slice-num">${String(index + 1).padStart(2, "0")}</span>
        <span class="slice-name">${esc(svcName(svc))}</span>
        <span class="slice-note">${esc(svcNote(svc))}</span>
        <span class="slice-min">${svc.minutes} ${esc(copy("min"))}</span>
        <span class="slice-price" data-price="${svc.price}">${menuPriced ? `$${svc.price}` : "$0"}</span>
      </button>
    </li>
  `).join("");

  $$(".slice", list).forEach((button) => {
    button.addEventListener("click", () => {
      desk.pick(button.dataset.service);
    });
  });
}

/* ---------------- count ups ---------------- */

function countTo(el, to, decimals, prefix = "") {
  if (reduceMotion) {
    el.textContent = `${prefix}${to.toFixed(decimals)}`;
    return;
  }
  const start = performance.now();
  const span = 1100;
  const tick = (now) => {
    const progress = clamp((now - start) / span, 0, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.textContent = `${prefix}${(to * eased).toFixed(decimals)}`;
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function bootCounters() {
  const seen = new WeakSet();
  const watch = (el, run) => {
    if (!("IntersectionObserver" in window)) return run();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !seen.has(el)) {
          seen.add(el);
          run();
          io.disconnect();
        }
      });
    }, { threshold: 0.4 });
    io.observe(el);
  };

  $$(".slice-price").forEach((el) => {
    watch(el, () => countTo(el, Number(el.dataset.price), 0, "$"));
  });
  const score = $("#score");
  if (score) watch(score, () => countTo(score, Number(score.dataset.to), 1));
  setTimeout(() => { menuPriced = true; }, 1300);
}

/* ---------------- reveals ---------------- */

function bootReveals() {
  const items = $$(".reveal, .rise");
  const showAll = () => items.forEach((el) => el.classList.add("in"));
  if (reduceMotion || !("IntersectionObserver" in window)) return showAll();

  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const group = $$(".reveal", entry.target.parentElement).indexOf(entry.target);
      entry.target.style.transitionDelay = `${Math.max(0, group) * 70}ms`;
      entry.target.classList.add("in");
      io.unobserve(entry.target);
    });
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });

  items.forEach((el) => io.observe(el));
  // never leave anything stranded (headless shots, odd scroll restores)
  setTimeout(showAll, 1600);
}

/* ---------------- hero video ---------------- */

function bootHeroVideo() {
  const video = $("#heroVideo");
  const sound = $("#sound");
  if (!video) return;

  const tryPlay = () => video.play().catch(() => { /* blocked until a gesture */ });
  if (video.readyState >= 2) tryPlay();
  video.addEventListener("loadeddata", tryPlay, { once: true });

  video.addEventListener("loadedmetadata", () => {
    const hasAudio = video.mozHasAudio
      || Boolean(video.webkitAudioDecodedByteCount)
      || Boolean(video.audioTracks && video.audioTracks.length);
    if (hasAudio || video.webkitAudioDecodedByteCount === undefined) sound.hidden = false;
  }, { once: true });

  sound.addEventListener("click", () => {
    video.muted = !video.muted;
    sound.textContent = video.muted ? copy("sound.off") : copy("sound.on");
    if (!video.muted) tryPlay();
  });

  // clicking the frame also toggles playback
  video.addEventListener("click", () => {
    if (video.paused) tryPlay();
    else video.pause();
  });
}

/* ---------------- clip videos play in view ---------------- */

function bootClipPlayback() {
  const videos = $$(".clip video");
  if (!("IntersectionObserver" in window)) return;
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting) video.play().catch(() => {});
      else video.pause();
    });
  }, { threshold: 0.35 });
  videos.forEach((video) => io.observe(video));
}

/* ---------------- pinned horizontal reel + hero drift ---------------- */

function setReelRail(progress) {
  const bar = $("#reelBar");
  const count = $("#reelCount");
  const clips = $$(".clip").length || 1;
  const index = clamp(Math.floor(Math.min(progress, 0.999) * clips) + 1, 1, clips);
  if (bar) bar.style.transform = `scaleX(${Math.max(0.04, clamp(progress, 0, 1))})`;
  if (count) count.textContent = `${String(index).padStart(2, "0")} / ${String(clips).padStart(2, "0")}`;
}

function bootScrollRig() {
  const reel = $("#reel");
  const track = $("#reelTrack");
  const hint = $("#reelHint");
  const frame = $(".frame");
  const wide = window.matchMedia("(min-width: 861px)");
  let shift = 0;
  let queued = false;

  function measure() {
    if (!wide.matches || reduceMotion) {
      reel.style.height = "";
      track.style.transform = "";
      shift = 0;
      return;
    }
    const pin = $(".reel-pin", reel);
    shift = Math.max(0, track.scrollWidth - window.innerWidth);
    reel.style.height = `${pin.offsetHeight + shift}px`;
    paint();
  }

  function paint() {
    if (wide.matches && !reduceMotion && shift > 0) {
      const pin = $(".reel-pin", reel);
      const top = reel.offsetTop - parseFloat(getComputedStyle(pin).top || "0");
      const span = reel.offsetHeight - pin.offsetHeight;
      const progress = clamp((window.scrollY - top) / (span || 1), 0, 1);
      track.style.transform = `translate3d(${-shift * progress}px,0,0)`;
      if (hint) hint.style.opacity = progress > 0.92 ? "0" : "1";
      setReelRail(progress);
    }
    if (frame && !reduceMotion) {
      const rect = frame.getBoundingClientRect();
      const seen = clamp(1 - rect.top / window.innerHeight, -0.4, 1.4);
      frame.style.setProperty("--drift", `${(seen * -26).toFixed(1)}px`);
    }
    queued = false;
  }

  const onScroll = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(paint);
  };

  track.addEventListener("scroll", () => {
    if (wide.matches && !reduceMotion) return;
    const max = track.scrollWidth - track.clientWidth;
    setReelRail(max > 0 ? track.scrollLeft / max : 0);
  }, { passive: true });

  measure();
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", measure);
  wide.addEventListener("change", measure);
  window.addEventListener("load", measure);
}

/* ---------------- magnetic hero stamp ---------------- */

function bootMagnet() {
  const press = $("#press");
  if (!press || reduceMotion || !window.matchMedia("(hover: hover)").matches) return;
  let raf = null;
  let tx = 0;
  let ty = 0;

  press.addEventListener("pointermove", (event) => {
    const rect = press.getBoundingClientRect();
    tx = ((event.clientX - rect.left) / rect.width - 0.5) * 12;
    ty = ((event.clientY - rect.top) / rect.height - 0.5) * 10;
    if (!raf) raf = requestAnimationFrame(apply);
  });
  press.addEventListener("pointerleave", () => {
    tx = 0;
    ty = 0;
    if (!raf) raf = requestAnimationFrame(apply);
  });

  function apply() {
    press.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px)`;
    raf = null;
  }
}

/* ---------------- booking desk ---------------- */

const desk = {
  root: null,
  step: 0,
  serviceId: null,
  barberId: null,
  date: null,
  start: null,
  name: "",
  phone: "",
  error: "",
  ticket: null,

  init() {
    this.root = $("#desk");
    this.render();
  },

  pick(serviceId) {
    this.serviceId = serviceId;
    this.start = null;
    this.step = 1;
    this.error = "";
    this.render();
    this.root.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "center" });
  },

  go(step) {
    this.step = clamp(step, 0, 3);
    this.error = "";
    this.render();
  },

  render() {
    if (this.ticket) return this.renderTicket();
    const steps = [0, 1, 2, 3]
      .map((index) => {
        const label = copy(`step.${index}`);
        const cls = index === this.step ? "on" : index < this.step ? "done" : "";
        return `<li class="${cls}"><span>${String(index + 1).padStart(2, "0")} ${esc(label)}</span></li>`;
      }).join("");

    this.root.innerHTML = `
      <div class="desk-main">
        <ol class="steps">${steps}</ol>
        <div class="pane" id="pane">${this.pane()}</div>
      </div>
      ${this.receipt()}
    `;
    this.wire();
  },

  receipt() {
    const svc = this.serviceId ? service(this.serviceId) : null;
    const who = this.barberId ? barber(this.barberId) : null;
    const wait = (text) => `<span class="wait">${esc(text)}</span>`;
    let when = wait(copy("wait.time"));
    if (this.date && this.start !== null) {
      const date = fromYmd(this.date);
      when = esc(`${dayShort(date.getDay())} ${date.getDate()}, ${clock(this.start)}`);
    }
    return `
      <aside class="receipt" aria-live="polite">
        <p class="label">${esc(copy("receipt.title"))}</p>
        <dl>
          <div><dt>${esc(copy("receipt.cut"))}</dt><dd>${svc ? esc(svcName(svc)) : wait(copy("wait.cut"))}</dd></div>
          <div><dt>${esc(copy("receipt.chair"))}</dt><dd>${who ? esc(barberName(who)) : wait(copy("wait.chair"))}</dd></div>
          <div><dt>${esc(copy("receipt.when"))}</dt><dd>${when}</dd></div>
        </dl>
        <p class="receipt-due"><span>${esc(copy("due"))}</span><b class="${svc ? "" : "wait"}">${svc ? `$${svc.price}` : "—"}</b></p>
      </aside>
    `;
  },

  pane() {
    if (this.step === 0) {
      return `
        <h3>${esc(copy("pick.cut"))}</h3>
        <div class="pick-grid">
          ${SHOP.services.map((svc) => `
            <button class="pick ${svc.id === this.serviceId ? "on" : ""}" type="button" data-service="${svc.id}">
              <strong>${esc(svcName(svc))}</strong>
              <span>${esc(svcNote(svc))}</span>
              <b>$${svc.price} · ${svc.minutes} ${esc(copy("min"))}</b>
            </button>
          `).join("")}
        </div>
      `;
    }

    if (this.step === 1) {
      return `
        <h3>${esc(copy("pick.chair"))}</h3>
        <div class="pick-grid">
          ${SHOP.barbers.map((item) => `
            <button class="pick ${item.id === this.barberId ? "on" : ""}" type="button" data-barber="${item.id}">
              <strong>${esc(barberName(item))}</strong>
              <span>${esc(barberNote(item))}</span>
            </button>
          `).join("")}
        </div>
        <div class="row"><button class="back" type="button" data-back="0">${esc(copy("back.cuts"))}</button></div>
      `;
    }

    if (this.step === 2) {
      const days = nextDays(14);
      if (!this.date) this.date = (days.find((day) => !day.closed) || days[0]).iso;
      const slots = openSlots(this.serviceId, this.barberId, this.date);
      return `
        <h3>${esc(copy("pick.day"))}</h3>
        <div class="chips">
          ${days.map((day) => `
            <button class="chip ${day.iso === this.date ? "on" : ""}" type="button" data-date="${day.iso}" ${day.closed ? "disabled" : ""}>
              ${esc(day.short)} ${day.num}<small>${day.closed ? esc(copy("day.closed")) : ""}</small>
            </button>
          `).join("")}
        </div>
        <h3>${esc(copy("pick.time"))}</h3>
        ${slots.length ? `
          <div class="chips">
            ${slots.map((slot) => `
              <button class="chip ${slot.start === this.start ? "on" : ""}" type="button" data-start="${slot.start}">${esc(slot.label)}</button>
            `).join("")}
          </div>` : `<p class="hint">${esc(copy("empty.day"))}</p>`}
        <div class="row">
          <button class="back" type="button" data-back="1">${esc(copy("back.chairs"))}</button>
        </div>
      `;
    }

    const svc = service(this.serviceId);
    return `
      <h3>${esc(copy("who"))}</h3>
      <div class="pair">
        <label class="field"><span>${esc(copy("field.name"))}</span><input id="fName" value="${esc(this.name)}" autocomplete="name" placeholder="${esc(copy("ph.name"))}"></label>
        <label class="field"><span>${esc(copy("field.phone"))}</span><input id="fPhone" value="${esc(this.phone)}" autocomplete="tel" inputmode="tel" placeholder="956 000 0000"></label>
      </div>
      ${this.error ? `<p class="err" role="alert">${esc(copy(this.error))}</p>` : `<p class="hint">${esc(fill("hold.hint", { cut: svcName(svc).toLowerCase(), min: svc.minutes }))}</p>`}
      <div class="row">
        <button class="lock" type="button" id="lock">${esc(copy("lock"))}</button>
        <button class="back" type="button" data-back="2">${esc(copy("back.times"))}</button>
      </div>
    `;
  },

  wire() {
    const pane = $("#pane", this.root);

    $$("[data-service]", pane).forEach((button) => button.addEventListener("click", () => {
      this.serviceId = button.dataset.service;
      this.start = null;
      this.go(1);
    }));

    $$("[data-barber]", pane).forEach((button) => button.addEventListener("click", () => {
      this.barberId = button.dataset.barber;
      this.start = null;
      this.go(2);
    }));

    $$("[data-date]", pane).forEach((button) => button.addEventListener("click", () => {
      this.date = button.dataset.date;
      this.start = null;
      this.render();
    }));

    $$("[data-start]", pane).forEach((button) => button.addEventListener("click", () => {
      this.start = Number(button.dataset.start);
      this.go(3);
    }));

    $$("[data-back]", pane).forEach((button) => button.addEventListener("click", () => {
      this.go(Number(button.dataset.back));
    }));

    const name = $("#fName", pane);
    const phone = $("#fPhone", pane);
    if (name) name.addEventListener("input", () => { this.name = name.value; });
    if (phone) phone.addEventListener("input", () => { this.phone = phone.value; });

    const lock = $("#lock", pane);
    if (lock) lock.addEventListener("click", () => this.hold());
  },

  hold() {
    const name = this.name.trim();
    const digits = this.phone.replace(/\D/g, "");
    const phone = digits.length === 11 && digits.startsWith("1") ? digits.slice(1) : digits;

    if (name.length < 2) {
      this.error = "err.name";
      return this.render();
    }
    if (phone.length !== 10) {
      this.error = "err.phone";
      return this.render();
    }

    holds = loadHolds();
    const slot = openSlots(this.serviceId, this.barberId, this.date).find((item) => item.start === this.start);
    if (!slot) {
      this.error = "err.gone";
      this.start = null;
      this.step = 2;
      return this.render();
    }

    const svc = service(this.serviceId);
    const chairId = slot.free[0];
    const code = Math.random().toString(36).replace(/[^a-z0-9]/g, "").slice(0, 6).toUpperCase();

    holds.push({
      code,
      serviceId: svc.id,
      barberId: chairId,
      date: this.date,
      start: slot.start,
      end: slot.end,
      name,
      phone,
    });
    saveHolds();

    const date = fromYmd(this.date);
    this.ticket = {
      code,
      serviceId: svc.id,
      barberId: chairId,
      date: this.date,
      start: slot.start,
      price: svc.price,
      name,
    };
    this.render();
  },

  renderTicket() {
    const ticket = this.ticket;
    const date = fromYmd(ticket.date);
    const when = `${dayName(date.getDay())}, ${date.toLocaleDateString(lang === "es" ? "es-MX" : "en-US", { month: "short", day: "numeric" })} ${copy("ticket.at")} ${clock(ticket.start)}`;
    this.root.innerHTML = `
      <div class="ticket" role="status">
        <p class="label">${esc(fill("ticket.for", { name: ticket.name }))}</p>
        <p class="code">${esc(ticket.code)}</p>
        <dl>
          <div><dt>${esc(copy("receipt.cut"))}</dt><dd>${esc(svcName(service(ticket.serviceId)))}</dd></div>
          <div><dt>${esc(copy("receipt.chair"))}</dt><dd>${esc(barberName(barber(ticket.barberId)))}</dd></div>
          <div><dt>${esc(copy("receipt.when"))}</dt><dd>${esc(when)}</dd></div>
          <div><dt>${esc(copy("due"))}</dt><dd>$${ticket.price}</dd></div>
        </dl>
        <p class="hint">${esc(copy("ticket.demo"))}</p>
        <div class="row">
          <button class="back" type="button" id="again">${esc(copy("ticket.again"))}</button>
        </div>
      </div>
    `;
    $("#again", this.root).addEventListener("click", () => {
      this.ticket = null;
      this.step = 0;
      this.start = null;
      this.render();
    });
  },
};

/* ---------------- ticker seam ---------------- */

function bootTicker() {
  const track = $("#tickerTrack");
  if (!track) return;
  const unit = (I18N[lang].ticker || I18N.en.ticker)
    .map((item) => `<span>${esc(item)}</span><b>/</b>`)
    .join("");
  track.innerHTML = unit + unit;
}

function applyStatic() {
  document.documentElement.lang = lang;
  document.title = copy("meta.title");
  const desc = document.querySelector('meta[name="description"]');
  if (desc) desc.setAttribute("content", copy("meta.desc"));
  const langBox = $("#lang");
  if (langBox) langBox.setAttribute("aria-label", copy("lang.label"));
  $$("[data-i18n]").forEach((el) => { el.textContent = copy(el.dataset.i18n); });
  $$("[data-i18n-html]").forEach((el) => { el.innerHTML = copy(el.dataset.i18nHtml); });
  const photo = $(".storefront img");
  if (photo) photo.alt = copy("visit.alt");
  $$("[data-set-lang]").forEach((button) => {
    const on = button.dataset.setLang === lang;
    button.classList.toggle("on", on);
    button.setAttribute("aria-pressed", on ? "true" : "false");
  });
  const sound = $("#sound");
  const video = $("#heroVideo");
  if (sound && video && !sound.hidden) {
    sound.textContent = video.muted ? copy("sound.off") : copy("sound.on");
  }
}

function bootLang() {
  applyStatic();
  $$("[data-set-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      const next = button.dataset.setLang;
      if (next === lang) return;
      lang = next;
      try { localStorage.setItem(LANG_KEY, lang); } catch { /* private mode */ }
      applyStatic();
      bootStatus();
      bootHours();
      bootMenu();
      bootTicker();
      if (desk.root) desk.render();
    });
  });
}

/* ---------------- go ---------------- */

bootIntro();
bootNav();
bootLang();
bootStatus();
bootHours();
bootMenu();
bootTicker();
bootCounters();
bootReveals();
bootHeroVideo();
bootClipPlayback();
bootScrollRig();
bootMagnet();
desk.init();
