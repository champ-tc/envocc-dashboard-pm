export type ChartPoint = { date: string; value: number; x: number; y: number };

export function prepareChartSeries(
    data: Record<string, { date: string; value: number }[]>,
    labels: string[],
    axisDates: string[],
    maxValue: number,
) {
    const positions = new Map(axisDates.map((date, index) => [
        date, axisDates.length <= 1 ? 50 : index / (axisDates.length - 1) * 100,
    ]));
    return labels.map(label => {
        const points: ChartPoint[] = [...(data[label] || [])]
            .sort((a, b) => a.date.localeCompare(b.date))
            .map(point => ({ ...point, x: positions.get(point.date) ?? 0, y: 100 - point.value / maxValue * 100 }));
        return { label, points, path: points.map(point => `${point.x},${point.y}`).join(' ') };
    });
}

/** Binary lookup keeps pointer movement cheap even for multi-year series. */
export function nearestChartPoint(points: ChartPoint[], x: number): ChartPoint | undefined {
    if (!points.length) return undefined;
    let low = 0;
    let high = points.length - 1;
    while (low < high) {
        const mid = Math.floor((low + high) / 2);
        if (points[mid].x < x) low = mid + 1;
        else high = mid;
    }
    const previous = points[Math.max(0, low - 1)];
    return Math.abs(previous.x - x) <= Math.abs(points[low].x - x) ? previous : points[low];
}
