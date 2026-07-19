# IPTV Streaming Service — React + Vite + TypeScript + DaisyUI

## Objective
Bangun web streaming service ala Netflix/Google TV/Apple TV OS untuk channel IPTV. User akhir **tidak perlu** upload atau paste URL M3U sendiri — mereka cukup buka web, browse katalog channel yang sudah tersedia, dan langsung menonton. Tidak pakai backend/database eksternal (tanpa Supabase) — katalog channel disimpan sebagai data statis di dalam project, diisi/di-update oleh developer lewat proses import terpisah.

## Tech Stack
- **Frontend**: React 19 + Vite, dengan **TypeScript** (bukan JavaScript) untuk seluruh source code
- **Styling**: Tailwind CSS v4 + DaisyUI v5
- **Video**: hls.js untuk playback HLS (.m3u8), fallback native untuk Safari
- **Data source**: Tidak ada backend/database eksternal. Katalog channel disimpan sebagai file data statis (TS/JSON) di dalam project, di-bundle bersama aplikasi
- **State management**: React state/hooks bawaan (useState, useMemo), tanpa Redux
- **Routing**: boleh tanpa router (single page dengan view state) atau react-router bila butuh halaman terpisah
- **File extensions**: semua file React pakai `.tsx`, semua file logic/util/hook pakai `.ts` — **tidak ada** file `.jsx` atau `.js` di source code

## Arsitektur (perubahan dari versi sebelumnya)
- **Sebelumnya**: rencana pakai Supabase sebagai backend untuk simpan data channel
- **Sekarang**: tanpa Supabase atau backend eksternal apapun. Katalog channel disimpan sebagai file data statis (`src/data/channels.ts` atau `public/channels.json`) yang di-generate/di-update lewat script import M3U terpisah, lalu di-commit ke project
- **Alur import**: buat script Node.js terpisah (`scripts/importPlaylist.ts`, dijalankan manual pakai `tsx`/`ts-node`, **bukan** bagian dari aplikasi web) yang menerima URL/file M3U, parse dengan parser M3U, lalu tulis hasilnya ke `src/data/channels.ts` atau `public/channels.json`. Developer jalankan script ini sesekali untuk update katalog — end user tidak pernah lihat proses ini.

