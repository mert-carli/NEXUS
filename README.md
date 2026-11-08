# NEXUS — Yerel Yapay Zeka Destekli Kodlama Asistanı

**NEXUS**, yazılım projelerini yalnızca dosya bazında incelemek yerine; projenin yapısını, dosyalar arasındaki ilişkileri, kod bileşenlerini ve çalışma durumunu analiz edebilen yerel yapay zeka destekli bir geliştirme asistanıdır.

NEXUS'un temel amacı; geliştiricinin kodunu buluta göndermeden, kendi bilgisayarındaki LLM modelleri ve proje verileriyle kodunu analiz etmesine, değişiklik yapmasına, test çalıştırmasına ve olası sorunları tespit etmesine yardımcı olmaktır.

> **NEXUS = Codebase Intelligence + Local LLM + RAG + Security + Safe Code Changes**

---

## NEXUS Nedir?

Büyük projelerde belirli bir kod parçasını anlamak veya değiştirmek zamanla zorlaşabilir.

Örneğin:

* Veritabanı bağlantısı hangi dosyada?
* Bu fonksiyon nerelerde kullanılıyor?
* Bir component hangi servislerle iletişim kuruyor?
* Bu değişiklik başka hangi dosyaları etkiliyor?
* Projede belirli bir hata neden oluşuyor?
* Yapay zekaya tüm projeyi nasıl güvenli şekilde aktarabilirim?

NEXUS bu soruların cevaplarını yalnızca dosya isimlerine bakarak değil, projenin kod yapısını indeksleyerek ve ilgili bağlamı yerel yapay zekaya sağlayarak bulmayı hedefler.

---

# 1. Codebase Intelligence

NEXUS'un temel özelliklerinden biri, projenin yapısını anlamlandıran **Codebase Intelligence** sistemidir.

NEXUS projeyi tararken yalnızca dosya listesini oluşturmaz. Kod içerisindeki önemli yapı taşlarını analiz ederek anlamlı parçalara ayırır.

### Akıllı Kod İndeksleme

Projedeki:

* Fonksiyonlar
* Sınıflar
* Değişkenler
* Metotlar
* Import / Export ilişkileri
* Dosyalar
* Kod blokları

anlamlı **chunk**'lara ayrılır.

Bu parçalar daha sonra **ChromaDB** içerisinde vektör tabanlı olarak indekslenir.

Böylece NEXUS, binlerce satırlık projelerde yalnızca dosya araması yapmak yerine, soruyla ilişkili kod parçalarını semantik olarak bulabilir.

### Örnek

> "Kullanıcı giriş işlemi nerede gerçekleştiriliyor?"

NEXUS:

1. Kullanıcının sorusunu analiz eder.
2. ChromaDB içerisinde ilgili kod parçalarını arar.
3. En alakalı dosya ve kod bloklarını belirler.
4. Bu bilgileri LLM'e bağlam olarak gönderir.
5. Sonucu kullanıcıya açıklar.

Bu yaklaşım, **RAG (Retrieval-Augmented Generation)** sisteminin temelini oluşturur.

---

# 2. Görsel Proje İlişki Grafiği

NEXUS, projenin yapısını yalnızca metinsel olarak değil, görsel olarak da incelemenizi sağlar.

Projedeki dosyalar arasındaki bağlantılar bir **Network Graph** üzerinde gösterilebilir.

Örneğin:

```text
        UserController
              |
              v
        AuthService
          |       |
          v       v
       UserDB   JWTService
          |
          v
       Database
```

Bu yapı sayesinde:

* Hangi dosyanın hangisine bağlı olduğu
* Projenin karmaşıklığı
* Merkezi dosyalar
* Dosyalar arasındaki bağlantılar
* Kullanılan programlama dilleri

daha kolay anlaşılabilir.

Ayrıca proje içerisinde kullanılan dillerin dağılımı da görüntülenebilir.

```text
TypeScript  ████████████████████  62%
Python      ██████████            28%
CSS         ███                    7%
JSON        █                      3%
```

---

# 3. Local LLM

NEXUS'un önemli özelliklerinden biri **yerel LLM desteğidir.**

NEXUS, **Ollama** gibi yerel model çalışma altyapıları üzerinden kodlama odaklı yapay zeka modellerini çalıştırabilir.

Örneğin:

* `qwen2.5-coder`
* Ollama uyumlu diğer kodlama modelleri

kullanılabilir.

Bu sayede proje kodunun analiz edilmesi için zorunlu olarak harici bir API'ye veya bulut tabanlı yapay zeka servisine ihtiyaç duyulmaz.

### Yerel Çalışmanın Avantajları

Kodunuz:

