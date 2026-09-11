import React from 'react';

// Format inline text: **bold**, *italic*, `code`, and clean markdown artifacts
function formatInline(text) {
  if (!text) return text;

  // Split by markdown bold (**text**)
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="chat-strong">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && !part.startsWith('**')) {
      return (
        <em key={index} className="chat-em">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={index} className="chat-code">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export default function ChatMarkdown({ content }) {
  if (!content) return null;

  const lines = content.split('\n');
  const renderedElements = [];
  let currentList = null; // { type: 'ul' | 'ol', items: [] }
  let currentTable = null; // { headers: [], rows: [] }

  const flushList = (key) => {
    if (!currentList) return;
    if (currentList.type === 'ul') {
      renderedElements.push(
        <ul key={`ul-${key}`} className="chat-md-ul">
          {currentList.items.map((it, idx) => (
            <li key={idx} className="chat-md-li">
              {formatInline(it)}
            </li>
          ))}
        </ul>
      );
    } else {
      renderedElements.push(
        <ol key={`ol-${key}`} className="chat-md-ol">
          {currentList.items.map((it, idx) => (
            <li key={idx} className="chat-md-li">
              {formatInline(it)}
            </li>
          ))}
        </ol>
      );
    }
    currentList = null;
  };

  const flushTable = (key) => {
    if (!currentTable) return;
    renderedElements.push(
      <div key={`table-${key}`} className="chat-md-table-wrapper">
        <table className="chat-md-table">
          <thead>
            <tr>
              {currentTable.headers.map((h, i) => (
                <th key={i}>{formatInline(h.trim())}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {currentTable.rows.map((row, rIdx) => (
              <tr key={rIdx}>
                {row.map((cell, cIdx) => (
                  <td key={cIdx}>{formatInline(cell.trim())}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
    currentTable = null;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // 1. Table Row
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(index);
      const cells = trimmed
        .slice(1, -1)
        .split('|')
        .map((c) => c.trim());

      // Check if it's separator row (e.g., |---|---|)
      const isSeparator = cells.every((c) => /^[-:\s]+$/.test(c));
      if (isSeparator) {
        return; // skip separator row
      }

      if (!currentTable) {
        currentTable = { headers: cells, rows: [] };
      } else {
        currentTable.rows.push(cells);
      }
      return;
    } else if (currentTable) {
      flushTable(index);
    }

    // 2. Empty line
    if (!trimmed) {
      flushList(index);
      flushTable(index);
      return;
    }

    // 3. Horizontal separator (---)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      flushList(index);
      renderedElements.push(<hr key={`hr-${index}`} className="chat-md-hr" />);
      return;
    }

    // 4. Headings (###, ##, #)
    if (trimmed.startsWith('### ')) {
      flushList(index);
      renderedElements.push(
        <h4 key={`h4-${index}`} className="chat-md-h4">
          {formatInline(trimmed.replace(/^###\s+/, ''))}
        </h4>
      );
      return;
    }
    if (trimmed.startsWith('## ')) {
      flushList(index);
      renderedElements.push(
        <h3 key={`h3-${index}`} className="chat-md-h3">
          {formatInline(trimmed.replace(/^##\s+/, ''))}
        </h3>
      );
      return;
    }
    if (trimmed.startsWith('# ')) {
      flushList(index);
      renderedElements.push(
        <h2 key={`h2-${index}`} className="chat-md-h2">
          {formatInline(trimmed.replace(/^#\s+/, ''))}
        </h2>
      );
      return;
    }

    // 5. Unordered List Items (*, -, •)
    const bulletMatch = trimmed.match(/^([*•\-–])\s+(.+)/);
    if (bulletMatch) {
      if (!currentList || currentList.type !== 'ul') {
        flushList(index);
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(bulletMatch[2]);
      return;
    }

    // 6. Ordered List Items (1., 2., etc.)
    const orderedMatch = trimmed.match(/^(\d+)[.)]\s+(.+)/);
    if (orderedMatch) {
      if (!currentList || currentList.type !== 'ol') {
        flushList(index);
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(orderedMatch[2]);
      return;
    }

    // 7. Regular paragraph / Callout box
    flushList(index);

    const isCallout =
      trimmed.startsWith('🚨') ||
      trimmed.startsWith('⚠️') ||
      trimmed.startsWith('✅') ||
      trimmed.startsWith('❌') ||
      trimmed.startsWith('📞');

    renderedElements.push(
      <p
        key={`p-${index}`}
        className={`chat-md-p ${isCallout ? 'chat-md-callout' : ''}`}
      >
        {formatInline(trimmed)}
      </p>
    );
  });

  // Flush remaining
  flushList('end');
  flushTable('end');

  return <div className="chat-markdown-body">{renderedElements}</div>;
}
