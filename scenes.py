# -*- coding: utf-8 -*-
"""
NAHLIO — Darstellungen der fuenf Leistungen (Hero und Beispiele).

Jede Darstellung ist eine Szene aus Geraeten (Smartphone, Laptop) mit echter,
lesbarer Oberflaeche und Fotos von Unsplash. Alle Masse in em: Die Szene
(.sz) ist 60 em hoch, ihre Breite folgt aus dem Seitenverhaeltnis (--arn).
Dadurch passt dieselbe Szene in die Bilderreihe des Hero und in den Rahmen der
Beispiele. Texte stehen in content/mocks.json (szenen), alles ist ausgedacht und
im Bild als Konzeptdarstellung gekennzeichnet.

Die WhatsApp-Szene (kontakt) ist in den Beispielen eine Live-Vorfuehrung
(data-wa-live, 45-wa.js): Termin buchen -> Tag waehlen -> Uhrzeit -> bestaetigt.
"""

import datetime

from components import t, esc

# Seitenverhaeltnis (Breite / Hoehe) je Szene. Im Hero zeigen Karte und Google nur das Telefon
# (keine schwebenden Karten, die dort zu klein zum Lesen waeren) und sind deshalb schmaler.
AR = {u"fotos": 0.70, u"kontakt": 0.56, u"karte": 0.80, u"google": 0.78, u"website": 1.47}
AR_HERO = dict(AR, karte=0.70, google=0.52)   # Karte im Hero: nur das iPad (hochkant)

WD_SHORT = [u"Mo", u"Di", u"Mi", u"Do", u"Fr", u"Sa", u"So"]
MONTHS = [u"Januar", u"Februar", u"März", u"April", u"Mai", u"Juni", u"Juli", u"August",
          u"September", u"Oktober", u"November", u"Dezember"]
WD_LONG = [u"Montag", u"Dienstag", u"Mittwoch", u"Donnerstag", u"Freitag", u"Samstag", u"Sonntag"]

# --- kleine Symbole (Strichzeichnungen, erben die Textfarbe) ---------------------------------
def _svg(path, vb=u"0 0 24 24", cls=u"ic"):
    return u'<svg class="%s" viewBox="%s" aria-hidden="true" focusable="false">%s</svg>' % (cls, vb, path)

I_SIG = (u'<svg class="dv-sb__sig" viewBox="0 0 18 12" aria-hidden="true"><rect x="0" y="8" width="3" height="4" rx=".8"/>'
         u'<rect x="5" y="5.5" width="3" height="6.5" rx=".8"/><rect x="10" y="3" width="3" height="9" rx=".8"/>'
         u'<rect x="15" y="0" width="3" height="12" rx=".8"/></svg>')
I_WIFI = (u'<svg class="dv-sb__wifi" viewBox="0 0 16 12" aria-hidden="true"><path d="M8 11.6 5.7 9.2a3.3 3.3 0 0 1 4.6 0z"/>'
          u'<path d="M3.3 6.9a6.6 6.6 0 0 1 9.4 0l-1.5 1.5a4.5 4.5 0 0 0-6.4 0z"/>'
          u'<path d="M.9 4.5a10 10 0 0 1 14.2 0l-1.5 1.5a7.9 7.9 0 0 0-11.2 0z"/></svg>')
I_BAT = (u'<svg class="dv-sb__bat" viewBox="0 0 27 13" aria-hidden="true"><rect x=".6" y=".6" width="22.8" height="11.8" rx="3.4" '
         u'fill="none" stroke="currentColor" stroke-opacity=".38" stroke-width="1.1"/><rect x="2.3" y="2.3" width="19.4" height="8.4" rx="2"/>'
         u'<path d="M24.8 4.4v4.2c.9-.3 1.5-1.1 1.5-2.1s-.6-1.8-1.5-2.1z" fill-opacity=".4"/></svg>')

