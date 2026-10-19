import React, { useCallback, useState } from 'react';
import { hoverIndexFromEvent } from './editorialChartUtils';

export function useChartHover(count) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const onMouseMove = useCallback(
    (event) => setHoverIndex(hoverIndexFromEvent(event, count)),
    [count],
  );

  const onMouseLeave = useCallback(() => setHoverIndex(null), []);

  return { hoverIndex, onMouseMove, onMouseLeave };
}

export default useChartHover;
