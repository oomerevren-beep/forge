FORGE 100K PIPELINE — AŞAMA 1 / 5

MASTER PROMPT 1: DERİN REPO TEMİZLİĞİ, GİT HİJYENİ VE AÇIK KAYNAK STANDARDİZASYONU

Aşama Konumu: 1. Aşama (Temel Hijyen ve Altyapı Hazırlığı)

Ön Koşul: Yok (Mevcut kod tabanı başlangıç noktasıdır)

Sonraki Aşama: Aşama 2 (Çekirdek Mimari ve Adaptör Refactor'ı)

GÖREV TANIMI VE UZMAN PERSONA

Sen kıdemli bir Açık Kaynak Proje Sorumlusu (OSS Maintainer) ve Git/DevOps Güvenlik Mimarısın. Görevin, oomerevren-beep/forge reposunu bir "yapay zekâ kodlama prototipi / taslak çalışma alanı" görünümünden çıkarıp, dünyanın en saygın açık kaynak projelerinin (örn. Node.js, Bun, Vite, Rust) üretim seviyesindeki repo disiplinine ve temizliğine kavuşturmaktır.

1\. KALINTI VE ÇÖP DOSYA TEMİZLİĞİ (ZERO ARTIFACT POLICY)

Aşağıdaki dizin ve dosyaları derhal git takibinden çıkar ve yerel sistemden tamamen sil:

docs/run-state/ dizinini ve içerisindeki tüm dosyaları (CHECKPOINT.md, EPOCH\_1c\_1d\_SONU .md, EPOCH\_1c\_1e\_SONU .md vb.) kalıcı olarak sil. Bu dosyalar AI agent çalıştırma döngülerinden kalmış, Türkçe isimlendirilmiş ve dosya adında boşluk barındıran gayriresmi dosyalardır.

.hermes/ klasörünü (özellikle .hermes/environment.json) ve .kiro/ klasörünü (özellikle .kiro/settings/cli.json) tamamen kaldır. Bunlar yerel IDE/ajan ortamı ayarlarıdır ve açık kaynak kod ağacında bulunamaz.

Geçici test çıktıları, build logları ve işletim sistemi artıklarını (.DS\_Store, Thumbs.db) temizle.

2\. BİNARY DOSYALARIN GİT AĞACINDAN ÇIKARILMASI

Bir paket yöneticisinin git reposu içinde önceden paketlenmiş tarball binary'leri yer alamaz:

registry-content/ klasöründe yer alan tüm \*.tar.gz dosyalarını (örn. agent-changelog-writer-1.0.0.tar.gz, pdf-compress-1.0.0.tar.gz vb.) git indeksinden ve repodan kaldır.

Paketlerin sadece kaynak kod / şablon dosyalarını (SKILL.md, agent.md, forge.toml) repoda tut.

Bu arşivlerin dinamik olarak oluşturulması için scripts/build-registry.ts betiğini revize et; build işlemi sırasında dist/ veya .cache/ altında geçici olarak üretilmesini sağla.

3\. PROFESYONEL .gitignore VE TEMİZLİK OTOMASYONU

Reponun kök dizinindeki .gitignore dosyasını aşağıdaki kuralları içerecek şekilde baştan oluştur:

\# Dependencies

node\_modules/

.pnp

.pnp.js



\# Build Outputs

dist/

build/

out/

\*.tsbuildinfo



\# Package Manager Archives \& Temp

\*.tar.gz

\*.tgz

\*.zip

.cache/



\# Agent, LLM \& Local IDE Runtime Artifacts

.hermes/

.kiro/

.claude/

.cursor/

.windsurf/

run-state/

\*.checkpoint

\*.epoch



\# Environment \& Credentials

.env

.env.local

.env.\*.local

\*.pem

\*.key



\# Operating System

.DS\_Store

Thumbs.db





4\. DİL VE KOD İÇİ METİN HİJYENİ (100% ENGLISH OSS STANDARD)

Tüm kod tabanını (CLI, testler, scriptler, JSON/TOML şemaları ve dökümanlar) tara.

Kod yorumlarında, hata mesajlarında, console loglarında veya dökümanlarda yer alan Türkçe ifadeleri tamamen kaldır ve akıcı, profesyonel teknik İngilizceye dönüştür.

Değişken, fonksiyon ve dosya isimlendirmelerini katı camelCase/kebab-case standartlarına bağla.

5\. LİSANS, GÜVENLİK VE KATKIDA BULUNMA STANDARTLARI

LICENSE: MIT lisans metninin eksiksiz ve telif hakkı sahibinin net belirtilmiş olduğunu doğrula.

SECURITY.md: Sorumlu açıklama (responsible disclosure) süreci, güvenlik açığı bildirim e-postası ve PGP anahtarı politikasını netleştir.

CONTRIBUTING.md: Yeni bir adaptör ekleme, yeni bir skill paketi hazırlama ve yerel geliştirme ortamını kurma adımlarını adım adım standardize et.

.github/workflows/ci.yml: Her PR ve push işleminde çalışan; lint (ESLint), tip kontrolü (TypeScript strict mode) ve test döngüsünü zorunlu kılan katı bir GitHub Actions akışı kur.

KABUL KRİTERLERİ VE DEVİR SÖZLEŞMESİ (HANDOFF CONTRACT)

Bu aşama tamamlandığında:

git status çalıştırıldığında hiçbir takip edilmeyen çöp dosya, Türkçe isimlendirilmiş dosya veya binary arşiv bulunmamalıdır.

git log ve repo ağacında dosya boyutu 100 KB'ı aşan hiçbir binary kalmamalıdır.

npm run lint \&\& npm run typecheck komutları sıfır hata ve sıfır uyarı ile tamamlanmalıdır.

Bu kriterler karşılandığında sistem Aşama 2'ye (Çekirdek Mimari ve Adaptör Refactor'ı) geçmeye hazır olacaktır.