I_BACK = _svg(u'<path d="M15 4.5 7.5 12l7.5 7.5"/>')
I_VIDEO = _svg(u'<rect x="2.5" y="6" width="13" height="12" rx="2.6"/><path d="m15.5 10.2 6-3.4v10.4l-6-3.4"/>')
I_CALL = _svg(u'<path d="M6.6 3.5h2.6l1.4 4.2-2.1 1.5a12 12 0 0 0 6.3 6.3l1.5-2.1 4.2 1.4v2.6a2 2 0 0 1-2.2 2A16.6 16.6 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2z"/>')
I_PLUS = _svg(u'<path d="M12 5v14M5 12h14"/>')
I_CAM = _svg(u'<path d="M4 8h3l1.6-2.4h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/>')
I_MIC = _svg(u'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21"/>')
I_TICKS = (u'<svg class="ic ic--ticks" viewBox="0 0 18 11" aria-hidden="true" focusable="false">'
           u'<path d="M1 5.8 4.2 9 11 1.8M7.4 8.2l.8.8L15 1.8"/></svg>')
I_CHECK = _svg(u'<path d="m5 12.5 4.5 4.5L19 7.5"/>')
I_CAL = _svg(u'<rect x="3.5" y="5" width="17" height="15.5" rx="2.6"/><path d="M3.5 10h17M8 3v4M16 3v4"/>')
I_SEARCH = _svg(u'<circle cx="10.5" cy="10.5" r="6.2"/><path d="m15.2 15.2 5.3 5.3"/>')
I_SHARE = _svg(u'<path d="M12 15V3.5M7.5 8 12 3.5 16.5 8"/><path d="M5 12.5V20h14v-7.5"/>')
I_SAVE = _svg(u'<path d="M6.5 3.5h11v17L12 16.6l-5.5 3.9z"/>')
I_ROUTE = _svg(u'<path d="M12 2.8 21.2 12 12 21.2 2.8 12z"/><path d="M9 13.6v-2.8h5.6M12.4 8.4l2.4 2.4-2.4 2.4"/>')
I_GLOBE = _svg(u'<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2M12 3.4c2.6 2.6 2.6 14.6 0 17.2M12 3.4c-2.6 2.6-2.6 14.6 0 17.2"/>')
I_MENU = _svg(u'<path d="M7 3v8M5 3v4.5a2 2 0 0 0 4 0V3M7 11v10M16.5 21V3c-2 1.2-3 3.8-3 7.5h3"/>')
I_CLOCK = _svg(u'<circle cx="12" cy="12" r="8.6"/><path d="M12 7v5.2l3.4 2"/>')
I_PIN = _svg(u'<path d="M12 21s-6.5-6-6.5-11.2a6.5 6.5 0 0 1 13 0C18.5 15 12 21 12 21z"/><circle cx="12" cy="9.8" r="2.3"/>')
I_IMG = _svg(u'<rect x="3.5" y="5" width="17" height="14" rx="2.4"/><circle cx="9" cy="10" r="1.7"/><path d="m4.5 17.5 5-4.6 3.4 3 2.6-2.2 4 3.8"/>')
I_HEART = _svg(u'<path d="M12 20s-7.5-4.4-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.6 12 20 12 20z"/>')
I_BUBBLE = _svg(u'<path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l.9-4.1A8 8 0 1 1 20 12z"/>')
I_BURGER = _svg(u'<path d="M4 7h16M4 12h16M4 17h16"/>')
I_CHEV = _svg(u'<path d="m9 5 7 7-7 7"/>')
I_REFRESH = _svg(u'<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5v4.6h-4.6"/>')
I_FILM = _svg(u'<rect x="3.5" y="4.5" width="17" height="15" rx="2.4"/><path d="m10 9.2 5 2.8-5 2.8z"/>')
I_PHOTOS = _svg(u'<rect x="3.5" y="6.5" width="13" height="13" rx="2.2"/><path d="M7.5 3.5h11a2 2 0 0 1 2 2v11"/>')
STAR = u'<svg class="ic-star" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3.6l2.5 5.1 5.6.8-4.1 4 1 5.6L12 16.4l-5 2.7 1-5.6-4.1-4 5.6-.8z"/></svg>'


def status(light=False):
    return (u'<div class="dv-sb%s" aria-hidden="true"><span class="dv-sb__t">9:41</span>'
            u'<span class="dv-sb__i">%s%s%s</span></div>' % (u" dv-sb--light" if light else u"", I_SIG, I_WIFI, I_BAT))