## Sumber Data Channel: iptv-org/iptv
Gunakan playlist publik dari repo **[iptv-org/iptv](https://github.com/iptv-org/iptv)** (di-hosting via GitHub Pages, lisensi Unlicense/CC0, tidak menyimpan video apapun — hanya link stream publik) sebagai sumber utama untuk mengisi katalog.

- **Playlist utama (semua channel dunia)**: `https://iptv-org.github.io/iptv/index.m3u`
- **Rekomendasi default untuk project ini — playlist Indonesia**: `https://iptv-org.github.io/iptv/countries/id.m3u`
- **Alternatif per kategori** (bisa dipakai untuk isi beberapa row tertentu, misal News/Sports/Kids): `https://iptv-org.github.io/iptv/categories/<nama-kategori>.m3u` (contoh: `news.m3u`, `sports.m3u`, `entertainment.m3u`, `kids.m3u`)
- **Alternatif per region**: `https://iptv-org.github.io/iptv/regions/<region>.m3u` (contoh: `sea.m3u` untuk Asia Tenggara)
- Daftar lengkap semua URL playlist (per negara/bahasa/kategori/region) ada di [PLAYLISTS.md](https://github.com/iptv-org/iptv/blob/master/PLAYLISTS.md)

**Rencana implementasi `scripts/importPlaylist.ts`:**
1. Fetch playlist dari salah satu URL di atas (default: playlist Indonesia `countries/id.m3u`, bisa di-override lewat argumen CLI untuk fetch negara/kategori lain)
2. Parse M3U jadi array `Channel[]` sesuai `interface Channel` yang sudah didefinisikan
3. Filter opsional: buang channel tanpa `streamUrl` valid, dedupe berdasarkan nama/tvgId
4. Tulis hasilnya ke `src/data/channels.ts` sebagai array literal TypeScript yang di-export
5. Bisa dijalankan lagi kapan saja untuk refresh katalog (`npx tsx scripts/importPlaylist.ts`), tapi hasilnya tetap file statis yang di-bundle — bukan fetch runtime tiap kali end user buka web

**Catatan legal**: iptv-org/iptv menyatakan hanya berisi link yang mereka anggap sudah dipublikasikan secara sengaja oleh pemegang hak siar. Tapi kualitas dan keandalan tiap stream bervariasi (banyak yang bisa mati/geo-blocked sewaktu-waktu) — beri komentar soal ini di script, dan pastikan `useHlsPlayer.ts` menangani channel yang gagal diputar dengan pesan error yang jelas, bukan crash diam-diam.

## Data Model

```ts
interface Channel {
  id: string
  name: string
  logoUrl: string | null
  category: string        // contoh: 'News', 'Sports', 'Entertainment' (dari group-title M3U)
  streamUrl: string        // URL .m3u8
  tvgId: string | null
  isFeatured?: boolean      // untuk tandai channel yang tampil di hero section
  sortOrder?: number         // urutan tampil dalam kategori
}
```

Simpan sebagai array `Channel[]` di `src/data/channels.ts` (typed langsung dengan interface `Channel`), defaultkan opsi ini untuk type-safety penuh dibanding fetch dari `channels.json`.

## Design Direction
**Referensi**: Google TV homescreen dan Apple TV OS (tvOS) home screen, atau Netflix untuk pola katalog.

- **Theme**: dark mode sebagai default utama, background gelap pekat (near-black/dark navy)
- **Typography**: font besar dan tebal untuk judul kategori/channel, skala tipografi jelas ala "10-foot UI"
- **Layout**:
  - *Hero section*: banner atas menampilkan channel unggulan (filter dari field `isFeatured`, atau ambil beberapa channel pertama kalau tidak ada yang ditandai), dengan backdrop blur dari logo channel tsb
  - *Rows*: baris-baris horizontal per kategori (di-generate dari field `category`), scrollable horizontal
  - *Cards*: card channel landscape/portrait konsisten, logo besar + nama, efek scale-up + ring/glow saat fokus
  - *Focus navigation*: navigasi keyboard (arrow keys) ala remote TV — pindah fokus antar card dan antar baris, fokus jelas terlihat, auto-scroll ke card yang fokus
- **Color & effects**: gradient overlay gelap di atas backdrop, blur pada hero background, transisi halus 200–300ms saat ganti fokus/channel, efek subtle bukan berlebihan
- **Player view**: fullscreen player dengan kontrol minimal ala tvOS, auto-hide saat idle

## Core Features
- Katalog channel diambil dari data statis (`src/data/channels.ts`) — **tidak ada** form upload/paste M3U dan **tidak ada** request ke backend eksternal di UI end user
- Pemutaran stream HLS menggunakan hls.js dengan error handling dan auto-recovery
- Hero section menampilkan channel unggulan dengan backdrop blur
- Baris horizontal per kategori, di-generate otomatis dari field `category`
- Navigasi fokus keyboard (arrow keys + Enter) ala remote TV, termasuk auto-scroll
- Search/filter channel berdasarkan nama, dilakukan di client side (data sudah ada semua di memory)
- Fullscreen player view dengan tombol kembali ke halaman browse
- Alert jelas kalau stream gagal diputar
- Responsive: tetap layak dipakai di layar kecil meski desain utama diarahkan ke pengalaman TV/desktop besar

## File Structure

```
src/
  types/channel.ts          # interface Channel dan tipe terkait
  data/channels.ts          # array data channel statis, typed sebagai Channel[]
  components/
    HeroSection.tsx          # banner atas, channel unggulan + backdrop blur
    ChannelRow.tsx            # baris horizontal card channel per kategori
    ChannelCard.tsx            # card individual channel, style focus/hover ala tvOS
    FullscreenPlayer.tsx        # tampilan pemutaran fullscreen, kontrol auto-hide
    SearchBar.tsx                # input pencarian channel
  hooks/
    useHlsPlayer.ts               # kelola instance hls.js, status, error
    useTvNavigation.ts              # navigasi fokus ala remote TV (arrow keys)
  utils/
    groupChannels.ts                 # group channel per category + filter search
  App.tsx                              # state channel aktif, switch view browse/fullscreen
scripts/
  importPlaylist.ts                     # script terpisah: parse M3U -> update data statis
```

## Acceptance Criteria
- [ ] Saat pertama buka web, user langsung melihat katalog channel (hero + baris kategori) tanpa perlu upload, paste, atau koneksi ke backend apapun
- [ ] Semua data channel berasal dari file statis di dalam project, bukan dari API eksternal atau database
- [ ] User bisa memilih channel dengan mouse maupun keyboard (arrow keys + Enter), indikator fokus jelas
- [ ] Channel yang dipilih langsung diputar via hls.js tanpa error di console untuk stream yang valid
- [ ] Tampilan keseluruhan terasa seperti smart TV/streaming service modern, bukan seperti tool developer
- [ ] Search bar berhasil memfilter channel secara real-time berdasarkan nama
- [ ] Ada script terpisah (`scripts/importPlaylist.ts`) yang bisa dipakai developer untuk update katalog dari sumber M3U, dijalankan di luar alur pemakaian normal end user
- [ ] Seluruh source code menggunakan TypeScript (`.ts`/`.tsx`), tidak ada file `.js`/`.jsx` tersisa
- [ ] Tidak ada error type-checking (`tsc --noEmit`) dan tidak ada warning/error saat menjalankan `npm run build`

## Notes for Claude Code
- Setup project dengan template Vite **`react-ts`**, bukan `react` biasa, supaya konfigurasi TypeScript sudah benar dari awal (`tsconfig.json`, dll)
- Fokus utama: end user experience harus terasa seperti membuka aplikasi streaming siap pakai — sama sekali tidak ada langkah "masukkan playlist dulu" dan tidak ada dependency ke backend/API eksternal
- Proses import M3U ke data statis adalah tanggung jawab developer, dibuat sebagai script terpisah (`scripts/importPlaylist.ts`), bukan bagian dari UI yang dilihat penonton
- Prioritaskan pengalaman navigasi keyboard/fokus (`useTvNavigation.ts`) karena ini yang membuat terasa seperti TV OS asli
- Gunakan DaisyUI untuk komponen dasar (button, input, badge, alert), tapi card/hero/focus effect sebaiknya custom Tailwind agar tidak terasa seperti template DaisyUI default
- Definisikan semua props komponen dengan interface/type eksplisit, hindari `any`
- Jalankan `scripts/importPlaylist.ts` dengan default URL `https://iptv-org.github.io/iptv/countries/id.m3u` untuk mengisi `src/data/channels.ts` dengan channel Indonesia dari repo `iptv-org/iptv` — ini jadi katalog awal aplikasi, bukan cuma placeholder 1-2 channel
- Beberapa stream dari `iptv-org/iptv` mungkin down/geo-blocked sewaktu-waktu karena sifatnya user-submitted; pastikan UI menampilkan pesan error yang jelas (bukan layar blank) saat sebuah channel gagal diputar, dan sertakan opsi untuk pindah ke channel lain dengan mudah