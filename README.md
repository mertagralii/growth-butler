# seo-butler — a Claude Code plugin

**Türkçe** · [English](#english)

**Geliştiriciler için uzman bir SEO & GEO ajansı.** Sen ürünü yaparsın; seo-butler onun bulunmasını
sağlar — hem Google'da sıralanmayı, hem ChatGPT/Claude/Perplexity gibi yapay zekâ motorlarında
**kaynak gösterilmeyi**.

Sana SEO sorusu sormaz. Projeni okur, stack'ini tespit eder, bir ajansın yapacağı teknik işi yapar —
ama **her zaman onayladığın bir plandan sonra**, git yedeği ve geri alma ile.

## Ne yapar

| Komut | Cevapladığı soru | Kodunu değiştirir mi? | Sıklık |
|---|---|---|---|
| `/seo` | *İşi yaptım mı?* | ✅ **onaydan sonra** | iş oldukça |
| `/seo-live` | *Yayına çıktı mı?* | ❌ | her deploy sonrası |
| `/seo-watch` | *Bir şey bozuldu mu?* | ❌ **asla** | haftalık, gözetimsiz |
| `/seo-report` | *İşe yaradı mı?* | ❌ | aylık |

Dördü bir **döngü** oluşturuyor — kurulum bir kerelik, sıralama değil:

```
/seo → deploy → /seo-live → (haftalık /seo-watch) → ~4 hafta → /seo-report → /seo → …
```

`/seo-report` Search Console'u okuyup işin uygulandığı andaki anlık görüntüyle kıyaslar ve farkı bir
sonraki `/seo` koşusu için **öncelikli plana** çevirir. Ayırt edici yanı: plugin **ne değiştirdiğini ve
ne zaman değiştirdiğini** bilir. Ahrefs sana gösterimin arttığını söyler; 19 Temmuz'da JSON-LD
eklediğinden haberi yoktur.

Nedensellik iddia etmez: *"şu sayesinde"* değil, *"şu yayına girdiğinden bu yana"* der — ve aynı
dönemde başka ne yaptıysan onu da hatırlatır.

35 maddelik **sabit** bir checklist üzerinden çalışır. Sabit olması kasıtlı: sonraki koşularda yeni
madde uydurmaz — ya yaptı ya yapmadı.

**Beş uzman agent:** teknik SEO · GEO & içerik · performans · erişilebilirlik · Search Console/GA4.

## Farkı: GEO

Çoğu SEO aracı 2015'in problemini çözüyor. İnsanlar artık soruları ChatGPT'ye soruyor. **GEO**
(Generative Engine Optimization) burada birinci sınıf vatandaş:

- robots.txt'in **alıntı botlarını** engellemediğini doğrular (GPTBot, ClaudeBot, PerplexityBot,
  OAI-SearchBot, Google-Extended, Bingbot) — en yüksek etkili tek ayar
- Kilit içeriğin sunucu tarafında render edildiğini kontrol eder (SPA boşlukları)
- Cevap-önce yapı, semantik HTML, FAQ blokları, `llms.txt`

`llms.txt` bilerek **düşük** ağırlıklıdır: 2026 itibarıyla hiçbir büyük yapay zekâ motoru onu resmen
tüketmiyor. Bu plugin kaynağını gösteremediği bir sayıyı — kendi lehine bile olsa — tekrarlamaz.

## Skor tahmin değil, hesaplanır

`scripts/` altında bağımlılıksız iki Node script'i var:

```
node scripts/validate-artifacts.mjs --url https://siten.com --root . --json
node scripts/score.mjs --state ./.seo-butler/state.json
```

İkisi de **ham baytlar** üzerinde çalışır, çünkü sahada build geçtiği hâlde site bozuk çıktı:

- Bir template motoru JSON-LD script tipini HTML-encode etmişti (`application/ld&#x2B;json`) — sayfa
  render oluyor, JSON orada duruyor, hiçbir tüketici görmüyor.
- `sitemap.xml` UTF-8 BOM ile çıkmıştı — katı XML parser'lar dosyayı tümden reddediyor, editörde görünmüyor.

Aynı site üzerinde iki koşu **byte-identik** çıktı verir. Skor 35 maddeyi ağırlıklandırır, `n/a`
maddeleri paydadan düşürür ve kalanı 100'e normalize eder — elde yapılan aritmetiğin aksine tekrarlanabilir.

## Dürüstlük kapıları