def phone(inner, cls=u"", light=False, style=u""):
    """Smartphone mit Titanrahmen, Dynamic-Island-Aussparung und Spiegelung. Die Breite im
    Szenenmass steht in --pw (Standard 24 em); innen ist der Bildschirm 22,2 em breit."""
    return (u'<div class="dv-phone %s"%s><i class="dv-phone__btn" aria-hidden="true"></i>'
            u'<div class="dv-phone__screen">%s%s</div>'
            u'<span class="dv-phone__island" aria-hidden="true"></span>'
            u'<span class="dv-phone__glare" aria-hidden="true"></span></div>'
            % (cls, (u' style="%s"' % style) if style else u"", status(light), inner))


def tablet(inner, cls=u""):
    """iPad hochkant mit Aluminiumrand und schmalem Rand. Breite im Szenenmass in --tw (Standard 36 em);
    innen ist der Bildschirm 50,8 em breit (= 820 pt eines iPad Air), 1 em also etwa 16 pt."""
    sb = (u'<div class="dv-sb dv-sb--tab" aria-hidden="true"><span class="dv-sb__t">9:41</span>'
          u'<span class="dv-sb__i">%s%s</span></div>' % (I_WIFI, I_BAT))
    return (u'<div class="dv-tab %s"><div class="dv-tab__screen">%s%s</div>'
            u'<span class="dv-tab__cam" aria-hidden="true"></span>'
            u'<span class="dv-tab__glare" aria-hidden="true"></span></div>' % (cls, sb, inner))


def laptop(inner, cls=u""):
    return (u'<div class="dv-laptop %s"><div class="dv-laptop__lid"><span class="dv-laptop__cam" aria-hidden="true"></span>'
            u'<div class="dv-laptop__screen">%s</div></div><div class="dv-laptop__base" aria-hidden="true"><i></i></div></div>'
            % (cls, inner))


def img(name, cls=u"", eager=True):
    return (u'<img class="%s" src="img/%s" alt="" decoding="async"%s>'
            % (cls, esc(name), u"" if eager else u' loading="lazy"'))


HERO = [False]   # wird von scene() gesetzt: Szene fuer die Bilderreihe des Hero


def wrap(key, inner):
    hero = HERO[0]
    return (u'<div class="sz sz--%s%s" style="--arn:%s"><div class="sz__in">%s</div></div>'
            % (key, u" sz--hero" if hero else u"", (AR_HERO if hero else AR)[key], inner))


# ---------------------------------------------------------------------------
# Kontakt & WhatsApp: Termin buchen
# ---------------------------------------------------------------------------

def open_days(start=None, n=6):
    """Die naechsten n Oeffnungstage (Mo-Sa) ab morgen. 45-wa.js rechnet sie im Browser neu,
    damit die Vorfuehrung immer die kommende Woche zeigt; diese Werte gelten ohne Skript."""
    d = (start or datetime.date.today()) + datetime.timedelta(days=1)
    out = []
    while len(out) < n:
        if d.weekday() != 6:
            out.append(d)
        d += datetime.timedelta(days=1)
    return out


