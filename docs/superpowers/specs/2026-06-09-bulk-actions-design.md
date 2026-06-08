# Design Specification: Bulk Actions

## 1. Overview
Fitur "Bulk Actions" memungkinkan pengguna untuk memilih beberapa file/folder sekaligus pada tampilan antarmuka (UI) dan melakukan aksi massal (Hapus, Pindahkan, Unduh, Tandai Bintang, dan Tambahkan ke Virtual Folder) tanpa harus melakukannya satu per satu.

## 2. State Management (`useSelectionStore.ts`)
Penyimpanan state pemilihan saat ini (hanya mendukung item tunggal) akan diubah untuk mendukung mode jamak (multiple selection):
*   `selectedItem` diganti menjadi `selectedItems: SelectedItem[]` (atau `Map`/`Set` untuk efisiensi jika perlu).
*   Fungsi yang disediakan:
    *   `toggleSelection(item: SelectedItem)`: Menambahkan atau menghapus item dari state.
    *   `selectAll(items: SelectedItem[])`: Memilih semua item yang ditampilkan di halaman.
    *   `clearSelection()`: Mengosongkan daftar pilihan.
*   **Mode Seleksi:** Secara logika, mode seleksi aktif jika `selectedItems.length > 0`.

## 3. Antarmuka Pengguna (UI)

### 3.1. Komponen Checkbox di File Grid
*   Sebuah checkbox akan ditambahkan di setiap komponen item file/folder (`FileGrid.tsx` dll).
*   **Visibilitas:**
    *   Saat `selectedItems.length === 0`: Checkbox tersembunyi dan hanya muncul ketika pengguna melakukan *hover* pada item tersebut.
    *   Saat `selectedItems.length > 0`: Semua checkbox pada semua baris file akan terlihat (permanen), agar pengguna sadar mereka sedang dalam mode seleksi.
*   Akan ada checkbox global "Pilih Semua" (Select All) di bagian kolom pengendali.

### 3.2. Bulk Action Bar (Contextual Header)
*   Saat mode seleksi aktif, *Header* utama (yang berisi breadcrumb/judul) akan digantikan menjadi *Contextual Header* (seperti di Gmail / Google Drive).
*   **Isi Header:**
    *   **Kiri:** Tombol "Tutup/Batal" (mengaktifkan `clearSelection()`), dan indikator jumlah (teks "X item terpilih").
    *   **Kanan:** Tombol-tombol aksi massal (Hapus, Pindah, Unduh, Bintang, Tambahkan ke Virtual Folder).
*   **Aturan Khusus "Tambahkan ke Virtual Folder":**
    *   Tombol ini tetap ada tapi akan menjadi **disabled** (tidak bisa diklik) jika pengguna memilih satu folder atau lebih (karena virtual folder hanya untuk mengelompokkan file).
    *   Akan disertakan *tooltip* informasi yang jelas jika state tombol sedang *disabled* ("Hanya bisa digunakan jika semua item yang dipilih adalah file").

## 4. Eksekusi Aksi dan Alur Kerja
*   **Pendekatan Pemanggilan API:** Backend saat ini berfokus pada aksi tunggal (`DELETE /api/files/:id`, dll). Frontend akan mengeksekusi pemanggilan API tersebut secara paralel (menggunakan *Promise.all* dengan limitasi) untuk semua item yang terpilih.
*   **Proses & Loading:** Saat aksi sedang berjalan, akan dimunculkan sebuah indikator global atau *Toast Notification* (misal: "Memproses 5 item...").
*   **Feedback (Hasil):** Setelah eksekusi selesai untuk semua item, aplikasi akan menampilkan rangkuman notifikasi (misal: "✅ 5 item berhasil dipindahkan" atau "⚠️ 4 item berhasil, 1 gagal").
*   **Reset UI:** Setelah aksi selesai dijalankan, daftar file akan di-refresh (*re-fetch*) dan fungsi `clearSelection()` dipanggil agar mode seleksi tertutup secara otomatis.

## 5. Ruang Lingkup
Fokus implementasi berada di frontend (`packages/web`). Perubahan *backend* tidak diperlukan kecuali kinerja proses asinkron massal di sisi klien tidak mencukupi (tidak diantisipasi menjadi masalah saat ini).