* Harici bir AI API'sine gönderilmeden çalıştırılabilir.
* İnternet bağlantısına daha az bağımlı hale gelir.
* Yerel bilgisayarın CPU/GPU kaynaklarından yararlanabilir.
* Proje üzerinde daha kontrollü bir çalışma ortamı oluşturabilir.

> **Kodunuz sizin bilgisayarınızda, yapay zekanız sizin kontrolünüzde.**

---

# 4. RAG — Retrieval-Augmented Generation

NEXUS, LLM'i doğrudan tüm proje klasörüyle beslemek yerine **RAG mimarisini** kullanır.

Bu yaklaşım özellikle büyük projelerde önemlidir.

### Geleneksel Yaklaşım

```text
Tüm Proje
    |
    v
   LLM
    |
    v
  Cevap
```

Büyük projelerde bu yaklaşım ciddi miktarda gereksiz bağlam oluşturabilir.

### NEXUS Yaklaşımı

```text
Kullanıcı Sorusu
       |
       v
   RAG Search
       |
       v
    ChromaDB
       |
       v
İlgili Kod Parçaları
       |
       v
    Local LLM
       |
       v
   AI Response
```

Örneğin:

> "Veritabanı bağlantısını nerede yapıyoruz?"

NEXUS ilgili kodları bulur ve yalnızca gerekli bağlamı LLM'e gönderir.

Böylece yapay zeka, projenin tamamını tekrar tekrar okumak yerine soruyla ilişkili kod üzerinde yoğunlaşabilir.

---

# 5. Nexus Guard

Yapay zekanın kod üzerinde değişiklik yapabilmesi güçlü bir özellik olsa da kontrolsüz değişiklikler yeni hatalara veya güvenlik problemlerine yol açabilir.

**Nexus Guard**, yapay zeka tarafından gerçekleştirilecek işlemleri kontrol etmek için tasarlanmıştır.

### Risk Analizi

Bir değişiklik uygulanmadan önce:

* Syntax kontrolleri
* Potansiyel riskler
* Değişiklik kapsamı
* Etkilenen dosyalar
* Güvenlik açısından şüpheli işlemler

kontrol edilebilir.

### Korunan Dosyalar

Kritik dosya ve klasörler koruma altına alınabilir.

Örneğin:

```text
.git/
.env
package-lock.json
database/
config/
```

gibi dosya ve klasörler için özel sınırlar oluşturulabilir.

### Path Protection

NEXUS'un proje dizininin dışına çıkmasını engelleyecek sınırlar oluşturularak yapay zekanın sistem üzerinde kontrolsüz dosya işlemleri yapmasının önüne geçilmesi hedeflenir.

---

# 6. Change Center

NEXUS yalnızca kod hakkında konuşmaz.

Yapay zekanın önerdiği değişiklikleri **kontrollü şekilde projeye uygulamanıza** yardımcı olur.

Örneğin:

> "Login ekranındaki hata mesajını düzelt."

NEXUS gerekli dosyaları analiz eder ve değişiklik önerisini oluşturur.

Ardından kullanıcıya değişikliklerin öncesi ve sonrası gösterilir:

```diff
- setError("Login failed")

+ setError("E-posta veya şifre hatalı.")
```

Kullanıcı değişikliği inceleyebilir ve onaylayabilir veya reddedebilir.

### Çoklu Dosya Değişiklikleri

Daha karmaşık işlemlerde yapay zeka birden fazla dosyada değişiklik önerebilir.

Örneğin:

```text
src/
├── components/Login.tsx
├── services/auth.ts
├── hooks/useAuth.ts
└── types/user.ts
```

NEXUS değişiklikleri dosya bazında göstererek geliştiricinin neyin değiştiğini kontrol etmesini sağlar.

---

# 7. Otomatik Doğrulama

Kod değişikliğini doğrudan uygulamak yerine mümkün olduğunda değişiklik sonrasında doğrulama yapılabilir.

```text
AI Change
    |
    v
Diff Review
    |
    v
Syntax Check
    |
    v
Build / Test
    |
    +----------+
    |          |
    v          v
Başarılı    Başarısız
    |          |
    v          v
 Uygula     Geri Al
```

Bu yaklaşımın amacı, yapay zekanın yaptığı değişikliklerin projeyi bozma ihtimalini azaltmaktır.

---

# 8. Project Health

NEXUS, projenin yalnızca kodlarını değil, genel çalışma durumunu da takip etmeyi amaçlar.

### Readiness Score

Projenin genel durumu tek bir skor üzerinden takip edilebilir.

Örneğin:

```text
NEXUS READINESS SCORE

██████████████████░░  87%

Git Status
Dependencies
Syntax
Tests
Build
Uncommitted Changes
```