def scene_kontakt(m, live=False):
    w = m["szenen"]["kontakt"]
    days = open_days()
    FULL, PICK, TPICK = 1, 3, 2           # ein Tag ist ausgebucht; die Vorfuehrung waehlt Tag 4 und 14:30
    day_btns = u"".join(
        u'<button class="wa__day%s" type="button" tabindex="-1" data-wa-day="%d"%s>'
        u'<small>%s</small><b>%d</b><em>%s</em></button>'
        % (u" is-full" if i == FULL else (u" is-sel" if (i == PICK and not live) else u""), i,
           u" disabled" if i == FULL else u"", WD_SHORT[d.weekday()], d.day,
           t(w["full"], "mocks") if i == FULL else MONTHS[d.month - 1][:3] + u".")
        for i, d in enumerate(days))
    times = u"".join(
        u'<button class="wa__time%s" type="button" tabindex="-1" data-wa-time="%s">%s</button>'
        % (u" is-sel" if (i == TPICK and not live) else u"", esc(x), t(x, "mocks"))
        for i, x in enumerate(w["times"]))
    pick = days[PICK]
    day_long = u"%s, %d. %s" % (WD_LONG[pick.weekday()], pick.day, MONTHS[pick.month - 1])
    btns = u"".join(
        u'<button class="wa__btn" type="button" tabindex="-1"%s>%s</button>'
        % (u' data-wa-book' if i == 0 else u"", t(b, "mocks")) for i, b in enumerate(w["buttons"]))
    clock = t(w["clock"], "mocks")

    def row(step, inner, out=False):
        return (u'<div class="wa__row%s" data-step="%d"><div class="wa__rin">%s</div></div>'
                % (u" wa__row--out" if out else u"", step, inner))

    def msg(inner, out=False, extra=u""):
        stamp = u'<span class="wa__time-s">%s%s</span>' % (clock, I_TICKS if out else u"")
        return u'<div class="wa__msg wa__msg--%s%s">%s%s</div>' % (u"out" if out else u"in", extra, inner, stamp)

    rows = (
        row(0, msg(u"<p>%s</p>" % t(w["hello"], "mocks")) + u'<div class="wa__btns">%s</div>' % btns)
        + row(1, msg(u"<p>%s</p>" % t(w["buttons"][0], "mocks"), out=True), out=True)
        + row(2, msg(u'<p>%s</p><p class="wa__hint">%s</p><div class="wa__days">%s</div>'
                     % (t(w["ask_day"], "mocks"), t(w["days_hint"], "mocks"), day_btns), extra=u" wa__msg--wide"))
        + row(3, msg(u'<p data-wa-day-label>%s</p>' % day_long, out=True), out=True)
        + row(4, msg(u'<p>%s <span data-wa-day-short>%s</span>:</p><div class="wa__times">%s</div>'
                     % (t(w["ask_time"], "mocks"), WD_LONG[pick.weekday()], times), extra=u" wa__msg--wide"))
        + row(5, msg(u'<p><span data-wa-time-label>%s</span> %s</p>' % (esc(w["times"][TPICK]), t(w["time_reply"], "mocks")), out=True), out=True)
        + row(6, msg(u'<div class="wa__conf"><span class="wa__conf-ic">%s</span><div><b>%s</b>'
                     u'<span data-wa-conf>%s · %s Uhr</span><span>%s</span></div></div>'
                     u'<div class="wa__conf-btn">%s<span>%s</span></div>'
                     % (I_CHECK, t(w["confirm"], "mocks"), day_long, esc(w["times"][TPICK]),
                        t(w["service"], "mocks"), I_CAL, t(w["calendar"], "mocks")), extra=u" wa__msg--wide"))
        + u'<div class="wa__row wa__typing" data-wa-typing><div class="wa__rin"><div class="wa__msg wa__msg--in">'
          u'<i></i><i></i><i></i></div></div></div>')
    screen = u"""<div class="wa"%(live)s data-wa data-full="%(full)d" data-pick="%(pick)d" data-tpick="%(tpick)d" data-clock="%(clockraw)s">
  <div class="wa__head">%(back)s<span class="wa__avatar">%(ini)s</span>
    <span class="wa__who"><b>%(name)s</b><i>%(status)s</i></span>
    <span class="wa__tools">%(video)s%(call)s</span></div>
  <div class="wa__chat" data-wa-chat><span class="wa__daypill">%(today)s</span>%(rows)s</div>
  <div class="wa__input">%(plus)s<span class="wa__field">%(input)s</span>%(cam)s%(mic)s</div>
  <span class="wa__tap" data-wa-tap aria-hidden="true"></span>
</div>""" % {
        "live": u" data-wa-live" if live else u"", "full": FULL, "pick": PICK, "tpick": TPICK,
        "clockraw": esc(w["clock"]), "back": I_BACK, "ini": t(w["initials"], "mocks"),
        "name": t(w["name"], "mocks"), "status": t(w["status"], "mocks"), "video": I_VIDEO, "call": I_CALL,
        "today": t(w["today"], "mocks"), "rows": rows, "plus": I_PLUS, "input": t(w["input"], "mocks"),
        "cam": I_CAM, "mic": I_MIC}
    return wrap(u"kontakt", phone(screen, u"dv-phone--wa sz__phone"))


# ---------------------------------------------------------------------------
# Google-Profil
# ---------------------------------------------------------------------------