- **Uydurma yok.** Ölçülemeyen şey sebebiyle birlikte "ölçülemedi" yazılır, tahminle doldurulmaz.
- **Uygulandı ≠ yayında.** Deploy edilmemiş iş sıfır etki eder; her koşu bunu açıkça söyler.
- **Kullanıcının şifresi asla istenmez.** Google otomatik girişleri engeller; sen bir kez giriş yaparsın.
- **Onay kapısı.** Meta/başlık/alt doğrudan düzenlenir; **gövde metni** her zaman plana konur ve onayla uygulanır.
- **Lighthouse SEO 100**, teknik temellerin geçtiği anlamına gelir — sıralanacağın anlamına değil.

## Gereksinimler

| Ne | Gerekli mi | Not |
|---|---|---|
| **Node 18+** | ✅ Zorunlu | `scripts/` için. Ek bağımlılık yok. |
| **Playwright MCP** | Önerilir | Render edilmiş DOM, OG görsel üretimi, dashboard adımları. Pakette geliyor. |
| **Google hesabı** | Search Console/GA4 için | Şifren bize hiç gelmez. Tarayıcıdan otomatikleştirmek istersen **Claude-in-Chrome** gerekir (kendi oturum açmış Chrome'un); yoksa butler kod tarafını yapar ve sana tıklama tıklama yol tarifi verir. |
| **PSI API anahtarı** | Opsiyonel, ücretsiz | Anahtarsız PageSpeed Insights'ın günlük kotası var ve tekrarlı koşularda doluyor — Lighthouse ölçümünü düzenli istiyorsan ücretsiz bir anahtar al. |
| **context7 MCP** | Opsiyonel | Framework'e özgü API'ları doğrulamak için. Pakette geliyor. |
| **OpenSEO MCP** | Opsiyonel | Gerçek arama hacmi/zorluk verisi (~$10/ay). **Yoksa her şey anahtarsız çalışır** — nitel sinyaller, uydurma hacim yok. |

## Kurulum

```
/plugin marketplace add mertagralii/seo-butler
/plugin install seo-butler
```

Claude Code'u yeniden başlat, sonra projende `/seo` çalıştır.

Plugin **global** kurulur ama yalnızca komutu çalıştırdığın projeye dokunur. Hafızası
`./.seo-butler/state.json` içinde tutulur — `.gitignore`'a eklemeni önerir (iş profili içerir),
ama karar senin.

## v1.x'ten (growth-butler) geçiş

seo-butler, growth-butler'ın **yalnız SEO ailesi**. Launch, Automate, Ads ve Email aileleri
kaldırıldı — sahada test edilmiş ve gerçekten doğrulanabilir olan tek aile SEO'ydu; gerisi büyük
ölçüde LLM'in zaten üretebileceği pazarlama metniydi.

Komutlar `/growth-seo*` → `/seo*` oldu. Mevcut `.growth-butler/state.json` dosyan varsa ilk koşuda
okunur ve geçmişin kaybolmadan `.seo-butler/`'a taşınır.

## Durum

**v2.0.0.** SEO ailesi gerçek bir projede saha testinden geçti. v2.0.0'daki kod katmanı
(`scripts/`) ve MCP düzeltmeleri **yeni** — sınır durumlarıyla ve boş fixture'larla test edildi,
ama henüz canlı bir sitede uçtan uca doğrulanmadı. Bu README mevcut durumun dürüst özeti, bir vaat değil.

MIT lisanslı.

---

# English

**An expert SEO & GEO agency for developers.** You build the product; seo-butler gets it found — both
ranked by Google and **cited** by AI answer engines like ChatGPT, Claude and Perplexity.

It never asks you SEO questions. It reads your project, detects your stack, and does the technical
work an agency would — but **always behind a plan you approve**, with a git-aware backup and rollback.

## What it does

| Command | Question it answers | Changes your code? | Cadence |
|---|---|---|---|
| `/seo` | *Did I do the work?* | ✅ **after approval** | when there's work |
| `/seo-live` | *Did it ship?* | ❌ | after each deploy |
| `/seo-watch` | *Did something break?* | ❌ **never** | weekly, unattended |
| `/seo-report` | *Is it working?* | ❌ | monthly |

The four form a **loop** — setup is a one-off, ranking is not:

```
/seo → deploy → /seo-live → (weekly /seo-watch) → ~4 weeks → /seo-report → /seo → …
```

`/seo-report` reads Search Console, compares it with the snapshot from when the work landed, and turns
the difference into a **prioritized plan** for the next run. Its unfair advantage: the plugin knows
**what changed and when**. Ahrefs can tell you impressions rose; it has no idea you added JSON-LD on
19 July.

It never claims causation — *"since X landed"*, never *"because of X"* — and it names the confounders
it can see, including whatever else you were doing that month.

It works from a **fixed** 35-item checklist. Fixed on purpose: it never invents new items on later
runs — either it did them or it didn't.

**Five specialist agents:** technical SEO · GEO & content · performance · accessibility · Search Console/GA4.

## The difference: GEO

Most SEO tools solve 2015's problem. People now ask their questions in ChatGPT. **GEO** (Generative
Engine Optimization) is first-class here:

