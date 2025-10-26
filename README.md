# Feature Toggle Servisi

Bu proje, "Zebra Engineering Assignment" için geliştirilmiş, ölçeklenebilir ve çok-kiracılı (multi-tenant) bir özellik bayrağı (Feature Flag) yönetim servisidir.

Sistem, özellik bayraklarını yönetmek için güvenli bir REST API (Node.js/TypeScript) ve bu bayrakları `dev`, `staging`, `prod` gibi farklı ortamlar arasında yönetmek için basit bir Admin UI (React) sağlar. Proje, Redis önbellekleme (caching), kiracı bazlı rate limiting ve detaylı denetim kaydı (audit log) gibi özelliklerle performans ve güvenlik göz önünde bulundurularak oluşturulmuştur.

## .:Temel Özellikler:.

* **Çok-Kiracılı Mimari:** Tüm veriler (bayraklar, ayarlar) kiracılara (tenant) göre bölümlenmiştir.
* **Ortam Yönetimi:** Her kiracı için `dev`, `staging`, `prod` gibi birden fazla ortamda bayrakları ayrı ayrı yönetebilme.
* **Güvenli API:** Tüm yönetim endpoint'leri **JWT Authentication** ile korunmaktadır.
* **Admin Arayüzü:** Bayrakları listelemek, oluşturmak, güncellemek ve silmek için **React** tabanlı bir kullanıcı arayüzü.
* **Yüksek Performanslı Okuma:** `GET /api/features/evaluated` endpoint'i üzerinden yapılan bayrak değerlendirme okumaları, **Redis** ile önbelleğe alınarak milisaniyeler içinde yanıtlanır.
* **Akıllı Önbellek Temizleme:** Bayraklarda yapılan herhangi bir değişiklik (C/U/D), ilgili Redis anahtarını anında temizleyerek verilerin hızla güncellenmesini sağlar.
* **Gelişmiş Değerlendirme Stratejileri:**
    * **Boolean:** Basit `true`/`false` (Açık/Kapalı).
    * **Percentage:** Bayrağı kullanıcıların rastgele bir yüzdesine (%50, %20 vb.) açma.
    * **User Targeting:** Bayrağı sadece belirli bir kullanıcı ID listesine açma.
* **Denetim Kaydı (Audit Logging):** Bayraklar üzerinde yapılan her değişiklik (Create, Update, Delete) *kim*, *ne zaman* ve *ne değiştirdi* (diff) bilgisiyle birlikte veritabanına kaydedilir.
* **Ortam Senkronizasyonu (Promotion):** Bayrak ayarlarını bir ortamdan diğerine (örn: `staging` -> `prod`) güvenli bir şekilde, `dry-run` (test) moduyla aktarma.
* **Kiracı Bazlı Rate Limiting:** API'yi kötüye kullanımdan korumak için Redis destekli, kiracı başına istek limiti.
* **API Dokümantasyonu:** **Swagger** (`/api-docs`) üzerinden sunulan interaktif API dokümantasyonu.
* **Containerize Edilmiş:** Tüm sistem (API, UI, Postgres, Redis) `docker-compose` ile tek bir komutla ayağa kaldırılabilir.

---

## .:Teknoloji Yığını:.

* **Backend:** Node.js, Express, TypeScript
* **Veritabanı:** PostgreSQL
* **ORM:** Prisma
* **Önbellek (Cache) / Rate Limiting:** Redis (ve `ioredis`)
* **Frontend:** React (Vite), TypeScript, Axios
* **Kimlik Doğrulama:** JSON Web Tokens (JWT)
* **API Dokümantasyonu:** Swagger (`swagger-ui-express`, `swagger-jsdoc`)
* **Test:** Jest, Supertest
* **Containerizasyon:** Docker, Docker Compose

---
---

## ⚡ Redis Kullanımı: Performans ve Stabilite

Redis, bu projede iki kritik görev için merkezi bir rol oynar:

### 1. Yüksek Performanslı Önbellekleme (Caching)

Client uygulamalarının sürekli sorguladığı `GET /api/features/evaluated` (değerlendirilmiş bayrakları al) endpoint'i, projenin en "sıcak yolu" (hot path) olarak tasarlanmıştır.

* **Okuma Stratejisi (Cache-Aside):**
    1.  Bir istek geldiğinde (`tenant=X`, `env=Y`), sistem veritabanından önce Redis'i kontrol eder.
    2.  `features:raw:X:Y` anahtarında veri varsa, bu veri Redis'ten (milisaniyeler içinde) okunur, değerlendirilir ve döndürülür. Veritabanına gidilmez.
    3.  Veri yoksa (cache miss), veritabanından çekilir, Redis'e (5 dakikalık bir TTL ile) yazılır ve sonra döndürülür.

* **Yazma Stratejisi (Cache Invalidation):**
    1.  Yönetim panelinden bir bayrak oluşturulduğunda, güncellendiğinde veya silindiğinde (`POST /features`, `DELETE /features`, `POST /features/promote`)...
    2.  ...Veritabanı işlemi biter bitmez, `feature.service.ts` ilgili `features:raw:X:Y` anahtarını Redis'ten **aktif olarak siler** (`redisClient.del(...)`).

    Bu "Read-Through / Write-Invalidate" stratejisi, sistemin hem çok hızlı olmasını (çoğu okuma cache'den gelir) hem de verinin asla eskimemesini (her yazma cache'i temizler) garanti altına alır.

### 2. Kiracı Bazlı Rate Limiting

Redis, API'yi kötüye kullanımdan korumak için `express-rate-limit` kütüphanesine bir "dağıtık sayaç" (distributed counter) olarak hizmet verir.