def scene_google(m, live=False):
    g = m["szenen"]["google"]
    stars = STAR * 5
    acts = u"".join(
        u'<span class="gm__act%s">%s%s</span>' % (u" gm__act--main" if i == 0 else u"",
                                                   [I_ROUTE, I_CALL, I_GLOBE, I_MENU][i % 4], t(a, "mocks"))
        for i, a in enumerate(g["actions"]))
    tabs = u"".join(u'<span class="gm__tab%s">%s</span>' % (u" is-on" if i == 0 else u"", t(x, "mocks"))
                    for i, x in enumerate(g["tabs"]))
    photos = u"".join(u'<span class="gm__ph">%s</span>' % img(p, u"gm__phimg")
                      for p in (u"sz-theke.webp", u"sz-cappuccino.webp", u"sz-eggs.webp"))
    screen = u"""<div class="gm">
  <div class="gm__cover">%(cover)s<span class="gm__cover-empty">%(imgic)s</span>
    <span class="gm__fab gm__fab--l">%(back)s</span><span class="gm__fab gm__fab--r">%(share)s</span><span class="gm__fab gm__fab--r2">%(save)s</span></div>
  <div class="gm__sheet">
    <i class="gm__grip"></i>
    <b class="gm__name">%(name)s</b>
    <span class="gm__rate"><span class="gm__a"><b>%(rating)s</b><span class="gm__stars">%(stars)s</span><i>%(count)s</i></span><span class="gm__b">%(b_rating)s</span></span>
    <span class="gm__cat">%(cat)s</span>
    <span class="gm__open"><span class="gm__a"><b>%(open)s</b> · %(closes)s</span><span class="gm__b">%(b_open)s</span></span>
    <div class="gm__acts">%(acts)s</div>
    <div class="gm__tabs">%(tabs)s</div>
    <div class="gm__photos">%(photos)s<span class="gm__photos-empty">%(imgic)s<span>%(b_photos)s</span></span></div>
    <div class="gm__info"><span>%(clock)s<span class="gm__a">%(hours)s</span><span class="gm__b">%(b_open)s</span></span><span>%(pin)s%(place)s</span><span class="gm__a">%(globe)s%(web)s</span></div>
  </div>
</div>""" % {
        "cover": img(u"sz-cafe.webp", u"gm__coverimg"), "imgic": I_IMG, "back": I_BACK, "share": I_SHARE, "save": I_SAVE,
        "name": t(g["name"], "mocks"), "rating": t(g["rating"], "mocks"), "stars": stars, "count": t(g["count"], "mocks"),
        "b_rating": t(g["before_rating"], "mocks"), "cat": t(g["category"], "mocks"), "open": t(g["open"], "mocks"),
        "closes": t(g["closes"], "mocks"), "b_open": t(g["before_open"], "mocks"), "acts": acts, "tabs": tabs,
        "photos": photos, "b_photos": t(g["before_photos"], "mocks"), "clock": I_CLOCK, "hours": t(g["hours"], "mocks"),
        "pin": I_PIN, "place": t(g["place"], "mocks"), "globe": I_GLOBE, "web": t(g["web"], "mocks")}
    floats = (u'<div class="sz__float gm-search">%s<span>%s</span></div>' % (I_SEARCH, t(g["search"], "mocks"))
              + u'<div class="sz__float gm-card"><span class="gm-card__top">%s<b>%s</b><em>%s</em></span>'
                u'<span class="gm-card__line">%s</span></div>'
                % (I_CLOCK, t(g["card_title"], "mocks"), t(g["card_badge"], "mocks"), t(g["card_line"], "mocks"))
              + u'<span class="sz__state" aria-hidden="true"><b class="sz__state-a">%s</b><b class="sz__state-b">%s</b></span>'
                % (t(g["after"], "mocks"), t(g["before"], "mocks")))
    return wrap(u"google", phone(screen, u"dv-phone--gm sz__phone", light=True) + floats)


# ---------------------------------------------------------------------------
# Fotos & Kurzvideos
# ---------------------------------------------------------------------------

