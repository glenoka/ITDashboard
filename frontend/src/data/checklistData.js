// Definisi tugas Checklist Rutin IT Komaneka Resorts
// Sumber: P&P IT - revisi Juni 2026 (Routine Tasks)

export const dailyTasks = [
  { id: 'd-01', title: 'Email Monitoring', desc: 'Memeriksa email untuk memastikan tidak ada pemberitahuan, permintaan, atau gangguan yang memerlukan tindak lanjut.' },
  { id: 'd-02', title: 'Google Business Profile Monitoring', desc: 'Memastikan informasi pada Google Business Profile tetap akurat (nama property, nomor telepon, lokasi, website, jam operasional, tautan reservasi, dll) dan tidak ada perubahan tidak sah.' },
  { id: 'd-03', title: 'Website Monitoring', desc: 'Memastikan website property dapat diakses, seluruh konten dan fitur utama berfungsi normal (Book Now, formulir kontak, WhatsApp, email, tautan penting), dan tidak ada perubahan tampilan/konten tidak sah.' },
  { id: 'd-04', title: 'Guest Room Technology Readiness', desc: 'Memastikan seluruh kamar Showing dan Expected Arrival siap digunakan, WiFi & Smart TV berfungsi baik, dan tidak ada akun tamu sebelumnya yang masih login.' },
  { id: 'd-05', title: 'Internet Connectivity Monitoring', desc: 'Memastikan koneksi internet hotel berjalan normal dan stabil.' },
  { id: 'd-06', title: 'MikroTik Router Monitoring', desc: 'Memantau kondisi router utama untuk memastikan layanan jaringan beroperasi dengan baik.' },
  { id: 'd-07', title: 'Network Switch Monitoring', desc: 'Memastikan seluruh switch jaringan berfungsi normal tanpa gangguan konektivitas.' },
  { id: 'd-08', title: 'Wireless Network Monitoring', desc: 'Memastikan seluruh Access Point dan layanan WiFi beroperasi dengan baik.' },
  { id: 'd-09', title: 'Server Monitoring', desc: 'Memantau kondisi server dan layanan yang berjalan untuk memastikan operasional tetap normal.' },
  { id: 'd-10', title: 'Backup Monitoring', desc: 'Memastikan proses backup data dan konfigurasi sistem berhasil dilaksanakan.' },
  { id: 'd-11', title: 'NAS / Storage Monitoring', desc: 'Memeriksa kondisi media penyimpanan dan kapasitas ruang penyimpanan yang tersedia.' },
  { id: 'd-12', title: 'CCTV Monitoring', desc: 'Memastikan seluruh kamera CCTV, proses perekaman, dan media penyimpanan berfungsi dengan baik.' },
  { id: 'd-13', title: 'Printer Monitoring', desc: 'Memastikan printer operasional di setiap departemen siap digunakan.' },
  { id: 'd-14', title: 'Business System Monitoring', desc: 'Memastikan sistem operasional hotel (PMS, POS, Smart TV, dan sistem pendukung lainnya) berjalan dengan baik.' },
  { id: 'd-15', title: 'IT Support & Troubleshooting', desc: 'Memberikan bantuan teknis serta menangani gangguan yang dilaporkan oleh tamu maupun departemen terkait.' },
  { id: 'd-16', title: 'Daily IT Log Update', desc: 'Mendokumentasikan hasil pemeriksaan, gangguan yang ditemukan, tindakan yang dilakukan, dan status penyelesaiannya.' },
];

export const weeklyTasks = [
  { id: 'w-01', title: 'Network Infrastructure Inspection', desc: 'Memeriksa kondisi router, switch, access point, dan perangkat jaringan lainnya untuk memastikan seluruh infrastruktur beroperasi dengan baik.' },
  { id: 'w-02', title: 'Server & Storage Inspection', desc: 'Memeriksa kapasitas penyimpanan, kondisi server, serta kesehatan media penyimpanan.' },
  { id: 'w-03', title: 'Backup Verification', desc: 'Memastikan hasil backup data dan konfigurasi sistem dapat digunakan apabila diperlukan proses pemulihan.' },
  { id: 'w-04', title: 'Network Performance Review', desc: 'Memeriksa performa jaringan, kualitas koneksi internet, dan layanan WiFi di seluruh area operasional.' },
  { id: 'w-05', title: 'CCTV System Inspection', desc: 'Memeriksa kualitas gambar, proses perekaman, kapasitas penyimpanan, dan kondisi perangkat CCTV.' },
  { id: 'w-06', title: 'Review Outstanding IT Issues', desc: 'Meninjau seluruh permasalahan IT yang belum terselesaikan dan menentukan tindak lanjut yang diperlukan.' },
];

