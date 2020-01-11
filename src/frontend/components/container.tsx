import { h, RenderableProps, VNode } from "preact";
import { BaseProps, InternalProperty, Base, Div } from "./base";
import { Width, measureToCSSProperty, Gap } from "./measures";
import { useMediaQuery } from "./media";
import { useState } from "preact/hooks";
import { assert } from "../../common";

/**
 * Given a pair [a, b]
 * If a, b are number and b > a, then [a, b] === [a, b]
 * Otherwise the range is invalid
 */
export type WidthRange = [Width | null, Width | null];
export type WidthMode = { fixed: Width } | { padding: Gap };

function widthRangeToMediaQuery([a, b]: WidthRange): string {
    assert(a !== null || b !== null, `invalid width range [${a}, ${b})`);

    if (a !== null && b === null) {
        return `(min-width: ${measureToCSSProperty(a)})`;
    } else if (a === null && b !== null) {
        return `(min-width: ${measureToCSSProperty(b)})`;
    }

    assert(a !== null && b !== null);

    return `(min-width: ${measureToCSSProperty(
        a
    )}) and (max-width: ${measureToCSSProperty(b)})`;
}

export type ContainerProps<P> = BaseProps<
    P,
    {
        widthConfig?: [WidthRange, WidthMode][];
    }
>;

/**
 * Container is a component that adjust max-width
 * according to the screen size
 */
export function Container<P extends InternalProperty<"style">>(
    props: RenderableProps<ContainerProps<P>>
): VNode {
    const widthConfigOptional: [WidthRange, WidthMode][] | undefined =
        props.widthConfig;
    const widthConfig = widthConfigOptional || Container.defaultWidthConfig;

    const [width, setWidth] = useState("auto");
    const [marginLeft, setMarginLeft] = useState("auto");
    const [marginRight, setMarginRight] = useState("auto");

    // iterate through the width ranges and configure events
    // for window changes
    for (const [range, mode] of widthConfig) {
        if ("fixed" in mode) {
            const fixedWidth = measureToCSSProperty(mode.fixed);

            useMediaQuery(widthRangeToMediaQuery(range), () => {
                setWidth(fixedWidth);
                setMarginLeft("auto");
                setMarginRight("auto");
            });
        } else {
            const fixedPadding = measureToCSSProperty(mode.padding);

            useMediaQuery(widthRangeToMediaQuery(range), () => {
                setWidth("auto");
                setMarginLeft(fixedPadding);
                setMarginRight(fixedPadding);
            });
        }
    }

    return (
        <Base
            {...(Object.assign({ as: Div }, props) as any)}
            style={Object.assign(
                {
                    width: width,
                    "margin-left": marginLeft,
                    "margin-right": marginRight,
                },
                props.style || {}
            )}
        >
            {props.children}
        </Base>
    );
}

Container.defaultWidthConfig = [
    [[{ px: 768 }, null], { fixed: { px: 700 } }],
    [[{ px: 0 }, { px: 767 }], { padding: "gap-small" }],
] as [WidthRange, WidthMode][];