def scene_fotos(m, live=False):
    f = m["szenen"]["fotos"]
    clip = u"""<div class="cl">
  %(img)s<span class="cl__shade"></span>
  <span class="cl__top"><span class="cl__badge">%(film)s%(clip)s</span></span>
  <span class="cl__side">%(heart)s%(bubble)s%(share)s</span>
  <div class="cl__bottom"><span class="cl__cap">%(cap)s</span>
    <span class="cl__bar"><i></i></span><span class="cl__time">%(ctime)s</span></div>
</div>""" % {"img": img(u"sz-latte.webp", u"cl__img"), "film": I_FILM, "clip": t(f["clip"], "mocks"),
             "heart": I_HEART, "bubble": I_BUBBLE, "share": I_SHARE, "cap": t(f["caption"], "mocks"),
             "ctime": t(f["clip_time"], "mocks")}
    chips = u"".join(u'<span class="ft-chip">%s<span>%s</span></span>' % ((I_PHOTOS, I_FILM)[i % 2], t(c, "mocks"))
                     for i, c in enumerate(f["chips"]))
    back = (u'<div class="ft-shot">%s<span class="ft-rec"><i></i>%s <span>%s</span></span>'
            u'<span class="ft-corners" aria-hidden="true"></span></div>'
            % (img(u"sz-dreh.webp", u"ft-shot__img"), t(f["rec"], "mocks"), t(f["rec_time"], "mocks")))
    return wrap(u"fotos", back + phone(clip, u"dv-phone--clip sz__phone", light=True)
                + u'<div class="sz__float ft-chips">%s</div>' % chips)


# ---------------------------------------------------------------------------
# Digitale Karte (nur online)
# ---------------------------------------------------------------------------

def menu_tablet(k):
    """Online-Speisekarte im Tablet-Layout: Kopf, Reiter, zwei Spalten Gerichte, Mittagstisch."""
    tabs = u"".join(u'<span class="mn__tab%s">%s</span>' % (u" is-on" if i == 0 else u"", t(x, "mocks"))
                    for i, x in enumerate(k["tabs"]))
    cards = u"".join(
        u'<div class="mt__card">%s<div class="mt__body"><b>%s</b><span class="mt__price">%s</span><i>%s</i></div></div>'
        % (img(it["photo"], u"mt__img"), t(it["name"], "mocks"), t(it["price"], "mocks"), t(it["desc"], "mocks"))
        for it in k["items"])
    ln = k["lunch"]
    return u"""<div class="mt">
  <div class="mt__bar"><span class="mn__brand mt__brand"><b>%(brand)s</b><i>%(sub)s</i></span>
    <span class="mt__search">%(sicon)s<span>%(search)s</span></span><span class="mt__cta">%(cta)s</span></div>
  <div class="mt__head"><b class="mt__title">%(title)s</b><span class="mt__open"><i></i>%(open)s</span></div>
  <div class="mt__tabs">%(tabs)s</div>
  <span class="mt__sec">%(sec)s</span>
  <div class="mt__grid">%(cards)s</div>
  <div class="mt__lunch">%(limg)s<span><b>%(lt)s</b><span>%(ls)s</span></span>%(chev)s</div>
  <div class="mt__foot"><span class="mn__all">%(all)s%(chev)s</span></div>
</div>""" % {"brand": t(k["brand"], "mocks"), "sub": t(k["brand_sub"], "mocks"), "sicon": I_SEARCH,
             "search": t(k["search"], "mocks"), "cta": t(k["cta"], "mocks"), "title": t(k["title"], "mocks"),
             "open": t(k["open"], "mocks"), "tabs": tabs, "sec": t(k["section"], "mocks"), "cards": cards,
             "limg": img(ln["photo"], u""), "lt": t(ln["t"], "mocks"), "ls": t(ln["s"], "mocks"), "chev": I_CHEV,
             "all": t(k["allergens"], "mocks")}


def scene_karte(m, live=False):
    k = m["szenen"]["karte"]
    tab = tablet(menu_tablet(k), u"sz__tab")
    if HERO[0]:                      # Hero: nur das iPad
        return wrap(u"karte", tab)
    tabs = u"".join(u'<span class="mn__tab%s">%s</span>' % (u" is-on" if i == 0 else u"", t(x, "mocks"))
                    for i, x in enumerate(k["tabs"]))
    items = u"".join(
        u'<div class="mn__item">%s<span class="mn__txt"><b>%s</b><i>%s</i></span><span class="mn__price">%s</span></div>'
        % (img(it["photo"], u"mn__img"), t(it["name"], "mocks"), t(it["desc"], "mocks"), t(it["price"], "mocks"))
        for it in k["items"])
    screen = u"""<div class="mn">
  <div class="mn__bar"><span class="mn__brand"><b>%(brand)s</b><i>%(sub)s</i></span><span class="mn__search">%(search)s</span></div>
  <b class="mn__title">%(title)s</b>
  <div class="mn__tabs">%(tabs)s</div>
  <span class="mn__sec">%(sec)s</span>
  <div class="mn__list">%(items)s</div>
  <div class="mn__foot"><span class="mn__all">%(all)s%(chev)s</span><span class="mn__cta">%(cta)s</span></div>
</div>""" % {"brand": t(k["brand"], "mocks"), "sub": t(k["brand_sub"], "mocks"), "search": I_SEARCH,
             "title": t(k["title"], "mocks"), "tabs": tabs, "sec": t(k["section"], "mocks"), "items": items,
             "all": t(k["allergens"], "mocks"), "chev": I_CHEV, "cta": t(k["cta"], "mocks")}
    card = (u'<div class="sz__float mn-card"><span class="mn-card__ic">%s</span><span><b>%s</b><i>%s</i></span></div>'
            % (I_REFRESH, t(k["card_title"], "mocks"), t(k["card_line"], "mocks")))
    return wrap(u"karte", tab + phone(screen, u"dv-phone--mn sz__phone") + card)