export const monthlyTasks = [
  { id: 'm-01', title: 'Preventive Maintenance', desc: 'Melaksanakan preventive maintenance terhadap seluruh perangkat IT sesuai SOP yang berlaku.' },
  { id: 'm-02', title: 'System Update & Patch Management', desc: 'Melakukan pembaruan sistem operasi, firmware, antivirus, dan aplikasi untuk menjaga keamanan dan kinerja sistem.' },
  { id: 'm-03', title: 'UPS & Power Protection Inspection', desc: 'Memeriksa kondisi UPS dan perangkat pendukung kelistrikan untuk memastikan perlindungan terhadap perangkat IT.' },
  { id: 'm-04', title: 'Asset Management Review', desc: 'Memperbarui data inventaris apabila terdapat penambahan, perpindahan, penggantian, atau penghapusan aset IT.' },
  { id: 'm-05', title: 'IT Security Review', desc: 'Melakukan pemeriksaan terhadap keamanan jaringan, hak akses pengguna, antivirus, firewall, dan konfigurasi keamanan lainnya.' },
  { id: 'm-06', title: 'Monthly IT Report', desc: 'Menyusun laporan kegiatan IT, gangguan yang terjadi, pekerjaan yang telah diselesaikan, serta rekomendasi perbaikan kepada Resort Manager (RM).' },
];

export const yearlyTasks = [
  { id: 'y-01', title: 'IT Asset Inventory', desc: 'Melakukan inventarisasi dan verifikasi seluruh aset teknologi informasi perusahaan.' },
  { id: 'y-02', title: 'Infrastructure Evaluation', desc: 'Mengevaluasi kondisi infrastruktur IT untuk menentukan kebutuhan penggantian, peningkatan kapasitas, atau pengembangan.' },
  { id: 'y-03', title: 'Vendor & License Review', desc: 'Mengevaluasi kontrak vendor, masa berlaku lisensi perangkat lunak, garansi perangkat, dan layanan pendukung lainnya.' },
  { id: 'y-04', title: 'Information Security Evaluation', desc: 'Melakukan evaluasi menyeluruh terhadap keamanan sistem dan infrastruktur IT serta menyusun rekomendasi peningkatan.' },
  { id: 'y-05', title: 'IT Strategic Planning', desc: 'Menyusun rencana pengembangan teknologi informasi untuk mendukung kebutuhan operasional dan bisnis hotel pada tahun berikutnya.' },
];

export const occasionalTasks = [
  { id: 'o-01', title: 'Event Audio Visual Setup', desc: 'Menyiapkan file gamelan/audio musik, projector, dan media pendukung untuk kebutuhan event sesuai permintaan.' },
  { id: 'o-02', title: 'Event Printing Support', desc: 'Melakukan pencetakan materi event seperti flyer, menu, drink list, dan dance story sesuai kebutuhan acara.' },
  { id: 'o-03', title: 'Event Documentation Support', desc: 'Mendukung kebutuhan teknis terkait materi digital atau konten yang digunakan dalam event.' },
  { id: 'o-04', title: 'Restaurant Layout Support', desc: 'Membantu penyusunan layout restaurant atau area event apabila diperlukan untuk mendukung pelaksanaan acara.' },
];

// Helper: hitung period key untuk masing-masing tipe periode berdasarkan tanggal tertentu (default hari ini)
export function getPeriodKey(periodType, date) {
  var d = date || new Date();
  var y = d.getFullYear();
  var m = String(d.getMonth() + 1).padStart(2, '0');
  var day = String(d.getDate()).padStart(2, '0');

  if (periodType === 'daily') return y + '-' + m + '-' + day;
  if (periodType === 'monthly') return y + '-' + m;
  if (periodType === 'yearly') return String(y);
  if (periodType === 'weekly') {
    // ISO week number
    var tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    var dayNum = (tmp.getUTCDay() + 6) % 7;
    tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
    var firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
    var week = 1 + Math.round(((tmp - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
    return tmp.getUTCFullYear() + '-W' + String(week).padStart(2, '0');
  }
  // occasional: keyed by date it was used (like daily) so history is per-day
  return y + '-' + m + '-' + day;
}

export function shiftPeriod(periodType, currentDate, direction) {
  var d = new Date(currentDate);
  if (periodType === 'daily' || periodType === 'occasional') d.setDate(d.getDate() + direction);
  else if (periodType === 'weekly') d.setDate(d.getDate() + direction * 7);
  else if (periodType === 'monthly') d.setMonth(d.getMonth() + direction);
  else if (periodType === 'yearly') d.setFullYear(d.getFullYear() + direction);
  return d;
}

export function formatPeriodLabel(periodType, date) {
  var d = date;
  var opts;
  if (periodType === 'daily' || periodType === 'occasional') {
    opts = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
    return d.toLocaleDateString('id-ID', opts);
  }
  if (periodType === 'weekly') {
    var start = new Date(d);
    var day = (start.getDay() + 6) % 7;
    start.setDate(start.getDate() - day);
    var end = new Date(start);
    end.setDate(end.getDate() + 6);
    var fmt = { day: 'numeric', month: 'short' };
    return start.toLocaleDateString('id-ID', fmt) + ' - ' + end.toLocaleDateString('id-ID', fmt) + ' ' + end.getFullYear();
  }
  if (periodType === 'monthly') {
    return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  }
  if (periodType === 'yearly') {
    return String(d.getFullYear());
  }
  return '';
}

export const taskSets = {
  daily: dailyTasks,
  weekly: weeklyTasks,
  monthly: monthlyTasks,
  yearly: yearlyTasks,
  occasional: occasionalTasks,
};
