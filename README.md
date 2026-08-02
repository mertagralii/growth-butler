# seo-butler — a Claude Code plugin

**Türkçe** · [English](#english)

**Geliştiriciler için uzman bir SEO & GEO ajansı.** Sen ürünü yaparsın; seo-butler onun bulunmasını
sağlar — hem Google'da sıralanmayı, hem ChatGPT/Claude/Perplexity gibi yapay zekâ motorlarında
**kaynak gösterilmeyi**.

Sana SEO sorusu sormaz. Projeni okur, stack'ini tespit eder, bir ajansın yapacağı teknik işi yapar —
ama **her zaman onayladığın bir plandan sonra**, git yedeği ve geri alma ile.

---

## Kurulum

```
/plugin marketplace add mertagralii/seo-butler
/plugin install seo-butler
```

Claude Code'u yeniden başlat. Plugin **global** kurulur ama yalnızca komutu çalıştırdığın projeye
dokunur.

**Gereken tek zorunlu şey Node 18+.** Gerisi opsiyonel — aşağıdaki [Gereksinimler](#gereksinimler).

---

## Nasıl kullanılır

### 1. İlk koşu — `/seo`

Projenin kökünde:

```
/seo
```

Sırayla şunlar olur:

**Keşif.** `package.json`, `*.csproj`, `astro.config` gibi imzalardan stack'ini tespit eder,
sayfalarını haritalar, mevcut meta etiketlerini okur, sitenin ne hakkında olduğunu içerikten çıkarır.
Daha önce koşmuşsan `.seo-butler/state.json`'ı okur ve **bitmiş işleri tekrar önermez**.

**Denetim.** Beş uzman agent'ı paralel çalıştırır, her biri 35 maddelik checklist'in kendi bölümünü
denetler.

**Plan — ve burada durur.**

```
📋 SEO/GEO Butler — Plan
Proje: Next.js App Router · 12 sayfa · İlk koşu

🎯 En iyi 3 kazanım
  1. Sitemap + robots.txt ekle — Google 12 sayfanı hiç bulamıyor    [etki: yüksek]
  2. 9 sayfada meta description yok — tıklanma oranı kaybı           [etki: yüksek]
  3. JSON-LD ekle — zengin sonuçlar ve AI alıntıları                 [etki: yüksek]

Kod tarafı (ben yaparım):
  • [yüksek] JSON-LD (Organization + WebSite + 3 Article)
  • [orta]   Open Graph + Twitter kartı (+ eksik OG görselini üretirim)
  ...

Dashboard tarafı (senin tarayıcın gerekir):
  • [orta] Search Console — site ekle, doğrula, sitemap gönder

Opsiyonel (ağır, opt-in):
  🔍 Strateji — keyword araştırması + rakip analizi
  📍 Local SEO — yerel işletme değilse atlanır

[ Onayla ]   [ Düzenle — "analytics'i atla" gibi ]   [ Reddet ]
```

**Onaylamadan hiçbir dosyaya dokunmaz.** "Düzenle" diyip madde çıkarabilirsin.

**Uygulama.** Önce git yedeği: repo temizse devam eder, kirliyse uyarır ve senin onayını bekler, repo
değilse `git init` önerir. Sonra uzmanlar yazar — dosya bazlı bölünmüş, birbirlerinin üzerine yazmazlar.

**Doğrulama.** Projenin kendi build/lint'ini çalıştırır, sonra deterministik doğrulayıcıları. Bir
değişiklik bir kontrolü bozduysa **o değişikliği geri alır**, maddeyi `partial` işaretler ve söyler.

**Skor kartı.** Öncesi → sonrası, ne yapıldı, ne eksik kaldı, sıradaki adım.

---

### 2. Deploy et, sonra `/seo-live`

Kodun düzelmesi işin yarısı. Deploy edip:

```
/seo-live
```

Canlı sitenin **ham yanıtını** çeker. Neden gerekli: template motorları çıktıyı bozabiliyor, CDN'ler
robots.txt'i gölgeleyebiliyor, deploy yarım kalabiliyor — hiçbiri kaynak kodda görünmüyor.

Ayrıca gerçek ölçümü burada alır: Lighthouse (yerel, kotasız), performans trace'i (ölçülmüş LCP/CLS),
CrUX gerçek kullanıcı verisi.

---

### 3. Haftalık nöbetçi — `/seo-watch`

```
/seo-watch
```

Salt-okunur. Canlı siteyi kayıtlı temel çizgiyle karşılaştırır: robots.txt değişti mi (CDN kayması),
bir rota 404'e mi düştü, canonical kayboldu mu, Lighthouse düştü mü.

**Hiçbir şeye dokunmaz** — gözetimsiz çalıştığı için onay alamaz, ve bu plugin'de her değişiklik
onaydan geçer. Bulduğunu raporlar, düzeltmeyi `/seo`'ya devreder.

Zamanlamayı plugin kuramaz, sen kurarsın — Claude Code'un `/schedule` komutu, bir CI job'ı ya da kendi
cron'un. Haftalık makul bir varsayılan.

---

### 4. Aylık sonuç raporu — `/seo-report`

```
/seo-report
```

Search Console'u okur, işin uygulandığı andaki anlık görüntüyle kıyaslar, farkı **bir sonraki `/seo`
için öncelikli plana** çevirir.

**28 günden erken çalıştırırsan reddeder** — trend uydurmaz, "şu tarihte gel" der. Google'ın veriyi
oturtması haftalar alıyor.

---

### Döngü

```
/seo → deploy → /seo-live → (haftalık /seo-watch) → ~4 hafta → /seo-report → /seo → …
```

Kurulum bir kerelik, sıralama değil.

---

### Pratik notlar

**Sana ne sorar, ne sormaz.** SEO kararlarını sormaz — meta açıklama kaç karakter, hangi schema tipi,
canonical stratejisi… hepsini kendisi verir. Sadece **uyduramayacağı iş bilgilerini** sorar: şirket
adı, iletişim maili, sosyal medya profilleri. Onları da önce koddan bulmaya çalışır.

**Kapsamı daraltmak istersen:** `/seo sadece sitemap` ya da `/seo analytics'i atla` — plan yine
gösterilir, onay yine istenir.

**Strateji fazını istiyorsan** planda 🔍 Strateji satırını onayla. Araştırmaya başlamadan önce sana bir
kez sorar: anahtarsız (ücretsiz) mı, yoksa gerçek arama hacmi için OpenSEO mu. Parayı seçimden önce söyler.

**Google adımları için** iki yol var: Claude-in-Chrome (kendi Chrome'un, kurulum yok) ya da bundled
tarayıcıda **bir kez** kendin giriş yaparsın — profil kalıcı, sonraki koşularda hatırlar. İkisi de
yoksa kod tarafını yapar, sana tıklama tıklama yol tarifi verir. **Şifreni asla istemez.**

**Script'leri elle de çalıştırabilirsin** — plugin'e gerek yok:

```
node scripts/validate-artifacts.mjs --url https://siten.com --root . --json
node scripts/score.mjs --state ./.seo-butler/state.json --fail-under 90
```

`--fail-under` CI'da kapı kurmak için: skor eşiğin altındaysa exit 1.

---

## Ne yapar

| Komut | Cevapladığı soru | Kodunu değiştirir mi? | Sıklık |
|---|---|---|---|
| `/seo` | *İşi yaptım mı?* | ✅ **onaydan sonra** | iş oldukça |
| `/seo-live` | *Yayına çıktı mı?* | ❌ | her deploy sonrası |
| `/seo-watch` | *Bir şey bozuldu mu?* | ❌ **asla** | haftalık, gözetimsiz |
| `/seo-report` | *İşe yaradı mı?* | ❌ | aylık |

35 maddelik **sabit** bir checklist üzerinden çalışır. Sabit olması kasıtlı: sonraki koşularda yeni
madde uydurmaz — ya yaptı ya yapmadı.

**Beş uzman agent:** teknik SEO · GEO & içerik · performans · erişilebilirlik · Search Console/GA4.

`/seo-report`'un ayırt edici yanı: plugin **ne değiştirdiğini ve ne zaman değiştirdiğini** bilir.
Ahrefs sana gösterimin arttığını söyler; 19 Temmuz'da JSON-LD eklediğinden haberi yoktur. Ama
nedensellik iddia etmez: *"şu sayesinde"* değil, *"şu yayına girdiğinden bu yana"* — ve aynı dönemde
başka ne yaptıysan onu da hatırlatır.

## Farkı: GEO

Çoğu SEO aracı 2015'in problemini çözüyor. İnsanlar artık soruları ChatGPT'ye soruyor. **GEO**
(Generative Engine Optimization) burada birinci sınıf vatandaş:

- robots.txt'in **alıntı botlarını** engellemediğini doğrular — GPTBot, ClaudeBot, PerplexityBot,
  OAI-SearchBot, Google-Extended, Bingbot, GoogleOther, Bytespider, CCBot. En yüksek etkili tek ayar,
  ve genelde `User-agent: *` bloğu bunları kimse istemeden süpürüyor.
- Kilit içeriğin sunucu tarafında render edildiğini kontrol eder (SPA boşlukları)
- Cevap-önce yapı, semantik HTML, listicle yapısı, FAQ blokları, schema katmanlama, `llms.txt`

`llms.txt` bilerek **düşük** ağırlıklıdır: 2026 itibarıyla hiçbir büyük yapay zekâ motoru onu resmen
tüketmiyor. Bu plugin kaynağını gösteremediği bir sayıyı — kendi lehine bile olsa — tekrarlamaz.

## Skor tahmin değil, hesaplanır

`scripts/` altında bağımlılıksız iki Node script'i var. İkisi de **ham baytlar** üzerinde çalışır,
çünkü sahada build geçtiği hâlde site bozuk çıktı:

- Bir template motoru JSON-LD script tipini HTML-encode etmişti (`application/ld&#x2B;json`) — sayfa
  render oluyor, JSON orada duruyor, hiçbir tüketici görmüyor.
- `sitemap.xml` UTF-8 BOM ile çıkmıştı — katı XML parser'lar dosyayı tümden reddediyor, editörde görünmüyor.

Aynı site üzerinde iki koşu **byte-identik** çıktı verir. Skor 35 maddeyi ağırlıklandırır, `n/a`
maddeleri paydadan düşürür ve kalanı 100'e normalize eder — elde yapılan aritmetiğin aksine tekrarlanabilir.

**Performans da tahmin değil, ölçüm.** Chrome DevTools trace'i gerçek LCP/CLS ve nedenlerini veriyor —
*"bu görsel muhtemelen LCP'indir"* değil, *"LCP 258 ms, 138 ms'i render gecikmesi"*.

## Dürüstlük kapıları

- **Uydurma yok.** Ölçülemeyen şey sebebiyle birlikte "ölçülemedi" yazılır, tahminle doldurulmaz.
- **Uygulandı ≠ yayında.** Deploy edilmemiş iş sıfır etki eder; her koşu bunu açıkça söyler.
- **Kullanıcının şifresi asla istenmez.** Google otomatik girişleri engeller; sen bir kez giriş yaparsın.
- **Onay kapısı.** Meta/başlık/alt doğrudan düzenlenir; **gövde metni** her zaman plana konur ve onayla uygulanır.
- **Uydurma içerik işaretlenmez.** Doğrulanamayan yorum/puan bloklarına `Review` şeması eklemez —
  üstelik bunu SEO sorunu değil, **yanıltıcı reklam riski** olarak bildirir.
- **Lighthouse SEO 100**, teknik temellerin geçtiği anlamına gelir — sıralanacağın anlamına değil.

## Gereksinimler

| Ne | Gerekli mi | Not |
|---|---|---|
| **Node 18+** | ✅ Zorunlu | `scripts/` için. Ek bağımlılık yok. |
| **chrome-devtools MCP** | Önerilir | Google'ın kendi aracı. **Lighthouse'u yerelde çalıştırır** (kota yok, anahtar yok), gerçek performans trace'i alır, render edilmiş DOM'u okur, OG görselini üretir. Pakette geliyor. |
| **Google hesabı** | Search Console/GA4 için | Şifren bize hiç gelmez. İki yol: **Claude-in-Chrome** (kurulum yok) ya da bundled tarayıcıda **bir kez** giriş — profil kalıcı. İkisi de yoksa kod tarafı yapılır + yol tarifi verilir. |
| **context7 MCP** | Opsiyonel | Framework'e özgü API'ları doğrulamak için. Pakette geliyor. |
| **OpenSEO MCP** | Opsiyonel | Gerçek arama hacmi/zorluk verisi (~$10/ay). **Yoksa her şey anahtarsız çalışır** — nitel sinyaller, uydurma hacim yok. |
| **PSI API anahtarı** | Nadiren gerekir | Yalnızca yerel Chrome yokken devreye giren yedek. Lighthouse artık yerelde çalıştığı için çoğu kullanıcı buna hiç ihtiyaç duymaz. |

Hafızası `./.seo-butler/state.json` içinde tutulur — `.gitignore`'a eklemeni önerir (iş profili
içerir), ama karar senin.

## v1.x'ten (growth-butler) geçiş

seo-butler, growth-butler'ın **yalnız SEO ailesi**. Launch, Automate, Ads ve Email aileleri
kaldırıldı — sahada test edilmiş ve gerçekten doğrulanabilir olan tek aile SEO'ydu; gerisi büyük
ölçüde LLM'in zaten üretebileceği pazarlama metniydi.

Komutlar `/growth-seo*` → `/seo*` oldu. Mevcut `.growth-butler/state.json` dosyan varsa ilk koşuda
okunur ve geçmişin kaybolmadan `.seo-butler/`'a taşınır.

## Durum

**v2.1.0.** Dört komut da gerçek bir projede (ASP.NET Core MVC, canlı site) uçtan uca çalıştırıldı ve
dürüstlük kapılarını geçti: skor bağımsız doğrulamayla birebir eşleşti, `/seo-report` veri yetersizken
trend üretmeyi reddetti, `/seo` kendi skorunu yükseltebilecekken *"dürüst olmaz"* diyerek bırakmadı.

**v2.1.0'daki yenilikler henüz tam bir koşuda denenmedi** — Playwright'tan chrome-devtools'a geçiş,
ölçülen performans, yeni kontroller. Araçlar tek tek doğrulandı (1200×630 ekran görüntüsü, Lighthouse,
trace) ama uçtan uca koşu bekliyor. Sıfırdan bir projede ilk koşu da hiç test edilmedi.

Bu README mevcut durumun dürüst özeti, bir vaat değil.

MIT lisanslı.

---

# English

**An expert SEO & GEO agency for developers.** You build the product; seo-butler gets it found — both
ranked by Google and **cited** by AI answer engines like ChatGPT, Claude and Perplexity.

It never asks you SEO questions. It reads your project, detects your stack, and does the technical
work an agency would — but **always behind a plan you approve**, with a git-aware backup and rollback.

---

## Install

```
/plugin marketplace add mertagralii/seo-butler
/plugin install seo-butler
```

Restart Claude Code. The plugin installs **globally** but only ever touches the project you run the
command in.

**Node 18+ is the only hard requirement.** Everything else is optional — see
[Requirements](#requirements).

---

## How to use it

### 1. First run — `/seo`

From your project root:

```
/seo
```

Here's what happens, in order:

**Discover.** It detects your stack from real signatures (`package.json`, `*.csproj`, `astro.config`…),
maps your pages, reads existing metadata, and works out what the site is about from its actual content.
If it has run before it reads `.seo-butler/state.json` and **won't re-propose finished work**.

**Audit.** Five specialist agents run in parallel, each covering its slice of the 35-item checklist.

**The plan — and it stops here.**

```
📋 SEO/GEO Butler — Plan
Project: Next.js App Router · 12 pages · First run

🎯 Top 3 wins
  1. Add sitemap + robots.txt — Google can't find your 12 pages at all   [impact: high]
  2. 9 pages have no meta description — lost click-through               [impact: high]
  3. Add JSON-LD — rich results and AI citations                         [impact: high]

Code side (I'll do these):
  • [high] JSON-LD (Organization + WebSite + 3 Article)
  • [med]  Open Graph + Twitter card (+ I'll generate the missing OG image)
  ...

Dashboard side (needs your browser):
  • [med] Search Console — add site, verify, submit sitemap

Optional (heavy, opt-in):
  🔍 Strategy — keyword research + competitor analysis
  📍 Local SEO — skipped unless you're a local business

[ Approve ]   [ Edit — e.g. "skip analytics" ]   [ Reject ]
```

**It touches no file until you approve.** Say "edit" and drop whatever you don't want.

**Apply.** Git-aware backup first: clean tree → proceed; dirty tree → warn and wait for your OK; not a
repo → recommend `git init`. Then the specialists write, split by file so they never overwrite each other.

**Verify.** It runs your project's own build/lint, then the deterministic validators. If a change
regressed a check it **reverts that change**, marks the item `partial`, and tells you.

**Score card.** Before → after, what was done, what's still open, what's next.

---

### 2. Deploy, then `/seo-live`

Fixing the code is half the job. Deploy, then:

```
/seo-live
```

It fetches the **raw response** from your live site. Why that matters: template engines mangle output,
CDNs shadow robots.txt, deploys land half-finished — none of it visible in the source.

Real measurement happens here too: Lighthouse (local, no quota), a performance trace (measured LCP/CLS),
and CrUX real-user data.

---

### 3. Weekly watchdog — `/seo-watch`

```
/seo-watch
```

Read-only. Diffs the live site against the stored baseline: did robots.txt change (CDN drift), did a
route start 404ing, did a canonical disappear, did Lighthouse drop.

**It changes nothing** — it runs unattended, so nobody is there to approve a plan, and every change in
this plugin goes through approval. It reports and hands off to `/seo`.

The plugin can't schedule itself — you wire it up with Claude Code's `/schedule`, a CI job, or your own
cron. Weekly is a sensible default.

---

### 4. Monthly outcome report — `/seo-report`

```
/seo-report
```

Reads Search Console, compares against the snapshot from when the work landed, and turns the difference
into a **prioritized plan** for the next `/seo`.

**Run it before 28 days and it refuses** — it won't manufacture a trend, it tells you the date to come
back. Google takes weeks to settle.

---

### The loop

```
/seo → deploy → /seo-live → (weekly /seo-watch) → ~4 weeks → /seo-report → /seo → …
```

Setup is a one-off. Ranking isn't.

---

### Practical notes

**What it asks you, and what it doesn't.** It never asks SEO questions — meta description length,
which schema type, canonical strategy: it decides all of those. It only asks for **business facts it
can't invent**: company name, contact email, social profiles. And it tries to find those in your code first.

**To narrow the scope:** `/seo only sitemap` or `/seo skip analytics` — you still get the plan, you
still approve it.

**For the strategy phase**, approve the 🔍 Strategy line in the plan. Before researching anything it
asks you once: keyless (free) or OpenSEO for real search volumes. The cost is stated before you choose.

**For Google steps** there are two routes: Claude-in-Chrome (your own Chrome, no setup), or sign in
**once** yourself in the bundled browser — the profile persists, so later runs remember. With neither,
it does the code side and hands you exact click-by-click steps. **It never asks for your password.**

**You can run the scripts by hand** — no plugin needed:

```
node scripts/validate-artifacts.mjs --url https://yoursite.com --root . --json
node scripts/score.mjs --state ./.seo-butler/state.json --fail-under 90
```

`--fail-under` is a CI gate: exit 1 when the score is below the threshold.

---

## What it does

| Command | Question it answers | Changes your code? | Cadence |
|---|---|---|---|
| `/seo` | *Did I do the work?* | ✅ **after approval** | when there's work |
| `/seo-live` | *Did it ship?* | ❌ | after each deploy |
| `/seo-watch` | *Did something break?* | ❌ **never** | weekly, unattended |
| `/seo-report` | *Is it working?* | ❌ | monthly |

It works from a **fixed** 35-item checklist. Fixed on purpose: it never invents new items on later
runs — either it did them or it didn't.

**Five specialist agents:** technical SEO · GEO & content · performance · accessibility · Search Console/GA4.

`/seo-report`'s unfair advantage: the plugin knows **what changed and when**. Ahrefs can tell you
impressions rose; it has no idea you added JSON-LD on 19 July. But it never claims causation —
*"since X landed"*, never *"because of X"* — and it names the confounders it can see, including
whatever else you were doing that month.

## The difference: GEO

Most SEO tools solve 2015's problem. People now ask their questions in ChatGPT. **GEO** (Generative
Engine Optimization) is first-class here:

- Verifies robots.txt doesn't block the **citation bots** — GPTBot, ClaudeBot, PerplexityBot,
  OAI-SearchBot, Google-Extended, Bingbot, GoogleOther, Bytespider, CCBot. The single highest-impact
  setting, and a catch-all `User-agent: *` block usually sweeps them up without anyone intending it.
- Checks key content is server-rendered (flags SPA gaps)
- Answer-first structure, semantic HTML, listicle structure, FAQ blocks, schema stacking, `llms.txt`

`llms.txt` is weighted **low** on purpose: as of 2026 no major AI engine officially consumes it. This
plugin doesn't repeat a number it can't source — including in its own favour.

## The score is computed, not estimated

`scripts/` ships two dependency-free Node scripts. Both work on **raw bytes**, because in the field a
passing build still shipped a broken site:

- A template engine HTML-encoded the JSON-LD script type (`application/ld&#x2B;json`) — the page
  renders, the JSON is right there, and no consumer recognises it.
- `sitemap.xml` shipped with a UTF-8 BOM — strict XML parsers reject the whole file, and it's
  invisible in an editor.

Two runs on an unchanged site produce **byte-identical** output. The score weights all 35 items,
drops `n/a` items from the denominator, and renormalizes the rest to 100 — repeatable, unlike hand
arithmetic.

**Performance is measured too, not guessed.** A Chrome DevTools trace gives real LCP/CLS and the
reason behind them — not *"that image is probably your LCP"* but *"LCP 258 ms, 138 ms of it render delay"*.

## Honesty gates

- **No fabrication.** Anything unmeasured is reported as unmeasured, with the reason — never estimated.
- **Applied is not live.** Work that isn't deployed has zero effect, and every run says so.
- **Your password is never requested.** Google blocks automated logins; you sign in once yourself.
- **The approval gate.** Meta/title/alt are edited directly; **body copy** always goes into the plan
  and is applied only on approval.
- **It won't mark up invented content.** Testimonial or rating blocks it can't verify never get
  `Review` schema — and it reports that as a **misleading-advertising risk**, not just an SEO issue.
- **Lighthouse SEO 100** means the technical basics pass — not that you'll rank.

## Requirements

| What | Required | Note |
|---|---|---|
| **Node 18+** | ✅ Required | For `scripts/`. No other dependencies. |
| **chrome-devtools MCP** | Recommended | Google's own tool. **Runs Lighthouse locally** (no quota, no key), records real performance traces, reads the rendered DOM, generates the OG image. Bundled. |
| **A Google account** | For Search Console/GA4 | Your password never reaches the plugin. Two routes: **Claude-in-Chrome** (no setup), or sign in **once** in the bundled browser — the profile persists. With neither, you get the code side plus exact steps. |
| **context7 MCP** | Optional | Confirms framework-specific APIs. Bundled. |
| **OpenSEO MCP** | Optional | Real search volume/difficulty (~$10/mo). **Without it everything runs keyless** — qualitative signals, no invented volumes. |
| **A PSI API key** | Rarely needed | Only the fallback for when there's no local Chrome. Lighthouse runs locally now, so most people never need it. |

Its memory lives in `./.seo-butler/state.json` — it suggests adding that to `.gitignore` (it holds a
business profile), but the call is yours.

## Migrating from v1.x (growth-butler)

seo-butler is growth-butler's **SEO family only**. The Launch, Automate, Ads and Email families were
removed — SEO was the one family that had been field-tested and was genuinely verifiable; the rest was
largely marketing copy an LLM would produce anyway.

Commands went from `/growth-seo*` to `/seo*`. If you have an existing `.growth-butler/state.json`, the
first run reads it and carries your history forward into `.seo-butler/` without losing anything.

## Status

**v2.1.0.** All four commands have been run end to end on a real project (ASP.NET Core MVC, live site)
and held their honesty gates: the score matched an independent verification exactly, `/seo-report`
refused to produce a trend on insufficient data, and `/seo` declined to raise its own score when the
item wasn't genuinely done.

**What's new in v2.1.0 hasn't been through a full run yet** — the Playwright → chrome-devtools swap,
measured performance, the new checks. The tools were each verified individually (1200×630 screenshot,
Lighthouse, trace) but an end-to-end run is still pending. A first run on a fresh project has never
been tested either.

This README is an honest summary of the current state, not a promise.

MIT licensed.
