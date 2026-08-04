import React, { useState, useMemo } from 'react';
import sopData, { categoryMeta, jobDescription } from '../data/sopData';

export default function SOPPage() {
  var [search, setSearch] = useState('');
  var [filterCategory, setFilterCategory] = useState('all');
  var [expanded, setExpanded] = useState({});
  var [showJobDesc, setShowJobDesc] = useState(false);

  var filtered = useMemo(function () {
    var q = search.trim().toLowerCase();
    return sopData.filter(function (sop) {
      if (filterCategory !== 'all' && sop.category !== filterCategory) return false;
      if (!q) return true;
      return sop.title.toLowerCase().indexOf(q) !== -1 ||
        sop.no.toLowerCase().indexOf(q) !== -1 ||
        sop.kebijakan.toLowerCase().indexOf(q) !== -1 ||
        sop.prosedur.some(function (p) { return p.toLowerCase().indexOf(q) !== -1; });
    });
  }, [search, filterCategory]);

  function toggle(no) {
    setExpanded(function (prev) {
      var next = Object.assign({}, prev);
      next[no] = !next[no];
      return next;
    });
  }

  function expandAll() {
    var next = {};
    filtered.forEach(function (s) { next[s.no] = true; });
    setExpanded(next);
  }
  function collapseAll() {
    setExpanded({});
  }

  var categoryCounts = useMemo(function () {
    var counts = {};
    sopData.forEach(function (s) { counts[s.category] = (counts[s.category] || 0) + 1; });
    return counts;
  }, []);

  return React.createElement('div', {
    style: { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 84px)', background: '#080F1E', overflow: 'hidden' }
  },
    // Toolbar
    React.createElement('div', {
      style: { background: '#0D1B2E', borderBottom: '1px solid #1E3A5F', padding: '10px 16px',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, flexWrap: 'wrap', minHeight: 52 }
    },
      React.createElement('span', { style: { fontSize: 12, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em' } }, 'SOP & POLICY IT'),
      React.createElement('span', { style: { fontSize: 10, color: '#334155' } }, sopData.length + ' dokumen'),
      React.createElement('input', {
        type: 'text', value: search, placeholder: 'Cari SOP (judul, isi prosedur)...',
        onChange: function (e) { setSearch(e.target.value); },
        style: { flex: 1, minWidth: 200, maxWidth: 340, background: '#060E1C', border: '1px solid #1E3A5F',
          borderRadius: 6, padding: '7px 12px', fontSize: 11, color: '#E2E8F0', fontFamily: 'inherit', outline: 'none' }
      }),
      React.createElement('div', { style: { marginLeft: 'auto', display: 'flex', gap: 6 } },
        React.createElement('button', {
          onClick: function () { setShowJobDesc(true); },
          style: { fontSize: 10, padding: '6px 12px', borderRadius: 6, background: 'transparent',
            border: '1px solid #A855F755', color: '#A855F7', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }
        }, 'Job Description'),
        React.createElement('button', {
          onClick: expandAll,
          style: { fontSize: 10, padding: '6px 12px', borderRadius: 6, background: 'transparent',
            border: '1px solid #1E3A5F', color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }
        }, 'Buka Semua'),
        React.createElement('button', {
          onClick: collapseAll,
          style: { fontSize: 10, padding: '6px 12px', borderRadius: 6, background: 'transparent',
            border: '1px solid #1E3A5F', color: '#64748B', cursor: 'pointer', fontFamily: 'inherit' }
        }, 'Tutup Semua')
      )
    ),

    // Category filter chips
    React.createElement('div', { style: { padding: '10px 16px 0', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 } },
      React.createElement('button', {
        onClick: function () { setFilterCategory('all'); },
        style: { fontSize: 10, padding: '5px 12px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
          fontWeight: filterCategory === 'all' ? 700 : 400,
          background: filterCategory === 'all' ? '#38BDF822' : 'transparent',
          color: filterCategory === 'all' ? '#38BDF8' : '#64748B',
          border: '1px solid ' + (filterCategory === 'all' ? '#38BDF855' : '#1E3A5F') }
      }, 'Semua (' + sopData.length + ')'),
      Object.keys(categoryMeta).map(function (key) {
        var meta = categoryMeta[key];
        var active = filterCategory === key;
        return React.createElement('button', {
          key: key, onClick: function () { setFilterCategory(key); },
          style: { fontSize: 10, padding: '5px 12px', borderRadius: 5, cursor: 'pointer', fontFamily: 'inherit',
            fontWeight: active ? 700 : 400,
            background: active ? meta.color + '22' : 'transparent',
            color: active ? meta.color : '#64748B',
            border: '1px solid ' + (active ? meta.color + '55' : '#1E3A5F') }
        }, meta.icon + ' ' + meta.label + ' (' + (categoryCounts[key] || 0) + ')');
      })
    ),

    // SOP list
    React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '12px 16px 20px' } },
      React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      filtered.length === 0 ? React.createElement('div', {
        style: { textAlign: 'center', paddingTop: 60, color: '#334155', fontSize: 12 }
      }, 'Tidak ada SOP yang cocok dengan pencarian') : null,

      filtered.map(function (sop) {
        var meta = categoryMeta[sop.category] || categoryMeta.manajemen;
        var isOpen = !!expanded[sop.no];
        return React.createElement('div', {
          key: sop.no,
          style: { background: '#0A1628', border: '1px solid #1E3A5F', borderRadius: 10, overflow: 'hidden', flexShrink: 0 }
        },
          // Header row (clickable)
          React.createElement('div', {
            onClick: function () { toggle(sop.no); },
            style: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', cursor: 'pointer' }
          },
            React.createElement('div', {
              style: { width: 36, height: 36, borderRadius: 8, flexShrink: 0, background: meta.color + '18',
                border: '1px solid ' + meta.color + '44', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 15 }
            }, meta.icon),
            React.createElement('div', { style: { flex: 1, minWidth: 0 } },
              React.createElement('div', { style: { fontSize: 13, fontWeight: 700, color: '#E2E8F0' } }, sop.title),
              React.createElement('div', { style: { fontSize: 10, color: '#64748B', marginTop: 2 } },
                sop.no + ' \u00B7 ' + meta.label)
            ),
            React.createElement('div', {
              style: { fontSize: 14, color: '#475569', transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }
            }, '\u203A')
          ),
          // Expandable content
          isOpen ? React.createElement('div', { style: { padding: '0 16px 16px', borderTop: '1px solid #1E3A5F' } },
            React.createElement('div', { style: { marginTop: 12, marginBottom: 14 } },
              React.createElement('div', { style: { fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', marginBottom: 4 } }, 'KEBIJAKAN'),
              React.createElement('div', { style: { fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 } }, sop.kebijakan)
            ),
            React.createElement('div', null,
              React.createElement('div', { style: { fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', marginBottom: 6 } }, 'PROSEDUR'),
              React.createElement('ol', { style: { margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 6 } },
                sop.prosedur.map(function (step, i) {
                  return React.createElement('li', { key: i, style: { fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 } }, step);
                })
              )
            )
          ) : null
        );
      })
      )
    ),

    // Job Description Modal
    showJobDesc ? React.createElement('div', {
      onClick: function () { setShowJobDesc(false); },
      style: { position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }
    },
      React.createElement('div', {
        onClick: function (e) { e.stopPropagation(); },
        style: { background: '#0D1B2E', border: '1px solid #A855F755', borderRadius: 14, width: '100%', maxWidth: 640,
          maxHeight: '85vh', display: 'flex', flexDirection: 'column' }
      },
        React.createElement('div', { style: { padding: '16px 20px', borderBottom: '1px solid #1E3A5F',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 } },
          React.createElement('div', { style: { fontSize: 14, fontWeight: 800, color: '#E2E8F0' } }, jobDescription.title),
          React.createElement('button', {
            onClick: function () { setShowJobDesc(false); },
            style: { width: 28, height: 28, borderRadius: 7, background: '#1E3A5F', border: 'none', color: '#94A3B8', cursor: 'pointer' }
          }, 'X')
        ),
        React.createElement('div', { style: { padding: '18px 20px', overflowY: 'auto' } },
          React.createElement('div', { style: { fontSize: 12, color: '#CBD5E1', lineHeight: 1.6, marginBottom: 16 } }, jobDescription.summary),
          React.createElement('div', { style: { fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.05em', marginBottom: 8 } }, 'RUANG LINGKUP TANGGUNG JAWAB'),
          React.createElement('ol', { style: { margin: 0, paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 } },
            jobDescription.scope.map(function (item, i) {
              return React.createElement('li', { key: i, style: { fontSize: 12, color: '#CBD5E1', lineHeight: 1.6 } }, item);
            })
          )
        )
      )
    ) : null
  );
}
