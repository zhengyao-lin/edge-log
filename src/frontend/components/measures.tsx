export type ExplicitMeasure = { em: number } | { rem: number } | { px: number };

export type Height =
    | "height-tiny"
    | "height-small"
    | "height-medium"
    | "height-big"
    | "height-huge"
    | "height-full"
    | ExplicitMeasure
    | [number, Height];

export type Width =
    | "width-tiny"
    | "width-small"
    | "width-medium"
    | "width-big"
    | "width-huge"
    | "width-full"
    | ExplicitMeasure
    | [number, Width];

export type Gap =
    | "gap-small"
    | "gap-medium"
    | "gap-big"
    | ExplicitMeasure
    | [number, Gap];

export type Measure = Height | Width | Gap | ExplicitMeasure;

export function measureToCSSProperty(measure: Measure): string {
    const [size, unit] = measureToSize(measure);
    return `${size}${unit}`;
}

export function measureToSize(measure: Measure): [number, string] {
    if (measure.hasOwnProperty("em")) {
        return [(measure as any).em, "em"];
    }

    if (measure.hasOwnProperty("rem")) {
        return [(measure as any).rem, "rem"];
    }

    if (measure.hasOwnProperty("px")) {
        return [(measure as any).px, "px"];
    }

    if (measure instanceof Array) {
        const [multiplier, submeasure] = measure;
        const [size, unit] = measureToSize(submeasure);
        return [multiplier * size, unit];
    }

    const measureMap: Record<string, [number, string]> = {
        "height-tiny": [0.75, "em"],
        "height-small": [0.83, "em"],
        "height-medium": [1.17, "em"],
        "height-big": [1.5, "em"],
        "height-huge": [2, "em"],
        "height-full": [100, "%"],

        "width-tiny": [1, "em"],
        "width-small": [2, "em"],
        "width-medium": [3, "em"],
        "width-big": [4, "em"],
        "width-huge": [5, "em"],
        "width-full": [100, "%"],

        "gap-small": [1, "em"],
        "gap-medium": [3, "em"],
        "gap-big": [5, "em"],
    };

    return measureMap[measure as Exclude<typeof measure, ExplicitMeasure>];
}
