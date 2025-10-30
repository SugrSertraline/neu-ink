// components/paper/InlineMathSpan.tsx
'use client';

import { memo, useMemo } from 'react';
import katex from 'katex';

interface InlineMathSpanProps {
  latex?: string;
}

const InlineMathSpan = memo(({ latex = '' }: InlineMathSpanProps) => {
  const rendered = useMemo(() => {
    try {
      return katex.renderToString(latex, {
        throwOnError: false,
        displayMode: false,
      });
    } catch (err) {
      console.error('Inline math render error:', err);
      return latex;
    }
  }, [latex]);

  return (
    <span
      className="inline-block align-middle"
      dangerouslySetInnerHTML={{ __html: rendered }}
    />
  );
});
InlineMathSpan.displayName = 'InlineMathSpan';

export default InlineMathSpan;