* Her istek, `auth.middleware.ts` tarafından çözülen JWT'den gelen `tenantId` (kiracı kimliği) ile anahtarlanır.
* Bu sayede, her kiracının 15 dakika içinde yapabileceği istek sayısı (örn: 100 istek) merkezi olarak Redis üzerinde sayılır.
* Bu, "API Rate Limits per Tenant" gereksinimini karşılar ve sistem birden fazla sunucuda çalışsa bile (ölçeklense bile) tutarlı bir limit sağlar.


## .:Kurulum ve Çalıştırma:.

Projeyi çalıştırmanın iki yolu vardır. En hızlı ve tavsiye edilen yöntem Docker kullanmaktır.

### Yöntem 1: Docker ile (Tavsiye Edilen)

Bu yöntem, makinenizde `Docker` ve `docker-compose` yüklü olmasını gerektirir. Veritabanı veya Node.js kurmanıza gerek yoktur.

1.  Projeyi klonlayın.
2.  `docker-compose.yml` dosyasını açın ve `api` servisinin altındaki `environment` bölümünde bulunan `JWT_SECRET` değerini kendi gizli anahtarınızla değiştirin.
3.  Proje ana dizininde terminali açın ve aşağıdaki komutu çalıştırın:
    ```bash
    docker-compose up --build
    ```
4.  Tüm servisler (API, UI, Postgres, Redis) başlatılacaktır.
5.  Uygulamaya erişin:
    * **Admin UI:** `http://localhost:8080`
    * **Swagger API Docs:** `http://localhost:8080/api-docs`

### Yöntem 2: Lokal (Manuel) Kurulum

Bu yöntem, makinenizde **Node.js** (v18+), **PostgreSQL** ve **Redis**'in kurulu ve çalışır durumda olmasını gerektirir.

1.  **Projeyi Klonlayın:**
    ```bash
    git clone [https://github.com/ByMaster81/featureToggleAPI.git](https://github.com/ByMaster81/featureToggleAPI.git)
    cd featureToggleAPI
    ```

2.  **Environment Dosyasını Hazırlayın:**
    Proje ana dizininde `.env` adında bir dosya oluşturun (veya `.env.example` dosyasını kopyalayın) ve yerel veritabanı/redis bilgilerinizi girin:
    ```.env
    # Uygulama Portu
    PORT=5001
    
    # Kendi güçlü anahtarınızı girin
    JWT_SECRET=BU-ALANI-COK-GUCLU-BIR-ANAHTAR-ILE-DEGISTIRIN
    
    # Lokal PostgreSQL bağlantı bilginiz
    DATABASE_URL="postgresql://kullanici:sifre@localhost:5432/veritabani_adi"
    
    # Lokal Redis bağlantı bilginiz
    REDIS_HOST="localhost"
    REDIS_PORT=6379
    ```

3.  **Backend'i Başlatın (Terminal 1):**
    ```bash
    # Bağımlılıkları yükle
    npm install
    
    # Veritabanı şemasını uygula (migration)
    npx prisma migrate dev
    
    # (Opsiyonel) Başlangıç verisi ekle
    npx prisma db seed
    
    # API sunucusunu başlat
    npm run dev
    ```
    API artık `http://localhost:5001` adresinde çalışıyor.

4.  **Frontend'i Başlatın (Terminal 2):**
    ```bash
    # Frontend klasörüne gir
    cd frontend
    
    # Bağımlılıkları yükle
    npm install
    
    # React geliştirme sunucusunu başlat
    npm run dev
    ```
    Admin UI artık `http://localhost:5173` (veya benzeri) adresinde çalışıyor.

---

## .:API Dokümantasyonu:.

API, Swagger kullanılarak belgelenmiştir. Sunucu çalışırken (ister Docker ister Lokal olsun), interaktif dokümantasyona aşağıdaki adresten erişebilirsiniz:

* **Docker:** `http://localhost:8080/api-docs`
* **Lokal:** `http://localhost:5001/api-docs`

---

## .:Veritabanı Yönetimi (Migration):.

Bu proje, veritabanı şema değişikliklerini yönetmek için **Prisma Migrate** kullanır.

### .:Geliştirme (Development):.

`prisma/schema.prisma` dosyasında bir değişiklik yaptığınızda (örn: yeni bir model eklemek), yeni bir migration dosyası oluşturmak ve bunu veritabanınıza uygulamak için şu komutu çalıştırın:

```bash
npx prisma migrate dev --name sizin-migration-adiniz
```

### .:Üretim (Production):.

Hazırlanmış migration dosyalarını bir üretim veritabanına uygulamak için `deploy` komutu kullanılır. Bu komut, `prisma/migrations` klasöründeki çalıştırılmamış tüm SQL dosyalarını sırayla uygular:

```bash
npx prisma migrate deploy
```
*(Not: Bu komut, Docker kurulumundaki `Dockerfile.api` dosyası tarafından otomatik olarak çalıştırılır.)*

### .:Başlangıç Verisi (Seeding):.

Veritabanınızı test için örnek verilerle (kiracılar, özellik tanımları vb.) doldurmak için `seed` komutunu kullanabilirsiniz. Seed betiği `prisma/seed.ts` dosyasında tanımlanmıştır.

```bash
npx prisma db seed
```

---

## .:Testler:.

Proje, Jest ve Supertest kullanılarak yazılmış birim (unit) ve entegrasyon (integration) testleri içerir.

Tüm testleri çalıştırmak için proje ana dizininde aşağıdaki komutu çalıştırın:

```bash
npm test
```