Skor aşağıdaki gibi farklı kriterlerden oluşturulabilir:

* Git durumu
* Test sonuçları
* Build durumu
* Syntax hataları
* Bağımlılıkların durumu
* Sistem bileşenleri
* Güvenlik kontrolleri

Amaç, geliştiriciye projenin ne kadar hazır ve sağlıklı olduğunu tek bakışta gösterebilmektir.

---

# 9. Activity Timeline

NEXUS içerisinde gerçekleşen önemli işlemler bir aktivite zaman çizelgesinde takip edilebilir.

Örneğin:

```text
22:10  Project Scan Completed
22:11  1,248 Code Chunks Indexed
22:12  RAG Database Updated
22:14  AI Analysis Started
22:15  Change Proposed
22:16  Security Check Passed
22:17  Tests Started
22:18  Tests Passed
```

Bu yapı sayesinde projede ne zaman ve hangi işlemlerin gerçekleştirildiği daha kolay takip edilebilir.

---

# 10. Projenizle Konuşun

NEXUS'un temel kullanım amacı, geliştiricinin proje hakkında doğal dil ile soru sorabilmesini sağlamaktır.

### Kod hakkında

> "Bu fonksiyon ne yapıyor?"

### Mimari hakkında

> "Authentication sistemi nasıl çalışıyor?"

### Hata hakkında

> "Bu API isteği neden başarısız olabilir?"

### Dosya ilişkileri hakkında

> "Bu component hangi servisleri kullanıyor?"

### Değişiklik hakkında

> "Bu fonksiyonu daha güvenli hale getir."

### Proje hakkında

> "Projede veritabanı bağlantısı nerede kuruluyor?"

NEXUS, sorulara cevap verirken mümkün olduğunca projenin gerçek kod yapısını ve indekslenmiş bağlamı kullanmayı hedefler.

---

# 11. NEXUS Mimarisi

Temel çalışma yapısı:

```text
                    NEXUS UI
                       |
                       v
                  NEXUS Core
                       |
          +------------+------------+
          |            |            |
          v            v            v
    Code Indexer   Nexus Guard  Change Center
          |            |            |
          v            v            v
      ChromaDB     Risk Analysis  Diff Engine
          |                         |
          +------------+------------+
                       |
                       v
                  RAG Pipeline
                       |
                       v
                Local LLM / Ollama
                       |
                       v
                   AI Response
```

---

# 12. NEXUS'un Temel Hedefi

NEXUS, klasik bir kod editörünün yerine geçmekten ziyade geliştiricinin yanında çalışan **yerel ve kontrollü bir AI geliştirme ortamı** oluşturmayı hedefler.

Temel çalışma mantığı:

```text
Projeyi Anla
     |
     v
Doğru Kodu Bul
     |
     v
Değişiklik Öner
     |
     v
Güvenlik Kontrolü
     |
     v
Test Et
     |
     v
Sonucu Doğrula
```

Bütün bu sürecin mümkün olduğunca **yerel, kontrollü ve şeffaf** olması NEXUS'un temel yaklaşımıdır.

---

# 13. Öne Çıkan Özellikler

| Özellik               | Açıklama                                       |
| --------------------- | ---------------------------------------------- |
| Codebase Intelligence | Projenin kod yapısını analiz eder              |
| Smart Indexing        | Kodları anlamlı parçalara ayırarak indeksler   |
| ChromaDB              | Vektör tabanlı kod arama altyapısı             |
| Network Graph         | Dosya ve kod ilişkilerini görselleştirir       |
| Local LLM             | Ollama üzerinden yerel AI modelleri            |
| RAG                   | Soruyla ilgili kodları otomatik olarak getirir |
| Nexus Guard           | AI değişiklikleri için güvenlik katmanı        |
| Change Center         | Diff tabanlı kontrollü değişiklik sistemi      |
| Validation            | Build, syntax ve test doğrulamaları            |
| Project Health        | Proje durumunu analiz eder                     |
| Activity Timeline     | Proje aktivitelerini takip eder                |
| Local-first           | Kodun yerel ortamda kalmasını hedefler         |

---

# 14. Gizlilik ve Yerel Çalışma

NEXUS'un temel prensiplerinden biri **local-first** yaklaşımıdır.

Proje kodunun harici bir yapay zeka servisine gönderilmesine ihtiyaç duymadan, yerel LLM modelleri ve yerel veri kaynaklarıyla çalışabilecek bir yapı hedeflenmektedir.

Bu yaklaşım özellikle:

* Özel projeler
* Şirket içi kodlar
* Hassas kaynak kodları
* İnternet bağlantısının sınırlı olduğu ortamlar

için daha kontrollü bir geliştirme deneyimi sunmayı amaçlamaktadır.

