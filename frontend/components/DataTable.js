import React, { useState, useMemo } from 'react';

const BRAND_GOLD = '#FFD000';
const BRAND_BLACK = '#1A1A1A';

/**
 * DataTable
 *
 * Generic table with column-config, client-side sort + filter, and per-row
 * action buttons. Designed to be a one-stop replacement for the ad-hoc
 * tables scattered across every page.
 *
 * Usage:
 *   <DataTable
 *     columns={[
 *       { key: 'name', label: 'Name', sortable: true },
 *       { key: 'email', label: 'Email' },
 *       { key: 'status', label: 'Status', render: (row) => <Badge value={row.status} /> },
 *     ]}
 *     rows={clients}
 *     rowKey="id"
 *     searchableFields={['name', 'email']}
 *     actions={[
 *       { label: 'Edit', onClick: (row) => setEditing(row) },
 *       { label: 'Delete', onClick: (row) => setDeleting(row), destructive: true },
 *     ]}
 *   />
 *
 * Props:
 *   columns          — [{ key, label, sortable?, render?, align? }]
 *   rows             — array of objects.
 *   rowKey           — string; unique key field on each row (default 'id').
 *   actions          — optional [{ label, onClick(row), destructive? }] rendered per row.
 *   searchableFields — optional list of column keys to search. Adds a search input.
 *   emptyMessage     — string shown when rows is empty.
 *   pageSize         — default 25. Set 0 to disable pagination.
 */
function DataTable({
  columns,
  rows,
  rowKey = 'id',
  actions = [],
  searchableFields = [],
  emptyMessage = 'No data',
  pageSize = 25,
}) {
  const [sort, setSort] = useState({ key: null, dir: 'asc' });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    let out = Array.isArray(rows) ? rows : [];
    if (search && searchableFields.length > 0) {
      const q = search.toLowerCase();
      out = out.filter((r) =>
        searchableFields.some((field) => {
          const v = r?.[field];
          return v != null && String(v).toLowerCase().includes(q);
        }),
      );
    }
    if (sort.key) {
      const k = sort.key;
      out = [...out].sort((a, b) => {
        const av = a?.[k];
        const bv = b?.[k];
        if (av == null) return 1;
        if (bv == null) return -1;
        if (typeof av === 'number' && typeof bv === 'number') {
          return sort.dir === 'asc' ? av - bv : bv - av;
        }
        const as = String(av);
        const bs = String(bv);
        return sort.dir === 'asc' ? as.localeCompare(bs) : bs.localeCompare(as);
      });
    }
    return out;
  }, [rows, sort, search, searchableFields]);

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(filtered.length / pageSize)) : 1;
  const pageRows = pageSize > 0 ? filtered.slice(page * pageSize, page * pageSize + pageSize) : filtered;

  const toggleSort = (col) => {
    if (!col.sortable) return;
    setSort((s) =>
      s.key === col.key
        ? { key: col.key, dir: s.dir === 'asc' ? 'desc' : 'asc' }
        : { key: col.key, dir: 'asc' },
    );
  };

  return (
    <div style={{ width: '100%', color: '#FFFFFF' }}>
      {searchableFields.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <input
            type="search"
            placeholder={`Search ${searchableFields.join(', ')}…`}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            style={{
              width: '100%',
              maxWidth: '320px',
              padding: '8px 12px',
              backgroundColor: BRAND_BLACK,
              color: '#FFFFFF',
              border: '1px solid #333',
              borderRadius: '6px',
              fontSize: '14px',
            }}
          />
        </div>
      )}

      <div
        style={{
          backgroundColor: '#111111',
          border: '1px solid #1E1E1E',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead style={{ backgroundColor: BRAND_BLACK, borderBottom: `2px solid ${BRAND_GOLD}` }}>
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => toggleSort(col)}
                  style={{
                    padding: '12px 16px',
                    textAlign: col.align || 'left',
                    color: BRAND_GOLD,
                    fontWeight: 600,
                    cursor: col.sortable ? 'pointer' : 'default',
                    userSelect: 'none',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {col.label}
                  {col.sortable && sort.key === col.key && (
                    <span style={{ marginLeft: '4px' }}>{sort.dir === 'asc' ? '↑' : '↓'}</span>
                  )}
                </th>
              ))}
              {actions.length > 0 && (
                <th style={{ padding: '12px 16px', textAlign: 'right', color: BRAND_GOLD }}>
                  Actions
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (actions.length > 0 ? 1 : 0)}
                  style={{ padding: '32px', textAlign: 'center', color: '#888' }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row, idx) => (
                <tr
                  key={row?.[rowKey] ?? idx}
                  style={{
                    borderBottom: idx < pageRows.length - 1 ? '1px solid #1E1E1E' : 'none',
                  }}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '12px 16px',
                        textAlign: col.align || 'left',
                        color: '#E0E0E0',
                      }}
                    >
                      {col.render ? col.render(row) : (row?.[col.key] ?? '—')}
                    </td>
                  ))}
                  {actions.length > 0 && (
                    <td style={{ padding: '8px 16px', textAlign: 'right' }}>
                      {actions.map((action, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => action.onClick(row)}
                          style={{
                            backgroundColor: 'transparent',
                            color: action.destructive ? '#FF4444' : BRAND_GOLD,
                            border: `1px solid ${action.destructive ? '#FF4444' : '#333'}`,
                            padding: '4px 10px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginLeft: i > 0 ? '6px' : 0,
                            cursor: 'pointer',
                          }}
                        >
                          {action.label}
                        </button>
                      ))}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pageSize > 0 && filtered.length > pageSize && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
            color: '#A0A0A0',
            fontSize: '13px',
          }}
        >
          <span>
            {filtered.length} {filtered.length === 1 ? 'row' : 'rows'} · page {page + 1} of {totalPages}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              style={pageBtnStyle(page === 0)}
            >
              ‹ Prev
            </button>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              style={pageBtnStyle(page >= totalPages - 1)}
            >
              Next ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const pageBtnStyle = (disabled) => ({
  backgroundColor: 'transparent',
  color: disabled ? '#555' : '#FFFFFF',
  border: '1px solid #333',
  padding: '4px 12px',
  borderRadius: '4px',
  fontSize: '13px',
  cursor: disabled ? 'not-allowed' : 'pointer',
});

export default DataTable;