# ---------------------------------------------------------------------------
# One-Page-Website (eigene Marke des Beispielbetriebs, nicht im NAHLIO-Stil)
# ---------------------------------------------------------------------------

def scene_website(m, live=False):
    s = m["szenen"]["website"]
    nav = u"".join(u"<span>%s</span>" % t(x, "mocks") for x in s["nav"])
    h1 = u"<br>".join(t(x, "mocks") for x in s["headline"])
    cards = u"".join(
        u'<div class="uf__card">%s<b>%s</b><span>%s</span></div>' % (img(c["photo"], u"uf__cimg"), t(c["t"], "mocks"), t(c["s"], "mocks"))
        for c in s["cards"])
    hours = u"".join(u"<span>%s</span>" % t(x, "mocks") for x in s["hours"])
    logo = u'<span class="uf__logo"><b>%s</b><i>%s</i></span>' % (t(s["brand"], "mocks"), t(s["brand_sub"], "mocks"))
    desk = u"""<div class="uf uf--desk">
  <div class="uf__nav">%(logo)s<span class="uf__links">%(nav)s</span><span class="uf__btn">%(cta)s</span></div>
  <div class="uf__hero">%(hero)s<span class="uf__tint"></span>
    <div class="uf__copy"><span class="uf__eyebrow">%(eyebrow)s</span><b class="uf__h1">%(h1)s</b><span class="uf__sub">%(sub)s</span>
      <span class="uf__ctas"><span class="uf__btn uf__btn--brass">%(cta)s</span><span class="uf__btn uf__btn--ghost">%(menu)s</span></span></div></div>
  <div class="uf__row">%(cards)s<div class="uf__hours"><b>%(hours_t)s</b>%(hours)s</div></div>
</div>""" % {"logo": logo, "nav": nav, "cta": t(s["cta"], "mocks"), "hero": img(u"sz-terrasse.webp", u"uf__heroimg"),
             "eyebrow": t(s["eyebrow"], "mocks"), "h1": h1, "sub": t(s["sub"], "mocks"), "menu": t(s["menu"], "mocks"),
             "cards": cards, "hours_t": t(s["hours_t"], "mocks"), "hours": hours}
    mob = u"""<div class="uf uf--mob">
  <div class="uf__nav">%(logo)s<span class="uf__burger">%(burger)s</span></div>
  <div class="uf__hero">%(hero)s<span class="uf__tint"></span>
    <div class="uf__copy"><span class="uf__eyebrow">%(eyebrow)s</span><b class="uf__h1">%(h1)s</b>
      <span class="uf__btn uf__btn--brass">%(cta)s</span></div></div>
  <div class="uf__list">%(cards)s</div>
</div>""" % {"logo": logo, "burger": I_BURGER, "hero": img(u"sz-terrasse.webp", u"uf__heroimg"),
             "eyebrow": t(s["eyebrow"], "mocks"), "h1": h1, "cta": t(s["cta"], "mocks"), "cards": cards}
    return wrap(u"website", laptop(desk, u"sz__laptop") + phone(mob, u"dv-phone--uf sz__phone2"))


SCENES = {u"kontakt": scene_kontakt, u"google": scene_google, u"fotos": scene_fotos,
          u"karte": scene_karte, u"website": scene_website}


def scene(key, mocks, live=False, hero=False):
    HERO[0] = hero
    try:
        return SCENES[key](mocks, live)
    finally:
        HERO[0] = False
