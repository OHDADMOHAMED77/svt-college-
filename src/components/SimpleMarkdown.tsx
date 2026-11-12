import React from 'react';

/**
 * Rendu léger d'un sous-ensemble de Markdown : titres (#, ##, ###),
 * listes à puces (-, *, •), listes numérotées (1. ou 1)), paragraphes et gras (**texte**).
 *
 * Aucun HTML n'est interprété : tout est produit sous forme d'éléments React,
 * ce qui évite les injections même si le texte vient de l'assistant IA.
 */

type Block =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph'; lines: string[] }
  | { kind: 'ul' | 'ol'; items: string[] };

function parseBlocks(source: string): Block[] {
  const blocks: Block[] = [];
  let startNewBlock = true;

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim();

    if (line === '') {
      startNewBlock = true;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(line);
    const bullet = /^[-*•]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const last = blocks[blocks.length - 1];

    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      startNewBlock = true;
    } else if (bullet || numbered) {
      const kind: 'ul' | 'ol' = bullet ? 'ul' : 'ol';
      const text = bullet ? bullet[1] : numbered ? numbered[1] : '';
      if (!startNewBlock && last && (last.kind === 'ul' || last.kind === 'ol') && last.kind === kind) {
        last.items.push(text);
      } else {
        blocks.push({ kind, items: [text] });
      }
      startNewBlock = false;
    } else {
      if (!startNewBlock && last && last.kind === 'paragraph') {
        last.lines.push(line);
      } else {
        blocks.push({ kind: 'paragraph', lines: [line] });
      }
      startNewBlock = false;
    }
  }

  return blocks;
}

function renderInline(text: string): React.ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((token, index) =>
    token.length > 4 && token.startsWith('**') && token.endsWith('**')
      ? <strong key={index} className="font-bold text-white">{token.slice(2, -2)}</strong>
      : <React.Fragment key={index}>{token}</React.Fragment>
  );
}

interface SimpleMarkdownProps {
  text: string;
  className?: string;
}

export const SimpleMarkdown: React.FC<SimpleMarkdownProps> = ({ text, className = '' }) => {
  const blocks = parseBlocks(text);

  return (
    <div className={`space-y-2 ${className}`}>
      {blocks.map((block, index) => {
        if (block.kind === 'heading') {
          const Tag = block.level <= 2 ? 'h3' : 'h4';
          return (
            <Tag key={index} className="font-bold text-white pt-1">
              {renderInline(block.text)}
            </Tag>
          );
        }

        if (block.kind === 'paragraph') {
          return (
            <p key={index}>
              {block.lines.map((line, lineIndex) => (
                <React.Fragment key={lineIndex}>
                  {lineIndex > 0 && <br />}
                  {renderInline(line)}
                </React.Fragment>
              ))}
            </p>
          );
        }

        const ListTag = block.kind === 'ul' ? 'ul' : 'ol';
        const listStyle = block.kind === 'ul' ? 'list-disc' : 'list-decimal';
        return (
          <ListTag key={index} className={`${listStyle} ps-5 space-y-1`}>
            {block.items.map((item, itemIndex) => (
              <li key={itemIndex}>{renderInline(item)}</li>
            ))}
          </ListTag>
        );
      })}
    </div>
  );
};
