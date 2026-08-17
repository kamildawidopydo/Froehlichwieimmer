# Kapitalmitte Rebrand — Uygulama Faz Planı

> **Kaynak:** ui-ux-pro-max design system + proje gereksinimleri  
> **Ton:** Resmi ve sıcak (Almanca) · **Logo:** Sonra değiştirilecek · **TÜV/LEI:** Şimdilik korunuyor

---

## Faz 0 — Temel (Design System + Copy) ✅

| Görev | Dosya | Durum |
|-------|-------|-------|
| Design system persist | `design-system/kapitalmitte-rebrand/MASTER.md` | ✅ |
| Uygulama faz planı | Bu dosya | ✅ |
| Merkezi metin kaynağı | `src/data/siteCopy.js` | ✅ |
| MASTER light-mode adaptasyonu | `MASTER.md` güncelleme | ✅ |

**Kararlar (ui-ux-pro-max + proje override):**
- **Tipografi:** IBM Plex Sans (heading + body), IBM Plex Mono (labels)
- **Renk:** Cool slate fintech — `#1E40AF` primary, `#22C55E` trust accent (eski gold yerine)
- **Light mode birincil** — dark mode desteklenir, marketing varsayılan açık
- **Pattern:** Minimal Swiss nav + compact footer

---

## Faz 1 — Design Tokens

| Görev | Dosya |
|-------|-------|
| CSS renk değişkenleri | `src/index.css` (`:root`, `.dark`) |
| Font import + grain/topo | `src/index.css` |
| Tailwind fontFamily + shadow | `tailwind.config.js` |
| h1–h4 display font ayarı | `src/index.css` |

**Grain:** İnce nokta grid (fractalNoise → dot matrix)  
**Topo:** Organik kontur → geometrik çizgi grid

---

## Faz 2 — Navbar (Minimal Swiss)

| Görev | Dosya |
|-------|-------|
| Mega-menu → 3 kompakt dropdown | `src/components/Navigation.js` |
| Glass blur kaldır, düz surface | `Navigation.js` |
| Serif dropdown → sans-serif | `Navigation.js` |
| Nav metinleri siteCopy'den | `Navigation.js` + `siteCopy.js` |
| Mobil drawer yeni palete uyum | `Navigation.js` |

**Yapı:** Logo · Angebote ▾ · Wissen ▾ · Unternehmen ▾ · News · [Actions]

---

## Faz 3 — Footer (Compact)

| Görev | Dosya |
|-------|-------|
| Benefits band yeni metin + renk | `FooterBenefitsBand.jsx` |
| Kompakt grid, daha az padding | `Footer.js` |
| Yeni slogan siteCopy'den | `Footer.js` |
| TÜV + LEI korunur | `FooterTrustBadges.jsx`, `LeiRegistrationBadge` |

---

## Faz 4 — Hero & Editorial

| Görev | Dosya |
|-------|-------|
| Yeni hero slogan + lede | `BankingHero.js` |
| Home product section metinleri | `HomePostHero.jsx` |
| Eyebrow accent rengi | `Eyebrow.jsx` |
| SectionLabel (opsiyonel ince ayar) | `SectionLabel.jsx` |

---

## Faz 5 — Geniş metin & görsel merkezileştirme ✅

| Görev | Dosya | Durum |
|-------|-------|-------|
| Merkezi kopya (FAQ, calculator, savings, social) | `src/data/siteCopyPhase5.js` → `siteCopy.js` | ✅ |
| Merkezi görseller (Unsplash kaldırıldı) | `src/data/siteImages.js` | ✅ |
| AI görsel üretimi | `scripts/generate-rebrand-marketing-images.mjs` | ✅ (48 manifest) |
| Ürün rehberleri | `src/data/savingsProductGuides.js` | ✅ |
| Fonds-Grundlagen editorial | `src/data/fondsGrundlagenContent.js` | ✅ |
| Spezial-AIF PIB görseli | `src/data/spezialAifPibContent.js` | ✅ |
| LinkedIn tagline | `src/data/social/linkedinProfile.js` | ✅ |
| Yasal sayfalar (marka adı hariç) | `legalPages.jsx` | ⏸ sonraki |
| PDF generator metinleri | `src/lib/generate*.js` | ⏸ sonraki |

**Görsel yenileme:** Tüm sayfa hero/editorial görselleri Pollinations Flux ile yeniden üretildi (`public/assets/marketing/`, `products/`, `compliance/`, `footer/benefits/`). Unsplash proxy artık sayfa içeriğinde kullanılmıyor.

---

## Faz 6 — Logo & Asset (kullanıcı)

- `public/assets/logo/` — yeni SVG
- Hero görseli (`/assets/hero-banking.png`)
- Favicon

---

## Doğrulama Checklist

- [ ] Light mode kontrast ≥ 4.5:1
- [ ] Dark mode token tutarlılığı
- [ ] Navbar 375 / 768 / 1024 / 1440 responsive
- [ ] Footer mobilde okunabilir
- [ ] `prefers-reduced-motion` korunuyor
- [ ] Dashboard `.dashboard-theme` etkilenmedi
- [ ] TÜV + LEI badge'ler görünür

---

## Token Özeti (bank-*)

| Token | Light | Kullanım |
|-------|-------|----------|
| `--bank-bg` | `#F8FAFC` | Sayfa arka planı |
| `--bank-surface` | `#FFFFFF` | Kart, nav |
| `--bank-primary` | `#1E40AF` | CTA, link |
| `--bank-gold` | `#16A34A` | Trust accent (eski brass) |
| `--bank-ink` | `#0F172A` | Koyu bantlar, footer |