- Verifies robots.txt doesn't block the **citation bots** (GPTBot, ClaudeBot, PerplexityBot,
  OAI-SearchBot, Google-Extended, Bingbot) — the single highest-impact setting
- Checks key content is server-rendered (flags SPA gaps)
- Answer-first structure, semantic HTML, FAQ blocks, `llms.txt`

`llms.txt` is weighted **low** on purpose: as of 2026 no major AI engine officially consumes it. This
plugin doesn't repeat a number it can't source — including in its own favour.

## The score is computed, not estimated

`scripts/` ships two dependency-free Node scripts:

```
node scripts/validate-artifacts.mjs --url https://yoursite.com --root . --json
node scripts/score.mjs --state ./.seo-butler/state.json
```

Both work on **raw bytes**, because in the field a passing build still shipped a broken site:

- A template engine HTML-encoded the JSON-LD script type (`application/ld&#x2B;json`) — the page
  renders, the JSON is right there, and no consumer recognises it.
- `sitemap.xml` shipped with a UTF-8 BOM — strict XML parsers reject the whole file, and it's
  invisible in an editor.

Two runs on an unchanged site produce **byte-identical** output. The score weights all 35 items,
drops `n/a` items from the denominator, and renormalizes the rest to 100 — repeatable, unlike hand
arithmetic.

## Honesty gates

- **No fabrication.** Anything unmeasured is reported as unmeasured, with the reason — never estimated.
- **Applied is not live.** Work that isn't deployed has zero effect, and every run says so.
- **Your password is never requested.** Google blocks automated logins; you sign in once yourself.
- **The approval gate.** Meta/title/alt are edited directly; **body copy** always goes into the plan
  and is applied only on approval.
- **Lighthouse SEO 100** means the technical basics pass — not that you'll rank.

## Requirements

| What | Required | Note |
|---|---|---|
| **Node 18+** | ✅ Required | For `scripts/`. No other dependencies. |
| **Playwright MCP** | Recommended | Rendered DOM, OG image generation, dashboard steps. Bundled. |
| **A Google account** | For Search Console/GA4 | Your password never reaches the plugin. To automate it in a browser you need **Claude-in-Chrome** (your own signed-in Chrome); without it the butler does the code side and hands you exact click-by-click steps. |
| **A PSI API key** | Optional, free | Keyless PageSpeed Insights has a daily quota that repeat runs exhaust — get a free key if you want Lighthouse measured regularly. |
| **context7 MCP** | Optional | Confirms framework-specific APIs. Bundled. |
| **OpenSEO MCP** | Optional | Real search volume/difficulty (~$10/mo). **Without it everything runs keyless** — qualitative signals, no invented volumes. |

## Install

```
/plugin marketplace add mertagralii/seo-butler
/plugin install seo-butler
```

Restart Claude Code, then run `/seo` in your project.

The plugin installs **globally** but only ever touches the project you run the command in. Its memory
lives in `./.seo-butler/state.json` — it suggests adding that to `.gitignore` (it holds a business
profile), but the call is yours.

## Migrating from v1.x (growth-butler)

seo-butler is growth-butler's **SEO family only**. The Launch, Automate, Ads and Email families were
removed — SEO was the one family that had been field-tested and was genuinely verifiable; the rest was
largely marketing copy an LLM would produce anyway.

Commands went from `/growth-seo*` to `/seo*`. If you have an existing `.growth-butler/state.json`, the
first run reads it and carries your history forward into `.seo-butler/` without losing anything.

## Status

**v2.0.0.** The SEO family has been field-tested on a real project. The v2.0.0 code layer (`scripts/`)
and MCP fixes are **new** — tested against boundary cases and hand-built broken fixtures, but not yet
verified end-to-end against a live site. This README is an honest summary of the current state, not a
promise.

MIT licensed.