&#x20;  





FORGE 100K PIPELINE — AŞAMA 2 / 5

MASTER PROMPT 2: ÇEKİRDEK MİMARİ, SIFIR SÜRTÜNMELİ DX VE DİNAMİK ADAPTÖR KATMANI

Aşama Konumu: 2. Aşama (Core Runtime, Engine \& Adapters)

Ön Koşul: Aşama 1 (Repo temizliği, tip kontrolü ve git hijyeni tamamlanmış olmalıdır)

Sonraki Aşama: Aşama 3 (Evrensel Ajan Bağlamı ve Güvenlik Sandbox'ı)

GÖREV TANIMI VE UZMAN PERSONA

Sen kıdemli bir Sistem \& CLI Çekirdek Mimarı (Core Engine Architect) ve TypeScript Uzmanısın. Görevin; Forge CLI'ı sıradan bir dosya kopyalama betiğinden çıkarıp; pnpm hızında, deterministik lockfile üreten, sıfır kuruluma sahip (npx/bunx uyumlu) ve önde gelen tüm AI editörlerinin (Cursor, Claude Code, Windsurf, OpenCode, Codex) en güncel konfigürasyon formatlarıyla çift yönlü çalışan kusursuz bir çekirdek motora dönüştürmektir.

1\. SIFIR SÜRTÜNMELİ ÇALIŞMA (ZERO-INSTALL / INSTANT RUNTIME)

Kullanıcıların makinesine global npm paketi kurma zorunluluğu açık kaynakta en büyük terk edilme nedenidir. Forge'un ilk saniyeden itibaren çalışabilmesini sağla:

package.json dosyasında bin eşlemesini tanımla ("forge": "./dist/index.js").

cli/src/index.ts dosyasında shebang (#!/usr/bin/env node) tanımla ve bundle sürecinde (tsup / esbuild) CLI başlatma süresini < 50ms seviyesine optimize et.

npx forge add <package> veya bunx forge add <package> komutlarının sıfır ön yapılandırma ile anında çalışmasını garanti et.

2\. 2026 STANDARTLARINDA ADAPTÖR KATMANI REFACTOR'I

cli/src/adapters/ altındaki tüm adaptörleri sektörün en son güncellemelerine göre yeniden inşa et:

Cursor Adaptörü (cursor.ts):

Eski .cursorrules tekil dosya mantığını geriye dönük uyumlu tutarak, modern çoklu kural formatına taşı: .cursor/rules/<skill-name>.mdc (Frontmatter metadata: description, globs, alwaysApply).

MCP sunucularını otomatik olarak .cursor/mcp.json içine enjekte et.

Claude Code Adaptörü (claude.ts):

Proje kökündeki CLAUDE.md dosyasına deklaratif kurallar ekle.

MCP araçlarını ve izin tanımlarını .claude/mcp.json veya Claude Desktop uyumlu şemalara entegre et.

Windsurf Adaptörü (windsurf.ts):

.windsurfrules ve Cascade AI kurallarını yapılandır.

MCP konfigürasyonlarını .codeium/windsurf/mcp\_config.json ile senkronize et.

OpenCode \& Codex \& DSH Adaptörleri (opencode.ts, codex.ts, dsh.ts):

Standart AGENTS.md ve ortak sistem istemi kurallarını üreten ortak arayüz (BaseAdapter) üzerinden miras aldır.

3\. ZARAR VERMEYEN BİRLEŞTİRME (NON-DESTRUCTIVE 3-WAY MERGE ENGINE)

Bir paket yüklenirken veya güncellenirken kullanıcının elle yazdığı özel kuralların üzerine yazılmasını (overwrite) engelle:

Mevcut konfigürasyon dosyalarını parse ederken AST veya blok bazlı imza kontrolü kullan.

Forge tarafından yönetilen bölümleri özel ayraçlarla işaretle:

<!-- FORGE:START id="agent-pr-reviewer" version="1.0.0" -->

... skill yönergeleri ...

<!-- FORGE:END id="agent-pr-reviewer" -->

Kullanıcının kendi eklediği kurallara asla dokunma. Paket kaldırıldığında sadece ilgili blokları temizle.

4\. DETERMINISTIK LOCKFILE VE SEMVER ÇÖZÜMLEYİCİ (forge.lock)

cli/src/core/lock.ts ve semver.ts bileşenlerini güçlendir:

Her yüklenen paketin kaynak adresini, çözümlenen sürümünü ve SHA-256 bütünlük karmasını (integrity hash) forge.lock içine kaydet.

Takım arkadaşlarının forge install çalıştırdığında baytına kadar aynı yetenek ve kurallara sahip olmasını sağla.

Geçersiz kılınan (yanked) veya hash uyuşmazlığı olan paketlerde süreci durdurup uyarı veren güvenlik bariyeri ekle.

KABUL KRİTERLERİ VE DEVİR SÖZLEŞMESİ (HANDOFF CONTRACT)

tests/adapters-matrix.test.ts testi tüm hedef editörler için çalışmalı ve üretilen dosyaların geçerli sözdizimine sahip olduğunu doğrulamalıdır.

Var olan bir CLAUDE.md veya .cursor/rules/ dosyasına paket eklendiğinde kullanıcı içerikleri silinmemeli, sadece işaretli blok güncellenmelidir.

forge.lock deterministik olarak üretilmeli ve versiyon kilitleri korunmalıdır.

Bu kriterler sağlandığında Aşama 3'e (Evrensel Ajan Bağlamı ve Güvenlik Sandbox'ı) geçilebilir.







FORGE 100K PIPELINE — AŞAMA 3 / 5

MASTER PROMPT 3: EVRENSEL AJAN BAĞLAMI (DOCKER FOR CONTEXT) VE GÜVENLİK/AUDIT MOTORU

Aşama Konumu: 3. Aşama (Core Value Proposition, Decentralization \& Security)

Ön Koşul: Aşama 2 (Çekirdek CLI, adaptörler ve deterministik lockfile hazır olmalıdır)

Sonraki Aşama: Aşama 4 (İnteraktif TUI ve Büyüme Döngüleri)

GÖREV TANIMI VE UZMAN PERSONA

Sen bir Yapay Zekâ Protokol Mühendisi (AI Protocol Engineer) ve Uygulama Güvenliği Uzmanı (AppSec Specialist)sın. Görevin; Forge'u basit bir "araç kurucu" seviyesinden çıkarıp, takımlar için "AI Bağlamının Docker'ı (Docker for Agent Context)" haline getirmektir. Merkezi olmayan (decentralized) paket kurulumunu sağlamalı, `forge.toml` standardını evrenselleştirmeli ve üçüncü parti yetenekleri denetleyen güçlü bir statik güvenlik motoru (AST security scanner) inşa etmelisin.

1\. MERKEZİ OLMAYAN (DECENTRALIZED / GIT-NATIVE) PAKET ÇÖZÜMLEME

Merkezi bir sunucu veya tescilli bir web registry'sine bağımlı kalmak açık kaynak projelerin benimsenmesini yavaşlatır. Forge'un doğrudan açık ekosistemden beslenmesini sağla:

cli/src/core/registry.ts modülünü genişleterek şu kaynak biçimlerini destekle:

GitHub Shorthand: forge add github:owner/repo veya forge add owner/repo

Doğrudan Git URL: forge add https://github.com/...git veya git@github.com:...

Yerel Dosya / Monorepo Yolu: forge add ./packages/my-custom-skill

Resmi Doğrulanmış Kayıt Defteri (Verified Registry): forge add pdf-compress

Git kaynaklarından indirilen repolardaki SKILL.md, agent.md veya forge.toml manifestolarını otomatik parse et.

2\. EVRENSEL AJAN BİLDİRİMİ (forge.toml — DOCKER FOR CONTEXT)

Bir yazılım projesindeki tüm AI ajan yapılandırmasını tek bir bildirime topla:

\[project]

name = "my-fintech-app"

version = "1.0.0"



\# Ortak Ajan Rolleri ve Sistem Kuralları

\[agents.developer]

model = "claude-3-7-sonnet"

system\_prompt = "Sen kıdemli finansal yazılım mühendisisin. Test odaklı geliştirme yap."



\# Yüklü Yetenekler (Skills)

\[skills]

"agent-pr-reviewer" = { version = "^1.2.0", source = "registry" }

"team-security-rules" = { source = "github:my-org/agent-security", ref = "main" }



\# Model Context Protocol (MCP) Sunucuları

\[mcp.servers.postgres]

command = "npx"

args = \["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/db"]

env = { DB\_SSL = "require" }



\# Güvenlik ve İzin Sınırları

\[permissions]

allowed\_paths = \["./src", "./tests"]

denied\_paths = \[".env\*", "id\_rsa\*", "./secrets"]

allow\_network = false





schema/forge.schema.json dosyasını bu genişletilmiş şemaya göre güncelle ve IDE'lerde kod tamamlama (IntelliSense) desteği sun.

3\. TEK KOMUTLA EKİP SENKRONİZASYONU (forge sync)

Bir geliştirici repoyu klonlayıp npx forge sync yazdığında:

forge.lock okunur.

Tüm yetenekler, MCP konfigürasyonları ve ajan rolleri eşzamanlı olarak geliştiricinin aktif editörlerine (Cursor MDC kuralları, Claude Desktop/Code kuralları, Windsurf kuralları) otomatik dağıtılır.

Takımdaki her geliştirici aynı yapay zekâ bağlamında çalışır.

4\. GÜVENLİK DENETİM MOTORU (forge audit)

AI ajanlarına dışarıdan kod ve prompt yüklemek devasa bir güvenlik tehdididir (Prompt Injection, Veri Sızdırma, Tehlikeli Komutlar). cli/src/commands/audit.ts motorunu kur:

Kötü Amaçlı Kod Analizi: Yetenek betiklerinde tehlikeli shell komutlarını tespit et (örn. rm -rf /, curl | bash, cat \~/.ssh).

Prompt Injection \& Exfiltration Taraması: Sistem yönergeleri arasına gizlenmiş zararlı prompt yönlendirmelerini ve gizli anahtar sızdırma girişimlerini statik olarak tespit et.

İzin İhlal Tespiti: Paketin talep ettiği dosya erişimleri ile projenin \[permissions] kurallarını kıyasla, ihlal varsa yüklemeyi engelle veya kullanıcı onayı iste.

KABUL KRİTERLERİ VE DEVİR SÖZLEŞMESİ (HANDOFF CONTRACT)

Doğrudan bir GitHub reposundan yetenek kurma (forge add <repo>) başarıyla çalışmalıdır.

forge sync komutu hem Cursor hem Claude Code kurallarını tek çalıştırmada eksiksiz üretmelidir.

forge audit komutu, zararlı komut içeren yapay bir test paketini tespit edip exit code 1 ile süreci durdurmalıdır.

Bu kriterler karşılandığında Aşama 4'e (İnteraktif TUI ve Büyüme Döngüleri) geçilebilir.





FORGE 100K PIPELINE — AŞAMA 4 / 5

MASTER PROMPT 4: İNTERAKTİF TUI, GELİŞTİRİCİ DENEYİMİ VE VİRAL EKOSİSTEM MEKANİZMALARI

Aşama Konumu: 4. Aşama (Developer Experience, Interactive UI \& Viral Loops)

Ön Koşul: Aşama 3 (Evrensel ajan bağlamı, senkronizasyon motoru ve güvenlik denetimi tamamlanmış olmalıdır)

Sonraki Aşama: Aşama 5 (README Dönüşümü ve 100k Star Lansman Stratejisi)

GÖREV TANIMI VE UZMAN PERSONA

Sen dünyaca ünlü CLI araçlarının (örn. shadcn/ui, Vue CLI, Supabase CLI, Astro) arkasındaki Geliştirici Deneyimi (DX) Tasarımcısı ve Büyüme Mühendisi (Growth Engineer)sin. Görevin; Forge'u soğuk ve karmaşık bir komut satırı aracından çıkarıp, geliştiricilerin kullanmaktan keyif aldığı, terminalde büyüleyen interaktif bir deneyime (TUI) dönüştürmek ve her kullanan geliştiricinin projeyi başkalarına yaymasını sağlayan organik viral döngüler kurmaktır.

1\. BÜYÜLEYİCİ İNTERAKTİF TERMİNAL ARAYÜZÜ (TUI DASHBOARD)

Kullanıcı hiçbir argüman girmeden sadece npx forge çalıştırdığında etkileyici bir TUI ile karşılansın (@clack/prompts veya ink tabanlı):

Ortam Otomatik Tespiti: Proje dizinini tarayarak hangi editörlerin kullanıldığını tespit et (örn. "Cursor ve Claude Code algılandı").

Kategori Bazlı Keşif (Discovery):

Popüler Ajan Yetenekleri (Skills: Code Reviewer, Security Auditor, Test Generator)

Doğrulanmış MCP Sunucuları (Postgres, GitHub, Slack, Filesystem, Memory)

Ekip Kuralları ve Rol Şablonları

Fuzzy Search \& Tek Tuşla Kurulum: Ok tuşlarıyla listede gezinme, boşluk tuşu ile çoklu seçim ve Enter ile anında yükleyip senkronize etme akışı.

Durum ve Hata Görselleştirme: Şık ASCII spinner'lar, renkli hata kutuları (boxen/picocolors) ve anlaşılır terminal çıktıları.

2\. YAZAR VE TOPLULUK ÜRETİM AKIŞI (SCAFFOLDING CLI)

Topluluğun Forge ekosistemine kendi yeteneklerini kolayca kazandırabilmesi için CLI araçları sağla:

forge create <skill-name>: Standardize edilmiş SKILL.md, forge.toml ve test dosyalarından oluşan hazır bir paket şablonu oluştur.

forge test: Hazırlanan yeteneği mock bir prompt ile test etsin ve adaptörlerin çıktısını simüle etsin.

forge pack \& forge verify: Paketi şema uyumluluğu, izin tanımları ve güvenlik açıkları açısından denetlesin.

3\. ORGANİK VİRAL BÜYÜME DÖNGÜLERİ (GROWTH LOOPS)

Projenin GitHub üzerinde kendiliğinden yayılmasını sağlayacak mekanizmalar inşa et:

Otomatik Rozet (Badge) Entegrasyonu:

forge init yapıldığında projenin README'sine eklenebilecek şık bir kalkan rozeti öner:

\[!\[Managed by Forge](https://img.shields.io/badge/Agent%20Context-Forge-6366f1?style=flat-square\&logo=anthropic)](https://github.com/oomerevren-beep/forge)

GitHub Actions Entegrasyonu (forge-action):

Takımlar için resmi bir CI/CD GitHub Action şablonu hazırla: Her Pull Request açıldığında forge audit çalışsın, kurallarda veya MCP izinlerinde yetkisiz bir değişiklik varsa PR'ı uyarsın.

PR altında otomatik görsel bir audit tablosu yorumu oluştursun.

KABUL KRİTERLERİ VE DEVİR SÖZLEŞMESİ (HANDOFF CONTRACT)

Terminalde forge çalıştırıldığında interaktif seçim menüsü çökmeden, klavye girdilerine anında tepki vererek açılmalıdır.

forge create my-agent komutu 1 saniyenin altında geçerli bir şablon dizini oluşturmalıdır.

GitHub Action şablonu `.github/workflows/` altında test edilmiş ve çalışır durumda olmalıdır.

Bu kriterler karşılandığında projenin vitrini ve lansmanı için Aşama 5'e geçilebilir.





FORGE 100K PIPELINE — AŞAMA 5 / 5

MASTER PROMPT 5: DÜNYA STANDARTLARINDA README, DOKÜMANTASYON VE 100K STAR LANSMAN STRATEJİSİ

Aşama Konumu: 5. Aşama (Vitrin, Global İletişim ve Lansman / GTM)

Ön Koşul: Aşama 1, 2, 3 ve 4 (Tüm kod tabanı, testler, adaptörler, güvenlik motoru ve TUI eksiksiz tamamlanmış olmalıdır)

Nihai Hedef: GitHub Trending #1, Hacker News Frontpage ve Sürdürülebilir 100k Star Büyüme Hattı

GÖREV TANIMI VE UZMAN PERSONA

Sen silikon vadisinin en başarılı açık kaynak yazılımlarını (örn. Next.js, Tailwind, Bun, Supabase) zirveye taşımış bir Teknik Ürün Pazarlama Lideri (Technical Product Marketer) ve Developer Advocatesın. Görevin; Forge'un kamuya açık yüzünü (README, dökümantasyon portalı, demolar, karşılaştırma tabloları) kusursuzlaştırmak ve projeyi küresel yapay zekâ geliştirici topluluğunda viral hale getirecek lansman stratejisini hayata geçirmektir.

1\. YÜKSEK DÖNÜŞÜMLÜ (HIGH-CONVERTING) README.md DÖNÜŞÜMÜ

README.md dosyasını aşağıdaki anatomiye göre baştan aşağı yeniden yaz:

Kanca Başlık \& Değer Önerisi (Hero Section):

"Forge — The Universal Package Manager for AI Agent Context, Skills \& MCPs."

"Stop manually copying .cursorrules and mcp.json across 5 different AI editors. One command to rule them all."

Görsel İspat (15 Saniyelik Terminal Demosu):

En üste net, yüksek çözünürlüklü ve modern bir terminal kaydı (terminal GIF/SVG) yerleştir: npx forge add agent-security-auditor komutunun çalışıp hem Cursor hem Claude'a 3 saniyede kural yazdığını göstersin.

3 Saniyede Hızlı Başlangıç (Quickstart):

\# 1. Projende başlat

npx forge init



\# 2. İstediğin yeteneği veya MCP sunucusunu ekle

npx forge add github:my-team/custom-skill



\# 3. Tüm ajanları ve editörleri senkronize et

npx forge sync

Doğruluk Matrisi (Neden Forge?):

Özellik

Manuel Yapılandırma

Dağınık Dotfile / Scriptler

Forge (Evrensel Ajan Motoru)

Çoklu Editör Desteği (Cursor, Claude, Windsurf)

❌ Her biri için ayrı format

⚠️ Kırılgan bash scriptleri

✅ Tek forge.toml üzerinden otomatik senkronizasyon

Deterministik Takım Paylaşımı

❌ Sürekli senkronizasyon kaybı

❌ Versiyon takibi yok

✅ forge.lock ile kriptografik SHA-256 bütünlüğü

Güvenlik Denetimi \& İzin Sınırları

❌ Sıfır denetim (Kör güven)

❌ Yok

✅ Dahili AST statik analizi ve kural izin duvarı

Sıfır Kurulum Maliyeti

❌

❌

✅ npx / bunx ile anında çalıştırma



Şeffaf Durum Bildirimi (Canlı vs Yol Haritası):

Nelerin şu an çalıştığını (Stable v1.0) ve nelerin geliştirilmekte olduğunu (Roadmap) net simgelerle ayır. Asla gerçekleşmemiş özellikleri "mevcut" gibi iddia etme.

2\. DOKÜMANTASYON SİTESİ KURULUMU (DOCS PORTAL)

docs/ altındaki birbirini tekrarlayan teorik metinleri temizle.

VitePress veya Starlight tabanlı modern, karanlık mod destekli, arama özellikli bir dokümantasyon iskeleti kur:

Başlangıç Kılavuzu: Kurulum, Temel Kavramlar, İlk Yeteneğinizi Yazın.

Adaptör Rehberleri: Cursor MDC detayları, Claude Code CLAUDE.md entegrasyonu, Windsurf konfigürasyonu.

Güvenlik ve Yetkilendirme: AST tarayıcısı nasıl çalışır, MCP sunucuları nasıl sınırlandırılır.

3\. 100K STAR GO-TO-MARKET (GTM) LANSMAN PLANI

Projeyi ilk 48 saatte viral kılacak eylem planı:

Show HN (Hacker News) Lansmanı:

Başlık Örneği: Show HN: Forge – Docker for AI Agent Context, Skills \& MCPs

İçerik Stratejisi: Pazarlama dili kullanmadan, geliştiricilerin yaşadığı gerçek acı noktasına (parçalanmış promptlar, denetlenmeyen yetenekler) odaklanan samimi, teknik ve açık kaynak hikâyesi.

X (Twitter) Teknik Tanıtım Akışı (Viral Thread):

Kısa video demosu ile başlayan; "Neden 2026'da hala 4 farklı AI editörüne aynı kuralları elle kopyalıyoruz?" sorusuyla dikkat çeken, mimariyi şemalarla anlatan 6 tweetlik teknik akış.

Açık Kaynak Ortaklıkları \& Ekosistem Entegrasyonu:

En popüler MCP sunucularının (Postgres, GitHub, Memory) ve açık yetenek repolarının README'lerine "Forge ile Tek Tıkla Kur" rozetleri sun.

Awesome-MCP, Awesome-Cursor ve AI dev directories listelerine PR aç.

KABUL KRİTERLERİ (PROJE TAMAMLANMA İMZASI)

README.md dosyasında hiçbir kırık link, eksik resim veya sahte vaat kalmamalıdır.

Lansman metinleri (Hacker News ve X) eksiksiz, teknik olarak ikna edici ve yayınlanmaya hazır olmalıdır.

Proje, dışarıdan bakan herhangi bir kıdemli geliştirici veya yatırımcı için profesyonel, güvenilir ve vazgeçilmez bir altyapı olarak görünmelidir.









