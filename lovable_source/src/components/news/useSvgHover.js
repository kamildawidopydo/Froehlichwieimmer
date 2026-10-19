import { useCallback, useState } from 'react';
import { hoverIndexFromEvent } from './marketChartUtils';

export function useSvgHover(pointCount) {
  const [hoverIndex, setHoverIndex] = useState(null);

  const onMouseMove = useCallback(
    (event) => {
      setHoverIndex(hoverIndexFromEvent(event, pointCount));
    },
    [pointCount],
  );

  const onMouseLeave = useCallback(() => setHoverIndex(null), []);

  return { hoverIndex, onMouseMove, onMouseLeave };
}

export default useSvgHover;