---

# 15. Proje Durumu

NEXUS aktif olarak geliştirilmektedir.

Bazı özellikler mevcut durumda kullanılabilirken, bazı özellikler geliştirme ve iyileştirme aşamasındadır.

## Planlanan Geliştirmeler

* [ ] Daha gelişmiş kod analizi
* [ ] Daha güçlü dependency graph
* [ ] Gelişmiş RAG retrieval
* [ ] Daha fazla yerel LLM desteği
* [ ] Gelişmiş güvenlik kontrolleri
* [ ] Daha kapsamlı test otomasyonu
* [ ] Daha gelişmiş Change Center
* [ ] Daha detaylı Project Health analizleri

---

# 16. Kısaca NEXUS

**NEXUS, yalnızca kod yazan bir AI chatbot değildir.**

NEXUS;

**Projeyi anlamaya, doğru kodu bulmaya, yerel yapay zekayla analiz etmeye, güvenli değişiklikler oluşturmaya, kodu test etmeye ve projenin genel sağlığını takip etmeye odaklanan bir yazılım geliştirme asistanıdır.**

> **Kod sizin bilgisayarınızda.
> Verileriniz sizin kontrolünüzde.
> Yapay zeka sizin yanınızda.**

---

# 17. Teknik Yığın, Klasör Yapısı ve Kurulum (Installation & Testing)

## Teknoloji Yığını (Tech Stack)

| Katman | Kullanılan Teknolojiler |
| :--- | :--- |
| **Backend (`backend/`)** | Python 3.11+, FastAPI, SQLAlchemy, Alembic, ChromaDB (Vektör Veritabanı), GitPython, Pydantic Settings, HTTPX |
| **Frontend (`frontend/`)** | React 19, TypeScript, Vite 8, Tailwind CSS v4, Monaco Editor (`@monaco-editor/react`), Zustand, TanStack Query, Lucide React |
| **Yerel Yapay Zekâ** | Ollama (`http://localhost:11434`) & yapılandırılabilir AI Provider katmanı |
| **Test Altyapısı** | Backend: `pytest` (`backend/tests/`) · Frontend: `vitest` & React Testing Library (`frontend/src/components/__tests__/`) |

## Klasör Yapısı (Directory Structure)

```text
NEXUS/
├── backend/
│   ├── alembic/                # Veritabanı şema göçleri (migrations)
│   ├── app/
│   │   ├── api/v1/             # REST uç noktaları (projects, files, chat, edit, settings, health)
│   │   ├── core/               # Uygulama yapılandırması ve ayar kayıt defteri
│   │   ├── db/                 # SQLAlchemy SQLite veritabanı oturumu
│   │   ├── models/ & schemas/  # ORM modelleri ve Pydantic şemaları
│   │   └── services/           # Chunker, VectorDB (Chroma), RAG, Agent, Git & Security Validator
│   ├── tests/                  # Pytest birim ve API entegrasyon testleri
│   ├── .env.example            # Örnek ortam değişkenleri
│   └── requirements.txt        # Python bağımlılıkları
├── frontend/
│   ├── src/
│   │   ├── components/         # CodebaseIntelligence, ChangeCenter, NexusGuard, DiffEditorCard vb.
│   │   ├── pages/              # Dashboard, CodeExplorer, Assistant, Settings
│   │   ├── services/           # Backend API istemcisi (api.ts)
│   │   └── store/              # Zustand durum yönetimi (project, agent, settings, ui)
│   └── package.json            # Frontend bağımlılıkları ve betikleri
├── start.bat                   # Windows tek tıkla başlatıcı (Backend + Frontend)
└── start-dev.ps1               # PowerShell geliştirici başlatma betiği
```

## Kurulum ve Çalıştırma Adımları

### 1. Depoyu Klonlayın
```bash
git clone https://github.com/mert-carli/NEXUS.git
cd NEXUS
```

### 2. Backend Kurulumu (FastAPI)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 3. Frontend Kurulumu (React + Vite)
```powershell
cd frontend
npm install
npm run dev
```

## Testlerin Çalıştırılması (Testing)

- **Backend Testleri (`pytest`):** `cd backend && pytest -v`
- **Frontend Testleri (`vitest`):** `cd frontend && npm test`
---

# 18. Vizyon

NEXUS'un uzun vadeli hedefi, geliştiricilerin yalnızca kod yazmasına değil, **kod tabanlarını anlamasına, yönetmesine ve güvenli şekilde geliştirmesine yardımcı olan tamamen yerel bir geliştirme ekosistemi** oluşturmaktır.

NEXUS'un yaklaşımı basittir:

> **Understand your code.
> Control your AI.
> Build with confidence.**
